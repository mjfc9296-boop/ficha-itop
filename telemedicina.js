(() => {
  const menu = document.querySelector('.itop-module-menu .nav-tabs');
  const content = document.querySelector('.itop-work-content');
  if (!menu || !content || document.getElementById('telemedicina')) return;

  const styles = document.createElement('style');
  styles.textContent = `
    #telemedicina { color:#fff; }
    #telemedicina [hidden], [data-module="telemedicina"] [hidden] { display:none!important; }
    #telemedicina .tele-actions { display:flex; gap:10px; flex-wrap:wrap; margin-block:12px; }
    #telemedicina button { border:1px solid #d27a2f; border-radius:8px; padding:8px 13px; }
    #telemedicina button[aria-pressed="true"] { background:#d27a2f; color:#101010; }
    #telemedicina form, #telemedicina details { padding:14px; border:1px solid #666; border-radius:10px; background:#171717; }
    #telemedicina form { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr)); gap:12px; }
    #telemedicina label { display:grid; gap:4px; align-content:start; min-width:0; }
    #telemedicina :is(input,select,textarea) { width:100%; box-sizing:border-box; border:1px solid #aaa; border-radius:7px; padding:8px; background:#fff; color:#111; }
    #telemedicina [aria-invalid="true"] { outline:2px solid #f66; }
    #telemedicina [data-full] { grid-column:1/-1; }
    #telemedicina [data-form-status] { margin:0; }
    #telemedicina [data-form-status][data-error] { color:#ffb8b8; }
    #telemedicina [data-list] { display:grid; gap:8px; }
    #telemedicina summary { cursor:pointer; overflow-wrap:anywhere; }
    #telemedicina dl { display:grid; grid-template-columns:minmax(88px,1fr) 2fr; gap:6px 12px; }
    #telemedicina dd { margin:0; overflow-wrap:anywhere; white-space:pre-wrap; }
    [data-module="telemedicina"] .tele-badge { position:absolute; top:6px; right:6px; width:14px; height:14px; border-radius:50%; background:#e11d35; border:2px solid #fff; z-index:10; }
  `;
  document.head.append(styles);

  const tab = document.createElement('button');
  tab.type = 'button';
  tab.className = 'nav-tab';
  tab.dataset.module = 'telemedicina';
  tab.hidden = true;
  tab.setAttribute('aria-controls', 'telemedicina');
  tab.setAttribute('aria-label', '18 Telemedicina');
  tab.innerHTML = '<img class="itop-tab-art" src="capas/menu-telemedicina.webp" alt=""><span class="step-ball" aria-hidden="true">18</span><span class="itop-nav-label">Telemedicina</span><span class="tele-badge" aria-hidden="true" hidden></span>';
  menu.append(tab);
  const badge = tab.querySelector('.tele-badge');

  const names = {
    titular: 'Titular da vida', cpf: 'CPF', nascimento: 'Data de nascimento', email: 'E-mail',
    titular_mk: 'Titular no MK', codigo_mk: 'Código MK', vendedor: 'Nome do vendedor',
    plano: 'Plano escolhido', motivo: 'Motivo do cancelamento'
  };
  const plans = '<label>Plano escolhido<select name="plano" required><option value="">Selecione</option><option>Humana</option><option>Pet</option><option>Combo</option></select></label>';
  const field = (name, attrs = '') => `<label>${names[name]}<input name="${name}" required ${attrs}></label>`;
  const holder = field('titular', 'maxlength="160"');
  const mkHolder = field('titular_mk', 'maxlength="160"');
  const phone = label => `<label>${label}<input name="telefone" type="tel" inputmode="tel" maxlength="20" required></label>`;
  const formFooter = '<div data-full><button type="submit">Enviar</button></div><p data-full data-form-status role="status"></p>';

  const panel = document.createElement('section');
  panel.className = 'module';
  panel.id = 'telemedicina';
  panel.hidden = true;
  panel.innerHTML = `
    <h2>Telemedicina</h2>
    <div class="tele-actions">
      <button type="button" data-view="ativacao" aria-pressed="false">Ativar vidas</button>
      <button type="button" data-view="cancelamento" aria-pressed="false">Cancelar vidas</button>
    </div>
    <form data-tipo="ativacao" novalidate hidden>
      <label>Data<input name="data" type="date" readonly></label>
      ${holder}
      ${field('cpf', 'inputmode="numeric" maxlength="14"')}
      ${field('nascimento', 'type="date"')}
      ${field('email', 'type="email" maxlength="254"')}
      ${phone('WhatsApp')}
      ${mkHolder}
      ${field('codigo_mk', 'maxlength="60"')}
      ${field('vendedor', 'maxlength="160"')}
      ${plans}
      ${formFooter}
    </form>
    <form data-tipo="cancelamento" novalidate hidden>
      ${holder}
      ${mkHolder}
      ${plans}
      ${phone('Telefone de contato')}
      <label data-full>Motivo do cancelamento<textarea name="motivo" rows="3" maxlength="2000" required></textarea></label>
      ${formFooter}
    </form>
    <section data-queue hidden>
      <h3>Solicitações</h3>
      <p data-queue-status role="status"></p>
      <div data-list></div>
      <div class="tele-actions">
        <button type="button" data-prev hidden>Anterior</button>
        <button type="button" data-next hidden>Próxima</button>
      </div>
    </section>
  `;
  content.append(panel);

  const forms = [...panel.querySelectorAll('form')];
  const activation = forms[0];
  const views = [...panel.querySelectorAll('[data-view]')];
  const queue = panel.querySelector('[data-queue]');
  const queueStatus = panel.querySelector('[data-queue-status]');
  const list = panel.querySelector('[data-list]');
  const previous = panel.querySelector('[data-prev]');
  const next = panel.querySelector('[data-next]');
  const table = () => window.itopAuthClient.from('itop_telemedicina_solicitacoes');
  const timeZone = 'America/Sao_Paulo';
  const localDay = new Intl.DateTimeFormat('sv-SE', { timeZone, dateStyle: 'short' });
  const localTime = new Intl.DateTimeFormat('pt-BR', { timeZone, dateStyle: 'short', timeStyle: 'short' });
  const digits = value => value.replace(/\D/g, '');
  const actions = new WeakMap();
  const pageSize = 20;
  let profile, manager = false, session = 0, badgeVersion = 0, queueVersion = 0;
  let selected = '', page = 0;

  function setDates() {
    const day = localDay.format(new Date());
    activation.elements.data.value = day;
    activation.elements.nascimento.max = day;
  }

  function validCpf(cpf) {
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) return false;
    return [9, 10].every(length => {
      const sum = [...cpf.slice(0, length)].reduce((total, digit, i) => total + Number(digit) * (length + 1 - i), 0);
      return (sum * 10 % 11) % 10 === Number(cpf[length]);
    });
  }

  function fieldError(input) {
    const label = input.labels[0].firstChild.textContent.trim();
    const value = input.value.trim();
    if (!value) return `Preencha o campo ${label}.`;
    if (input.name === 'cpf' && !validCpf(digits(value))) return 'Informe um CPF válido.';
    if (input.name === 'telefone' && !/^\d{10,11}$/.test(digits(value))) return `Informe ${label} com DDD.`;
    if (input.name === 'email' && (!input.validity.valid || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value))) return 'Informe um e-mail válido.';
    if (!input.validity.valid) return `Confira o campo ${label}.`;
    return '';
  }

  function formStatus(form, message, error = false) {
    const status = form.querySelector('[data-form-status]');
    status.textContent = message;
    status.toggleAttribute('data-error', error);
  }

  function updateFormButton(form) {
    const button = form.querySelector('[type="submit"]');
    const complete = [...form.querySelectorAll('[required]')].every(input => !fieldError(input));
    button.setAttribute('aria-disabled', String(!complete || button.disabled));
  }

  async function refreshBadge() {
    if (!profile) return;
    const version = ++badgeVersion;
    try {
      const { count, error } = await table().select('id', { count: 'exact', head: true }).neq('aliviaapp', 'sim');
      if (error || version !== badgeVersion) return;
      badge.hidden = count === 0;
      tab.setAttribute('aria-label', count ? `18 Telemedicina, ${count} pendente(s)` : '18 Telemedicina');
    } catch {
      // Preserve the last confirmed badge state during a temporary connection failure.
    }
  }

  function requestCard(row) {
    const card = document.createElement('details');
    const title = document.createElement('summary');
    const state = {sim:'Confirmado', nao:'Não confirmado', pendente:'Pendente'}[row.aliviaapp];
    const finished = row.concluido_em && localTime.format(new Date(row.concluido_em));
    title.textContent = [row.titular, row.plano, state, finished].filter(Boolean).join(' · ');
    const items = document.createElement('dl');
    const fields = {
      'Enviado em': localTime.format(new Date(row.criado_em)),
      'Finalizado em': finished,
      'Titular no MK': row.titular_mk,
      [row.tipo === 'ativacao' ? 'WhatsApp' : 'Telefone de contato']: row.telefone,
      CPF: row.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
      'Data de nascimento': row.nascimento?.split('-').reverse().join('/'),
      'E-mail': row.email,
      'Código MK': row.codigo_mk,
      'Nome do vendedor': row.vendedor,
      'Motivo do cancelamento': row.motivo
    };
    for (const [label, value] of Object.entries(fields)) {
      if (!value) continue;
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      items.append(dt, dd);
    }
    card.append(title, items);
    if (manager && row.aliviaapp !== 'sim') {
      const heading = document.createElement('strong');
      heading.textContent = row.tipo === 'ativacao' ? 'Cadastro no AliviaApp' : 'Cancelamento no AliviaApp';
      const controls = document.createElement('div');
      controls.className = 'tele-actions';
      const choices = row.tipo === 'ativacao' ? [['sim', 'Sim'], ['nao', 'Não']] : [['sim', 'Sim']];
      for (const [value, label] of choices) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.disabled = row.aliviaapp === value;
        button.addEventListener('click', () => void confirm(row.id, value, controls));
        controls.append(button);
      }
      card.append(heading, controls);
    }
    return card;
  }

  async function loadQueue(quiet = false) {
    if (!selected || !profile || !panel.classList.contains('active')) return;
    const version = ++queueVersion;
    const start = page * pageSize;
    if (!quiet) {
      list.replaceChildren();
      previous.hidden = next.hidden = true;
      queueStatus.textContent = 'Carregando solicitações…';
    }
    try {
      const { data, error } = await table().select('*').eq('tipo', selected)
        .order('concluido_em', { ascending: false, nullsFirst: true })
        .order('criado_em', { ascending: false }).order('id')
        .range(start, start + pageSize);
      if (version !== queueVersion) return;
      if (error) throw error;
      if (!data.length && page > 0) {
        page -= 1;
        return loadQueue();
      }
      const expanded = new Set([...list.querySelectorAll('details[open]')].map(item => item.dataset.id));
      list.replaceChildren(...data.slice(0, pageSize).map(row => {
        const card = requestCard(row);
        card.dataset.id = row.id;
        card.open = expanded.has(row.id);
        return card;
      }));
      queueStatus.textContent = data.length ? '' : 'Nenhuma solicitação registrada.';
      previous.hidden = page === 0;
      next.hidden = data.length <= pageSize;
    } catch {
      if (version === queueVersion && !quiet) queueStatus.textContent = 'Não foi possível carregar as solicitações. Selecione a opção novamente.';
    }
  }

  async function confirm(id, value, controls) {
    const epoch = session;
    const buttons = [...controls.querySelectorAll('button')];
    const disabled = buttons.map(button => button.disabled);
    buttons.forEach(button => { button.disabled = true; });
    try {
      const { data, error } = await table().update({ aliviaapp: value }).eq('id', id).select('id').maybeSingle();
      if (epoch !== session) return;
      if (error) throw error;
      await Promise.all([refreshBadge(), loadQueue(true)]);
      if (!data && epoch === session) queueStatus.textContent = 'A solicitação já foi atualizada. Confira o status.';
    } catch {
      if (epoch === session) {
        queueStatus.textContent = 'Não foi possível confirmar no painel. Tente novamente.';
        buttons.forEach((button, index) => { button.disabled = disabled[index]; });
      }
    }
  }

  for (const form of forms) {
    const button = form.querySelector('[type="submit"]');
    form.addEventListener('input', event => {
      event.target.removeAttribute('aria-invalid');
      updateFormButton(form);
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!profile || button.disabled) return;
      setDates();
      const inputs = [...form.querySelectorAll('[required]')];
      const invalid = inputs.find(input => fieldError(input));
      if (invalid) {
        formStatus(form, fieldError(invalid), true);
        invalid.setAttribute('aria-invalid', 'true');
        invalid.focus();
        return;
      }
      const fields = Object.fromEntries(inputs.map(input => [input.name, input.value.trim()]));
      fields.telefone = digits(fields.telefone);
      if (fields.cpf) fields.cpf = digits(fields.cpf);
      if (fields.email) fields.email = fields.email.toLowerCase();
      const payload = { tipo: form.dataset.tipo, ...fields };
      const signature = JSON.stringify(payload);
      const previousAttempt = actions.get(form);
      const id = previousAttempt?.signature === signature ? previousAttempt.id : crypto.randomUUID();
      actions.set(form, { signature, id });
      const epoch = session;
      button.disabled = true;
      updateFormButton(form);
      formStatus(form, 'Enviando…');
      try {
        const result = await table().insert({ id, ...payload }).select('criado_em').single();
        let { data, error } = result;
        if (error?.code === '23505') {
          ({ data, error } = await table().select('criado_em').eq('id', id).single());
        }
        if (epoch !== session) return;
        if (error) throw error;
        form.reset();
        actions.delete(form);
        setDates();
        if (profile.nome) activation.elements.vendedor.value = profile.nome;
        formStatus(form, `Enviado em ${localTime.format(new Date(data.criado_em))}. Aguardando confirmação no AliviaApp.`);
        page = 0;
        await Promise.all([refreshBadge(), loadQueue()]);
      } catch {
        if (epoch === session) formStatus(form, 'Não foi possível enviar. Confira a conexão e tente novamente.', true);
      } finally {
        if (epoch === session) {
          button.disabled = false;
          updateFormButton(form);
        }
      }
    });
    updateFormButton(form);
  }

  for (const button of views) {
    button.addEventListener('click', () => {
      selected = button.dataset.view;
      page = 0;
      for (const view of views) view.setAttribute('aria-pressed', String(view === button));
      for (const form of forms) form.hidden = form.dataset.tipo !== selected;
      queue.hidden = false;
      setDates();
      void loadQueue();
    });
  }
  previous.addEventListener('click', () => { page -= 1; void loadQueue(); });
  next.addEventListener('click', () => { page += 1; void loadQueue(); });
  tab.addEventListener('click', () => {
    if (tab.hidden) return;
    switchModule(panel.id);
    tab.setAttribute('aria-current', 'page');
    const mobileMenu = menu.closest('details');
    if (matchMedia('(max-width:900px)').matches && mobileMenu) {
      mobileMenu.open = false;
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setDates();
    void loadQueue();
    void refreshBadge();
  });
  new MutationObserver(() => tab.setAttribute('aria-current', tab.classList.contains('active') ? 'page' : 'false'))
    .observe(tab, { attributes: true, attributeFilter: ['class'] });

  function resetSession() {
    session += 1;
    badgeVersion += 1;
    queueVersion += 1;
    profile = null;
    manager = false;
    selected = '';
    page = 0;
    badge.hidden = tab.hidden = panel.hidden = true;
    tab.setAttribute('aria-label', '18 Telemedicina');
    queue.hidden = true;
    list.replaceChildren();
    queueStatus.textContent = '';
    for (const view of views) view.setAttribute('aria-pressed', 'false');
    for (const form of forms) {
      actions.delete(form);
      form.hidden = true;
      form.reset();
      form.querySelector('[type="submit"]').disabled = false;
      form.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
      updateFormButton(form);
      formStatus(form, '');
    }
    if (panel.classList.contains('active')) switchModule('sondagem');
    panel.classList.remove('active');
    tab.classList.remove('active');
  }

  async function authorize(currentProfile) {
    if (!currentProfile || currentProfile === profile) return;
    resetSession();
    profile = currentProfile;
    const epoch = session;
    if (profile.papel === 'administrador') {
      try {
        const { data, error } = await window.itopAuthClient.auth.getUser();
        if (epoch !== session) return;
        manager = !error && data.user?.email?.toLowerCase() === 'mjfc9296@gmail.com';
      } catch {
        if (epoch !== session) return;
      }
    }
    tab.hidden = panel.hidden = false;
    if (profile.nome) activation.elements.vendedor.value = profile.nome;
    updateFormButton(activation);
    void refreshBadge();
  }

  window.addEventListener('itop:authorized', event => void authorize(event.detail));
  window.addEventListener('itop:logged-out', resetSession);
  if (document.documentElement.classList.contains('itop-authorized')) void authorize(window.itopAuthorizedProfile);
  setInterval(() => {
    if (document.hidden || !profile) return;
    void refreshBadge();
    if (!list.querySelector('details[open]')) void loadQueue(true);
  }, 15000);
  window.addEventListener('focus', () => void refreshBadge());
})();
