(() => {
  'use strict';

  const units = {
    alfenas: ['Alfenas / MG', 'ITOP INTERNET LTDA', '11.767.198/0001-50', 'Praça Getúlio Vargas, 25, Loja Térreo — Centro'],
    machado: ['Machado / MG', 'ITOP TELECOM LTDA', '44.206.697/0001-27', 'Praça Antônio Carlos, 65 — Centro'],
    paraguacu: ['Paraguaçu / MG', 'TOP SERVICOS DE INTERNET LTDA', '40.188.910/0001-64', 'Rua Marcos Souza Dias'],
    bh: ['Belo Horizonte / MG', 'INTERNET TOP SERVICOS TELECOMUNICACAO E TV LTDA', '34.303.609/0001-51', 'Rua Erico Verissimo, 845 — São João Batista'],
    ribeirao: ['Ribeirão Preto / SP', 'ITOP INTERNET E SERVICOS LTDA', '10.964.954/0001-78', 'Avenida Monteiro Lobato, 1896']
  };
  const customerFields = [
    ['cliente_nome', 'Nome completo / Razão Social do cliente', 'text', 'required'],
    ['cliente_documento', 'CPF ou CNPJ', 'text', 'inputmode="numeric"'],
    ['cliente_telefone', 'Telefone', 'tel'],
    ['cliente_whatsapp', 'WhatsApp', 'tel'],
    ['cliente_email', 'E-mail', 'email'],
    ['cliente_endereco', 'Endereço', 'text'],
    ['cliente_numero', 'Número', 'text'],
    ['cliente_bairro', 'Bairro', 'text'],
    ['cliente_cidade', 'Cidade', 'text'],
    ['observacoes', 'Observações comerciais', 'textarea']
  ];
  const issueFields = [
    ['emissao_data', 'Data de emissão (horário de Brasília)', 'date', 'required readonly'],
    ['emissao_hora', 'Horário de emissão', 'time', 'required readonly'],
    ['validade', 'Validade da proposta', 'date', 'required'],
    ['id', 'Número do orçamento', 'text', 'readonly']
  ];
  const energyIds = ['conta', 'tarifa', 'categoria', 'consumo'];
  const fields = [...customerFields, ...issueFields, ['unidade', 'Unidade ITOP emissora'], ['retorno_em', 'Data e horário do retorno']];
  const field = ([key, label, type, attributes = '']) => {
    const id = 'uvi-budget-' + key;
    const control = type === 'textarea'
      ? '<textarea id="' + id + '" rows="3"></textarea>'
      : '<input id="' + id + '" type="' + type + '" ' + attributes + '>';
    return '<div class="field"><label for="' + id + '">' + label + '</label>' + control + '</div>';
  };

  function init() {
    if ($('uvi-budget-form')) return;
    const legacy = $('itop-budget-panel');
    const entry = $('itop-budget-open');
    if (!legacy || !entry) return;

    // Replace the old controls after their inline handlers have been installed.
    const openButton = entry.cloneNode(true);
    entry.replaceWith(openButton);
    const panel = legacy.cloneNode(false);
    legacy.replaceWith(panel);
    const packageModule = $('pacote');
    const retentionTab = document.createElement('button');
    retentionTab.type = 'button';
    retentionTab.className = 'nav-tab';
    retentionTab.dataset.module = 'retencao';
    retentionTab.setAttribute('aria-label', '15 Retenção');
    retentionTab.setAttribute('aria-controls', 'retencao');
    retentionTab.innerHTML = '<img alt="" class="itop-tab-art" src="capas/menu-bronze-retencao.webp"><span class="step-ball" aria-hidden="true">15</span><span class="itop-nav-label">Retenção</span>';
    document.querySelector('.itop-module-menu .nav-tabs').append(retentionTab);
    const retentionModule = document.createElement('div');
    retentionModule.id = 'retencao';
    retentionModule.className = 'module';
    retentionModule.innerHTML = '<section><h2>Retenção</h2><button type="button">Simulação Retenção Cliente</button></section>';
    const banner = document.createElement('img');
    banner.src = 'capas/retencao-topo.webp';
    banner.alt = 'Programa de fidelidade — Renove conosco';
    banner.width = 1024;
    banner.height = 214;
    banner.loading = 'lazy';
    banner.style.cssText = 'display:block;width:100%;height:auto;margin:0 0 12px;border-radius:12px';
    retentionModule.prepend(banner);
    const inova = $('inova-blocos');
    (inova || packageModule).after(retentionModule);

    const catalogSection = $('catalog').closest('section');
    catalogSection.id = 'uvi-budget-catalog';
    const catalogTitle = catalogSection.querySelector('h2');
    const originalCatalogTitle = catalogTitle.textContent;
    const currentPanel = document.createElement('section');
    currentPanel.hidden = true;
    currentPanel.innerHTML = `
      <h2>Plano atual</h2>
      <div class="field">
        <label for="itop-retencao-atual-produto">Plano de fibra ou serviço contratado</label>
        <select id="itop-retencao-atual-produto"><option value="">Selecione no catálogo</option></select>
      </div>
      <button type="button" disabled>Adicionar ao plano atual</button>
      <ul aria-label="Serviços do plano atual"></ul>`;
    catalogSection.before(currentPanel);
    const currentSelect = currentPanel.querySelector('select');
    const currentAdd = currentPanel.querySelector('button');
    const currentList = currentPanel.querySelector('ul');
    const currentOptions = [];
    let currentItems = [];
    const categories = Object.keys(catalogData);
    const orderedCategories = [
      'Fibra',
      ...categories.filter(category => category !== 'Fibra' && !category.startsWith('Combos')),
      ...categories.filter(category => category.startsWith('Combos'))
    ];
    for (const category of orderedCategories) {
      const group = document.createElement('optgroup');
      group.label = category;
      for (const [name] of catalogData[category]) {
        const option = new Option(name, String(currentOptions.length));
        group.append(option);
        currentOptions.push({category, name});
      }
      currentSelect.append(group);
    }

    function renderCurrentPlan() {
      currentList.replaceChildren();
      for (const [index, item] of currentItems.entries()) {
        const row = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = item.name + ' · ' + item.category + ' · Qtd. ';
        const quantity = document.createElement('input');
        quantity.type = 'number';
        quantity.min = '1';
        quantity.step = '1';
        quantity.value = item.q;
        quantity.style.width = '70px';
        quantity.setAttribute('aria-label', 'Quantidade de ' + item.name);
        quantity.addEventListener('change', () => {
          item.q = Math.max(1, Math.trunc(Number(quantity.value) || 1));
          quantity.value = item.q;
        });
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'Remover';
        remove.setAttribute('aria-label', 'Remover ' + item.name);
        remove.addEventListener('click', () => {
          currentItems.splice(index, 1);
          renderCurrentPlan();
          currentSelect.focus();
        });
        row.append(name, quantity, ' ', remove);
        currentList.append(row);
      }
    }
    currentSelect.addEventListener('change', () => { currentAdd.disabled = !currentSelect.value; });
    currentAdd.addEventListener('click', () => {
      if (currentSelect.value === '') return;
      const option = currentOptions[Number(currentSelect.value)];
      const match = currentItems.find(item => item.name === option.name && item.category === option.category);
      if (match) match.q += 1;
      else currentItems.push({...option, q: 1});
      currentSelect.value = '';
      currentAdd.disabled = true;
      renderCurrentPlan();
      currentSelect.focus();
    });

    const energySection = document.querySelector('#energia .energy-entry');
    const promotions = $('packagePromotion');
    const promotionSlot = document.createComment('Posição original das promoções');
    promotions.before(promotionSlot);
    const energySlot = document.createComment('Posição original da simulação de energia');
    energySection.before(energySlot);

    panel.innerHTML = `
      <div class="section-heading"><div><span class="eyebrow">U.V.I. · MÓDULO 16</span>
      <h2>Orçamento Comercial</h2></div><span class="section-tag">VENDA EM ESPERA</span></div>
      <form id="uvi-budget-form">
        <fieldset><legend>1. Dados do cliente</legend><div class="grid">${customerFields.map(field).join('')}</div></fieldset>
        <fieldset><legend>2. Data e horário</legend><div class="grid">${issueFields.map(field).join('')}</div></fieldset>
        <fieldset id="uvi-budget-unit-fieldset"><legend>3. Unidade ITOP emissora</legend>
          <div class="field"><label for="uvi-budget-unidade">Cidade da unidade</label>
            <select id="uvi-budget-unidade" required><option value="">Selecione a unidade</option>
            ${Object.entries(units).map(([key, unit]) => `<option value="${key}">${unit[0]}</option>`).join('')}</select>
          </div>
          <p id="uvi-budget-unit-info" aria-live="polite"></p>
        </fieldset>
      </form>`;
    const form = $('uvi-budget-form');
    const input = key => $('uvi-budget-' + key);
    const cepField = document.createElement('div');
    cepField.className = 'field';
    cepField.hidden = true;
    cepField.innerHTML = '<label for="uvi-budget-cliente_cep">CEP</label><input id="uvi-budget-cliente_cep" type="text" inputmode="numeric" autocomplete="postal-code" maxlength="9" aria-describedby="uvi-budget-cep-status"><small id="uvi-budget-cep-status" role="status"></small>';
    input('cliente_endereco').closest('.field').before(cepField);
    const cepInput = input('cliente_cep');
    const cepStatus = $('uvi-budget-cep-status');
    const addressKeys = {'cliente_endereco': 'logradouro', 'cliente_bairro': 'bairro', 'cliente_cidade': 'localidade'};
    const autoAddress = new Map();
    let cepRequest;

    function resetCep() {
      cepRequest?.abort();
      cepRequest = null;
      autoAddress.clear();
      cepStatus.textContent = '';
    }

    cepInput.addEventListener('input', async () => {
      resetAddressLookup();
      const cep = cepInput.value.replace(/\D/g, '').slice(0, 8);
      cepInput.value = cep.length > 5 ? cep.slice(0, 5) + '-' + cep.slice(5) : cep;
      if (cep.length !== 8) return;
      const request = new AbortController();
      cepRequest = request;
      const previous = Object.fromEntries(Object.keys(addressKeys).map(key => [key, input(key).value]));
      const timer = setTimeout(() => request.abort(), 7000);
      cepStatus.textContent = 'Consultando CEP…';
      try {
        const response = await fetch('https://viacep.com.br/ws/' + cep + '/json/', {signal: request.signal});
        if (!response.ok) throw Error();
        const data = await response.json();
        if (data.erro) throw Error();
        if (request !== cepRequest || request.signal.aborted) return;
        for (const [key, property] of Object.entries(addressKeys)) {
          if (!data[property] || input(key).value !== previous[key]) continue;
          input(key).value = data[property];
          autoAddress.set(key, data[property]);
        }
        cepStatus.textContent = data.logradouro ? 'Confira o endereço e informe o número.' : 'CEP geral da cidade. Digite o endereço livremente.';
      } catch {
        if (request === cepRequest) cepStatus.textContent = 'Consulta indisponível ou CEP não encontrado. Digite o endereço manualmente.';
      } finally {
        clearTimeout(timer);
      }
    });

    function resetAddressLookup() {
      for (const [key, value] of autoAddress) {
        if (input(key).value === value) input(key).value = '';
      }
      resetCep();
    }

    const footer = document.createElement('section');
    footer.id = 'uvi-budget-actions';
    footer.hidden = true;
    footer.innerHTML = `
      <h3>Emitir orçamento</h3><p>Baixe o PDF diretamente no computador. Salvar no sistema é opcional e permite recuperar o orçamento ou agendar um retorno.</p>
      ${field(['retorno_em', 'Data e horário do retorno', 'datetime-local'])}
      <div class="actions">
        <button id="itop-budget-pdf" type="button">Baixar PDF</button>
        <button id="itop-budget-save" class="secondary" type="button">Salvar no sistema (opcional)</button>
        <button id="itop-budget-schedule" type="button">Agendar retorno</button>
        <button id="itop-budget-exit" class="secondary" type="button">Voltar à U.V.I.</button>
      </div>
      <p id="itop-budget-status" role="status"></p>
      <h3>Recuperar e acompanhar orçamentos</h3>
      <button class="secondary" id="itop-budget-refresh" type="button">Atualizar orçamentos</button>
      <div class="itop-budget-history" id="itop-budget-history"></div>`;
    catalogSection.after(footer);
    const energyBox = document.createElement('details');
    energyBox.id = 'uvi-budget-energy';
    energyBox.innerHTML = '<summary>Simular economia com energia (opcional)</summary>';
    const status = message => { $('itop-budget-status').textContent = message; };
    const unitInfo = () => {
      const unit = units[input('unidade').value];
      $('uvi-budget-unit-info').textContent = unit ? unit.slice(1).join(' · ') : '';
    };
    const active = () => document.body.classList.contains('itop-budget-mode');
    const issueDate = new Intl.DateTimeFormat('sv-SE', {timeZone: 'America/Sao_Paulo'});
    const issueTime = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });
    const syncSalesPackage = syncPackage;
    let sales;
    let visit = 0;
    let historyRequest = 0;
    let operator;
    let budgetTest = false;
    let saving = false;
    let existingId = null;
    let returnModule = 'procedimentos';

    function setRow(row, values = {}) {
      row.sel.value = values.name || '';
      row.quantity.value = row.sel.value ? values.q : 0;
      row.savedPlan = values.savedPlan;
      row.savedPrice = values.savedPrice;
      row.sourceIndex = values.sourceIndex;
      if (row.checkbox) row.checkbox.checked = !!row.sel.value;
    }

    function restoreSales() {
      if (!sales) return;
      visit++;
      operator = null;
      document.body.classList.remove('itop-budget-mode');
      panel.hidden = footer.hidden = currentPanel.hidden = true;
      catalogTitle.textContent = originalCatalogTitle;
      resetCep();
      form.reset();
      input('retorno_em').value = '';
      status('');
      $('itop-budget-history').replaceChildren();
      energySlot.after(energySection);
      promotionSlot.after(promotions);
      energyBox.remove();
      for (let index = compactRows.length - 1; index >= 0; index--) {
        const row = compactRows[index];
        const snapshot = sales.rows.get(row);
        if (snapshot) setRow(row, snapshot);
        else {
          row.sel.closest('.compact-row').remove();
          compactRows.splice(index, 1);
        }
      }
      mobileLineCount = sales.mobileCount;
      fixedLineCount = sales.fixedCount;
      energyIds.forEach((id, index) => { $(id).value = sales.energy[index]; });
      sales = null;
      syncPackage = syncSalesPackage;
      recalc();
    }

    async function getOperator() {
      const client = window.itopAuthClient;
      if (!client) throw Error('Autenticação indisponível. Entre novamente.');
      const {data, error} = await client.auth.getUser();
      if (error || !data?.user) throw Error('Faça login para consultar ou salvar orçamentos.');
      const {data: profile, error: profileError} = await client.from('perfis')
        .select('nome,papel,ativo,status_aprovacao').eq('id', data.user.id).single();
      if (profileError || !profile?.ativo || profile.status_aprovacao !== 'aprovado') {
        throw Error('O orçamento exige uma conta aprovada.');
      }
      return {client, user: data.user, profile};
    }

    function renderRole() {
      const canEdit = ['administrador', 'coordenador', 'supervisor'].includes(operator?.profile.papel);
      input('emissao_data').readOnly = input('emissao_hora').readOnly = !canEdit;
    }

    function open(source = 'procedimentos') {
      if (active()) return;
      returnModule = source;
      const retention = source === 'retencao';
      cepField.hidden = !retention;
      $('uvi-budget-unit-fieldset').hidden = retention;
      input('unidade').required = !retention;
      currentPanel.hidden = !retention;
      catalogTitle.textContent = retention ? 'Novo plano' : originalCatalogTitle;
      currentItems = [];
      currentSelect.value = '';
      currentAdd.disabled = true;
      renderCurrentPlan();
      panel.querySelector('h2').textContent = retention ? 'Cliente Especial, Oferta Especial' : 'Orçamento Comercial';
      panel.querySelector('.eyebrow').textContent = retention ? 'RETENÇÃO · MÓDULO 15' : 'U.V.I. · MÓDULO 16';
      $('itop-budget-exit').textContent = retention ? 'Voltar à Retenção' : 'Voltar à U.V.I.';
      const token = ++visit;
      sales = {
        rows: new Map(compactRows.map(row => [row, {
          name: row.sel.value, q: row.quantity.value, savedPlan: row.savedPlan,
          savedPrice: row.savedPrice, sourceIndex: row.sourceIndex
        }])),
        mobileCount: mobileLineCount,
        fixedCount: fixedLineCount,
        energy: energyIds.map(id => $(id).value)
      };
      // This mode uses the same calculator without applying a sondagem recommendation.
      syncPackage = () => {};
      compactRows.forEach(row => setRow(row));
      energyIds.forEach(id => { $(id).value = id === 'categoria' ? '30' : ''; });
      energyBox.open = false;
      energyBox.append(energySection);
      footer.before(promotions, energyBox);
      document.body.classList.add('itop-budget-mode');
      document.querySelectorAll('.module').forEach(module => module.classList.toggle('active', module === packageModule));
      document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.toggle('active', retention && tab === retentionTab));
      panel.hidden = footer.hidden = false;
      resetCep();
      form.reset();
      const now = new Date();
      input('emissao_data').value = issueDate.format(now);
      input('emissao_hora').value = issueTime.format(now);
      existingId = null;
      budgetTest = !!$('survey-is-test')?.checked;
      input('id').value = crypto.randomUUID();
      input('validade').min = input('emissao_data').value;
      renderRole();
      unitInfo();
      recalc();
      document.querySelector('.itop-work-content')?.scrollTo(0, 0);
      window.scrollTo(0, 0);
      input('cliente_nome').focus({preventScroll: true});
      getOperator().then(value => {
        if (token !== visit) return;
        operator = value;
        renderRole();
        refresh();
      }).catch(error => { if (token === visit) status(error.message); });
    }

    function unitFromCity(city) {
      const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/\s*(?:[/-]\s*|\s+)(?:mg|sp)\s*$/, '').trim();
      const cityName = normalize(city);
      return Object.keys(units).find(key => normalize(units[key][0]) === cityName) || null;
    }

    function readDraft() {
      input('validade').min = input('emissao_data').value;
      input('cliente_nome').value = input('cliente_nome').value.trim();
      if (!form.reportValidity()) throw Error('Confira os campos obrigatórios do orçamento.');
      if (!input('emissao_data').value || !input('emissao_hora').value) throw Error('Informe a data e o horário de emissão.');
      const {items, total} = window.ITOPBudgetCalculator();
      const energyEntered = energyIds.some(id => id !== 'categoria' && $(id).value !== '');
      if (energyEntered && !energy.valid) {
        energyBox.open = true;
        $('conta').focus();
        throw Error('Complete a simulação de energia com os dados válidos da fatura ou limpe os campos.');
      }
      if (!items.length && !energy.valid) throw Error('Selecione ao menos um produto ou preencha a simulação de energia.');
      const data = Object.fromEntries(fields.map(([key]) => [key, input(key).value.trim() || null]));
      if (returnModule === 'retencao') data.unidade = unitFromCity(data.cliente_cidade);
      return {
        ...data,
        ...(returnModule === 'retencao' ? {cliente_cep: cepInput.value.length === 9 ? cepInput.value : null, plano_atual: currentItems.map(item => ({...item}))} : {}),
        consultor_nome: operator?.profile.nome || '',
        produtos: items,
        valor_mensal: Math.round(total * 100) / 100,
        retorno_em: data.retorno_em ? new Date(data.retorno_em).toISOString() : null,
        simulacao_energia: energy.valid ? Object.fromEntries(energyIds.map(id => [id, $(id).value])) : null,
        origem: 'uvi_modulo_16',
        status: 'venda_em_espera',
        is_test: budgetTest
      };
    }

    async function save(schedule = false) {
      if (saving) return;
      const token = visit;
      try {
        if (!operator) throw Error('Aguarde a validação do seu acesso.');
        if (schedule && !input('retorno_em').value) {
          input('retorno_em').focus();
          throw Error('Selecione a data e o horário para agendar o retorno.');
        }
        const draft = readDraft();
        saving = true;
        $('itop-budget-save').disabled = $('itop-budget-schedule').disabled = true;
        const {client, user} = operator;
        const table = client.from('itop_orcamentos_uvi');
        const query = existingId === draft.id
          ? table.update(draft).eq('id', draft.id)
          : table.insert({...draft, user_id: user.id});
        let result = await query.select('emissao_data,emissao_hora').single();
        if (result.error?.code === '23505' && existingId !== draft.id) {
          result = await client.from('itop_orcamentos_uvi').update(draft).eq('id', draft.id)
            .select('emissao_data,emissao_hora').single();
        }
        const {data, error} = result;
        if (error) throw error;
        if (token !== visit || draft.id !== input('id').value) return;
        existingId = draft.id;
        input('emissao_data').value = data.emissao_data;
        input('emissao_hora').value = data.emissao_hora.slice(0, 5);
        status(schedule ? 'Retorno agendado. O orçamento consta como venda em espera.' : 'Orçamento salvo como venda em espera.');
        await refresh();
      } catch (error) {
        if (token === visit) status('Não foi possível salvar. ' + error.message);
      } finally {
        saving = false;
        $('itop-budget-save').disabled = $('itop-budget-schedule').disabled = false;
      }
    }

    async function refresh() {
      if (!operator || !active()) return;
      const token = ++historyRequest;
      const opened = visit;
      const box = $('itop-budget-history');
      box.textContent = 'Consultando…';
      try {
        const {data, error} = await operator.client.from('itop_orcamentos_uvi')
          .select('id,cliente_nome,valor_mensal,retorno_em,created_at,is_test')
          .order('created_at', {ascending: false}).limit(100);
        if (error) throw error;
        if (token !== historyRequest || opened !== visit) return;
        box.replaceChildren();
        if (!data.length) box.textContent = 'Nenhum orçamento encontrado para sua conta.';
        for (const row of data) {
          const card = document.createElement('div');
          card.className = 'itop-budget-item';
          const info = document.createElement('div');
          const title = document.createElement('strong');
          const detail = document.createElement('small');
          const button = document.createElement('button');
          title.textContent = row.cliente_nome + ' · ' + money(row.valor_mensal);
          detail.textContent = (row.is_test ? 'TESTE · ' : '') + 'VENDA EM ESPERA · '
            + new Date(row.created_at).toLocaleDateString('pt-BR')
            + (row.retorno_em ? ' · Retorno: ' + new Date(row.retorno_em).toLocaleString('pt-BR') : '');
          button.type = 'button';
          button.textContent = 'Recuperar';
          button.onclick = () => recover(row.id);
          info.append(title, detail);
          card.append(info, button);
          box.append(card);
        }
      } catch (error) {
        if (token === historyRequest && opened === visit) box.textContent = 'Falha ao consultar. ' + error.message;
      }
    }

    let recoveryRequest = 0;
    function findProductRow(item) {
      const accepts = row => !row.sel.value && [...row.sel.options].some(option => option.value === item.name);
      const same = compactRows.find(row => row.label === item.category && accepts(row));
      if (same) return same;
      if (/^ITOP móvel/.test(item.category)) {
        return compactRows.find(row => row.label.startsWith('ITOP móvel') && accepts(row)) || addPackageMobileLine();
      }
      if (/^Telefone fixo/.test(item.category)) {
        return compactRows.find(row => row.label.startsWith('Telefone fixo') && accepts(row)) || addPackageFixedLine();
      }
      return compactRows.find(accepts);
    }

    async function recover(id) {
      if (saving || !operator) return;
      const token = ++recoveryRequest;
      const opened = visit;
      try {
        const {data: row, error} = await operator.client.from('itop_orcamentos_uvi').select('*').eq('id', id).single();
        if (error) throw error;
        if (opened !== visit || token !== recoveryRequest || saving) return;
        resetCep();
        cepInput.value = row.cliente_cep || '';
        for (const [key] of fields) input(key).value = row[key] ?? '';
        existingId = row.id;
        budgetTest = !!row.is_test;
        currentItems = Array.isArray(row.plano_atual) ? row.plano_atual : [];
        renderCurrentPlan();
        if (!row.unidade && !row.cliente_whatsapp) input('cliente_whatsapp').value = row.cliente_telefone || '';
        const created = new Date(row.created_at);
        input('emissao_data').value ||= issueDate.format(created);
        input('emissao_hora').value = row.emissao_hora?.slice(0, 5) || issueTime.format(created);
        if (row.retorno_em) {
          const date = new Date(row.retorno_em);
          input('retorno_em').value = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        }
        energyIds.forEach(key => { $(key).value = row.simulacao_energia?.[key] ?? (key === 'categoria' ? '30' : ''); });
        energyBox.open = !!row.simulacao_energia;
        unitInfo();
        compactRows.forEach(model => setRow(model));
        const missing = [];
        for (const item of row.produtos || []) {
          const model = findProductRow(item);
          if (!model || ![...model.sel.options].some(option => option.value === item.name)) missing.push(item.name);
          else setRow(model, item);
        }
        recalc();
        status(missing.length ? 'Produtos fora do catálogo atual: ' + missing.join(', ') + '. Revise antes de salvar.'
          : 'Orçamento recuperado. Revise os dados e valores atuais.');
        document.querySelector('.itop-work-content')?.scrollTo(0, 0);
        window.scrollTo(0, 0);
      } catch (error) {
        if (opened === visit && token === recoveryRequest) status('Falha ao recuperar. ' + error.message);
      }
    }

    async function loadRetentionLogo() {
      const response = await fetch('capas/logo-retencao-pdf.png');
      if (!response.ok) throw Error('Não foi possível carregar a marca ITOP.');
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    }

    async function pdf() {
      const button = $('itop-budget-pdf');
      try {
        if (!operator) throw Error('Aguarde a validação do seu acesso.');
        const draft = readDraft();
        if (!window.ITOPBudgetPDF) throw Error('Gerador de PDF indisponível. Recarregue a página.');
        button.disabled = true;
        const retention = returnModule === 'retencao';
        const token = visit;
        const logo = retention ? await loadRetentionLogo() : null;
        if (token !== visit) return;
        const result = window.ITOPBudgetPDF.create(draft, units[draft.unidade], {...energy}, retention ? {retention, logo} : {});
        await result.doc.save(result.name, {returnPromise: true});
        status('PDF gerado para download no computador. Não é necessário salvar o orçamento no sistema.');
      } catch (error) { status('Não foi possível gerar o PDF. ' + error.message); }
      finally { button.disabled = false; }
    }

    form.addEventListener('submit', event => event.preventDefault());
    form.addEventListener('input', event => event.stopPropagation());
    form.addEventListener('change', event => event.stopPropagation());
    input('unidade').addEventListener('change', unitInfo);
    input('emissao_data').addEventListener('change', () => { input('validade').min = input('emissao_data').value; });
    openButton.addEventListener('click', () => open());
    retentionTab.addEventListener('click', () => switchModule('retencao'));
    retentionModule.querySelector('button').addEventListener('click', () => open('retencao'));
    $('itop-budget-save').onclick = () => save();
    $('itop-budget-schedule').onclick = () => save(true);
    $('itop-budget-refresh').onclick = refresh;
    $('itop-budget-pdf').onclick = pdf;
    const navigate = switchModule;
    function exit() {
      restoreSales();
      navigate(returnModule);
    }
    $('itop-budget-exit').onclick = exit;
    switchModule = id => {
      if (active()) exit();
      return navigate(id);
    };
    window.addEventListener('itop:logged-out', () => { if (active()) exit(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();

