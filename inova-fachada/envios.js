(() => {
 const panel = document.querySelector('#inova-blocos');
 const prices = {bloco_10: 7500, bloco_13: 8400, bloco_15: 9300, bloco_20: 10700,
  espacador_10: 0, espacador_13: 0, espacador_15: 0, espacador_20: 0};
 const items = Object.fromEntries([['bloco', 'Bloco'], ['espacador', 'Espaçador']].flatMap(([key, name]) =>
  [10, 13, 15, 20].map(size => [key + '_' + size, name + ' ' + size + ' cm'])
 ));
 const shipmentTypes = {venda: 'Venda', bonificacao: 'Bonificação'};
 const delivery = {propria: 'Própria', terceirizada: 'Terceirizada'};
 const statuses = {preparado: 'A entregar', entregue: 'Entregue', avaliado: 'Avaliado'};
 const upperFields = ['cliente', 'vendedor', 'logradouro', 'numero', 'bairro', 'cidade', 'uf', 'complemento'];
 const trackingFields = status => ({
  status: status === 'preparado' ? 'preparado' : 'entregue',
  pesquisa_confirmada: status === 'avaliado'
 });
 const currency = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'});
 const money = cents => currency.format(cents / 100);
 const itemTotal = (gross, shipmentType) => {
  const discount = shipmentType === 'bonificacao' ? gross : 0;
  const net = gross - discount;
  return {net, text: discount ? money(gross) + ' − ' + money(discount) + ' = ' + money(net) : money(net)};
 };
 const numberOnly = value => value.replace(/\D/g, '');
 const documentRaw = value => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
 const today = new Intl.DateTimeFormat('sv-SE', {timeZone: 'America/Sao_Paulo', dateStyle: 'short'});
 const options = entries => Object.entries(entries).map(([key, label]) => '<option value="' + key + '">' + label + '</option>').join('');
 const dialog = document.createElement('section');
 dialog.id = 'inova-envios';
 dialog.hidden = true;
 dialog.setAttribute('aria-labelledby', 'inova-envios-titulo');
 dialog.innerHTML = `
  <style>
   html body main #inova-blocos > #inova-envios,
   html body main #inova-blocos #inova-envios section[data-itens] {
    border: none !important;
    box-shadow: none !important;
   }
   html body main #inova-blocos #inova-envios section[data-itens] {
    padding: 0 !important;
   }
   #inova-envios [data-busca-envios] {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 10px;
   }
   #inova-envios summary { cursor: pointer; }
   #inova-envios [data-detalhes] { display: grid; gap: 6px; margin-top: 8px; }
   #inova-envios [data-lista] > li { border-color: #69b942 !important; }
   #inova-envios [data-identificacao-envio] {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));
    gap: 12px;
   }
   html body #inova-blocos #inova-envios .inova-view-heading {
    background: #e6f7dc !important;
    border-bottom: 2px solid #69b942 !important;
    border-radius: 8px;
    padding: 10px 12px;
   }
   html body #inova-blocos #inova-envios :is(button, input, select, output) {
    border: 1px solid #45872a !important;
    color: #162610 !important;
    -webkit-text-fill-color: #162610 !important;
   }
   html body #inova-blocos #inova-envios button {
    background: #f2faed !important;
   }
   html body #inova-blocos #inova-envios :is(input, select, output) {
    background: #f2faed !important;
   }
   html body #inova-blocos #inova-envios output {
    padding: 4px 8px;
    border-radius: 6px;
   }
   html body #inova-blocos #inova-envios :is(input, select, button):focus-visible {
    outline: 2px solid #45872a !important;
    outline-offset: 2px;
   }
  </style>
  <div class="inova-view-heading"><h2 id="inova-envios-titulo">Envios</h2></div>
  <form data-envio>
   <div data-identificacao-envio>
    <label>Vendedor<input name="vendedor" maxlength="150"></label>
    <label>Número de pedido<input name="numero_pedido" maxlength="50"></label>
   </div>
   <label>Nome ou razão social<input name="cliente" maxlength="150"></label>
   <label>CPF ou CNPJ<input name="documento" maxlength="18"></label>
   <label>WhatsApp do cliente<input name="whatsapp" type="tel" autocomplete="tel" maxlength="25"></label>
   <label>E-mail<input name="email" type="email" maxlength="254" autocomplete="email" autocapitalize="none"></label>
   <label>CEP da entrega<input name="cep" inputmode="numeric" maxlength="9"></label>
   <label>Logradouro<input name="logradouro" maxlength="150"></label>
   <label>Número<input name="numero" maxlength="20"></label>
   <label>Bairro<input name="bairro" maxlength="100"></label>
   <label>Cidade<input name="cidade" maxlength="100"></label>
   <label>UF<input name="uf" maxlength="2" pattern="[A-Z]{2}"></label>
   <label>Complemento<input name="complemento" maxlength="100"></label>
   <p data-cep-status role="status"></p>
   <label>Tipo de entrega<select name="tipo_entrega"><option value="">Selecione</option>${options(delivery)}</select></label>
   <label>Data da entrega<input name="data_entrega" type="date"></label>
   <label>Status<select name="status">${options(statuses)}</select></label>
   <section data-itens aria-label="Itens do envio" style="grid-column: 1 / -1"></section>
   <button type="button" data-add-item>Adicionar linha</button>
   <p data-total>Total geral <output aria-live="polite">R$ 0,00</output></p>
   <button type="submit">Salvar envio</button>
  </form>
  <p data-salvamento role="status"></p>
  <h3>Relação de envios</h3>
  <form data-busca-envios>
   <label>Nome do cliente<input name="busca" type="search" maxlength="150"></label>
   <label>Status<select name="filtro"><option value="">Todos os status</option>${options(statuses)}</select></label>
   <button type="submit">Buscar</button>
  </form>
  <p data-consulta role="status"></p>
  <ul data-lista></ul>
  <footer><button type="button" data-pagina="-1" hidden>Anterior</button><button type="button" data-pagina="1" hidden>Próxima</button></footer>`;
 panel.append(dialog);
 const form = dialog.querySelector('[data-envio]');
 const fields = form.elements;
 const save = form.querySelector('button[type=submit]');
 const lineList = form.querySelector('[data-itens]');
 const addItem = form.querySelector('[data-add-item]');
 const grandTotal = form.querySelector('[data-total] output');
 const cepStatus = form.querySelector('[data-cep-status]');
 const saveStatus = dialog.querySelector('[data-salvamento]');
 const listStatus = dialog.querySelector('[data-consulta]');
 const list = dialog.querySelector('[data-lista]');
 const searchForm = dialog.querySelector('[data-busca-envios]');
 let search = '';
 let filter = '';
 searchForm.addEventListener('submit', event => {
  event.preventDefault();
  search = searchForm.elements.busca.value.trim();
  load();
 });
 searchForm.elements.filtro.addEventListener('change', event => {
  filter = event.target.value;
  search = searchForm.elements.busca.value.trim();
  load();
 });
 const buttons = [...dialog.querySelectorAll('[data-pagina]')];
 const pageSize = 25;
 let page = 0;
 let listRequest = 0;
 let session = 0;
 let cepRequest;
 const autoAddress = new Map();

 function mask(value, pattern) {
  let index = 0;
  return pattern.replace(/[^#]*#/g, part => index < value.length ? part.replace('#', value[index++]) : '');
 }
 function maskDocument(raw) {
  return mask(raw, raw.length > 11 || /[A-Z]/.test(raw) ? '##.###.###/####-##' : '###.###.###-##');
 }
 fields.documento.addEventListener('input', () => {
  fields.documento.value = maskDocument(documentRaw(fields.documento.value));
  fields.documento.setCustomValidity('');
 });
 for (const name of [...upperFields, 'email']) {
  const input = fields[name];
  input.addEventListener('input', () => {
   const convert = value => name === 'email' ? value.toLowerCase() : value.toUpperCase();
   const normalized = convert(input.value);
   if (normalized !== input.value) {
    const start = input.selectionStart === null ? null : convert(input.value.slice(0, input.selectionStart)).length;
    const end = input.selectionEnd === null ? null : convert(input.value.slice(0, input.selectionEnd)).length;
    input.value = normalized;
    if (start !== null && end !== null) input.setSelectionRange(start, end);
   }
   input.setCustomValidity('');
  });
 }
 fields.cep.addEventListener('input', async () => {
  const cep = numberOnly(fields.cep.value).slice(0, 8);
  fields.cep.value = mask(cep, '#####-###');
  fields.cep.setCustomValidity('');
  cepRequest?.abort();
  cepRequest = null;
  for (const [name, value] of autoAddress) {
   if (fields[name].value === value) fields[name].value = '';
  }
  autoAddress.clear();
  cepStatus.textContent = '';
  if (cep.length !== 8) return;
  const request = new AbortController();
  cepRequest = request;
  const previous = Object.fromEntries(
   ['logradouro', 'bairro', 'cidade', 'uf'].map(name => [name, fields[name].value])
  );
  const timeout = setTimeout(() => request.abort(), 7000);
  cepStatus.textContent = 'Consultando CEP…';
  try {
   const response = await fetch('https://viacep.com.br/ws/' + cep + '/json/', {signal: request.signal});
   if (!response.ok) throw Error();
   const result = await response.json();
   if (result.erro) throw Error();
   if (request !== cepRequest || request.signal.aborted) return;
   for (const [name, value] of Object.entries({
    logradouro: result.logradouro,
    bairro: result.bairro,
    cidade: result.localidade,
    uf: result.uf
   })) {
    if (!value || fields[name].value !== previous[name]) continue;
    fields[name].value = value.toUpperCase();
    autoAddress.set(name, fields[name].value);
    fields[name].setCustomValidity('');
   }
   cepStatus.textContent = result.logradouro ? 'Confira os dados e informe o número.' : 'CEP geral. Preencha o logradouro e o número manualmente.';
  } catch {
   if (request === cepRequest) cepStatus.textContent = 'CEP não encontrado ou consulta indisponível. Preencha o endereço manualmente.';
  } finally {
   clearTimeout(timeout);
  }
 });
 function updateTotal() {
  let total = 0;
  for (const row of lineList.children) {
   const price = prices[row.querySelector('[data-produto]').value];
   const quantity = row.querySelector('input[type=number]').valueAsNumber;
   const subtotal = (price ?? 0) * (Number.isInteger(quantity) && quantity > 0 ? quantity : 0);
   row.querySelector('[data-unitario]').value = price === undefined ? '' : money(price);
   const amount = itemTotal(subtotal, row.querySelector('[data-tipo-envio]').value);
   row.querySelector('output').value = amount.text;
   total += amount.net;
  }
  grandTotal.value = money(total);
  addItem.disabled = lineList.children.length >= 100;
 }
 function addLine(focus = false) {
  const row = document.createElement('div');
  row.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(105px,1fr));gap:8px;align-items:end;margin-bottom:8px';
  row.innerHTML = `
   <label>Tipo de envio<select data-tipo-envio>${options(shipmentTypes)}</select></label>
   <label>Item<select data-produto><option value="">Selecione</option>${options(items)}</select></label>
   <label>Quantidade<input type="number" min="1" max="999999" step="1"></label>
   <label>Valor unitário<input data-unitario readonly></label>
   <label>Total do item<output>R$ 0,00</output></label>
   ${focus ? '<button type="button" aria-label="Remover linha do envio">Remover</button>' : ''}`;
  row.querySelector('[data-tipo-envio]').addEventListener('change', updateTotal);
  row.querySelector('[data-produto]').addEventListener('change', updateTotal);
  row.querySelector('input[type=number]').addEventListener('input', updateTotal);
  row.querySelector('button')?.addEventListener('click', () => {
   row.remove();
   updateTotal();
   addItem.focus();
  });
  lineList.append(row);
  updateTotal();
  if (focus) row.querySelector('[data-tipo-envio]').focus();
 }
 addItem.addEventListener('click', () => addLine(true));
 addLine();

 async function load(nextPage = 0) {
  const request = ++listRequest;
  const offset = pageSize * nextPage;
  listStatus.textContent = 'Carregando envios…';
  buttons.forEach(button => { button.disabled = true; });
  try {
   let query = window.itopAuthClient.from('inova_blocos_envios')
    .select('id,cliente,vendedor,numero_pedido,documento,email,whatsapp,cep,logradouro,numero,endereco,bairro,cidade,uf,complemento,tipo_envio,tipo_entrega,data_entrega,status,pesquisa_confirmada,item,quantidade,valor_unitario_centavos,itens_adicionais')
    .order('criado_em', {ascending: false}).order('id', {ascending: false});
   if (search) query = query.ilike('cliente', '%' + search.replace(/[\\%_]/g, '\\$&') + '%');
   if (filter === 'preparado') query = query.eq('status', 'preparado');
   if (filter === 'entregue' || filter === 'avaliado') {
    query = query.eq('status', 'entregue').eq('pesquisa_confirmada', filter === 'avaliado');
   }
   const {data, error} = await query.range(offset, offset + pageSize);
   if (error) throw error;
   if (request !== listRequest || dialog.hidden) return;
   page = nextPage;
   list.replaceChildren(...data.slice(0, pageSize).map(row => {
    const entry = document.createElement('li');
    const disclosure = document.createElement('details');
    const summary = document.createElement('summary');
    const details = document.createElement('div');
    details.dataset.detalhes = '';
    const client = row.cliente?.toUpperCase() || 'Cliente não informado';
    disclosure.append(summary, details);
    entry.append(disclosure);
    const alert = document.createElement('strong');
    alert.setAttribute('role', 'status');
    details.append(alert);
    const orderItems = [row, ...row.itens_adicionais].filter(item => item.item || item.quantidade);
    const amounts = orderItems.map(item => itemTotal((item.quantidade ?? 0) * item.valor_unitario_centavos, item.tipo_envio ?? row.tipo_envio));
    const total = amounts.reduce((sum, amount) => sum + amount.net, 0);
    for (const line of [
     [row.documento && maskDocument(row.documento), row.data_entrega?.split('-').reverse().join('/'),
      delivery[row.tipo_entrega]].filter(Boolean).join(' · '),
     [[row.logradouro, row.numero, ...(
      row.bairro || row.cidade || row.uf || row.complemento
       ? [row.bairro, row.cidade, row.uf, row.complemento] : [row.endereco]
     )].filter(Boolean).join(', ').toUpperCase(), row.cep && 'CEP ' + mask(row.cep, '#####-###')].filter(Boolean).join(' · '),
     row.email,
     row.whatsapp && 'WhatsApp: ' + row.whatsapp,
     row.numero_pedido && 'Número de pedido: ' + row.numero_pedido,
     row.vendedor && 'Vendedor: ' + row.vendedor,
     ...orderItems.map((item, index) => shipmentTypes[item.tipo_envio ?? row.tipo_envio] + ' · ' + (items[item.item] || 'Produto não informado') + ' · ' + (item.quantidade ?? 'Quantidade não informada') + ' × '
      + money(item.valor_unitario_centavos) + ' = ' + amounts[index].text),
     'Total geral: ' + money(total)
    ]) {
     if (!line) continue;
     const detail = document.createElement('span');
     detail.textContent = line;
     details.append(detail);
    }
    const statusLabel = document.createElement('label');
    statusLabel.textContent = 'Status da entrega';
    const statusSelect = document.createElement('select');
    statusSelect.innerHTML = options(statuses);
    statusSelect.value = row.status;
    statusSelect.setAttribute('aria-label', 'Status da entrega de ' + client);
    statusLabel.append(statusSelect);
    const statusMessage = document.createElement('span');
    statusMessage.setAttribute('role', 'status');
    let saved = {status: row.status, pesquisa_confirmada: row.pesquisa_confirmada};
    function renderTracking() {
     const evaluated = saved.status === 'entregue' && saved.pesquisa_confirmada;
     statusSelect.value = evaluated ? 'avaliado' : saved.status;
     alert.textContent = evaluated ? '' : saved.status === 'entregue'
      ? '🔴 Pendente: pesquisa de satisfação' : '🔴 Pendente: entrega e pesquisa de satisfação';
     alert.hidden = evaluated;
     summary.textContent = client + ' · ' + (evaluated ? '🟢 ' : '🔴 ') + statuses[statusSelect.value];
    }
    async function updateTracking(change) {
     if (dialog.hidden) return;
     statusSelect.disabled = true;
     statusMessage.textContent = 'Salvando acompanhamento…';
     try {
      const {data, error} = await window.itopAuthClient.from('inova_blocos_envios')
       .update(change).eq('id', row.id).select('status,pesquisa_confirmada').single();
      if (error) throw error;
      saved = data;
      statusMessage.textContent = 'Acompanhamento atualizado.';
     } catch {
      statusMessage.textContent = 'Não foi possível atualizar. Tente novamente.';
     } finally {
      renderTracking();
      statusSelect.disabled = false;
     }
    }
    statusSelect.addEventListener('change', () => updateTracking(trackingFields(statusSelect.value)));
    renderTracking();
    details.append(statusLabel, statusMessage);
    return entry;
   }));
   listStatus.textContent = data.length ? '' : 'Nenhum envio cadastrado.';
   buttons[0].hidden = page === 0;
   buttons[1].hidden = data.length <= pageSize;
  } catch {
   if (request === listRequest && !dialog.hidden) listStatus.textContent = 'Não foi possível consultar os envios. Selecione Envios novamente para tentar.';
  } finally {
   if (request === listRequest) buttons.forEach(button => { button.disabled = false; });
  }
 }
 buttons.forEach(button => button.addEventListener('click', () => load(page + Number(button.dataset.pagina))));
 dialog.addEventListener('inova:abriu', () => {
  if (!fields.data_entrega.value) fields.data_entrega.value = today.format();
  list.replaceChildren();
  buttons.forEach(button => { button.hidden = true; });
  load();
 });
 function resetForm() {
  cepRequest?.abort();
  cepRequest = null;
  autoAddress.clear();
  form.reset();
  for (const input of form.querySelectorAll('input, textarea')) input.setCustomValidity('');
  fields.data_entrega.value = today.format();
  cepStatus.textContent = '';
  lineList.replaceChildren();
  addLine();
 }
 dialog.addEventListener('inova:saiu', () => {
  session++;
  listRequest++;
  dialog.hidden = true;
  resetForm();
  list.replaceChildren();
  saveStatus.textContent = listStatus.textContent = '';
 });

 form.addEventListener('submit', async event => {
  event.preventDefault();
  if (save.disabled || dialog.hidden) return;
  const data = Object.fromEntries(new FormData(form));
  for (const name of upperFields) data[name] = data[name].trim().toUpperCase();
  data.endereco = [data.bairro, data.cidade, data.uf, data.complemento].filter(Boolean).join(', ');
  for (const name of [...upperFields, 'endereco', 'data_entrega', 'tipo_entrega']) data[name] ||= null;
  const whatsapp = numberOnly(data.whatsapp);
  data.whatsapp = whatsapp ? (data.whatsapp.trim().startsWith('+') ? '+' : '') + whatsapp : null;
  data.numero_pedido = data.numero_pedido.trim() || null;
  data.email = data.email.trim().toLowerCase() || null;
  Object.assign(data, trackingFields(data.status));
  data.documento = documentRaw(data.documento) || null;
  data.cep = numberOnly(data.cep) || null;
  const [firstItem, ...additionalItems] = Array.from(lineList.children, row => {
   const item = row.querySelector('[data-produto]').value;
   return {
    item,
    tipo_envio: row.querySelector('[data-tipo-envio]').value,
    quantidade: row.querySelector('input[type=number]').valueAsNumber || null,
    valor_unitario_centavos: prices[item]
   };
  }).filter(row => row.item || row.quantidade).map(row => ({
   ...row, item: row.item || null, valor_unitario_centavos: row.valor_unitario_centavos ?? null
  }));
  Object.assign(data, firstItem, {itens_adicionais: additionalItems});
  for (const [field, valid, message] of [
   ['documento', !data.documento || /^(?:[0-9]{11}|[A-Z0-9]{12}[0-9]{2})$/.test(data.documento), 'Informe um CPF de 11 dígitos ou um CNPJ de 14 caracteres.'],
   ['cep', !data.cep || data.cep.length === 8, 'Informe um CEP de 8 dígitos.'],
   ['uf', !data.uf || /^[A-Z]{2}$/.test(data.uf), 'Informe a UF com duas letras.']
  ]) {
   if (valid) continue;
   fields[field].setCustomValidity(message);
   fields[field].reportValidity();
   return;
  }
  const current = session;
  save.disabled = true;
  saveStatus.textContent = 'Salvando envio…';
  try {
   const {error} = await window.itopAuthClient.from('inova_blocos_envios').insert(data);
   if (error) throw error;
   if (current !== session) return;
   resetForm();
   saveStatus.textContent = 'Envio cadastrado.';
   searchForm.reset();
   search = filter = '';
   if (!dialog.hidden) load();
  } catch {
   if (current === session) saveStatus.textContent = 'Não foi possível salvar o envio. Tente novamente.';
  } finally {
   save.disabled = false;
  }
 });
})();
