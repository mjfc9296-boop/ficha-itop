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
    const legacy = $('itop-budget-panel');
    const entry = $('itop-budget-open');
    if (!legacy || !entry) return;

    // Replace the old controls after their inline handlers have been installed.
    const openButton = entry.cloneNode(true);
    entry.replaceWith(openButton);
    const panel = legacy.cloneNode(false);
    legacy.replaceWith(panel);
    const packageModule = $('pacote');
    const catalogSection = $('catalog').closest('section');
    catalogSection.id = 'uvi-budget-catalog';
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
        <fieldset><legend>3. Unidade ITOP emissora</legend>
          <div class="field"><label for="uvi-budget-unidade">Cidade da unidade</label>
            <select id="uvi-budget-unidade" required><option value="">Selecione a unidade</option>
            ${Object.entries(units).map(([key, unit]) => `<option value="${key}">${unit[0]}</option>`).join('')}</select>
          </div>
          <p id="uvi-budget-unit-info" aria-live="polite"></p>
        </fieldset>
      </form>`;
    const form = $('uvi-budget-form');
    const input = key => $('uvi-budget-' + key);
    const footer = document.createElement('section');
    footer.id = 'uvi-budget-actions';
    footer.hidden = true;
    footer.innerHTML = `
      <h3>Retorno e emissão</h3>
      ${field(['retorno_em', 'Data e horário do retorno', 'datetime-local'])}
      <div class="actions">
        <button id="itop-budget-save" type="button">Salvar orçamento</button>
        <button id="itop-budget-pdf" class="secondary" type="button">Baixar PDF</button>
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
      panel.hidden = footer.hidden = true;
      form.reset();
      input('retorno_em').value = '';
      status('');
      $('itop-budget-history').replaceChildren();
      energySlot.after(energySection);
      promotionSlot.after(promotions);
      energyBox.remove();
      compactRows.forEach(row => setRow(row, sales.rows.get(row)));
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

    function open() {
      if (active()) return;
      const token = ++visit;
      sales = {
        rows: new Map(compactRows.map(row => [row, {
          name: row.sel.value, q: row.quantity.value, savedPlan: row.savedPlan,
          savedPrice: row.savedPrice, sourceIndex: row.sourceIndex
        }])),
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
      document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
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
        refresh();
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
        for (const [key] of fields) input(key).value = row[key] ?? '';
        existingId = row.id;
        budgetTest = !!row.is_test;
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

    function pdf() {
      try {
        if (!operator) throw Error('Aguarde a validação do seu acesso.');
        const draft = readDraft();
        const unit = units[draft.unidade];
        const safe = value => escapeHTML(String(value ?? ''));
        const date = value => value.split('-').reverse().join('/');
        const lines = draft.produtos.map(item => `<tr><td>${safe(item.name)}</td><td>${safe(item.category)}</td>
          <td>${item.q}</td><td>${money(item.price)}</td><td>${money(item.price * item.q)}</td></tr>`).join('');
        const customer = customerFields.filter(([key]) => draft[key]).map(([key, label]) =>
          `<div><b>${label}</b> ${safe(draft[key])}</div>`).join('');
        const energyReport = energy.valid ? `<h2>Simulação de energia</h2><p>Conta Cemig atual: ${money(energy.bill)}<br>
          Saldo Cemig: ${money(energy.residual)} · ITOP NETZ: ${money(energy.newval)}<br>
          Total estimado das duas contas: ${money(energy.combined)}<br>
          Economia mensal estimada: ${money(energy.saving)}</p>
          ${draft.produtos.length ? itopPackageImpact(draft.valor_mensal, energy.saving, energy.valid, true) : ''}` : '';
        const popup = window.open('', '_blank');
        if (!popup) throw Error('Libere pop-ups para imprimir ou salvar em PDF.');
        popup.opener = null;
        popup.document.open();
        popup.document.write(`<!doctype html><html lang="pt-BR"><meta charset="utf-8">
          <title>Orçamento Comercial ITOP</title><style>
          @page{size:A4;margin:15mm}body{font:13px Arial;color:#222;margin:0}header{border-bottom:3px solid #d27a2f;padding-bottom:14px}
          img{max-width:155px;max-height:68px}h1{font-size:23px}h2{font-size:16px}p{line-height:1.5}
          table{border-collapse:collapse;width:100%}thead{display:table-header-group}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}
          tr{break-inside:avoid}th{background:#eee}footer{border-top:1px solid #ddd;margin-top:20px;padding-top:10px}
          </style><header><img src="${safe(PDF_LOGO)}" alt="Logo oficial ITOP"><h1>Orçamento Comercial</h1>
          <div><b>${safe(unit[1])}</b></div><div>CNPJ ${safe(unit[2])}</div><div>${safe(unit[3])} · ${safe(unit[0])}</div></header>
          <p><b>Número</b> ${safe(draft.id)}<br><b>Emissão</b> ${date(draft.emissao_data)} às ${safe(draft.emissao_hora)}<br>
          <b>Válido até</b> ${date(draft.validade)}<br><b>Consultor</b> ${safe(draft.consultor_nome)}</p>
          <h2>Dados do cliente</h2>${customer}
          ${lines ? '<h2>Serviços</h2><table><thead><tr><th>Produto</th><th>Categoria</th><th>Qtd.</th><th>Unitário</th><th>Mensal</th></tr></thead><tbody>' + lines + '</tbody></table><p><b>Total mensal regular: ' + money(draft.valor_mensal) + '</b></p>' : ''}
          ${promotionHTML(draft.produtos)}${energyReport}
          ${draft.retorno_em ? '<p><b>Retorno previsto</b> ' + new Date(draft.retorno_em).toLocaleString('pt-BR') + '</p>' : ''}
          <footer>Orçamento sujeito à disponibilidade, cobertura, condições comerciais e confirmação de valores.</footer></html>`);
        popup.document.close();
        const print = () => { popup.focus(); popup.print(); };
        if (popup.document.readyState === 'complete') print();
        else popup.addEventListener('load', print, {once: true});
        status('Na janela aberta, escolha “Salvar como PDF”.');
      } catch (error) { status(error.message); }
    }

    form.addEventListener('submit', event => event.preventDefault());
    form.addEventListener('input', event => event.stopPropagation());
    form.addEventListener('change', event => event.stopPropagation());
    input('unidade').addEventListener('change', unitInfo);
    input('emissao_data').addEventListener('change', () => { input('validade').min = input('emissao_data').value; });
    openButton.addEventListener('click', open);
    $('itop-budget-save').onclick = () => save();
    $('itop-budget-schedule').onclick = () => save(true);
    $('itop-budget-refresh').onclick = refresh;
    $('itop-budget-pdf').onclick = pdf;
    const navigate = switchModule;
    function exit() {
      restoreSales();
      navigate('procedimentos');
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
