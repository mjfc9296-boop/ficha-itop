import {mountPurchaseQuotes} from './orcamentos-compras.js?v=5';

import {mountPurchaseStatus, fileTypes} from './status-compras.js?v=3';

export function mountPurchases(panel, loadStock, supplierRegistration) {
 const money = cents => (cents / 100).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
 const date = value => value ? value.split('-').reverse().join('/') : '—';
 const client = () => window.itopAuthClient;
 panel.innerHTML = `
  <header class="compras-header"><div><span>INOVA BLOCOS</span><h2>Compras</h2></div>
    <nav aria-label="Ações de compras"><button type="button" data-return>Voltar à ITOP</button><button type="button" data-open="stock">Estoque mínimo</button>
    </nav>
  </header>
  <nav class="compras-tabs" aria-label="Compras">
   <button type="button" class="compras-primary" data-open="form">+ Novo PC</button>
   <button type="button" data-open="status">Status Pedido</button>
   <button type="button" data-open="complete">Concluir Pedido</button>
   <button type="button" data-open="orders" aria-current="page">Pedido de compra</button>
   <button type="button" data-open="quotes">Orçamentos</button>
  </nav>
  <p data-status role="status"></p>
  <section data-view="status" class="compras-card" hidden>
   <h3>Status Pedido</h3><div class="compras-table-scroll" data-purchase-status></div>
  </section>
  <section data-view="complete" class="compras-card" hidden>
   <h3>Pedidos aprovados</h3><div class="compras-table-scroll" data-approved-orders></div>
   <section data-complete-order hidden>
    <div class="compras-heading"><h3></h3><button type="button" data-close-completion>Fechar pedido</button></div>
    <div data-complete-details></div><p role="status"></p>
    <form>
     <div class="compras-pair">
      <label>Comprovante de pagamento<input name="comprovante" type="file" accept="${fileTypes},.xml" required></label>
      <label>Nota fiscal<input name="nota_fiscal" type="file" accept="${fileTypes},.xml" required></label>
     </div>
     <button type="submit" class="compras-primary">Concluir pedido</button>
    </form>
   </section>
  </section>
  <section data-view="orders" class="compras-card"><h3>Pedidos de compra</h3><ul data-orders></ul></section>
  <section data-view="quotes" class="compras-card" hidden><div class="compras-heading">
   <h3>Orçamentos</h3><button type="button" class="compras-primary" data-new-quote>+ Adicionar orçamento</button>
  </div><ul data-quotes></ul></section>
  <section data-view="stock" class="compras-card" hidden><h3>Estoque mínimo</h3>
   <p>Defina o mínimo por produto. O saldo atual é consultado no estoque da Inova.</p>
   <form data-min-form><div data-stock></div><button class="compras-primary" disabled>Salvar mínimos</button>
    <button type="button" data-open="orders">Voltar</button></form>
  </section>
  <form data-view="form" class="compras-layout" hidden>
    <div class="compras-fields">
      <section class="compras-card"><h3>Novo pedido de compra</h3><div class="compras-pair">
        <label>Fornecedor<input name="fornecedor" list="inova-compra-fornecedores" required maxlength="200"></label>
        <datalist id="inova-compra-fornecedores"></datalist>
        <label>Previsão de entrega<input name="entrega" type="date"></label>
        <label>Solicitante do pedido<input name="solicitante" maxlength="160" required></label>
        <label>Tipo de material solicitado<select name="tipo_material" required><option value="">Selecione</option><option>EPI</option><option>EPS</option><option>Suprimento</option><option>Patrimônio</option></select></label>
        <label>Prioridade<select name="prioridade"><option value="normal">Normal</option><option value="urgente">Urgente</option></select></label>
      </div></section>
      <section class="compras-card"><div class="compras-heading"><h3>Itens</h3><button type="button" data-add>+ Adicionar item</button></div>
        <div class="compras-order-items" role="region" aria-label="Linhas de itens" tabindex="0">
         <div class="compras-order-items-head" aria-hidden="true">
          <span>Produto</span><span>Quantidade</span><span>Valor unitário (R$)</span><span>Total</span>
         </div>
         <div data-items></div>
        </div><datalist id="inova-compra-produtos"></datalist>
      </section>
      <section class="compras-card">
        <h3>Orçamentos</h3>
        <label class="compras-exclusive"><input type="checkbox" name="fornecedor_exclusivo"> Fornecedor exclusivo</label>
        <nav class="compras-tabs" aria-label="Orçamentos do novo pedido">
          <button type="button" data-draft-slot="1">Orçamento 1</button>
          <button type="button" data-draft-slot="2">Orçamento 2</button>
          <button type="button" data-draft-slot="3">Orçamento 3</button>
        </nav>
        <p data-draft-quote aria-live="polite"></p>
        <button type="button" data-fill-quote>Preencher orçamento</button>
        <p><button type="button" class="compras-primary" data-send-approval>Enviar para aprovação</button></p>
      </section>
      <section class="compras-card"><label>Observações<textarea name="observacoes" rows="3" maxlength="2000"></textarea></label></section>
    </div>
    <aside class="compras-card compras-summary"><h3>Resumo</h3>
      <dl><dt>Fornecedor</dt><dd data-supplier>—</dd><dt>Entrega prevista</dt><dd data-delivery>—</dd>
       <dt>Itens</dt><dd data-count>0</dd><dt>Total</dt><dd><strong data-total></strong></dd></dl>
      <button class="compras-primary" type="submit">Criar pedido</button>
      <button type="button" data-open="orders">Cancelar</button>
    </aside>
  </form>`;
 const find = selector => panel.querySelector(selector);
 const form = find('[data-view="form"]');
 const minForm = find('[data-min-form]');
 const items = find('[data-items]');
 const stock = find('[data-stock]');
 const status = find('[data-status]');
 const submit = form.querySelector('.compras-summary [type=submit]');
 const send = find('[data-send-approval]');
 const draftQuotes = new Map();
 const draftTabs = [...form.querySelectorAll('[data-draft-slot]')];
 const exclusiveDraft = form.elements.fornecedor_exclusivo;
 let slot = 1;
 let screen = 'orders', revision = 0, saving = false, orderId;
 const setStatus = message => { status.textContent = message; };
 const workflow = mountPurchaseStatus(panel, {client, money, show, setStatus,
  isCurrent: view => screen === view && !panel.hidden
 });
 const products = data => Object.entries({Máscara: data?.mascara, Bloco: data?.blocos})
  .flatMap(([name, balances]) => (balances || []).map(([size, base, extra]) => ({
   produto: name + ' ' + size + ' cm', saldo: Number(base || 0) + Number(extra || 0)
  })));
 function fillOptions(selector, values) {
  find(selector).replaceChildren(...values.map(value => new Option(value)));
 }
 const quotes = mountPurchaseQuotes(panel, {...supplierRegistration, client, money, date, showQuotes: () => show('quotes'),
  async loadSuppliers() {
   const current = revision;
   try {
    const {data, error} = await client().from('inova_blocos_fornecedores').select('nome').order('nome');
    if (!error && current === revision) fillOptions('#inova-compra-fornecedores', data.map(row => row.nome));
   } catch {
    // O fornecedor pode ser digitado mesmo quando o cadastro está indisponível.
   }
  }
 });
 find('[data-new-quote]').onclick = () => quotes.open();
 function totals() {
  const rows = [...items.children].map(row => {
   const [product, quantity, price] = row.querySelectorAll('input');
   const valor_centavos = Math.round((price.valueAsNumber || 0) * 100);
   const quantidade = quantity.valueAsNumber || 0;
   const total_centavos = Math.round(valor_centavos * quantidade);
   row.querySelector('output').value = money(total_centavos);
   return {produto: product.value.trim(), quantidade, valor_centavos, total_centavos};
  });
  find('[data-supplier]').textContent = form.elements.fornecedor.value.trim() || '—';
  find('[data-delivery]').textContent = date(form.elements.entrega.value);
  find('[data-count]').textContent = rows.filter(row => row.produto).length;
  find('[data-total]').textContent = money(rows.reduce((sum, row) => sum + row.total_centavos, 0));
  refreshDraftQuote(rows);
  return rows;
 }
 function quoteMatches(quote, rows) {
  return quote.itens.length === rows.length && quote.itens.every((item, index) =>
   item.produto === rows[index].produto && item.quantidade === rows[index].quantidade);
 }
 function refreshDraftQuote(rows) {
  const max = exclusiveDraft.checked ? 1 : 3;
  if (slot > max) slot = 1;
  for (const tab of draftTabs) {
   const number = Number(tab.dataset.draftSlot);
   tab.hidden = number > max;
   tab.setAttribute('aria-current', number === slot ? 'page' : 'false');
  }
  const quote = draftQuotes.get(slot);
  find('[data-fill-quote]').textContent = quote ? 'Editar orçamento' : 'Preencher orçamento';
  find('[data-draft-quote]').textContent = !quote ? 'Orçamento em branco.' : quoteMatches(quote, rows)
   ? quote.fornecedor + ' · Total com frete ' + money(quote.frete_centavos + quote.itens.reduce((sum, item) => sum + (item.total_centavos ?? 0), 0))
   : 'Os itens do pedido mudaram. Revise este orçamento.';
 }
 for (const tab of draftTabs) tab.onclick = () => {
  slot = Number(tab.dataset.draftSlot);
  totals();
 };
 find('[data-fill-quote]').onclick = () => {
  if (saving) return;
  const rows = totals();
  if (rows.some(item => !item.produto || !item.quantidade)) {
   setStatus('Preencha os produtos e as quantidades do pedido antes de abrir o orçamento.');
   return;
  }
  setStatus('');
  const currentSlot = slot;
  const currentOrder = orderId;
  const previous = draftQuotes.get(currentSlot);
  const quotedItems = rows.map((item, index) => ({
   ...item, valor_centavos: previous?.itens[index]?.produto === item.produto ? previous.itens[index].valor_centavos : null
  }));
  quotes.open({id:currentOrder, itens:quotedItems}, currentSlot, quote => {
   if (orderId !== currentOrder || screen !== 'form') return;
   draftQuotes.set(currentSlot, quote);
   totals();
  }, {previous});
 };

 function addItem(focus = false) {
  if (items.children.length >= 100) return;
  const row = document.createElement('div');
  row.className = 'compras-item';
  row.innerHTML = `<input aria-label="Produto" list="inova-compra-produtos" required maxlength="160">
   <input aria-label="Quantidade" type="number" min="0.001" max="999999" step="0.001" required>
   <input aria-label="Valor unitário (R$)" type="number" min="0" max="999999" step="0.01" required>
   <output aria-label="Total"></output><button type="button" aria-label="Remover item" title="Remover item">🗑</button>`;
  row.querySelector('button').onclick = () => {
   row.remove();
   if (!items.childElementCount) addItem(true);
   totals();
  };
  items.append(row);
  totals();
  if (focus) row.querySelector('input').focus();
 }
 async function show(view, page = 0) {
  if (saving) return;
  screen = view;
  workflow.reset();
  const current = ++revision;
  for (const section of panel.querySelectorAll('[data-view]')) section.hidden = section.dataset.view !== view;
  for (const tab of panel.querySelectorAll('.compras-tabs [data-open]')) {
   tab.setAttribute('aria-current', tab.dataset.open === view ? 'page' : 'false');
  }
  setStatus('');
  if (view === 'form') {
   form.reset();
   draftQuotes.clear();
   slot = 1;
   items.replaceChildren();
   addItem(true);
   orderId = crypto.randomUUID();
   const sources = await Promise.allSettled([
    client().from('inova_blocos_fornecedores').select('nome').order('nome'),
    loadStock()
   ]);
   if (revision !== current) return;
   const suppliers = sources[0].value;
   fillOptions('#inova-compra-fornecedores', (suppliers?.data || []).map(row => row.nome));
   fillOptions('#inova-compra-produtos', products(sources[1].value).map(row => row.produto));
   return;
  }
  setStatus('Carregando…');
  try {
   if (view === 'status' || view === 'complete') {
    await workflow.load(view, () => revision === current, page);
    return;
   }
   if (view === 'quotes') {
    find('[data-quotes]').replaceChildren();
    const rows = await quotes.list();
    if (revision !== current) return;
    find('[data-quotes]').replaceChildren(...rows);
    setStatus(rows.length ? '' : 'Nenhum orçamento cadastrado.');
    return;
   }
   if (view === 'orders') {
    find('[data-orders]').replaceChildren();
    const {data, error} = await client().from('inova_compras').select('id,numero,fornecedor,entrega,itens,observacoes,tipo_material,fornecedor_exclusivo,enviado_para_aprovacao_em').order('numero', {ascending:false}).limit(30);
    if (error) throw error;
    if (revision !== current) return;
    find('[data-orders]').replaceChildren(...data.map(order => {
     const li = document.createElement('li');
     const detail = document.createElement('details');
     const summary = document.createElement('summary');
     summary.textContent = 'SC-' + String(order.numero).padStart(5, '0') + ' · ' + order.fornecedor + ' · ' + date(order.entrega) + ' · ' +
      money(order.itens.reduce((sum, item) => sum + item.total_centavos, 0));
     const list = document.createElement('ul');
     for (const item of order.itens) {
      const line = document.createElement('li');
      line.textContent = item.produto + ' · ' + item.quantidade + ' × ' + money(item.valor_centavos) + ' · ' + money(item.total_centavos);
      list.append(line);
     }
     detail.append(summary);
     if (order.tipo_material) {
      const material = document.createElement('p');
      material.textContent = 'Tipo de material · ' + order.tipo_material;
      detail.append(material);
     }
     detail.append(list);
     if (order.observacoes) {
      const notes = document.createElement('p');
      notes.textContent = order.observacoes;
      detail.append(notes);
     }
     const quoteTabs = document.createElement('details');
     const quoteLabel = document.createElement('summary');
     quoteLabel.textContent = '3 orçamentos';
     const tabs = document.createElement('nav');
     tabs.className = 'compras-tabs';
     tabs.setAttribute('aria-label', 'Orçamentos do pedido');
     const result = document.createElement('div');
     result.setAttribute('aria-live', 'polite');
     let selected = 1, request = 0;
     async function refresh(slot) {
      selected = slot;
      const latest = ++request;
      for (const [index, tab] of [...tabs.children].entries()) {
       tab.setAttribute('aria-current', index + 1 === slot ? 'page' : 'false');
      }
      result.textContent = 'Carregando…';
      try {
       const rows = await quotes.list(order.id, slot);
       if (latest !== request) return;
       if (rows.length) {
        const list = document.createElement('ul');
        list.append(...rows);
        result.replaceChildren(list);
        return;
       }
       const add = document.createElement('button');
       add.type = 'button';
       add.textContent = '+ Preencher orçamento ' + slot;
       add.onclick = () => quotes.open(order, slot, () => refresh(slot));
       result.replaceChildren(add);
      } catch {
       if (latest === request) result.textContent = 'Não foi possível carregar o orçamento. Selecione a aba para tentar novamente.';
      }
     }
     for (const slot of [1, 2, 3]) {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.textContent = 'Orçamento ' + slot;
      tab.onclick = () => void refresh(slot);
      tabs.append(tab);
     }
     quoteTabs.append(quoteLabel, tabs, result);
     quoteTabs.addEventListener('toggle', () => { if (quoteTabs.open) void refresh(selected); });
     const exclusiveLabel = document.createElement('label');
     const exclusive = document.createElement('input');
     exclusive.type = 'checkbox';
     exclusive.style.width = 'auto';
     exclusiveLabel.style.display = 'inline-flex';
     exclusiveLabel.style.alignItems = 'center';
     exclusive.checked = order.fornecedor_exclusivo;
     exclusiveLabel.append(exclusive, ' Fornecedor exclusivo');
     function syncQuoteTabs() {
      for (const tab of [...tabs.children].slice(1)) tab.hidden = exclusive.checked;
      if (exclusive.checked && selected !== 1) void refresh(1);
     }
     exclusive.onchange = syncQuoteTabs;
     syncQuoteTabs();
     const approval = document.createElement('button');
     approval.type = 'button';
     const approvalStatus = document.createElement('p');
     approvalStatus.setAttribute('role', 'status');
     function markPending() {
      exclusive.disabled = approval.disabled = true;
      approvalStatus.textContent = 'Aguardando aprovação';
      summary.textContent += ' · Aguardando aprovação';
     }
     approval.textContent = 'Enviar para aprovação';
     approval.className = 'compras-primary';
     approval.onclick = async () => {
      exclusive.disabled = approval.disabled = true;
      approvalStatus.textContent = 'Enviando…';
      try {
       const {data: quotes, error: quotesError} = await client().from('inova_compras_orcamentos')
        .select('posicao').eq('pedido_id', order.id).not('posicao', 'is', null);
       if (quotesError) throw quotesError;
       const required = exclusive.checked ? [1] : [1, 2, 3];
       if (!required.every(slot => quotes.some(quote => quote.posicao === slot))) {
        approvalStatus.textContent = exclusive.checked
         ? 'Preencha o Orçamento 1 para enviar.'
         : 'Preencha os três orçamentos para enviar ou marque Fornecedor exclusivo.';
        exclusive.disabled = approval.disabled = false;
        return;
       }
       const update = client().from('inova_compras');
       const {error} = await update.update({enviado_para_aprovacao_em: new Date().toISOString(), fornecedor_exclusivo: exclusive.checked})
        .eq('id', order.id).is('enviado_para_aprovacao_em', null);
       if (error) throw error;
       const {data, error: readError} = await update.select('enviado_para_aprovacao_em,fornecedor_exclusivo').eq('id', order.id).single();
       if (readError || !data.enviado_para_aprovacao_em) throw readError ?? new Error('Envio não confirmado');
       exclusive.checked = data.fornecedor_exclusivo;
       syncQuoteTabs();
       markPending();
      } catch {
       approvalStatus.textContent = 'Não foi possível confirmar o envio. Tente novamente.';
       exclusive.disabled = approval.disabled = false;
      }
     };
     if (order.enviado_para_aprovacao_em) markPending();
     detail.append(exclusiveLabel, quoteTabs, approval, approvalStatus);
     li.append(detail);
     return li;
    }));
    setStatus(data.length ? '' : 'Nenhum pedido de compra criado.');
    return;
   }
   stock.replaceChildren();
   minForm.querySelector('button').disabled = true;
   const [balances, {data, error}] = await Promise.all([loadStock(), client().from('inova_compras_minimos').select('produto,minimo')]);
   if (error) throw error;
   if (revision !== current) return;
   const thresholds = new Map(data.map(row => [row.produto, row.minimo]));
   for (const {produto, saldo} of products(balances)) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'number';
    input.min = 0;
    input.max = 999999999;
    input.step = 1;
    input.dataset.product = produto;
    input.value = thresholds.get(produto) ?? '';
    const info = document.createElement('span');
    const refresh = () => {
     const low = input.value !== '' && saldo < input.valueAsNumber;
     info.textContent = produto + ' · saldo ' + saldo + (low ? ' · abaixo do mínimo' : '');
     info.classList.toggle('compras-low', low);
    };
    input.addEventListener('input', refresh);
    refresh();
    label.append(info, input);
    stock.append(label);
   }
   minForm.querySelector('button').disabled = !stock.childElementCount;
   setStatus(stock.childElementCount ? '' : 'Nenhum produto no estoque.');
  } catch {
   if (revision === current) setStatus('Não foi possível carregar os dados. Selecione a opção novamente.');
  }
 }
 panel.addEventListener('click', event => {
  const button = event.target.closest('[data-open]');
  if (button) void show(button.dataset.open);
 });
 find('[data-add]').onclick = () => addItem(true);
 form.addEventListener('input', totals);
 let approveOnSubmit = false;
 send.onclick = () => {
  approveOnSubmit = true;
  try {
   form.requestSubmit(submit);
  } finally {
   approveOnSubmit = false;
  }
 };
 form.onsubmit = async event => {
  event.preventDefault();
  if (saving || screen !== 'form') return;
  const lines = totals();
  const supplier = form.elements.fornecedor.value.trim();
  const requester = form.elements.solicitante.value.trim();
  if (!supplier || !requester || lines.some(line => !line.produto)) {
   return setStatus('Preencha o fornecedor, o solicitante e o produto de cada item.');
  }
  const selectedQuotes = [...draftQuotes.values()].filter(quote => !exclusiveDraft.checked || quote.posicao === 1);
  const approve = approveOnSubmit;
  if (selectedQuotes.some(quote => !quoteMatches(quote, lines))) {
   return setStatus('Revise os orçamentos após alterar os itens do pedido.');
  }
  if (approve && selectedQuotes.length !== (exclusiveDraft.checked ? 1 : 3)) {
   return setStatus(exclusiveDraft.checked ? 'Preencha o Orçamento 1 para enviar.' : 'Preencha os três orçamentos para enviar.');
  }
  saving = submit.disabled = send.disabled = true;
  const current = revision;
  try {
   const order = {
    id: orderId, fornecedor: supplier, entrega: form.elements.entrega.value || null,
    itens: lines, observacoes: form.elements.observacoes.value.trim(),
    solicitante: requester, prioridade: form.elements.prioridade.value,
    tipo_material: form.elements.tipo_material.value
   };
   const {error} = await client().rpc('inova_criar_pedido_com_orcamentos', {
    pedido: order, orcamentos: selectedQuotes, exclusivo: exclusiveDraft.checked, aprovar: approve
   });
   if (error) throw error;
   if (revision !== current) return;
   saving = false;
   await show(approve ? 'status' : 'orders');
  } catch {
   if (revision === current) setStatus('Não foi possível criar o pedido. Os dados continuam no formulário.');
  } finally { saving = submit.disabled = send.disabled = false; }
 };
 minForm.onsubmit = async event => {
  event.preventDefault();
  if (saving || screen !== 'stock') return;
  const values = [...stock.querySelectorAll('input')].filter(input => input.value !== '')
   .map(input => ({produto: input.dataset.product, minimo: input.valueAsNumber}));
  if (!values.length) return setStatus('Informe ao menos um mínimo. Use zero para desativar um alerta.');
  const button = minForm.querySelector('button');
  const current = revision;
  saving = button.disabled = true;
  try {
   const {error} = await client().from('inova_compras_minimos').upsert(values);
   if (error) throw error;
   if (revision === current) setStatus('Estoques mínimos salvos.');
  } catch {
   if (revision === current) setStatus('Não foi possível salvar os mínimos.');
  } finally { saving = button.disabled = false; }
 };
 return {open: () => show('orders'), reset() {
  revision++;
  quotes.reset();
  workflow.reset();
  draftQuotes.clear();
  orderId = null;
  find('[data-quotes]').replaceChildren();
  form.reset();
  items.replaceChildren();
  stock.replaceChildren();
  find('[data-orders]').replaceChildren();
  fillOptions('#inova-compra-fornecedores', []);
  fillOptions('#inova-compra-produtos', []);
  setStatus('');
 }};
}
