(()=>{
 const menu=document.querySelector('.itop-module-menu'), links=document.querySelector('.itop-link-menu');
 const main=document.querySelector('main'), moduleRail=menu.closest('.itop-work-rail');
 for (const panel of [menu, links]) {
  panel.style.setProperty('border', '1px solid #fff', 'important');
  panel.style.setProperty('border-radius', '14px', 'important');
  panel.style.setProperty('box-shadow', 'inset 0 1px 2px rgba(255,255,255,.35), 0 2px 4px rgba(0,0,0,.42)', 'important');
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
  const zeusCover = 'data:image/webp;base64,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';
  const shortcut = sidebar.find(link => link.href === zeusUrl);
  if (shortcut) {
    shortcut.title = 'TIP Zeus';
    shortcut.setAttribute('aria-label', 'TIP Zeus (abre em nova aba)');
    const image = shortcut.querySelector('img');
    image.src = zeusCover;
    image.alt = 'TIP Zeus';
  }

  const card = links.find(item => primaryLink(item)?.href === zeusUrl);
  if (card) {
    card.querySelector('.useful-link-copy strong').textContent = 'TIP Zeus';
    const image = card.querySelector('.itop-useful-cover');
    image.src = zeusCover;
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
for (const moduleId of ['sondagem', 'pacote', 'fechamento', 'energia']) {
  const cover = document.querySelector('.itop-module-menu .nav-tab[data-module="' + moduleId + '"] .itop-tab-art');
  if (cover) cover.src = 'capas/menu-bronze-' + moduleId + '.webp';
}
