(()=>{
 const menu=document.querySelector('.itop-module-menu'), links=document.querySelector('.itop-link-menu');
 const main=document.querySelector('main'), moduleRail=menu.closest('.itop-work-rail');
 for (const panel of [menu, links]) {
  panel.style.setProperty('border', '1px solid #fff', 'important');
  panel.style.setProperty('border-radius', '14px', 'important');
  panel.style.setProperty('box-shadow', 'inset 0 1px 2px rgba(255,255,255,.35), 0 2px 4px rgba(0,0,0,.42)', 'important');
 }
 // Reserve a faixa entre as capas e a moldura dos dois menus.
 for (const list of [menu.querySelector('.nav-tabs'), links.querySelector('.itop-useful-links')]) {
  list.style.setProperty('box-sizing', 'border-box', 'important');
  list.style.setProperty('padding-inline', '10px', 'important');
 }
 const linkRail=document.createElement('aside');
 linkRail.className='itop-work-rail itop-links-rail';
 linkRail.setAttribute('aria-label','Links úteis');
 main.append(linkRail);
 const mq=matchMedia('(max-width:900px)');
 function resize(){
  if(mq.matches){moduleRail.append(links);linkRail.hidden=true;}
  else{linkRail.append(links);linkRail.hidden=false;}
  menu.open=!mq.matches;links.open=!mq.matches;
 }
 resize();mq.addEventListener('change',resize);
 const tabs=[...document.querySelectorAll('.nav-tab[data-module]')];
 function sync(){tabs.forEach(tab=>tab.setAttribute('aria-current',tab.classList.contains('active')?'page':'false'));}
 tabs.forEach(tab=>{tab.addEventListener('click',()=>{sync();if(mq.matches){menu.open=false;document.querySelector('.module.active')?.scrollIntoView({behavior:'smooth',block:'start'});}});});
 new MutationObserver(sync).observe(document.querySelector('nav.nav-tabs'),{subtree:true,attributes:true,attributeFilter:['class']});
 const action=document.getElementById('simulateEnergy')?.closest('.actions');
 if(action)document.querySelector('#pacote')?.append(action);
 sync();
})();

/* Canais e procedimentos da ITOP TV são dois materiais independentes. */
(() => {
  const cover = document.querySelector('#svas-area a.training-cover[href="itop-tv-canais-disponiveis.webp"]');
  const channels = cover?.closest('.training-card');
  const pdf = channels?.querySelector('a.training-open');
  if (!pdf) return;

  const procedures = channels.cloneNode(true);
  const proceduresCover = procedures.querySelector('a.training-cover');
  proceduresCover.href = pdf.href;
  proceduresCover.setAttribute('aria-label', 'Visualizar PDF de procedimentos da ITOP TV');
  const image = proceduresCover.querySelector('img');
  image.src = 'sva-capa-1.png';
  image.alt = 'ITOP TV — Procedimentos';
  procedures.querySelector('h3').textContent = 'ITOP TV — Procedimentos';
  channels.after(procedures);

  channels.querySelector('h3').textContent = 'ITOP TV — Canais disponíveis';
  channels.querySelector('p').textContent = 'Consulte a grade de canais da ITOP TV.';
  channels.querySelector('.training-format').textContent = 'GRADE DE CANAIS';
  channels.querySelector('.training-meta span:last-child')?.remove();
  pdf.href = cover.href;
  pdf.textContent = 'Ver canais disponíveis';
  channels.querySelector('.training-download')?.remove();
})();

