export function mountPurchaseQuotes(panel, {client, money, date, showQuotes, loadSuppliers, supplierForm, saveSupplier, supplierError}) {
 const dialog = document.createElement('dialog');
 dialog.className = 'compras-quote';
 dialog.setAttribute('aria-labelledby', 'inova-quote-title');
 dialog.innerHTML = `
  <form>
   <div class="compras-heading"><h3 id="inova-quote-title">Novo orçamento</h3>
    <button type="button" data-close aria-label="Fechar">×</button>
   </div>
   <div class="compras-quote-body">
    <label>Fornecedor<input name="fornecedor" list="inova-compra-fornecedores" required maxlength="200"></label>
    <div><button type="button" data-add-supplier>+ Adicionar fornecedor</button></div>
    <div class="compras-pair">
     <label>Data do orçamento<input type="date" name="data_orcamento" required></label>
     <label>Válido até (opcional)<input type="date" name="valido_ate"></label>
     <label>Condição de pagamento<select name="pagamento"><option value="">Selecione</option><option>PIX</option><option>À vista</option><option>30/60/90</option></select></label>
     <label>Prazo de entrega (dias)<input type="number" name="prazo_dias" min="0" max="3650" step="1"></label>
     <label>Valor do frete (R$)<input type="number" name="frete" min="0" max="999999" step="0.01" inputmode="decimal"></label>
     <label>Link do orçamento<input type="url" name="link" maxlength="2048" placeholder="https://"></label>
    </div>
    <section><div class="compras-heading"><h4>Preço por item</h4><button type="button" data-add-quote>+ Adicionar item</button></div>
     <p>Deixe o preço em branco quando o fornecedor não cotar o item.</p>
     <div data-quote-items></div><p data-quote-total aria-live="polite"></p>
    </section>
    <label>Observação (opcional)<textarea name="observacoes" rows="3" maxlength="2000"></textarea></label>
   </div>
   <footer><p role="status"></p><button type="button" data-close>Voltar</button>
    <button type="submit" class="compras-primary">Salvar orçamento</button></footer>
  </form>`;
 panel.append(dialog);
 const form = dialog.querySelector('form');
 const items = dialog.querySelector('[data-quote-items]');
 const total = dialog.querySelector('[data-quote-total]');
 const status = dialog.querySelector('[role=status]');
 const submit = form.querySelector('[type=submit]');
 const add = dialog.querySelector('[data-add-quote]');
 const localDate = new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Sao_Paulo'});
 const cents = input => Math.round((input.valueAsNumber || 0) * 100);
 let pending = false, draft, afterSave, saveInOrder;
 const registration = document.createElement('dialog');
 registration.className = 'compras-quote';
 registration.setAttribute('aria-labelledby', 'inova-supplier-title');
 const registrationForm = supplierForm.cloneNode(true);
 registrationForm.removeAttribute('data-fornecedor');
 registrationForm.querySelector('[type=submit]').remove();
 const fields = document.createElement('div');
 fields.className = 'compras-quote-body';
 fields.append(...registrationForm.children);
 registrationForm.innerHTML = `
  <div class="compras-heading"><h3 id="inova-supplier-title">Cadastrar fornecedor</h3></div>
  <footer><p role="status"></p><button type="button">Cancelar</button>
   <button type="submit" class="compras-primary">Salvar fornecedor</button></footer>`;
 registrationForm.querySelector('footer').before(fields);
 registration.append(registrationForm);
 panel.append(registration);
 const registrationStatus = registration.querySelector('[role=status]');
 const registrationSave = registration.querySelector('[type=submit]');
 const registrationCancel = registration.querySelector('[type=button]');
 dialog.querySelector('[data-add-supplier]').onclick = () => {
  if (pending || registrationSave.disabled) return;
  registrationForm.reset();
  registrationStatus.textContent = '';
  registration.showModal();
 };
 registrationCancel.onclick = () => registration.close();
 registration.addEventListener('cancel', event => {
  if (registrationSave.disabled) event.preventDefault();
 });
 registrationForm.onsubmit = async event => {
  event.preventDefault();
  if (registrationSave.disabled) return;
  const current = draft;
  registrationSave.disabled = registrationCancel.disabled = true;
  registrationStatus.textContent = 'Salvando fornecedor…';
  try {
   const name = await saveSupplier(registrationForm);
   if (draft !== current) return;
   form.elements.fornecedor.value = name;
   registration.close();
   form.elements.fornecedor.focus();
   void loadSuppliers();
  } catch (error) {
   if (draft === current) registrationStatus.textContent = supplierError(error, registrationForm);
  } finally {
   registrationSave.disabled = registrationCancel.disabled = false;
  }
 };
 function update() {
  const lines = [...items.children].map(row => {
   const [product, quantity, price] = row.querySelectorAll('input');
   const valor_centavos = price.value === '' ? null : cents(price);
   const quantidade = quantity.valueAsNumber || 0;
   const total_centavos = valor_centavos === null ? null : Math.round(valor_centavos * quantidade);
   row.querySelector('output').value = total_centavos === null ? '—' : money(total_centavos);
   return {produto:product.value.trim(), quantidade, valor_centavos, total_centavos};
  });
  total.textContent = 'Total com frete ' + money(cents(form.elements.frete) + lines.reduce((sum, line) => sum + (line.total_centavos ?? 0), 0))
   + (lines.some(line => line.valor_centavos === null) ? ' · Há itens sem cotação' : '');
  form.elements.valido_ate.min = form.elements.data_orcamento.value;
  return lines;
 }
 function addLine(item, linked) {
  if (items.children.length >= 100) return;
  const row = document.createElement('div');
  row.className = 'compras-item';
  row.innerHTML = `<label>Produto<input required maxlength="160"></label>
   <label>Quantidade<input type="number" min="0.001" max="999999" step="0.001" required></label>
   <label>Preço unitário (R$)<input type="number" min="0" max="999999" step="0.01" inputmode="decimal" placeholder="Não cotado"></label>
   <label>Subtotal<output></output></label>`;
  const [name, quantity, price] = row.querySelectorAll('input');
  if (linked) {
   name.value = item.produto;
   quantity.value = item.quantidade;
   name.readOnly = quantity.readOnly = true;
   if (saveInOrder && item.valor_centavos != null) price.value = item.valor_centavos / 100;
  } else {
   const remove = document.createElement('button');
   remove.type = 'button';
   remove.setAttribute('aria-label','Remover item');
   remove.textContent = '🗑';
   remove.onclick = () => {
    row.remove();
    if (!items.childElementCount) addLine();
    update();
   };
   row.append(remove);
  }
  items.append(row);
  update();
 }
 function open(order, slot, onSaved = showQuotes, localQuote) {
  if (dialog.open || pending) return;
  form.reset();
  items.replaceChildren();
  status.textContent = '';
  form.elements.data_orcamento.value = localDate.format(new Date());
  draft = {id:crypto.randomUUID(), pedido_id:order?.id ?? null, posicao:slot ?? null};
  afterSave = onSaved;
  saveInOrder = Boolean(localQuote);
  if (localQuote) {
   const previous = localQuote.previous;
   draft.id = previous?.id ?? draft.id;
   if (previous) {
    for (const field of ['fornecedor', 'data_orcamento', 'valido_ate', 'pagamento', 'prazo_dias', 'link', 'observacoes']) {
     form.elements[field].value = previous[field] ?? '';
    }
    form.elements.frete.value = previous.frete_centavos / 100;
   }
  }
  dialog.querySelector('h3').textContent = slot ? 'Orçamento ' + slot + ' do pedido' : 'Novo orçamento';
  add.hidden = Boolean(order);
  for (const item of order?.itens ?? [null]) addLine(item, Boolean(order));
  dialog.showModal();
  void loadSuppliers();
 }
 add.onclick = () => addLine();
 form.addEventListener('input', update);
 dialog.querySelectorAll('[data-close]').forEach(button => {
  button.onclick = () => { if (!pending) dialog.close(); };
 });
 dialog.addEventListener('cancel', event => { if (pending) event.preventDefault(); });
 form.onsubmit = async event => {
  event.preventDefault();
  if (pending) return;
  const current = draft;
  const lines = update();
  const {fornecedor, data_orcamento, valido_ate, pagamento, prazo_dias, frete, observacoes, link} = form.elements;
  if (!fornecedor.value.trim() || lines.some(line => !line.produto)) {
   status.textContent = 'Preencha o fornecedor e os produtos.';
   return;
  }
  const url = link.value.trim();
  if (url && !/^https?:\/\//i.test(url)) {
   status.textContent = 'Informe um link que comece com https:// ou http://.';
   link.focus();
   return;
  }
  pending = submit.disabled = true;
  try {
   const values = {
    ...current, fornecedor:fornecedor.value.trim(), data_orcamento:data_orcamento.value,
    valido_ate:valido_ate.value || null, pagamento:pagamento.value || null,
    prazo_dias:prazo_dias.value === '' ? null : prazo_dias.valueAsNumber,
    frete_centavos:cents(frete), link:url || null, itens:lines, observacoes:observacoes.value.trim()
   };
   if (!saveInOrder) {
    const {error} = await client().from('inova_compras_orcamentos')
     .upsert(values, {onConflict:'id',ignoreDuplicates:true});
    if (error) throw error;
   }
   if (draft !== current) return;
   dialog.close();
   await afterSave(values);
  } catch (error) {
   if (draft === current) status.textContent = error?.code === '23505'
    ? 'Já existe um orçamento nesta posição. Feche o formulário para atualizar a aba.'
    : 'Não foi possível salvar. Os dados continuam no formulário.';
  } finally { pending = submit.disabled = false; }
 };
 return {open, reset() { draft = null; registration.close(); registrationForm.reset(); dialog.close(); form.reset(); items.replaceChildren(); status.textContent = ''; },
  async list(orderId, slot) {
   const query = client().from('inova_compras_orcamentos')
    .select('fornecedor,data_orcamento,valido_ate,pagamento,prazo_dias,frete_centavos,itens,observacoes,link,inova_compras(numero)')
    .order('criado_em',{ascending:false}).limit(30);
   if (orderId) query.eq('pedido_id', orderId).eq('posicao', slot);
   const {data,error} = await query;
   if (error) throw error;
   return data.map(row => {
    const li = document.createElement('li');
    const detail = document.createElement('details');
    const summary = document.createElement('summary');
    const sum = row.frete_centavos + row.itens.reduce((amount,item) => amount + (item.total_centavos ?? 0),0);
    summary.textContent = row.fornecedor + ' · ' + date(row.data_orcamento) + ' · ' + money(sum);
    const metadata = document.createElement('p');
    const orderNumber = row.inova_compras?.numero;
    metadata.textContent = [
     orderNumber && 'PC-' + String(orderNumber).padStart(5,'0'),
     row.valido_ate && 'Válido até ' + date(row.valido_ate), row.pagamento,
     row.prazo_dias !== null && 'Entrega em ' + row.prazo_dias + ' dia(s)', 'Frete ' + money(row.frete_centavos)
    ].filter(Boolean).join(' · ');
    const list = document.createElement('ul');
    for (const item of row.itens) {
     const line = document.createElement('li');
     const price = item.valor_centavos === null ? 'Não cotado' : money(item.valor_centavos) + ' · Subtotal ' + money(item.total_centavos);
     line.textContent = item.produto + ' · ' + item.quantidade + ' × ' + price;
     list.append(line);
    }
    const notes = document.createElement('p');
    notes.textContent = row.observacoes;
    detail.append(summary,metadata,list);
    if (row.observacoes) detail.append(notes);
    if (/^https?:\/\//i.test(row.link ?? '')) {
     const link = document.createElement('a');
     link.href = row.link;
     link.target = '_blank';
     link.rel = 'noopener noreferrer';
     link.textContent = 'Abrir link do orçamento';
     detail.append(link);
    }
    if (orderId) detail.open = true;
    li.append(detail);
    return li;
   });
  }};
}
