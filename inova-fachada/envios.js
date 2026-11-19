(() => {
 const panel = document.querySelector('#inova-blocos');
 const prices = {bloco_10: 7500, bloco_13: 8400, bloco_15: 9300, bloco_20: 10700,
  espacador_10: 0, espacador_13: 0, espacador_15: 0, espacador_20: 0};
 const items = Object.fromEntries([['bloco', 'Bloco'], ['espacador', 'Espaçador']].flatMap(([key, name]) =>
  [10, 13, 15, 20].map(size => [key + '_' + size, name + ' ' + size + ' cm'])
 ));
 const delivery = {propria: 'Própria', terceirizada: 'Terceirizada'};
 const statuses = {preparado: 'Preparado para entrega', entregue: 'Entregue'};
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
   <label>CEP da entrega<input name="cep" inputmode="numeric" maxlength="9" placeholder="00000-000" required></label>
   <label>Tipo de entrega<select name="tipo_entrega" required><option value="">Selecione</option>${options(delivery)}</select></label>
   <label data-endereco>Endereço da entrega<textarea name="endereco" maxlength="400" rows="2" placeholder="Rua, número, complemento, bairro, cidade e UF" required></textarea>
    <span data-cep-status role="status"></span>
   </label>
   <label>Data da entrega<input name="data_entrega" type="date" required></label>
   <label>Status<select name="status" required>${options(statuses)}</select></label>
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
 let autoAddress = '';

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
 fields.cep.addEventListener('input', async () => {
  const cep = numberOnly(fields.cep.value).slice(0, 8);
  fields.cep.value = mask(cep, '#####-###');
  fields.cep.setCustomValidity('');
  cepRequest?.abort();
  cepRequest = null;
  if (fields.endereco.value === autoAddress) fields.endereco.value = '';
  autoAddress = '';
  cepStatus.textContent = '';
  if (cep.length !== 8) return;
  const request = new AbortController();
  cepRequest = request;
  const previous = fields.endereco.value;
  const timeout = setTimeout(() => request.abort(), 7000);
  cepStatus.textContent = 'Consultando CEP…';
  try {
   const response = await fetch('https://viacep.com.br/ws/' + cep + '/json/', {signal: request.signal});
   if (!response.ok) throw Error();
   const result = await response.json();
   if (result.erro) throw Error();
   if (request !== cepRequest || request.signal.aborted) return;
   if (!result.logradouro) {
    cepStatus.textContent = 'CEP geral. Preencha o endereço completo manualmente.';
    return;
   }
   if (fields.endereco.value === previous) {
    autoAddress = [result.logradouro, result.bairro, [result.localidade, result.uf].filter(Boolean).join(' - ')].filter(Boolean).join(', ');
    fields.endereco.value = autoAddress;
   }
   cepStatus.textContent = 'Confira o endereço e acrescente o número e o complemento.';
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
 for (const input of [fields.cliente, fields.endereco]) input.addEventListener('input', () => input.setCustomValidity(''));

 async function load(nextPage = 0) {
  const request = ++listRequest;
  const offset = pageSize * nextPage;
  listStatus.textContent = 'Carregando envios…';
  buttons.forEach(button => { button.disabled = true; });
  try {
   const {data, error} = await window.itopAuthClient.from('inova_blocos_envios')
    .select('id,cliente,documento,cep,endereco,tipo_entrega,data_entrega,status,item,quantidade,valor_unitario_centavos,valor_total_centavos')
    .order('data_entrega', {ascending: false}).order('id', {ascending: false}).range(offset, offset + pageSize);
   if (error) throw error;
   if (request !== listRequest || dialog.hidden) return;
   page = nextPage;
   list.replaceChildren(...data.slice(0, pageSize).map(row => {
    const entry = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = row.cliente;
    entry.append(title);
    for (const line of [
     maskDocument(row.documento) + ' · ' + row.data_entrega.split('-').reverse().join('/') + ' · ' + delivery[row.tipo_entrega],
     row.endereco + ' · CEP ' + mask(row.cep, '#####-###'),
     items[row.item] + ' · ' + row.quantidade + ' × ' + money(row.valor_unitario_centavos) + ' = ' + money(row.valor_total_centavos)
    ]) {
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
    const statusMessage = document.createElement('span');
    statusMessage.setAttribute('role', 'status');
    let savedStatus = row.status;
    statusSelect.addEventListener('change', async () => {
     if (dialog.hidden) return;
     const next = statusSelect.value;
     statusSelect.disabled = true;
     statusMessage.textContent = 'Atualizando status…';
     try {
      const {error} = await window.itopAuthClient.from('inova_blocos_envios')
       .update({status: next}).eq('id', row.id).select('id').single();
      if (error) throw error;
      savedStatus = next;
      statusMessage.textContent = 'Status atualizado.';
     } catch {
      statusSelect.value = savedStatus;
      statusMessage.textContent = 'Não foi possível atualizar o status. Tente novamente.';
     } finally {
      statusSelect.disabled = false;
     }
    });
    statusLabel.append(statusSelect);
    entry.append(statusLabel, statusMessage);
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
  autoAddress = '';
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
  data.cliente = data.cliente.trim();
  data.documento = documentRaw(data.documento);
  data.cep = numberOnly(data.cep);
  data.endereco = data.endereco.trim();
  data.quantidade = Number(data.quantidade);
  data.valor_unitario_centavos = priceCents();
  for (const [field, valid, message] of [
   ['cliente', data.cliente, 'Informe o nome ou a razão social.'],
   ['documento', /^(?:[0-9]{11}|[A-Z0-9]{12}[0-9]{2})$/.test(data.documento), 'Informe um CPF de 11 dígitos ou um CNPJ de 14 caracteres.'],
   ['cep', data.cep.length === 8, 'Informe um CEP de 8 dígitos.'],
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