(() => {
  const style = document.createElement('style');
  style.textContent = `
    html body main .module[id] :is(.training-wa,.useful-link-wa,#supportWhatsApp,#energiaWhatsapp,#sondagemWhatsapp,#pacoteWhatsapp,#shareClosing,a[href*="wa.me/"],a[href*="whatsapp.com/"]),
    html body dialog[id] :is(#webPDF,#appPDF,#openWebChat) {
      box-sizing: border-box;
      display: inline-grid;
      place-items: center;
      position: relative;
      width: 44px !important;
      height: 44px !important;
      min-width: 44px !important;
      min-height: 44px !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 9px !important;
      background: transparent !important;
      font-size: 0 !important;
    }
    html body main .module[id] :is(.training-wa,.useful-link-wa,#supportWhatsApp,#energiaWhatsapp,#sondagemWhatsapp,#pacoteWhatsapp,#shareClosing,a[href*="wa.me/"],a[href*="whatsapp.com/"])::before,
    html body dialog[id] :is(#webPDF,#appPDF,#openWebChat)::before {
      content: '';
      position: absolute;
      inset: 3px;
      clip-path: inset(0 round 9px);
      background: transparent url("data:image/png;base64,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") center / 38px 38px no-repeat !important;
      pointer-events: none;
    }
    html body dialog[id] :is(#webPDF,#appPDF,#openWebChat) :is(strong,span) {
      font-size: 0 !important;
    }
    html body :is(.training-wa,.useful-link-wa,#supportWhatsApp,#energiaWhatsapp,#sondagemWhatsapp,#pacoteWhatsapp,#shareClosing,#webPDF,#appPDF,#openWebChat)[hidden] {
      display: none !important;
    }
    html body :is(.training-wa,.useful-link-wa,#supportWhatsApp,#energiaWhatsapp,#sondagemWhatsapp,#pacoteWhatsapp,#shareClosing,#webPDF,#appPDF,#openWebChat):focus-visible {
      outline: 2px solid #00134c;
      outline-offset: 2px;
    }
  `;
  document.head.append(style);
  const shareLabels = { webPDF: 'Baixar ou compartilhar PDF pelo WhatsApp', appPDF: 'Compartilhar PDF pelo aplicativo', openWebChat: 'Abrir conversa no WhatsApp Web' };
  for (const [id, label] of Object.entries(shareLabels)) {
    const button = document.getElementById(id);
    if (!button) continue;
    button.setAttribute('aria-label', label);
    button.title = label;
  }
})();

/* Use a sequência da lateral como referência para os atalhos da U.V.I. */
(() => {
  const sidebar = [...document.querySelectorAll('.itop-link-menu a.itop-shortcut')];
  const grid = document.querySelector('#usefulLinksPanel .useful-links-grid');
  if (!sidebar.length || !grid) return;

  const links = [...grid.querySelectorAll('.useful-link-item')];
  const sidebarOrder = new Map(sidebar.map((link, position) => [link.href, position]));
  const primaryLink = item => item.querySelector('a.useful-link');
  const position = item => sidebarOrder.get(primaryLink(item)?.href) ?? sidebar.length;
  links.sort((first, second) => position(first) - position(second));
  grid.append(...links);
  grid.style.setProperty('grid-template-columns', 'minmax(0, 1fr)', 'important');

  const zeusUrl = 'https://administrator.tipbrasil.com.br/zeus_admin/cp_zeus/login';
  const covers = new Map([
    ['mkbot.itop.net.br/mk/mkcore/Login/', 'capas/link-portal-mk.webp'],
    ['mksolutions.movidesk.com/Account/Login', 'capas/link-mk-movidesk.webp'],
    ['tip.movidesk.com/Ticket/Create', 'capas/link-tip-movidesk.webp'],
    ['easy2use.com.br/mvno/wp-login.php', 'capas/link-tip-easy.webp'],
    ['tip.movidesk.com/kb/pt-br/article/526696/portabilidade-via-easy-servicos', 'capas/link-tip-manual.webp'],
    ['administrator.tipbrasil.com.br/zeus_admin/cp_zeus/login', 'capas/link-tip-zeus.webp'],
    ['site.dryconecta.com.br/ativar-chip/informacoes-basicas', 'capas/link-dry-ativar.webp'],
    ['itop.drytelecom.tech/index.php', 'capas/link-dry-recargas.webp'],
    ['vivo.com.br/para-voce/por-que-vivo/qualidade/cobertura', 'capas/link-braz-cobertura.webp'],
    ['parceiro.brazmovel.com.br/', 'capas/link-braz-recargas.webp'],
    ['www.google.com/maps/d/u/0/viewer', 'capas/link-itop-fibra.webp'],
    ['www.portaldoassinante.com/itoptelecom/login', 'capas/link-assinante.webp'],
    ['tarefas.fluxoeficiente.com/sectors', 'capas/link-tarefas.webp'],
    ['www.netzenergia.com.br/', 'capas/link-netz.webp'],
    ['remuneratop.itop.net.br/product/', 'capas/link-remunera.webp'],
    ['www.playhub.com.br/APP/login', 'capas/link-playhub.webp'],
    ['plataforma.celetihub.com.br/login', 'capas/link-celeti.webp'],
    ['dashboard.aliviaapp.com.br/authentication/sign-in', 'capas/link-telemedicina.webp'],
    ['consultanumero.abrtelecom.com.br/consultanumero/consulta/consultaHistoricoRecenteCtg', 'capas/link-consulta-numero.webp'],
  ]);
  const coverFor = link => {
    const url = new URL(link.href);
    return covers.get(url.host + url.pathname);
  };

  for (const link of sidebar) {
    const cover = coverFor(link);
    if (cover) link.querySelector('img').src = cover;
  }
  for (const item of links) {
    const link = primaryLink(item);
    const cover = link && coverFor(link);
    if (cover) item.querySelector('.itop-useful-cover').src = cover;
  }
  const shortcut = sidebar.find(link => link.href === zeusUrl);
  if (shortcut) {
    shortcut.title = 'TIP Zeus';
    shortcut.setAttribute('aria-label', 'TIP Zeus (abre em nova aba)');
    const image = shortcut.querySelector('img');
    image.alt = 'TIP Zeus';
  }

  const card = links.find(item => primaryLink(item)?.href === zeusUrl);
  if (card) {
    card.querySelector('.useful-link-copy strong').textContent = 'TIP Zeus';
    const image = card.querySelector('.itop-useful-cover');
    image.alt = 'TIP Zeus';
    const coverLink = document.createElement('a');
    coverLink.href = zeusUrl;
    coverLink.target = '_blank';
    coverLink.rel = 'noopener noreferrer';
    image.replaceWith(coverLink);
    coverLink.append(image);
  }
})();

