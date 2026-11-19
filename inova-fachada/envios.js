(() => {
 const panel = document.querySelector('#inova-blocos');
 const prices = {bloco_10: 7500, bloco_13: 8400, bloco_15: 9300, bloco_20: 10700,
  espacador_10: 0, espacador_13: 0, espacador_15: 0, espacador_20: 0};
 const items = Object.fromEntries([['bloco', 'Bloco'], ['espacador', 'Espaçador']].flatMap(([key, name]) =>
  [10, 13, 15, 20].map(size => [key + '_' + size, name + ' ' + size + ' cm'])
 ));
 const delivery = {propria: 'Própria', terceirizada: 'Terceirizada'};
 const statuses = {preparado: 'Preparado para entrega', entregue: 'Entregue'};
 const surveys = {pendente: 'Pendente', confirmada: 'Confirmada'};
 const currency = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'});
 const money = cents => currency.format(cents / 100);
 const numberOnly = value => value.replace(/\D/g, '');
 const documentRaw = value => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
 const today = new Intl.DateTimeFormat('sv-SE', {timeZone: 'America/Sao_Paulo', dateStyle: 'short'});
 const options = entries => Object.entries(entries).map(([key, label]) => '<option value="' + key + '">' + label + '</option>').join('');
 const dialog = document.createElement('section');
 dialog.id = 'inova-envios';
 dialog.hidden = true;
 dialog.setAttribute('aria-labelledby', 'inova-envios-titulo');
 dialog.innerHTML = `
  <div class="inova-view-heading"><h2 id="inova-envios-titulo">Envios</h2></div>
  <form data-envio>
   <label>Nome ou razão social<input name="cliente" maxlength="150" required></label>
   <label>CPF ou CNPJ<input name="documento" maxlength="18" placeholder="CPF ou CNPJ" required></label>
   <label>E-mail<input name="email" type="email" maxlength="254" autocomplete="email" autocapitalize="none"></label>
   <label>CEP da entrega<input name="cep" inputmode="numeric" maxlength="9" placeholder="00000-000" required></label>
   <label>Logradouro<input name="logradouro" maxlength="150" placeholder="RUA, AVENIDA OU ESTRADA" required></label>
   <label>Número<input name="numero" maxlength="20" placeholder="NÚMERO OU S/N" required></label>
   <label data-endereco>Endereço<textarea name="endereco" maxlength="400" rows="2" placeholder="BAIRRO, CIDADE, UF E COMPLEMENTO" required></textarea></label>
   <p data-cep-status role="status"></p>
   <label>Tipo de entrega<select name="tipo_entrega" required><option value="">Selecione</option>${options(delivery)}</select></label>
   <label>Data da entrega<input name="data_entrega" type="date" required></label>
   <label>Status<select name="status" required>${options(statuses)}</select></label>
   <label>Pesquisa de satisfação<select name="pesquisa" required>${options(surveys)}</select></label>
   <label>Item<select name="item" required><option value="">Selecione</option>${options(items)}</select></label>
   <label>Quantidade<input name="quantidade" type="number" min="1" max="999999" step="1" required></label>
   <label>Valor unitário (R$)<input name="preco" inputmode="decimal" maxlength="9" readonly required></label>
   <p data-preco-ajuda hidden>Preço provisório do espaçador: R$ 0,00.</p>
   <p data-total>Total <output>R$ 0,00</output></p>
   <button type="submit">Salvar envio</button>
  </form>
  <p data-salvamento role="status"></p>
  <h3>Relação de envios</h3>
  <p data-consulta role="status"></p>
  <ul data-lista></ul>
  <footer><button type="button" data-pagina="-1" hidden>Anterior</button><button type="button" data-pagina="1" hidden>Próxima</button></footer>`;
 panel.append(dialog);
 const form = dialog.querySelector('[data-envio]');
 const fields = form.elements;
 const save = form.querySelector('button');
 const cepStatus = form.querySelector('[data-cep-status]');
 const saveStatus = dialog.querySelector('[data-salvamento]');
 const listStatus = dialog.querySelector('[data-consulta]');
 const list = dialog.querySelector('[data-lista]');
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
 for (const name of ['cliente', 'logradouro', 'numero', 'endereco', 'email']) {
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
  const previous = {logradouro: fields.logradouro.value, endereco: fields.endereco.value};
  const timeout = setTimeout(() => request.abort(), 7000);
  cepStatus.textContent = 'Consultando CEP…';
  try {
   const response = await fetch('https://viacep.com.br/ws/' + cep + '/json/', {signal: request.signal});
   if (!response.ok) throw Error();
   const result = await response.json();
   if (result.erro) throw Error();
   if (request !== cepRequest || request.signal.aborted) return;
   const location = [result.localidade, result.uf].filter(Boolean).join(' - ');
   for (const [name, value] of Object.entries({
    logradouro: result.logradouro,
    endereco: [result.bairro, location].filter(Boolean).join(', ')
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
 function priceCents() {
  const value = fields.preco.value.trim();
  return /^\d{1,6}(?:[,.]\d{1,2})?$/.test(value) ? Math.round(Number(value.replace(',', '.')) * 100) : null;
 }
 function updateTotal() {
  form.querySelector('output').textContent = money((priceCents() ?? 0) * (Number(fields.quantidade.value) || 0));
 }
 function updateItem() {
  const item = fields.item.value;
  fields.preco.value = Object.hasOwn(prices, item) ? (prices[item] / 100).toFixed(2).replace('.', ',') : '';
  fields.preco.setCustomValidity('');
  form.querySelector('[data-preco-ajuda]').hidden = !item.startsWith('espacador_');
  updateTotal();
 }
 fields.item.addEventListener('change', updateItem);
 fields.quantidade.addEventListener('input', updateTotal);

 async function load(nextPage = 0) {
  const request = ++listRequest;
  const offset = pageSize * nextPage;
  listStatus.textContent = 'Carregando envios…';
  buttons.forEach(button => { button.disabled = true; });
  try {
   const {data, error} = await window.itopAuthClient.from('inova_blocos_envios')
    .select('id,cliente,documento,email,cep,logradouro,numero,endereco,tipo_entrega,data_entrega,status,pesquisa_confirmada,item,quantidade,valor_unitario_centavos,valor_total_centavos')
    .order('data_entrega', {ascending: false}).order('id', {ascending: false}).range(offset, offset + pageSize);
   if (error) throw error;
   if (request !== listRequest || dialog.hidden) return;
   page = nextPage;
   list.replaceChildren(...data.slice(0, pageSize).map(row => {
    const entry = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = row.cliente.toUpperCase();
    const alert = document.createElement('strong');
    alert.setAttribute('role', 'status');
    entry.append(title, alert);
    for (const line of [
     maskDocument(row.documento) + ' · ' + row.data_entrega.split('-').reverse().join('/') + ' · ' + delivery[row.tipo_entrega],
     [row.logradouro, row.numero, row.endereco].filter(Boolean).join(', ').toUpperCase() + ' · CEP ' + mask(row.cep, '#####-###'),
     row.email,
     items[row.item] + ' · ' + row.quantidade + ' × ' + money(row.valor_unitario_centavos) + ' = ' + money(row.valor_total_centavos)
    ]) {
     if (!line) continue;
     const detail = document.createElement('span');
     detail.textContent = line;
     entry.append(detail);
    }
    const statusLabel = document.createElement('label');
    statusLabel.textContent = 'Status da entrega';
    const statusSelect = document.createElement('select');
    statusSelect.innerHTML = options(statuses);
    statusSelect.value = row.status;
    statusSelect.setAttribute('aria-label', 'Status da entrega de ' + row.cliente);
    statusLabel.append(statusSelect);
    const surveyLabel = document.createElement('label');
    surveyLabel.textContent = 'Pesquisa de satisfação';
    const surveySelect = document.createElement('select');
    surveySelect.innerHTML = options(surveys);
    surveySelect.setAttribute('aria-label', 'Pesquisa de satisfação de ' + row.cliente);
    surveyLabel.append(surveySelect);
    const statusMessage = document.createElement('span');
    statusMessage.setAttribute('role', 'status');
    let saved = {status: row.status, pesquisa_confirmada: row.pesquisa_confirmada};
    function renderTracking() {
     statusSelect.value = saved.status;
     surveySelect.value = saved.pesquisa_confirmada ? 'confirmada' : 'pendente';
     const pending = [];
     if (saved.status !== 'entregue') pending.push('entrega');
     if (!saved.pesquisa_confirmada) pending.push('pesquisa de satisfação');
     alert.textContent = pending.length ? '🔴 Pendente: ' + pending.join(' e ') : '';
     alert.hidden = !pending.length;
    }
    async function updateTracking(change) {
     if (dialog.hidden) return;
     statusSelect.disabled = surveySelect.disabled = true;
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
      statusSelect.disabled = surveySelect.disabled = false;
     }
    }
    statusSelect.addEventListener('change', () => updateTracking({status: statusSelect.value}));
    surveySelect.addEventListener('change', () => updateTracking({pesquisa_confirmada: surveySelect.value === 'confirmada'}));
    renderTracking();
    entry.append(statusLabel, surveyLabel, statusMessage);
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
  updateItem();
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
  delete data.preco;
  for (const name of ['cliente', 'logradouro', 'numero', 'endereco']) data[name] = data[name].trim().toUpperCase();
  data.email = data.email.trim().toLowerCase() || null;
  data.pesquisa_confirmada = data.pesquisa === 'confirmada';
  delete data.pesquisa;
  data.documento = documentRaw(data.documento);
  data.cep = numberOnly(data.cep);
  data.quantidade = Number(data.quantidade);
  data.valor_unitario_centavos = priceCents();
  for (const [field, valid, message] of [
   ['cliente', data.cliente, 'Informe o nome ou a razão social.'],
   ['documento', /^(?:[0-9]{11}|[A-Z0-9]{12}[0-9]{2})$/.test(data.documento), 'Informe um CPF de 11 dígitos ou um CNPJ de 14 caracteres.'],
   ['cep', data.cep.length === 8, 'Informe um CEP de 8 dígitos.'],
   ['logradouro', data.logradouro, 'Informe o logradouro.'],
   ['numero', data.numero, 'Informe o número ou S/N.'],
   ['endereco', data.endereco, 'Informe o endereço de entrega.'],
   ['preco', data.valor_unitario_centavos !== null, 'Informe um valor unitário válido.']
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
   if (!dialog.hidden) load();
  } catch {
   if (current === session) saveStatus.textContent = 'Não foi possível salvar o envio. Tente novamente.';
  } finally {
   save.disabled = false;
  }
 });
})();
