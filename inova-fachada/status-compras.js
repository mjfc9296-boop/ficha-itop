const bucketName = 'inova-compras-documentos';
const fileTypes = 'application/pdf,image/jpeg,image/png,application/xml,text/xml';
const pageSize = 30;

export function mountPurchaseStatus(panel, {client, money, show, isCurrent, setStatus}) {
 const find = selector => panel.querySelector(selector);
 const results = find('[data-purchase-status]');
 const approved = find('[data-approved-orders]');
 const completion = find('[data-complete-order]');
 const docs = completion.querySelector('form');
 const submit = docs.querySelector('[type=submit]');
 const docStatus = completion.querySelector('[role=status]');
 let selected, loading = false;

 function decisionOf(order) { return order.inova_compras_decisoes; }
 function conclusionOf(order) { return order.inova_compras_conclusoes; }
 function quotesOf(order) {
  return order.inova_compras_orcamentos
   .filter(quote => quote.posicao && (!order.fornecedor_exclusivo || quote.posicao === 1))
   .sort((a, b) => a.posicao - b.posicao);
 }
 function numberOf(order) { return 'SC-' + String(order.numero).padStart(5, '0'); }
 function totals(items, freight) {
  return money(freight + items.reduce((sum, item) => sum + (item.total_centavos ?? 0), 0));
 }
 function element(tag, label) {
  const node = document.createElement(tag);
  if (label != null) node.textContent = label;
  return node;
 }
 function fillDetails(cells, order, quote) {
  const items = quote?.itens ?? order.itens;
  const freight = quote?.frete_centavos ?? 0;
  cells[0].textContent = quote?.fornecedor ?? order.fornecedor;
  cells[1].replaceChildren(...items.map(item => element('div', item.produto + ' × ' + item.quantidade)));
  cells[2].replaceChildren(...items.map(item => element('div', item.valor_centavos == null ? 'Não cotado' : money(item.valor_centavos))));
  cells[3].textContent = money(freight);
  cells[4].textContent = totals(items, freight);
 }
 function buildTable(orders, canDecide) {
  const table = element('table');
  const header = table.createTHead().insertRow();
  const headings = canDecide
   ? ['Número', 'Fornecedor', 'Produto', 'Preço unitário', 'Frete', 'Total', 'Solicitante', 'Situação']
   : ['Número', 'Itens', 'Prioridade', 'Solicitante', 'Situação'];
  for (const name of headings) {
   const heading = element('th', name);
   heading.scope = 'col';
   header.append(heading);
  }
  const body = table.createTBody();
  for (const order of orders) {
   const row = body.insertRow();
   row.insertCell().textContent = numberOf(order);

   const decision = decisionOf(order);
   const quotes = quotesOf(order);
   const selectedQuote = quotes.find(quote => quote.id === decision?.orcamento_id);
   const cells = canDecide ? Array.from({length: 5}, () => row.insertCell()) : [];
   if (!canDecide) {
    const items = selectedQuote?.itens ?? order.itens;
    row.insertCell().append(...items.map(item => element('div', item.produto + ' × ' + item.quantidade)));
    row.insertCell().textContent = order.prioridade === 'urgente' ? 'Urgente' : 'Normal';
   }
   row.insertCell().textContent = order.solicitante || 'Não informado';
   const status = row.insertCell();
   const decisionText = decision?.resultado === 'aprovado' ? 'Aprovado'
    : decision?.resultado === 'reprovado' ? 'Reprovado' : 'Aguardando aprovação';
   const indicator = element('span', decisionText);
   indicator.className = 'compras-decision';
   indicator.dataset.decision = decision?.resultado ?? 'pendente';
   status.append(indicator);
   if (canDecide) fillDetails(cells, order, selectedQuote ?? quotes[0]);
   if (conclusionOf(order)) status.append(element('div', 'Concluído'));
   if (!canDecide) {
    const open = element('button', conclusionOf(order) ? 'Ver pedido concluído' : 'Abrir pedido autorizado');
    open.type = 'button';
    open.onclick = () => openCompletion(order);
    status.append(open);
   } else if (!decision) {
    const select = element('select');
    select.setAttribute('aria-label', 'Orçamento de ' + numberOf(order));
    select.append(...quotes.map(quote => new Option('Orçamento ' + quote.posicao + ' · ' + quote.fornecedor, quote.id)));
    const approve = element('button', 'Aprovar');
    const reject = element('button', 'Reprovar');
    approve.type = reject.type = 'button';
    const feedback = element('div');
    feedback.setAttribute('role', 'status');
    function update() {
     const quote = quotes.find(option => option.id === select.value);
     fillDetails(cells, order, quote);
     approve.disabled = !quote || quote.itens.some(item => item.valor_centavos == null);
     return quote;
    }
    select.onchange = update;
    update();
    if (approve.disabled && quotes.length) feedback.textContent = 'Selecione um orçamento com todos os preços preenchidos.';
    select.addEventListener('change', () => {
     feedback.textContent = approve.disabled ? 'Selecione um orçamento com todos os preços preenchidos.' : '';
    });
    async function decide(outcome) {
     select.disabled = approve.disabled = reject.disabled = true;
     const {error} = await Promise.resolve(client().from('inova_compras_decisoes').insert({
      pedido_id: order.id, resultado: outcome, orcamento_id: select.value || null
     })).catch(() => ({error: true}));
     if (!error || error.code === '23505') {
      if (isCurrent('status')) void show('status');
      return;
     }
     feedback.textContent = 'Não foi possível registrar a decisão. Tente novamente.';
     select.disabled = reject.disabled = false;
     update();
    }
    approve.onclick = () => void decide('aprovado');
    reject.onclick = () => void decide('reprovado');
    status.append(select, approve, reject, feedback);
   }
  }
  return table;
 }
 async function load(view, current, page = 0) {
  const target = view === 'status' ? results : approved;
  target.replaceChildren();
  const decisions = view === 'status' ? 'inova_compras_decisoes' : 'inova_compras_decisoes!inner';
  const query = client().from('inova_compras')
   .select(`id,numero,entrega,fornecedor,itens,observacoes,solicitante,prioridade,fornecedor_exclusivo,${decisions}(resultado,orcamento_id),inova_compras_conclusoes(comprovante,nota_fiscal),inova_compras_orcamentos(id,posicao,fornecedor,frete_centavos,itens)`, {count:'exact'})
   .not('enviado_para_aprovacao_em', 'is', null)
   .order('numero', {ascending:false}).range(page * pageSize, (page + 1) * pageSize - 1);
  if (view === 'complete') query.eq('inova_compras_decisoes.resultado', 'aprovado');
  const {data, error, count} = await query;
  if (error) throw error;
  if (!current()) return;
  setStatus(data.length ? '' : view === 'status' ? 'Nenhum pedido enviado para aprovação.' : 'Nenhum pedido aprovado.');
  if (!data.length) return;
  target.append(buildTable(data, view === 'status'));
  for (const [label, offset, enabled] of [
   ['Anterior', -1, page > 0], ['Próxima', 1, (page + 1) * pageSize < count]
  ]) {
   if (!enabled) continue;
   const button = element('button', label);
   button.type = 'button';
   button.onclick = () => void show(view, page + offset);
   target.append(button);
  }
 }
 function openCompletion(order) {
  if (loading) return;
  selected = order;
  docs.reset();
  docStatus.textContent = '';
  completion.querySelector('h3').textContent = numberOf(order) + ' · Pedido aprovado';
  const quote = quotesOf(order).find(option => option.id === decisionOf(order).orcamento_id);
  const details = completion.querySelector('[data-complete-details]');
  details.replaceChildren();
  if (!quote) {
   docs.hidden = true;
   docStatus.textContent = 'Orçamento aprovado indisponível.';
   completion.hidden = false;
   return;
  }
  const table = element('table');
  const cells = ['Fornecedor', 'Produto', 'Preço unitário', 'Frete', 'Total'].map(name => {
   const row = table.insertRow();
   row.append(element('th', name));
   return row.insertCell();
  });
  fillDetails(cells, order, quote);
  details.append(table);
  if (order.solicitante) details.append(element('p', 'Solicitante · ' + order.solicitante));
  if (order.entrega) details.append(element('p', 'Entrega prevista em ' + order.entrega.split('-').reverse().join('/')));
  if (order.observacoes) details.append(element('p', order.observacoes));
  const finished = conclusionOf(order);
  docs.hidden = Boolean(finished);
  if (finished) {
   docStatus.textContent = 'Pedido concluído.';
   for (const [label, path] of [['Comprovante de pagamento', finished.comprovante], ['Nota fiscal', finished.nota_fiscal]]) {
    const button = element('button', 'Baixar ' + label.toLowerCase());
    button.type = 'button';
    button.onclick = async () => {
     const {data,error} = await client().storage.from(bucketName).createSignedUrl(path, 60, {download:true});
     if (error) {
      docStatus.textContent = 'Não foi possível baixar ' + label.toLowerCase() + '.';
      return;
     }
     const link = element('a');
     link.href = data.signedUrl;
     link.click();
    };
    details.append(button);
   }
  }
  completion.hidden = false;
  completion.scrollIntoView({block:'nearest'});
 }
 completion.querySelector('[data-close-completion]').onclick = () => {
  if (!loading) reset();
 };
 docs.onsubmit = async event => {
  event.preventDefault();
  if (loading || !selected) return;
  const order = selected;
  const fileFields = ['comprovante', 'nota_fiscal'];
  const files = fileFields.map(field => docs.elements[field].files[0]);
  if (files.some(file => !file || file.size > 10 * 1024 * 1024 || !fileTypes.split(',').includes(file.type))) {
   docStatus.textContent = 'Selecione os dois arquivos em PDF, JPG, PNG ou XML, com até 10 MB cada.';
   return;
  }
  loading = submit.disabled = true;
  docStatus.textContent = 'Enviando documentos…';
  const storage = client().storage.from(bucketName);
  const attempt = crypto.randomUUID();
  const paths = fileFields.map((field, index) => {
   const extension = {'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','application/xml':'xml','text/xml':'xml'};
   return order.id + '/' + attempt + '/' + field + '.' + extension[files[index].type];
  });
  try {
   const uploads = await Promise.allSettled(files.map((file, index) => storage.upload(paths[index], file)));
   if (uploads.some(result => result.status === 'rejected' || result.value.error)) throw new Error('Falha no envio dos arquivos');
   const {error} = await client().from('inova_compras_conclusoes').insert({
    pedido_id: order.id, comprovante: paths[0], nota_fiscal: paths[1]
   });
   if (error && error.code !== '23505') throw error;
   if (error) await storage.remove(paths);
   if (selected === order && isCurrent('complete')) {
    reset();
    await show('complete');
   }
  } catch {
   // A política protege documentos já registrados quando a resposta do servidor se perde.
   try { await storage.remove(paths); } catch {}
   if (selected === order) docStatus.textContent = 'Não foi possível confirmar a conclusão. Atualize a lista ou tente novamente.';
  } finally {
   loading = submit.disabled = false;
  }
 };
 function reset() {
  selected = null;
  completion.hidden = true;
  docs.reset();
  docStatus.textContent = '';
  completion.querySelector('[data-complete-details]').replaceChildren();
 }
 return {load, reset};
}

export {fileTypes};