/* Cartões de materiais e atalhos com ações compactas sob o título. */
(() => {
  const style = document.createElement('style');
  style.textContent = `
    html body main .module[id] .itop-compact-card.itop-compact-card {
      display: grid !important;
      grid-template: "cover title" auto "cover details" auto "cover actions" auto / clamp(82px, 13vw, 140px) minmax(0, 1fr) !important;
      gap: 5px 16px !important;
      align-items: center !important;
      padding: 12px 14px !important;
    }
    html body main .module[id] .itop-compact-card > :is(.training-cover,.itop-useful-cover,.itop-compact-cover) {
      grid-area: cover !important;
      width: 100% !important;
      min-width: 0 !important;
      height: auto !important;
      align-self: center !important;
    }
    html body main .module[id] .itop-compact-card > :is(h3,.useful-link-copy) { grid-area: title !important; margin: 0 !important; }
    html body main .module[id] .itop-compact-card > :is(p,.training-meta) { display: none !important; }
    html body main .module[id] .itop-compact-card > .training-card-top {
      display: block !important;
      grid-area: details !important;
      margin: 0 !important;
    }
    html body main .module[id] .itop-compact-card .training-monogram { display: none !important; }
    html body main .module[id] .itop-compact-card > :is(.training-actions,.useful-link-actions) {
      grid-area: actions !important;
      display: flex !important;
      align-items: center !important;
      justify-content: flex-start !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
      margin: 0 !important;
    }
    html body main .module[id] .itop-compact-card.itop-compact-card :is(.training-open,.training-download,.useful-link,.useful-link-copy-btn) {
      box-sizing: border-box !important;
      display: inline-flex !important;
      justify-content: center !important;
      align-items: center !important;
      width: min(134px, 100%) !important;
      min-width: 0 !important;
      height: 30px !important;
      min-height: 30px !important;
      padding: 0 8px !important;
      margin: 0 !important;
      background: #00134c !important;
      color: #fff !important;
      border: 0 !important;
      border-radius: 7px !important;
      box-shadow: none !important;
      font-size: 11px !important;
      line-height: 1.15 !important;
    }
    html body main .module[id] .itop-compact-card :is(.training-wa,.useful-link-wa) {
      margin: 0 0 0 8px !important;
      box-shadow: none !important;
      text-indent: 0 !important;
    }
    html body main .module[id] .itop-compact-card :is(.training-wa,.useful-link-wa)::after { content: none !important; }
  `;
  document.head.append(style);

  function prepareCards() {
    for (const card of document.querySelectorAll('.training-card,.useful-link-item')) {
      if (!card.querySelector('.training-actions,.useful-link-actions')) continue;
      card.classList.add('itop-compact-card');
      card.querySelector('.itop-useful-cover')?.closest('a')?.classList.add('itop-compact-cover');
      const button = card.querySelector('.training-wa,.useful-link-wa');
      if (!button) continue;
      button.replaceChildren();
      button.setAttribute('aria-label', 'Compartilhar pelo WhatsApp');
      button.title = 'Compartilhar pelo WhatsApp';
    }
  }
  document.addEventListener('DOMContentLoaded', prepareCards);

  // Preserve the destination of each card, including cards cloned at startup.
  document.addEventListener('click', event => {
    const button = event.target.closest('.training-wa,.useful-link-wa');
    const card = button?.closest('.training-card,.useful-link-item');
    const link = card?.querySelector('.training-open,.useful-link');
    if (!link || button.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const field = document.getElementById('trainingWhatsAppNumber');
    const hint = document.getElementById('trainingWhatsappHint');
    let number = field?.value.replace(/\D/g, '') || '';
    if (number.length === 13 && number.startsWith('55')) number = number.slice(2);
    if (number && !/^\d{2}9\d{8}$/.test(number)) {
      field.setAttribute('aria-invalid', 'true');
      field.focus();
      if (hint) hint.textContent = 'Informe um celular válido com DDD ou deixe em branco para escolher o destinatário no WhatsApp.';
      return;
    }
    field?.removeAttribute('aria-invalid');
    const title = card.querySelector('h3,.useful-link-copy strong')?.textContent.trim() || 'Material ITOP';
    const text = encodeURIComponent('ITOP · ' + title + '\n' + link.href);
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.open('https://wa.me/' + (number ? '55' + number : '') + '?text=' + text, '_blank', 'noopener,noreferrer');
      return;
    }

    const dialog = document.createElement('dialog');
    const titleLabel = document.createElement('h2');
    titleLabel.textContent = 'Compartilhar pelo WhatsApp';
    const instructions = document.createElement('p');
    instructions.textContent = 'Copie a mensagem e cole na conversa que já está aberta no WhatsApp.';
    const message = document.createElement('textarea');
    message.value = decodeURIComponent(text);
    message.readOnly = true;
    message.rows = 4;
    message.setAttribute('aria-label', 'Mensagem para compartilhar');
    const actions = document.createElement('div');
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copiar mensagem';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(message.value);
        copy.textContent = 'Mensagem copiada';
      } catch {
        message.focus();
        message.select();
        instructions.textContent = 'Pressione Ctrl+C e cole na conversa aberta.';
      }
    });
    const open = document.createElement('a');
    open.href = 'https://wa.me/' + (number ? '55' + number : '') + '?text=' + text;
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    open.textContent = 'Abrir WhatsApp';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Fechar';
    close.onclick = () => dialog.close();
    actions.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px';
    message.style.cssText = 'width:100%;box-sizing:border-box';
    dialog.style.cssText = 'width:min(460px,90vw);padding:20px;border:1px solid #ddd;border-radius:12px';
    dialog.setAttribute('aria-label', titleLabel.textContent);
    actions.append(copy, open, close);
    dialog.append(titleLabel, instructions, message, actions);
    dialog.addEventListener('close', () => dialog.remove(), {once: true});
    document.body.append(dialog);
    dialog.showModal();
  }, true);
})();

