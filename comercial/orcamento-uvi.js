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
  const officialLogo = 'logo-itop-oficial.png';
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
    const procedures = document.createElement('details');
    procedures.style.cssText = 'margin:12px 0;padding:14px;background:#fff;border:1px solid #d27a2f;border-radius:12px';
    procedures.innerHTML = `
      <summary style="cursor:pointer;font-weight:700">Procedimentos de Retenção</summary>
      <div style="display:grid;gap:12px;margin-top:12px">
       ${[
         ['diretrizes-de-retencao', 'Diretrizes de Retenção'],
         ['fluxo-de-retencao', 'Fluxo de Retenção']
       ].map(([slug, title]) => `
        <a href="materiais/retencao/${slug}.pdf" target="_blank" rel="noopener"
         style="display:flex;align-items:center;gap:12px;color:#00134c;text-decoration:none">
         <img src="materiais/retencao/${slug}.webp" alt="" loading="lazy"
          style="width:clamp(96px,24%,160px);height:auto;border-radius:8px">
         <span><strong>${title}</strong><br>Abrir PDF</span>
        </a>`).join('')}
      </div>`;
    retentionModule.append(procedures);
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

    const partyTab = document.createElement('button');
    partyTab.type = 'button';
    partyTab.className = 'nav-tab';
    partyTab.dataset.module = 'confraternizacao';
    partyTab.setAttribute('aria-label', '16 Confraternização');
    partyTab.setAttribute('aria-controls', 'confraternizacao');
    partyTab.innerHTML = '<img alt="" class="itop-tab-art" src="capas/menu-bronze-confraternizacao.webp"><span class="step-ball" aria-hidden="true">16</span><span class="itop-nav-label">Confraternização</span><span class="comunica-badge" id="confraternizacaoBadge" hidden></span>';
    retentionTab.after(partyTab);
    const partyModule = document.createElement('div');
    partyModule.id = 'confraternizacao';
    partyModule.className = 'module';
    partyModule.innerHTML = `
      <div style="position:relative;width:100%;aspect-ratio:2048 / 417;overflow:hidden;border-radius:2.5% / 12%;margin-bottom:12px">
        <img src="capas/confraternizacao-topo.webp?v=20261121-banner-anexo" alt="Confraternização — O melhor da festa é esperar por ela" width="2048" height="684" style="position:absolute;top:-32.61%;left:0;width:100%;height:auto;max-width:none;display:block">
      </div>
      <section><h2>Confraternização de 10 anos da ITOP</h2>
      <p data-party-status role="status"></p>
      <div id="confraternizacaoLista" class="comunica-lista"></div></section>`;
    retentionModule.after(partyModule);
    partyTab.addEventListener('click', () => switchModule('confraternizacao'));
    const partyList = partyModule.querySelector('#confraternizacaoLista');
    const partyStatus = partyModule.querySelector('[data-party-status]');
    const partyBadge = partyTab.querySelector('#confraternizacaoBadge');
    const announceList = $('comunicaLista');
    if (announceList) {
      function syncPartyNews() {
        const notices = [...announceList.querySelectorAll('.comunica-item.itop-comunica-compact')].filter(card =>
          /confraterniza[cç][aã]o/i.test(card.querySelector('h3')?.textContent || '')
        );
        const unread = notices.filter(card => card.classList.contains('nao-lido')).length;
        partyBadge.hidden = unread === 0;
        partyBadge.textContent = unread > 99 ? '99+' : String(unread);
        partyTab.setAttribute('aria-label', '16 Confraternização' + (unread ? ' · ' + unread + ' aviso(s) não lido(s)' : ''));
        partyStatus.textContent = unread ? unread + ' aviso(s) não lido(s).' : notices.length ? '' : 'Nenhum aviso de confraternização disponível.';
        partyList.replaceChildren(...notices.map(notice => {
          const copy = notice.cloneNode(true);
          const buttons = notice.querySelectorAll('button');
          copy.querySelectorAll('button').forEach((button, index) => button.addEventListener('click', () => buttons[index].click()));
          return copy;
        }));
      }
      new MutationObserver(syncPartyNews).observe(announceList, {childList: true, subtree: true});
      syncPartyNews();
    }


    const catalogSection = $('catalog').closest('section');
    catalogSection.id = 'uvi-budget-catalog';
    const catalogTitle = catalogSection.querySelector('h2');
    const originalCatalogTitle = catalogTitle.textContent;
    const currentPanel = document.createElement('div');
    currentPanel.hidden = true;
    currentPanel.style.cssText = 'margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #d27a2f';
    currentPanel.innerHTML = `
      <h2>Plano atual do cliente</h2>
      <button type="button" aria-haspopup="dialog">Abrir planos e produtos</button>
      <div style="overflow-x:auto;margin-top:12px">
       <table aria-label="Serviços do plano atual" style="width:100%;min-width:520px;border-collapse:collapse">
        <thead><tr>
         <th scope="col" style="text-align:left;padding:8px">Produto</th>
         <th scope="col" style="width:18%;text-align:center">Quantidade</th>
         <th scope="col" style="width:18%;text-align:center">Valor unitário (R$)</th>
         <th scope="col" style="width:18%;text-align:center">Subtotal</th>
         <th scope="col" style="width:18%;text-align:center">Ação</th>
        </tr></thead>
        <tbody></tbody>
        <tfoot><tr><th scope="row" colspan="3" style="text-align:right;padding:8px">Total mensal do plano atual</th><td colspan="2" style="text-align:center;padding:8px"><strong data-current-total aria-live="polite"></strong></td></tr></tfoot>
       </table>
      </div>`;
    catalogTitle.before(currentPanel);
    const currentOpen = currentPanel.querySelector('button');
    const currentList = currentPanel.querySelector('tbody');
    const currentTotal = currentPanel.querySelector('[data-current-total]');
    const currentDialog = document.createElement('dialog');
    currentDialog.setAttribute('aria-label', 'Planos e produtos do cliente');
    currentDialog.style.cssText = 'box-sizing:border-box;width:min(680px,94vw);max-height:85dvh;padding:16px;border:2px solid #d27a2f;border-radius:12px;background:#fff';
    currentDialog.innerHTML = `
      <h2>Planos e produtos do cliente</h2>
      <div class="field">
        <label for="itop-retencao-atual-busca">Buscar plano ou produto</label>
        <input id="itop-retencao-atual-busca" type="search" autocomplete="off">
      </div>
      <div data-current-options style="max-height:45dvh;overflow-y:auto"></div>
      <p role="status"></p>
      <form method="dialog"><button type="submit">Concluir seleção</button></form>`;
    document.body.append(currentDialog);
    const search = currentDialog.querySelector('input');
    const optionsList = currentDialog.querySelector('[data-current-options]');
    const currentStatus = currentDialog.querySelector('[role=status]');
    let currentItems = [];
    const categories = Object.keys(catalogData);
    const orderedCategories = [
      'Fibra',
      ...categories.filter(category => category !== 'Fibra' && !category.startsWith('Combos')),
      ...categories.filter(category => category.startsWith('Combos'))
    ];
    const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const groups = [];
    for (const category of orderedCategories) {
      const group = document.createElement('div');
      const label = document.createElement('h3');
      label.textContent = category;
      group.append(label);
      const options = [];
      for (const [name, price] of catalogData[category]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = '+ ' + name + ' · ' + money(price);
        button.style.cssText = 'display:block;width:100%;text-align:left;margin:4px 0';
        button.addEventListener('click', () => {
          const match = currentItems.find(item => item.name === name && item.category === category);
          if (match) match.q += 1;
          else currentItems.push({name, category, q: 1, price});
          renderCurrentPlan();
          currentStatus.textContent = name + ' · ' + (match?.q || 1) + ' no plano atual.';
        });
        group.append(button);
        options.push({button, searchText: normalize(name + ' ' + category)});
      }
      optionsList.append(group);
      groups.push({group, options});
    }

    function filterCurrentPlans() {
      const term = normalize(search.value.trim());
      for (const {group, options} of groups) {
        for (const {button, searchText} of options) button.hidden = !searchText.includes(term);
        group.hidden = options.every(({button}) => button.hidden);
      }
    }
    search.addEventListener('input', filterCurrentPlans);
    currentOpen.addEventListener('click', () => {
      search.value = '';
      currentStatus.textContent = '';
      filterCurrentPlans();
      currentDialog.showModal();
      search.focus();
    });

    const lineCents = item => Math.round(item.price * 100) * item.q;
    function updateCurrentTotal() {
      currentTotal.textContent = money(currentItems.reduce((sum, item) => sum + lineCents(item), 0) / 100);
    }

    function renderCurrentPlan() {
      currentList.replaceChildren();
      for (const [index, item] of currentItems.entries()) {
        const row = currentList.insertRow();
        const product = row.insertCell();
        product.textContent = item.name + ' · ' + item.category;
        const quantityCell = row.insertCell();
        const priceCell = row.insertCell();
        const subtotal = row.insertCell();
        const action = row.insertCell();
        for (const cell of row.cells) {
          cell.style.cssText = 'padding:8px 5px;border-top:1px solid #e5e7eb;text-align:center;vertical-align:middle';
        }
        product.style.textAlign = 'left';
        function updateSubtotal() {
          subtotal.textContent = money(lineCents(item) / 100);
          updateCurrentTotal();
        }
        for (const [key, cell, minimum, step, label] of [
          ['q', quantityCell, 1, 1, 'Quantidade de '],
          ['price', priceCell, 0, 0.01, 'Valor unitário de ']
        ]) {
          const field = document.createElement('input');
          field.type = 'number';
          field.min = minimum;
          field.step = step;
          field.value = item[key];
          field.style.cssText = 'box-sizing:border-box;width:100%;max-width:96px;text-align:center';
          field.setAttribute('aria-label', label + item.name);
          field.addEventListener('input', () => {
            const next = field.valueAsNumber;
            if (!Number.isFinite(next) || next < minimum) return;
            item[key] = key === 'q' ? Math.trunc(next) : Math.round(next * 100) / 100;
            updateSubtotal();
          });
          field.addEventListener('change', () => { field.value = item[key]; });
          cell.append(field);
        }
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'Remover';
        remove.setAttribute('aria-label', 'Remover ' + item.name);
        remove.addEventListener('click', () => {
          currentItems.splice(index, 1);
          renderCurrentPlan();
          currentOpen.focus();
        });
        action.append(remove);
        subtotal.textContent = money(lineCents(item) / 100);
      }
      updateCurrentTotal();
    }

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
        <fieldset><legend>1. Dados do cliente</legend><div class="grid">${customerFields.map(field).join('')}${field(['retencao_operador', 'Nome do operador', 'text', 'readonly'])}${field(['codigo_workspace', 'Código Workspace', 'text'])}</div></fieldset>
        <fieldset id="uvi-budget-issue-fieldset"><legend>2. Data e horário</legend><div class="grid">${issueFields.map(field).join('')}</div></fieldset>
        <fieldset id="uvi-budget-unit-fieldset"><legend>3. Unidade ITOP emissora</legend>
          <div class="field"><label for="uvi-budget-unidade">Cidade da unidade</label>
            <select id="uvi-budget-unidade" required><option value="">Selecione a unidade</option>
            ${Object.entries(units).map(([key, unit]) => `<option value="${key}">${unit[0]}</option>`).join('')}</select>
          </div>
          <p id="uvi-budget-unit-info" aria-live="polite"></p>
        </fieldset>
      </form>`;
    const simulationBanner = banner.cloneNode();
    simulationBanner.hidden = true;
    panel.prepend(simulationBanner);
    const form = $('uvi-budget-form');
    const input = key => $('uvi-budget-' + key);
    const retentionOperator = input('retencao_operador');
    const retentionExtraFields = customerFields.map(([key]) => key)
      .filter(key => !['cliente_nome', 'cliente_whatsapp', 'cliente_documento'].includes(key));
    const validityFields = ['uvi-budget-issue-fieldset', 'uvi-budget-unit-fieldset'].map(id => $(id));

    const footer = document.createElement('section');
    footer.id = 'uvi-budget-actions';
    footer.hidden = true;
    footer.innerHTML = `
      <h3 id="itop-budget-action-title">Emitir orçamento</h3><p id="itop-budget-action-description"></p>
      ${field(['retorno_em', 'Data e horário do retorno', 'datetime-local'])}
      <div class="actions">
        <button id="itop-budget-pdf" type="button">Baixar PDF</button>
        <button id="itop-budget-save" class="secondary" type="button">Salvar no sistema (opcional)</button>
        <button id="itop-budget-schedule" type="button">Agendar retorno</button>
        <button id="itop-budget-exit" class="secondary" type="button">Voltar à U.V.I.</button>
      </div>
      <p id="itop-budget-status" role="status"></p>
      <div id="itop-budget-history-section"><h3>Recuperar e acompanhar orçamentos</h3>
      <button class="secondary" id="itop-budget-refresh" type="button">Atualizar orçamentos</button>
      <div class="itop-budget-history" id="itop-budget-history"></div></div>`;
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
      if (currentDialog.open) currentDialog.close();
      catalogTitle.textContent = originalCatalogTitle;
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
      for (const key of retentionExtraFields) {
        input(key).closest('.field').hidden = input(key).disabled = retention;
      }
      for (const fieldset of validityFields) fieldset.hidden = fieldset.disabled = retention;
      for (const control of [retentionOperator, input('codigo_workspace')]) {
        control.closest('.field').hidden = control.disabled = !retention;
      }
      form.querySelector('label[for="uvi-budget-cliente_documento"]').textContent = retention ? 'CPF' : 'CPF ou CNPJ';
      input('retorno_em').closest('.field').hidden = retention;
      panel.querySelector('.section-tag').hidden = retention;
      simulationBanner.hidden = !retention;
      currentPanel.hidden = !retention;
      for (const id of ['itop-budget-save', 'itop-budget-schedule', 'itop-budget-history-section']) $(id).hidden = retention;
      $('itop-budget-action-title').textContent = retention ? 'Emitir proposta de retenção' : 'Emitir orçamento';
      $('itop-budget-action-description').textContent = retention
        ? 'Baixe o PDF para guardar uma cópia no seu dispositivo.'
        : 'Baixe o PDF diretamente no computador. Salvar no sistema é opcional e permite recuperar o orçamento ou agendar um retorno.';
      catalogTitle.textContent = retention ? 'Novo plano' : originalCatalogTitle;
      currentItems = [];
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
        if (retention) retentionOperator.value = value.profile.nome || '';
        else refresh();
      }).catch(error => { if (token === visit) status(error.message); });
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
      return {
        ...data,
        ...(returnModule === 'retencao' ? {codigo_workspace: input('codigo_workspace').value.trim(), plano_atual: currentItems.map(item => ({...item}))} : {}),
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
      if (saving || returnModule === 'retencao') return;
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
      if (!operator || !active() || returnModule === 'retencao') return;
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
        for (const [key] of fields) input(key).value = row[key] ?? '';
        existingId = row.id;
        budgetTest = !!row.is_test;
        currentItems = Array.isArray(row.plano_atual) ? row.plano_atual.map(item => ({
          ...item,
          price: item.price ?? catalogData[item.category]?.find(([name]) => name === item.name)?.[1] ?? 0
        })) : [];
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

    async function loadOfficialLogo() {
      const response = await fetch(officialLogo);
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
        const logo = retention ? await loadOfficialLogo() : null;
        if (token !== visit) return;
        const result = window.ITOPBudgetPDF.create(draft, units[draft.unidade], {...energy}, retention ? {retention, logo} : {});
        await result.doc.save(result.name, {returnPromise: true});
        status(retention ? 'PDF de retenção gerado para download.' : 'PDF gerado para download no computador. Não é necessário salvar o orçamento no sistema.');
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

