(() => {
 const blockSizes = [10, 13, 15, 20];
 const money = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'});
 const brl = cents => money.format(cents / 100);
 const digits = value => value.replace(/\D/g, '');
 const number = value => Number(String(value).trim().replace(',', '.'));
 const cents = value => Math.round(number(value) * 100);
 const sizes = blockSizes.map(size => '<option value="' + size + '">' + size + ' cm</option>').join('');
 const logoUrl = 'inova-fachada/marca.webp';
 const panel = document.querySelector('#inova-blocos');
 const form = document.createElement('form');
 form.id = 'inova-proposta';
 form.hidden = true;
 form.innerHTML = `
  <div class="inova-proposta-banner">
   <img src="${logoUrl}" alt="Inova Blocos">
   <h2>Controle de Venda e Entregas</h2>
  </div>
  <button type="submit">Baixar PDF</button>
  <p role="status" class="inova-pdf-status"></p>
  <fieldset><legend>1. Dados do pedido</legend>
   <div class="inova-proposta-grid inova-proposta-cliente">
    <label>Data da venda<input type="date" name="dataVenda" required></label><label>Nome ou razão social<input name="cliente" maxlength="150" required></label>
    <label>CPF ou CNPJ<input name="documento" inputmode="numeric" maxlength="18" title="CPF: 000.000.000-00. CNPJ: 00.000.000/0000-00." required></label>
    <label>Telefone de contato<input name="telefone" type="tel" maxlength="15" required></label>
    <label>CEP<input name="cep" inputmode="numeric" maxlength="9" required></label>
    <label>Logradouro<input name="logradouro" maxlength="150" required></label>
    <label>Número<input name="numero" maxlength="20" required></label>
    <label>Complemento<input name="complemento" maxlength="100"></label>
    <label>Bairro<input name="bairro" maxlength="100"></label>
    <label>Cidade<input name="cidade" maxlength="100" required></label>
    <label>UF<input name="uf" maxlength="2" pattern="[A-Za-z]{2}" required></label>
   </div>
   <p class="inova-cep-status" role="status">O endereço pode ser preenchido manualmente.</p>
  </fieldset>
  <fieldset><legend>Condições comerciais</legend>
   <div class="inova-proposta-grid">
    <label>Pagamento<select name="pagamento" required><option value="">Selecione</option><option>Boleto</option><option>Pix</option><option>Cartão</option></select></label>
    <label>Data de pagamento<input name="dataPagamento" type="date"></label>
    <label>Entrega<select name="entrega"><option>A definir</option><option value="data">Definir data</option></select></label>
    <label data-inova-data hidden>Data de entrega<input name="dataEntrega" type="date" disabled></label>
    <label>Responsável<select name="responsavel" required><option value="">Selecione</option><option>Mário Caputo</option><option>Felipe Vilela</option></select></label>
   </div>
  </fieldset>
  <fieldset><legend>Itens da proposta</legend>
   <div style="overflow-x:auto">
    <table aria-label="Itens da proposta" style="width:100%;min-width:710px">
     <thead><tr>
      <th scope="col">Bloco</th><th scope="col">Quant. blocos</th><th scope="col">Quant. espaç.</th>
      <th scope="col">Preço</th><th scope="col">Desconto</th><th scope="col">Unitário</th>
      <th scope="col">Total</th><th scope="col">Ação</th>
     </tr></thead>
     <tbody class="inova-proposta-itens"></tbody>
    </table>
   </div>
   <button type="button" data-inova-add>Adicionar linha</button>
   <p class="inova-proposta-total">Total da proposta <output>R$ 0,00</output></p>
  </fieldset>
  <fieldset><legend>2. Controle de entregas</legend>
   <p data-pedido-atual>Selecione uma venda para consultar o histórico.</p>
   <div data-historico></div>
   <p data-retorno role="status"></p>
  </fieldset>
  <fieldset><legend>Vendas cadastradas</legend>
   <label>Cliente ou número do pedido<input type="search" data-busca></label>
   <button type="button" data-buscar>Buscar</button>
   <ul data-vendas></ul>
   <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
    <div><button type="button" data-anterior>Anterior</button>
    <button type="button" data-proxima>Próxima</button></div>
    <button type="button" data-salvar>Salvar venda</button>
   </div>
   <p role="status" data-status-salvar></p>
   <p data-status-lista role="status"></p>
  </fieldset>`;
 panel.firstElementChild.after(form);
 const fields = form.elements;
 const items = form.querySelector('.inova-proposta-itens');
 const cepStatus = form.querySelector('.inova-cep-status');
 const pdfStatus = form.querySelector('.inova-pdf-status');
 const pdfButton = form.querySelector('[type="submit"]');
 const totalOutput = form.querySelector('.inova-proposta-total output');
 let cepRequest;
 const automaticAddress = new Map();
 let session = 0;

 function mask(input, getPattern) {
  input.addEventListener('input', () => {
   const raw = digits(input.value);
   let index = 0;
   input.value = getPattern(raw).replace(/[^#]*#/g, part => index < raw.length ? part.replace('#', raw[index++]) : '');
   input.setCustomValidity('');
  });
 }
 mask(fields.documento, raw => raw.length > 11 ? '##.###.###/####-##' : '###.###.###-##');
 mask(fields.telefone, raw => raw.length > 10 ? '(##) #####-####' : '(##) ####-####');
 mask(fields.cep, () => '#####-###');
 fields.uf.addEventListener('input', () => { fields.uf.value = fields.uf.value.toUpperCase(); });
 fields.cep.addEventListener('input', () => {
  cepRequest?.abort();
  for (const [name, value] of automaticAddress) {
   if (fields[name].value === value) fields[name].value = '';
  }
  automaticAddress.clear();
  cepStatus.textContent = 'O endereço pode ser preenchido manualmente.';
  if (digits(fields.cep.value).length === 8) void lookupCep();
 });
 async function lookupCep() {
  const cep = digits(fields.cep.value);
  const request = new AbortController();
  cepRequest = request;
  const timeout = setTimeout(() => request.abort(), 7000);
  const names = {logradouro: 'logradouro', bairro: 'bairro', cidade: 'localidade', uf: 'uf'};
  const snapshot = Object.fromEntries(Object.keys(names).map(name => [name, fields[name].value]));
  cepStatus.textContent = 'Consultando CEP…';
  try {
   const response = await fetch('https://viacep.com.br/ws/' + cep + '/json/', {signal: request.signal});
   if (!response.ok) throw Error();
   const data = await response.json();
   if (request.signal.aborted || request !== cepRequest) return;
   if (data.erro) throw Error();
   for (const [field, key] of Object.entries(names)) {
    if (fields[field].value === snapshot[field] && data[key]) {
     fields[field].value = data[key];
     automaticAddress.set(field, data[key]);
    }
   }
   cepStatus.textContent = data.logradouro ? 'Endereço consultado. Confira e informe o número.' : 'CEP geral. Preencha o logradouro e o bairro manualmente.';
  } catch {
   if (request === cepRequest && cep === digits(fields.cep.value)) cepStatus.textContent = 'Consulta indisponível ou CEP não encontrado. Preencha o endereço manualmente.';
  } finally {
   clearTimeout(timeout);
  }
 }
 function syncDelivery() {
  const active = fields.entrega.value === 'data';
  fields.dataEntrega.closest('label').hidden = !active;
  fields.dataEntrega.disabled = !active;
  fields.dataEntrega.required = active;
 }
 fields.entrega.addEventListener('change', syncDelivery);

 function itemData(row) {
  const get = name => row.querySelector('[data-field="' + name + '"]');
  const size = get('size').value;
  const quantity = number(get('quantity').value);
  const spacers = Number.isInteger(quantity) && quantity > 0 ? quantity * 4 : 0;
  const priceInput = get('price');
  const price = cents(priceInput.value);
  const validPrice = /^\d+(?:[.,]\d{1,2})?$/.test(priceInput.value.trim());
  priceInput.setCustomValidity(!priceInput.value || validPrice ? '' : 'Informe o preço unitário com até duas casas decimais.');
  const discountInput = get('discount');
  const discount = cents(discountInput.value);
  const validDiscount = /^(?:\d+(?:[.,]\d{0,2})?)?$/.test(discountInput.value.trim()) && discount <= price;
  discountInput.setCustomValidity(validDiscount ? '' : 'Informe um desconto unitário entre zero e o preço informado, com até duas casas decimais.');
  const net = validPrice && validDiscount ? price - discount : 0;
  return {size, quantity, spacers, price, discount, net, total: net * quantity};
 }
 function refreshItems() {
  let total = 0;
  [...items.children].forEach(row => {
   const item = itemData(row);
   row.querySelector('[data-remove]').disabled = items.children.length === 1;
   row.querySelector('[data-output="spacers"]').textContent = item.spacers;
   for (const key of ['net', 'total']) row.querySelector('[data-output="' + key + '"]').textContent = brl(item[key]);
   total += item.total;
  });
  totalOutput.textContent = brl(total);
 }
 function addLine(focus = false) {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><select aria-label="Bloco" data-field="size" required><option value="">Selecione</option>${sizes}</select></td>
    <td><input aria-label="Quantidade de blocos" data-field="quantity" type="number" min="1" max="999999" step="1" value="1" required></td>
    <td><output aria-label="Quantidade de espaçadores" data-output="spacers"></output></td>
    <td><input aria-label="Preço" data-field="price" inputmode="decimal" maxlength="9" required></td>
    <td><input aria-label="Desconto" data-field="discount" inputmode="decimal" maxlength="8" value="0,00"></td>
    <td style="white-space:nowrap"><output aria-label="Preço unitário líquido" data-output="net"></output></td>
    <td style="white-space:nowrap"><output aria-label="Total da linha" data-output="total"></output></td>
    <td><button type="button" data-remove aria-label="Remover linha">Remover</button></td>`;
  items.append(row);
  refreshItems();
  if (focus) row.querySelector('select').focus();
 }
 function resetProposal() {
  session += 1;
  const request = cepRequest;
  cepRequest = null;
  request?.abort();
  form.reset();
  fields.dataVenda.value = fields.dataVenda.max = hoje();
  automaticAddress.clear();
  for (const input of [fields.documento, fields.telefone, fields.cep]) input.setCustomValidity('');
  cepStatus.textContent = 'O endereço pode ser preenchido manualmente.';
  pdfStatus.textContent = '';
  pdfButton.disabled = false;
  items.replaceChildren();
  addLine();
  syncDelivery();
  form.hidden = true;
 }
 const editedItemFields = new WeakSet();
 items.addEventListener('focusin', ({target}) => {
  if (!target.matches('input[data-field]') || editedItemFields.has(target)) return;
  if (target.value === target.defaultValue) target.value = '';
 });
 items.addEventListener('focusout', ({target}) => {
  if (!target.matches('input[data-field]') || target.value !== '') return;
  target.value = target.defaultValue;
  editedItemFields.delete(target);
  refreshItems();
 });
 items.addEventListener('input', ({target}) => {
  if (target.matches('input[data-field]')) editedItemFields.add(target);
  refreshItems();
 });
 items.addEventListener('change', refreshItems);
 items.addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (!button || items.children.length === 1) return;
  button.closest('tr').remove();
  refreshItems();
 });
 form.querySelector('[data-inova-add]').addEventListener('click', () => addLine(true));
 window.addEventListener('itop:logged-out', resetProposal);
 window.addEventListener('itop:open-inova-proposta', () => {
  if (panel.hidden || !panel.classList.contains('active')) return;
  form.hidden = false;
  fields.dataVenda.max = hoje();
  void listar();
  form.scrollIntoView({block: 'start'});
  fields.cliente.focus({preventScroll: true});
 });

 const find = key => form.querySelector('[data-' + key + ']');
 const history = find('historico');
 const notice = find('retorno');
 const heading = find('pedido-atual');
 const client = () => window.itopAuthClient;
 const salesTable = () => client().from('inova_vendas');
 const deliveryTable = () => client().from('inova_entregas');
 const files = () => client().storage.from('inova-comprovantes');
 let page = 0;
 let listRequest = 0;
 let detailRequest = 0;
 let selectedSale = null;
 function hoje() {
  return new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo'}).format(new Date());
 }
 const brDate = value => value.split('-').reverse().join('/');
 function node(tag, text) {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
 }
 function button(text, fn) {
  const el = node('button', text);
  el.type = 'button';
  el.onclick = fn;
  return el;
 }
 function label(text, control) {
  const el = node('label', text + ' ');
  el.append(control);
  return el;
 }
 function must(result) {
  if (result.error) throw result.error;
  return result.data;
 }
 function stats(sale) {
  const rows = sale.inova_entregas;
  const totals = sale.itens.map((item, i) => {
   const sent = rows.filter(row => row.item === i).reduce((sum, row) => sum + row.quantidade, 0);
   return {sent, balance:item.quantidade - sent};
  });
  const sent = totals.reduce((sum, item) => sum + item.sent, 0);
  const balance = totals.reduce((sum, item) => sum + item.balance, 0);
  const missing = rows.filter(row => !row.comprovante).length;
  const alert = [balance ? 'Entrega pendente' : '', !sale.pesquisa_em ? 'Pesquisa de satisfação pendente' : '',
   missing ? 'Comprovantes pendentes: ' + missing : ''].filter(Boolean).join(' · ');
  return {totals,sent,balance,alert,status:balance ? (sent ? 'Entrega parcial' : 'A entregar') : (sale.pesquisa_em ? 'Avaliado' : 'Entregue')};
 }
 async function listar(target = page) {
  const request = ++listRequest;
  const prev = find('anterior');
  const next = find('proxima');
  prev.disabled = next.disabled = true;
  const status = find('status-lista');
  status.textContent = 'Carregando vendas…';
  try {
   const search = find('busca').value.trim();
   let query = salesTable().select('id,numero,cliente,data_venda,itens,pesquisa_em,inova_entregas(item,quantidade,comprovante)')
    .is('arquivada_em',null).order('data_venda',{ascending:false}).order('numero',{ascending:false});
   if (/^\d+$/.test(search)) query = query.eq('numero', search);
   else if (search) query = query.ilike('cliente','%' + search.replace(/[\\%_]/g, '\\$&') + '%');
   const rows = must(await query.range(target * 20, target * 20 + 20));
   if (request !== listRequest) return;
   page = target;
   find('vendas').replaceChildren(...rows.slice(0,20).map(sale => {
    const info = stats(sale);
    const li = node('li','');
    li.append(button((info.alert ? '🔴 ' : '') + 'Pedido ' + sale.numero + ' · ' + sale.cliente + ' · ' +
     brDate(sale.data_venda) + ' · ' + info.status + ' · ' + info.sent + ' entregues · ' + info.balance + ' a entregar',
     () => abrir(sale.id,true)));
    if (info.alert) li.append(node('p',info.alert));
    return li;
   }));
   prev.disabled = page === 0;
   next.disabled = rows.length <= 20;
   status.textContent = rows.length ? 'Página ' + (page + 1) : 'Nenhuma venda encontrada.';
  } catch {
   if (request === listRequest) status.textContent = 'Não foi possível carregar as vendas. Use Buscar para tentar novamente.';
  }
 }
 find('buscar').onclick = () => listar(0);
 find('busca').onkeydown = event => { if(event.key === 'Enter') {event.preventDefault(); void listar(0);} };
 find('anterior').onclick = () => listar(page - 1);
 find('proxima').onclick = () => listar(page + 1);
 window.addEventListener('itop:logged-out', () => {
  ++listRequest;
  ++detailRequest;
  selectedSale = null;
  page = 0;
  find('busca').value = '';
  heading.textContent = 'Selecione uma venda para consultar o histórico.';
  for (const part of [history,notice,find('status-salvar'),find('vendas'),find('status-lista')]) part.replaceChildren();
  find('salvar').disabled = false;
 });
 find('salvar').onclick = async event => {
  refreshItems();
  if (!form.reportValidity()) return;
  const current = session;
  const control = event.currentTarget;
  control.disabled = true;
  find('status-salvar').textContent = 'Salvando venda…';
  try {
   const dados = Object.fromEntries(new FormData(form));
   const produtos = [...items.children].flatMap((row,i) => {
    const item = itemData(row);
    const name = 'Item ' + (i+1) + ' · ';
    const products = [{nome:name+'Bloco de '+item.size+' cm',quantidade:item.quantity}];
    if (item.spacers) products.push({nome:name+'Espaçador de '+item.size+' cm',quantidade:item.spacers});
    return products;
   });
   const sale = must(await salesTable().insert({data_venda:dados.dataVenda,cliente:dados.cliente.trim(),dados,itens:produtos})
    .select('id,numero').single());
   if (current !== session) return;
   find('status-salvar').textContent = 'Venda nº ' + sale.numero + ' cadastrada.';
   find('busca').value = '';
   await Promise.all([listar(0),abrir(sale.id)]);
  } catch {
   if (current === session) find('status-salvar').textContent = 'Não foi possível salvar a venda. Confira os dados e tente novamente.';
  } finally {
   if (current === session) control.disabled = false;
  }
 };
 async function abrir(id, scroll = false) {
  const request = ++detailRequest;
  selectedSale = id;
  history.replaceChildren();
  notice.textContent = 'Carregando histórico…';
  try {
   const sale = must(await salesTable().select('*,inova_entregas(*)').eq('id',id).is('arquivada_em',null).single());
   if (request !== detailRequest) return;
   renderHistory(sale);
   notice.textContent = '';
   if (scroll) heading.scrollIntoView({block:'nearest'});
  } catch {
   if (request === detailRequest) notice.textContent = 'Não foi possível abrir a venda.';
  }
 }
 async function changeSale(id, control, operation) {
  const request = detailRequest;
  control.disabled = true;
  notice.textContent = 'Salvando…';
  try {
   await operation();
   if (request === detailRequest && selectedSale === id) await Promise.all([abrir(id),listar()]);
  } catch (error) {
   if (request === detailRequest) notice.textContent = error.message || 'Não foi possível salvar.';
  } finally {
   control.disabled = false;
  }
 }
 async function apagarVenda(sale, control) {
  if (!window.confirm('Retirar o pedido ' + sale.numero + ' — ' + sale.cliente + ' da lista de vendas?')) return;
  const request = detailRequest;
  const current = session;
  control.disabled = true;
  notice.textContent = 'Removendo venda…';
  try {
   must(await salesTable().update({arquivada_em:new Date().toISOString()})
    .eq('id',sale.id).is('arquivada_em',null).select('id').single());
   if (current !== session) return;
   if (request === detailRequest) {
    ++detailRequest;
    selectedSale = null;
    history.replaceChildren();
    heading.textContent = 'Selecione uma venda para consultar o histórico.';
    notice.textContent = 'Venda retirada da lista.';
   }
   await listar(0);
  } catch {
   if (request === detailRequest) notice.textContent = 'Não foi possível retirar a venda. Atualize a lista e tente novamente.';
  } finally {
   control.disabled = false;
  }
 }
 function renderHistory(sale) {
  history.append(button('Apagar venda', event => apagarVenda(sale,event.currentTarget)));
  const info = stats(sale);
  heading.textContent = 'Pedido ' + sale.numero + ' · ' + sale.cliente + ' · ' + brDate(sale.data_venda) + ' · ' + info.status
   + (info.alert ? ' · 🔴 ' + info.alert : '');
  const {box:amounts, body:summary} = productTable('Produtos do pedido', ['Produto','Pedido','Entregue','Saldo']);
  sale.itens.forEach((item,i) => {
   const row = summary.insertRow();
   for (const value of [item.nome,item.quantidade,info.totals[i].sent,info.totals[i].balance]) row.insertCell().textContent = value;
  });
  const address = ['logradouro','numero','complemento','bairro','cidade','uf','cep'].map(key => sale.dados[key]).filter(Boolean).join(', ');
  history.append(node('p',[sale.dados.telefone,address].filter(Boolean).join(' · ')),amounts,node('h3','Histórico de saídas'));
  if (sale.dados.dataPagamento) {
   history.insertBefore(node('p','Data de pagamento: ' + brDate(sale.dados.dataPagamento)),amounts);
  }
  const rows = sale.inova_entregas.slice().sort((a,b) => a.data_saida.localeCompare(b.data_saida) || a.id.localeCompare(b.id));
  if (!rows.length) history.append(node('p','Nenhuma saída registrada.'));
  const groups = new Map();
  for (const row of rows) {
   let group = groups.get(row.saida_id);
   if (!group) {
    group = productTable('Saída de ' + brDate(row.data_saida), ['Produto','Entregue','Comprovante']);
    groups.set(row.saida_id,group);
    history.append(group.box);
   }
   if (!group.body.rows.length) group.box.prepend(node('h4','Saída de ' + brDate(row.data_saida)));
   const line = group.body.insertRow();
   line.insertCell().textContent = sale.itens[row.item].nome;
   line.insertCell().textContent = row.quantidade;
   const part = line.insertCell();
   if (row.comprovante) {
    part.append(button('Baixar comprovante',async () => {
     try {
      const blob = must(await files().download(row.id));
      const extension = {'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[blob.type] || 'pdf';
      const url = URL.createObjectURL(blob);
      const link = node('a','');
      link.href = url;
      link.download = 'Comprovante-' + sale.numero + '-' + row.data_saida + '.' + extension;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url),30000);
     } catch { notice.textContent = 'Não foi possível baixar o comprovante.'; }
    }));
   } else {
    const file = node('input','');
    file.type = 'file';
    file.accept = 'application/pdf,image/jpeg,image/png,image/webp';
    part.append(label('Comprovante assinado',file),button('Anexar',event => {
     const upload = file.files[0];
     if (!upload || upload.size > 10485760 || !file.accept.split(',').includes(upload.type)) {
      notice.textContent = 'Selecione foto JPG, PNG, WebP ou PDF de até 10 MB.';
      return;
     }
     return changeSale(sale.id,event.currentTarget,async () => {
      must(await files().upload(row.id,upload,{upsert:true,contentType:upload.type}));
      must(await deliveryTable().update({comprovante:true}).eq('id',row.id).select('id').single());
     });
    }));
   }
  }
  if (!info.balance) {
   history.append(sale.pesquisa_em ? node('p','Pesquisa confirmada em ' + brDate(sale.pesquisa_em))
    : button('Confirmar pesquisa de satisfação', event => changeSale(sale.id,event.currentTarget, async () => {
     must(await salesTable().update({pesquisa_em:hoje()}).eq('id',sale.id).select('id').single());
    })));
   return;
  }
  history.insertBefore(deliveryEditor(sale,info), history.querySelector('h3'));
 }

 function productTable(title, columns) {
  const box = node('div','');
  box.style.overflowX = 'auto';
  const table = node('table','');
  table.style.cssText = 'width:100%;min-width:420px;margin:8px 0';
  table.setAttribute('aria-label',title);
  const head = table.createTHead().insertRow();
  columns.forEach(name => {
   const cell = node('th',name);
   cell.scope = 'col';
   head.append(cell);
  });
  const body = table.createTBody();
  box.append(table);
  return {box,body};
 }

 function deliveryEditor(sale,info) {
  const delivery = node('fieldset','');
  const date = node('input','');
  date.type = 'date';
  date.setAttribute('form','inova-controles-entrega');
  date.min = sale.data_venda;
  date.max = date.value = hoje();
  const {box,body} = productTable('Produtos desta saída',['Produto','Saldo atual','Quantidade nesta saída','Saldo após saída']);
  const inputs = [];
  sale.itens.forEach((item,index) => {
   const balance = info.totals[index].balance;
   if (!balance) return;
   const row = body.insertRow();
   row.insertCell().textContent = item.nome;
   row.insertCell().textContent = balance;
   const qty = node('input','');
   qty.type = 'number';
   qty.setAttribute('form','inova-controles-entrega');
   qty.setAttribute('aria-label','Quantidade nesta saída: ' + item.nome);
   qty.min = '0';
   qty.max = balance;
   qty.step = '1';
   qty.placeholder = '0';
   row.insertCell().append(qty);
   const remaining = row.insertCell();
   remaining.textContent = balance;
   qty.oninput = () => { remaining.textContent = qty.validity.valid ? balance - Number(qty.value) : 'Confira a quantidade'; };
   inputs.push({index,qty});
  });
  const saidaId = crypto.randomUUID();
  delivery.append(node('legend','Registrar entrega'),label('Data da saída',date),box,
   button('Confirmar entrega',event => {
    if (!date.value || !date.reportValidity() || inputs.some(({qty}) => !qty.reportValidity())) {
     notice.textContent = 'Confira a data e as quantidades desta saída.';
     return;
    }
    const rows = inputs.filter(({qty}) => Number(qty.value) > 0).map(({index,qty}) => ({
     venda_id:sale.id, saida_id:saidaId, item:index, data_saida:date.value, quantidade:Number(qty.value)
    }));
    if (!rows.length) {
     notice.textContent = 'Informe a quantidade de pelo menos um produto.';
     return;
    }
    return changeSale(sale.id,event.currentTarget,async () => {
     const existing = must(await deliveryTable().select('id').eq('venda_id',sale.id).eq('saida_id',saidaId).limit(1));
     if (!existing.length) must(await deliveryTable().insert(rows));
    });
   }));
  return delivery;
 }
 resetProposal();

 function renderPdf(data, lines, image) {
  const doc = new window.jspdf.jsPDF({unit: 'mm', format: 'a4'});
  const date = new Date().toLocaleDateString('pt-BR');
  const dateLabel = value => value.split('-').reverse().join('/');
  let y;
  function header() {
   doc.setFillColor(34, 37, 38);
   doc.rect(0, 0, 210, 37, 'F');
   if (image) doc.addImage(image, 'PNG', 12, 5, 53, 19, undefined, 'FAST');
   doc.setTextColor(255);
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(16);
   doc.text('PROPOSTA COMERCIAL', 198, 14, {align: 'right'});
   doc.setFontSize(9);
   doc.text('Emissão: ' + date, 198, 21, {align: 'right'});
   doc.setFont('helvetica', 'normal');
   doc.text('INOVA BLOCOS SUL DE MINAS ARTEFATO DE CIMENTO LTDA', 12, 28);
   doc.text('CNPJ 63.802.378/0001-29  |  comercial@inovablocos.com  |  (35) 3070-0929', 12, 33);
   doc.setFillColor(116, 221, 35);
   doc.rect(0, 37, 210, 1.4, 'F');
   doc.setTextColor(27, 30, 30);
   y = 46;
  }
  function paragraph(value) {
   doc.setFontSize(10);
   const text = doc.splitTextToSize(value, 186);
   doc.text(text, 12, y);
   y += text.length * 5;
  }
  const columns = [14, 73, 111, 139, 166, 196];
  function tableHeader() {
   doc.setFillColor(47, 53, 50);
   doc.rect(12, y, 186, 8, 'F');
   doc.setTextColor(255);
   doc.setFont('helvetica', 'bold');
   ['Produto', 'Qtd.', 'Preço lista', 'Desconto un.', 'Líquido un.', 'Total'].forEach((label, i) => {
    doc.text(label, columns[i], y + 5.2, {align: i < 2 ? 'left' : 'right'});
   });
   doc.setFont('helvetica', 'normal');
   doc.setTextColor(27, 30, 30);
   y += 8;
  }
  header();
  paragraph('CLIENTE  |  ' + data.cliente);
  paragraph('CPF/CNPJ: ' + data.documento + '  |  Telefone: ' + data.telefone);
  paragraph('Endereço: ' + [data.logradouro, data.numero, data.complemento, data.bairro, data.cidade + '/' + data.uf, 'CEP ' + data.cep].filter(Boolean).join(', '));
  y += 3;
  const paymentDate = data.dataPagamento ? '  |  Data de pagamento: ' + dateLabel(data.dataPagamento) : '';
  paragraph('Pagamento: ' + data.pagamento + paymentDate + '  |  Entrega: ' + (data.entrega === 'data' ? dateLabel(data.dataEntrega) : 'A definir'));
  paragraph('Responsável: ' + data.responsavel);
  y += 4;
  paragraph('Itens da proposta');
  tableHeader();
  let grandTotal = 0;
  for (const [index, item] of lines.entries()) {
   const height = item.spacers ? 13 : 8;
   if (y + height > 277) { doc.addPage(); header(); tableHeader(); }
   doc.setFillColor(index % 2 === 0 ? 240 : 248);
   doc.rect(12, y, 186, height, 'F');
   const values = ['Bloco de ' + item.size + ' cm', String(item.quantity), brl(item.price), brl(item.discount), brl(item.net), brl(item.total)];
   values.forEach((value, i) => doc.text(value, columns[i], y + 5.2, {align: i < 2 ? 'left' : 'right'}));
   if (item.spacers) doc.text('Espaçadores ' + item.size + ' cm: ' + item.spacers, 14, y + 10);
   y += height;
   grandTotal += item.total;
  }
  if (y + 54 > 277) { doc.addPage(); header(); }
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL  ' + brl(grandTotal), 198, y + 4, {align: 'right'});
  y += 16;
  paragraph('Aceite da proposta');
  doc.setFont('helvetica', 'normal');
  paragraph('Declaro estar de acordo com os itens, valores e condições desta proposta.');
  y += 10;
  doc.line(12, y, 96, y);
  doc.line(114, y, 198, y);
  doc.text('Contratante', 12, y + 5);
  doc.text('Representante comercial', 114, y + 5);
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
   doc.setPage(page);
   doc.setFontSize(8);
   doc.text('Inova Blocos  |  Proposta comercial', 12, 287);
   doc.text(page + '/' + pages, 198, 287, {align: 'right'});
  }
  doc.save('Proposta-Inova-Blocos.pdf');
 }
 form.addEventListener('submit', async event => {
  event.preventDefault();
  const lengths = {documento: [11, 14], telefone: [10, 11], cep: [8]};
  for (const [name, allowed] of Object.entries(lengths)) {
   fields[name].setCustomValidity(allowed.includes(digits(fields[name].value).length) ? '' : 'Confira a quantidade de dígitos.');
  }
  if (!form.reportValidity()) return;
  const currentSession = session;
  const data = Object.fromEntries(new FormData(form));
  const lines = [...items.children].map(itemData);
  pdfButton.disabled = true;
  pdfStatus.textContent = 'Preparando PDF…';
  try {
   if (!window.jspdf?.jsPDF) throw Error();
   const logo = form.querySelector('.inova-proposta-banner img');
   await logo.decode().catch(() => {});
   if (currentSession !== session) return;
   let image;
   if (logo.naturalWidth) {
    const canvas = document.createElement('canvas');
    canvas.width = logo.naturalWidth;
    canvas.height = logo.naturalHeight;
    canvas.getContext('2d').drawImage(logo, 0, 0);
    image = canvas.toDataURL('image/png');
   }
   renderPdf(data, lines, image);
   pdfStatus.textContent = 'PDF gerado.';
  } catch {
   if (currentSession === session) pdfStatus.textContent = 'Não foi possível gerar o PDF. Tente novamente.';
  } finally {
   if (currentSession === session) pdfButton.disabled = false;
  }
 });
})();