(() => {
  const label = document.querySelector('.support-context label[for="supportNumber"]');
  if (!label) return;
  label.textContent = 'WhatsApp cliente';

  const style = document.createElement('style');
  style.textContent = `
    html body main #itop-return-bell {
      box-sizing: border-box;
      height: 34px !important;
      min-height: 34px !important;
      padding: 0 4px !important;
      line-height: 1 !important;
      white-space: nowrap !important;
    }
    html body main .support-context { align-items: end; }
    html body main .support-context > .field > :is(input,select) {
      box-sizing: border-box;
      height: 40px !important;
      min-height: 40px !important;
    }
  `;
  document.head.append(style);
})();

/* Os módulos antigos têm regras próprias de coluna e largura. */
document.addEventListener('DOMContentLoaded', () => {
  const apply = (element, declarations) => {
    if (!element) return;
    for (const [property, value] of Object.entries(declarations)) {
      element.style.setProperty(property, value, 'important');
    }
  };
  for (const row of document.querySelectorAll('main .module :is(.training-actions,.useful-link-actions,.commission-doc-actions)')) {
    const card = row.closest('.itop-compact-card');
    if (card) {
      apply(card, {
        'border-color': '#8b94a5',
        'grid-template': '"cover title" auto "cover details" auto "cover actions" auto / clamp(82px, 16vw, 196px) minmax(0, 1fr)',
        'column-gap': 'clamp(16px, calc(22vw - 150px), 192px)'
      });
      const cover = card.querySelector(':scope > :is(.training-cover,.itop-useful-cover,.itop-compact-cover)');
      apply(cover, {'grid-area': 'cover', width: '100%', 'min-width': '0', 'max-width': '100%', height: 'auto', 'align-self': 'center'});
      apply(cover?.querySelector('img'), {width: '100%', 'max-width': '100%', height: 'auto', 'object-fit': 'contain'});
      apply(card.querySelector(':scope > :is(h3,.useful-link-copy)'), {'grid-area': 'title'});
      apply(card.querySelector(':scope > .training-card-top'), {'grid-area': 'details', 'justify-self': 'start'});
      apply(row, {'grid-area': 'actions'});
    }
    apply(row, {
      display: 'flex', 'flex-direction': 'row', 'flex-wrap': 'nowrap',
      'justify-content': 'flex-start', 'align-items': 'center',
      'justify-self': 'stretch', width: '100%', 'max-width': 'none',
      'min-width': '0', gap: '8px', overflow: 'auto', 'padding-block': '3px'
    });
    for (const button of row.querySelectorAll(':scope > :is(a,button)')) {
      const isWhatsApp = button.matches('.training-wa,.useful-link-wa');
      if (isWhatsApp) {
        apply(button, {
          flex: '0 0 44px', width: '44px', 'min-width': '44px', height: '44px',
          'min-height': '44px', margin: '0', padding: '0', border: '0',
          background: 'transparent', 'box-shadow': 'none', 'font-size': '0'
        });
        continue;
      }
      apply(button, {
        display: 'inline-flex', flex: '0 0 134px', width: '134px',
        'min-width': '134px', 'max-width': '134px', height: '30px',
        'min-height': '30px', padding: '0 8px', margin: '0',
        'box-sizing': 'border-box', 'align-items': 'center', 'justify-content': 'center',
        'white-space': 'nowrap', 'font-size': '11px', 'line-height': '1.15',
        background: '#00134c', color: '#fff', border: '0',
        'border-radius': '7px', 'box-shadow': 'none'
      });
    }
  }
});

/* Materiais comerciais e capa do treinamento de Portaria e Segurança. */
(() => {
  const plans = document.querySelector('#procedimentos [data-category="planos-combos"][data-training]');
  if (plans) {
    function setMaterial(card, {title, cover, pdf, pages, description}) {
      const image = card.querySelector('.training-cover img');
      image.src = cover;
      image.alt = 'Capa: ' + title;
      card.dataset.training = title;
      card.querySelector('h3').textContent = title;
      card.querySelector('p').textContent = description;
      card.querySelector('.training-format').textContent = 'PDF · ' + pages + ' PÁGINAS';
      card.querySelector('.training-meta span:last-child')?.remove();
      for (const link of card.querySelectorAll('.training-cover,.training-open,.training-download')) {
        link.href = pdf;
        if (link.hasAttribute('download')) link.download = pdf;
      }
      card.querySelector('.training-cover').setAttribute('aria-label', 'Visualizar PDF: ' + title);
    }

    const blackFriday = plans.cloneNode(true);
    setMaterial(plans, {
      title: 'Novos planos e combos',
      cover: 'capa-uvi-novos-planos-2026.webp',
      pdf: 'Itop-Apresentacao-Comercial-11-11-2026-v2-versao-clara.pdf',
      pages: 10,
      description: 'Tabela comercial atualizada em 11/11/2026.'
    });
    setMaterial(blackFriday, {
      title: 'Black Friday 2026',
      cover: 'capa-uvi-black-friday.webp',
      pdf: 'Itop-Black-Friday-2026-v2.pdf',
      pages: 4,
      description: 'Material da campanha Black Friday 2026.'
    });
    plans.after(blackFriday);
    const count = document.querySelector('[data-filter="planos-combos"] b');
    if (count) count.textContent = '2';
    const allCount = document.querySelector('[data-filter="all"] b');
    if (allCount && /^\d+$/.test(allCount.textContent.trim())) allCount.textContent = Number(allCount.textContent) + 1;
    document.querySelector('#trainingSearch')?.dispatchEvent(new Event('input'));
  }

  const talos = document.querySelector('#procedimentos [data-training^="TALOS"]');
  const moduleHeading = document.querySelector('#portaria-seguranca section > h3');
  const moduleActions = moduleHeading?.nextElementSibling;
  if (talos && moduleActions?.matches('.training-actions')) {
    const card = talos.cloneNode(true);
    card.removeAttribute('data-training');
    const image = card.querySelector('.training-cover img');
    image.src = 'capa-talos-modulo-11.webp';
    card.querySelector('h3').textContent = 'TALOS · Portaria e Segurança';
    moduleHeading.replaceWith(card);
    moduleActions.remove();
  }
})();

/* Capas da navegação lateral, associadas aos módulos pelo identificador. */
for (const moduleId of ["sondagem","pacote","fechamento","energia","itop-movel","movel","itop-comunica","procedimentos","svas-area","comissionamento-area","portaria-seguranca","gestao-usuarios","comercial"]) {
  const cover = document.querySelector('.itop-module-menu .nav-tab[data-module="' + moduleId + '"] .itop-tab-art');
  if (cover) cover.src = 'capas/menu-bronze-' + moduleId + '.webp';
}

/* Barra de ações e campos de identificação da sondagem. */
(() => {
  const fields = {
    nome: 'Cliente',
    telefone: 'WhatsApp',
    cidade: 'Cidade',
    vendedor: 'Consultor'
  };
  for (const [id, title] of Object.entries(fields)) {
    const input = document.getElementById(id);
    const label = input?.closest('.field')?.querySelector('label');
    if (label) {
      label.htmlFor = id;
      label.textContent = title;
      label.closest('.grid')?.classList.add('itop-survey-customer-fields');
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    html body #sondagem #itop-proposal-controlbar :is(
      label.commercial-test-toggle, #itop-phone-action, #itop-return-bell, #itop-search-toggle
    ) {
      box-sizing: border-box !important;
      height: 31px !important;
      min-height: 31px !important;
      max-height: 31px !important;
      padding: 0 4px !important;
      font-size: 12px !important;
      line-height: 1.2 !important;
      white-space: nowrap !important;
      text-align: center !important;
    }
    html body #sondagem #itop-proposal-controlbar label.commercial-test-toggle {
      align-items: center !important;
      justify-content: center !important;
    }
    html body #sondagem #itop-proposal-controlbar #itop-proposal-buttons {
      flex-wrap: wrap !important;
    }
    html body #sondagem #itop-proposal-controlbar :is(#itop-test-control, #itop-phone-action, #itop-return-bell, #itop-global-search) {
      min-width: 105px !important;
    }
    html body #sondagem .itop-survey-customer-fields {
      align-items: start !important;
    }
    html body #sondagem .itop-survey-customer-fields > .field {
      display: grid;
      grid-template-rows: auto auto;
      align-content: start;
    }
    html body #sondagem .itop-survey-customer-fields > .field > label {
      line-height: 1.25;
      min-height: 1.25em;
    }
  `;
  document.head.append(style);
})();
