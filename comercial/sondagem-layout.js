(()=>{'use strict';
 const $=id=>document.getElementById(id),top=document.querySelector('#sondagem > .itop-sales-flow'),toolbar=top?.querySelector('.actions');
 if(top&&toolbar){
  top.id='itop-survey-toolbar';toolbar.classList.add('itop-survey-toolbar-actions');if($('itop-flow-new'))$('itop-flow-new').textContent='NOVA PROPOSTA';
  const controls = $('itop-proposal-controlbar');
  if (controls) {
   const row = document.createElement('div');
   row.className = 'itop-survey-proposal-row';
   top.before(row);
   row.append(top, controls);
   const customer = document.querySelector('#sondagem .survey-customer-heading')?.parentElement;
   if (customer) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'comercial/sondagem-painel.css?v=20261121-teto-energia';
    document.head.append(stylesheet);
    const panel = document.createElement('section');
    panel.className = 'itop-sondagem-panel';
    const banner = document.createElement('img');
    banner.className = 'itop-sondagem-banner';
    banner.src = 'comercial/sondagem-topo.webp';
    banner.alt = 'Sondagem';
    row.before(panel);
    panel.append(banner, row);
    customer.classList.add('itop-sondagem-customer');
    panel.append(customer);
    const status = document.createElement('div');
    status.className = 'itop-sondagem-status';
    status.append(...top.querySelectorAll('.itop-flow-progress, .itop-flow-message'));
    panel.after(status);
    for (const [id, caption] of Object.entries({
     nome: 'Cliente', telefone: 'WhatsApp', cidade: 'Cidade', vendedor: 'Consultor'
    })) {
     const label = $(id)?.previousElementSibling;
     if (label?.tagName === 'LABEL') {
      label.htmlFor = id;
      label.textContent = caption;
     }
    }
    $('itop-search-toggle').textContent = 'BUSCA TOTAL DO SITE';
    const test = $('survey-is-test');
    test.setAttribute('aria-describedby', 'survey-test-hint');
    test.parentElement.lastChild.textContent = 'TESTE';
    customer.querySelector('h2').textContent = 'Dados do Cliente';
   }
  }
  const number=$('survey-proposal-id');if(number){const line=document.createElement('div');line.id='itop-proposal-number';line.append(document.createTextNode('PROPOSTA Nº: '),number);top.prepend(line);}
 }
 const packageCustomer = $('pacoteNome')?.closest('.customer-panel');
 if (packageCustomer) {
  packageCustomer.classList.add('itop-package-customer');
  const banner = document.createElement('img');
  banner.className = 'itop-package-banner';
  banner.src = 'comercial/adicionar-servicos-20261117.jpg';
  banner.alt = 'Adicionar Serviços';
  const progress = document.querySelector('#pacote > .itop-sales-flow');
  (progress || packageCustomer).before(banner);
  const heading = packageCustomer.querySelector('h2');
  const title = document.createElement('span');
  title.textContent = 'Dados do Cliente';
  heading.replaceChildren(title);
  for (const id of ['pacoteNome', 'pacoteTelefone', 'pacoteCidade', 'pacoteVendedor']) {
   const input = $(id);
   const label = input?.previousElementSibling;
   if (label?.tagName === 'LABEL') label.htmlFor = id;
  }
 }
 const energy = document.querySelector('#energia > .customer-panel');
 if (energy) {
  const banner = document.createElement('img');
  banner.src = 'comercial/energia-netz-topo.webp';
  banner.alt = 'NETZ. Sua energia planta o futuro. 20% de desconto no kWh excedente.';
  banner.width = 2048;
  banner.height = 684;
  banner.className = 'itop-energy-roof';
  energy.prepend(banner);
 }
 for (const [moduleId, image, title, width, height] of [
  ['itop-movel', 'telefonia-movel-fixa-topo.webp', 'Telefonia Móvel e Fixa', 2048, 684],
  ['movel', 'suporte-telefonia-movel-topo.webp', 'Suporte à Telefonia Móvel', 2048, 684],
  ['itop-comunica', 'itop-comunica-topo.webp', 'ITOP Comunica', 2048, 684],
  ['procedimentos', 'uvi-universidade-de-vendas-topo.webp', 'UVI — Universidade de Vendas ITOP', 2048, 684],
  ['svas-area', 'sva-topo.webp', 'SVA — Serviços de Valor Agregado', 2048, 684],
  ['comissionamento-area', 'topo-comissao.webp', 'Comissão', 2048, 684],
  ['gestao-usuarios', 'gestao-usuarios-topo.webp', 'Gestão de Usuários', 2048, 684],
  ['comercial', 'gestao-plataforma-topo.webp', 'Gestão da Plataforma', 2048, 684],
  ['inova-blocos', 'inova-blocos-topo.webp', 'Inova Blocos', 2048, 682]
 ]) {
  const module = $(moduleId);
  if (!module) continue;
  const banner = document.createElement('img');
  banner.src = moduleId === 'comissionamento-area' ? image : 'comercial/' + image;
  banner.alt = title;
  banner.loading = 'lazy';
  banner.width = width;
  banner.height = height;
  banner.style.cssText = 'display:block;width:100%;height:auto;margin:0 0 12px';
  if (moduleId === 'movel') {
   const frame = document.createElement('div');
   frame.className = 'itop-support-banner-frame';
   frame.style.cssText = 'box-sizing:border-box;width:100%;padding:16px clamp(18px, 4%, 40px) 14px';
   banner.style.margin = '0';
   frame.append(banner);
   module.prepend(frame);
   continue;
  }
  if (moduleId === 'procedimentos') {
   banner.style.clipPath = 'inset(0 round 5.4% / 16.2%)';
  }
  module.prepend(banner);
 }
 const businessCards = [...document.querySelectorAll('#procedimentos .training-card[data-category="planos-empresariais"]')];
 if (businessCards.length) {
  const lines = new Set();
  for (const card of businessCards) {
   const title = card.querySelector('h3');
   const line = title.textContent.split(' · ')[0];
   if (lines.has(line)) {
    card.remove();
    continue;
   }
   lines.add(line);
   title.textContent = line;
   card.dataset.training = 'Planos Empresariais ' + line + ' 600 700 900 Mega';
   const cover = card.querySelector('.training-cover img');
   cover.src = 'capas/planos-empresariais/capa-' + line.toLowerCase() + '.webp';
   cover.alt = 'Planos Empresariais — ' + line;
  }
  const businessPlans = [
   ['line', 'Business Line', 500],
   ['master', 'Business Master', 600],
   ['exclusive', 'Business Exclusive', 800]
  ];
  let lastCard = businessCards.filter(card => card.isConnected).at(-1);
  for (const [slug, title, speed] of businessPlans) {
   const card = businessCards[0].cloneNode(true);
   const asset = 'capas/planos-empresariais/';
   const cover = card.querySelector('.training-cover img');
   cover.src = asset + 'capa-business-' + slug + '.webp';
   cover.alt = 'Planos Empresariais — ' + title;
   card.querySelector('h3').textContent = title + ' · ' + speed + ' Mega';
   card.dataset.training = 'Planos Empresariais ' + title + ' ' + speed + ' Mega Fixo';
   for (const link of card.querySelectorAll('.training-cover, .training-open')) {
    link.href = asset + 'oferta-business-' + slug + '.webp';
    link.setAttribute('aria-label', 'Abrir oferta ' + title);
   }
   card.querySelector('.training-open').textContent = 'Visualizar oferta';
   lastCard.after(card);
   lastCard = card;
  }
  for (const category of ['planos-empresariais', 'all']) {
   const counter = document.querySelector('#procedimentos [data-filter="' + category + '"] b');
   const selector = category === 'all' ? '[data-training]' : '[data-training][data-category="' + category + '"]';
   if (counter) counter.textContent = document.querySelectorAll('#procedimentos .training-grid ' + selector).length;
  }
  $('trainingSearch')?.dispatchEvent(new Event('input'));
 }
 const trainingGrid = document.querySelector('#procedimentos .training-grid');
 const trainingFilters = document.querySelector('#procedimentos .training-filters');
 if (trainingGrid && trainingFilters) {
  const category = document.createElement('button');
  category.type = 'button';
  category.className = 'training-filter';
  category.dataset.filter = 'black-friday';
  category.setAttribute('aria-pressed', 'false');
  category.innerHTML = 'BLACK FRIDAY <b></b>';
  trainingFilters.querySelector('[data-filter="planos-empresariais"]').after(category);

  const blackBraz = document.createElement('article');
  blackBraz.className = 'training-card';
  blackBraz.dataset.category = 'black-friday';
  blackBraz.dataset.training = 'Black Braz Black Friday Braz Móvel 10GB 30GB 40GB';
  blackBraz.innerHTML = `
   <a class="training-cover" href="capas/black-braz-2026.webp" target="_blank" rel="noopener" aria-label="Abrir oferta Black Braz">
    <img src="capas/black-braz-2026.webp" loading="lazy" alt="Black Braz — 10 GB de bônus">
   </a>
   <h3>Black Braz</h3>
   <p class="training-description">10 GB de bônus nos planos de 30 GB e 40 GB para novos clientes. Vigência de 23 a 30 de novembro de 2026.</p>
   <div class="training-meta"><span>Black Friday</span></div>
   <div class="training-actions"><a class="training-open" href="capas/black-braz-2026.webp" target="_blank" rel="noopener">Visualizar oferta</a></div>`;
  trainingGrid.prepend(blackBraz);
  const campaignCards = [...trainingGrid.querySelectorAll('[data-category="black-friday"]')];
  blackBraz.after(...campaignCards.filter(card => card !== blackBraz));
  category.querySelector('b').textContent = campaignCards.length;
  const count = trainingFilters.querySelector('[data-filter="all"] b');
  if (count) count.textContent = trainingGrid.querySelectorAll('[data-training]').length;
  $('trainingSearch')?.dispatchEvent(new Event('input'));
 }
 const comunicaBadge = $('comunicaBadge');
 if (comunicaBadge) {
  const badgeStyle = document.createElement('style');
  badgeStyle.textContent = `
   html body main .nav-tab :is(#comunicaBadge, #confraternizacaoBadge):not([hidden]) {
    display: grid !important;
    place-items: center;
    width: 24px !important;
    height: 24px !important;
    inset: 6px 6px auto auto !important;
    border: 2px solid #fff;
    border-radius: 50%;
    background: #d71920;
    color: #fff;
    z-index: 40 !important;
   }
  `;
  document.head.append(badgeStyle);
 }
 const closingPreview = $('closingPreview');
 if (closingPreview) {
  const panel = document.createElement('section');
  panel.className = 'itop-closing-banner';
  const banner = document.createElement('img');
  banner.src = 'comercial/fechamento-venda-20261117.jpg';
  banner.alt = 'Fechamento de Venda';
  const simulate = document.createElement('button');
  simulate.type = 'button';
  simulate.id = 'itop-closing-energy-simulation';
  simulate.textContent = 'Simular Energia e Confrontar nesta Simulação';
  simulate.addEventListener('click', () => goToEnergy());
  const heading = document.createElement('h2');
  heading.textContent = 'Dados do Cliente';
  const fields = document.createElement('dl');
  const customer = [
   ['Cliente', 'client'], ['WhatsApp com DDD', 'phone'],
   ['Cidade', 'city'], ['Consultor', 'seller']
  ];
  const values = customer.map(([label, key]) => {
   const field = document.createElement('div');
   const title = document.createElement('dt');
   title.textContent = label;
   const value = document.createElement('dd');
   field.append(title, value);
   fields.append(field);
   return [key, value];
  });
  let enteredClient = '';
  function update() {
   const data = reportData();
   const client = ($('nome').value || $('pacoteNome').value).trim();
   if (client !== enteredClient) enteredClient = '';
   for (const [key, value] of values) value.textContent = enteredClient ? data[key] || '' : '';
  }
  const customerInputs = ['nome', 'telefone', 'cidade', 'pacoteNome', 'pacoteTelefone', 'pacoteCidade'];
  for (const id of customerInputs) {
   $(id)?.addEventListener('input', (event) => {
    if (!event.isTrusted) return;
    enteredClient = ($('nome').value || $('pacoteNome').value).trim();
    update();
   });
  }
  panel.append(banner, heading, fields);
  closingPreview.parentElement.before(panel);
  const footer = document.createElement('div');
  footer.className = 'itop-closing-energy-footer';
  footer.append(simulate);
  $('fechamento').append(footer);
  closingPreview.classList.add('itop-closing-custom-summary');
  new MutationObserver(update).observe(closingPreview, {childList: true});
  update();
 }
 const old=$('itop-survey-record');if(old){old.hidden=true;old.setAttribute('aria-hidden','true');old.inert=true;}
 // Campos internos são conservados para o histórico e os scripts já existentes.
 // A observação obrigatória permanece no bloco de finalização, fora desta seção.
 const observation=$('final-observation'),agenda=document.querySelector('.itop-return-panel');
 if(observation&&agenda)observation.insertAdjacentElement('afterend',agenda);
 const finish=$('itop-flow-finish'),closingActions=finish?.closest('.actions');
 const adjust=document.querySelector('#fechamento button[onclick="switchModule(\'pacote\')"]');
 if(closingActions&&adjust){closingActions.id='itop-closing-actions';adjust.id='itop-closing-adjust';adjust.textContent='AJUSTAR SERVIÇOS';for(const button of [$('pdf-with-energy'),$('pdf-without-energy'),adjust,finish])if(button)closingActions.append(button);}
 const bar=document.querySelector('#sondagem .itop-one-line-actions');
 const message=$('itop-next-message');if(bar&&message&&bar.contains(message))bar.insertAdjacentElement('afterend',message);
})();

(() => {
 const list = document.getElementById('comunicaLista');
 if (!list) return;

 const style = document.createElement('style');
 style.textContent = `
  :is(#comunicaLista, #confraternizacaoLista) .comunica-item.itop-comunica-compact {
   display: flex;
   flex-wrap: nowrap;
   align-items: center;
   gap: 12px;
   padding: 10px 12px;
  }
  :is(#itop-comunica, #confraternizacao) .itop-comunica-cover {
   flex: 0 0 clamp(64px, 12%, 96px);
   min-width: 0 !important;
   margin: 0 !important;
   padding: 0 !important;
   border: 0 !important;
   background: transparent !important;
   box-shadow: none !important;
   cursor: zoom-in;
  }
  :is(#itop-comunica, #confraternizacao) .itop-comunica-cover img { display: block; width: 100%; height: 96px; object-fit: contain; }
  :is(#itop-comunica, #confraternizacao) .itop-comunica-copy { flex: 1; min-width: 0; }
  :is(#itop-comunica, #confraternizacao) .itop-comunica-copy h3 { margin: 0; }
  :is(#itop-comunica, #confraternizacao) .itop-comunica-copy details { margin-top: 4px; }
  :is(#itop-comunica, #confraternizacao) .itop-comunica-copy summary { cursor: pointer; }
  :is(#itop-comunica, #confraternizacao) .itop-comunica-excerpt {
   display: -webkit-box;
   -webkit-box-orient: vertical;
   -webkit-line-clamp: 2;
   overflow: hidden;
  }
  :is(#itop-comunica, #confraternizacao) .itop-comunica-copy details[open] .itop-comunica-excerpt { display: none; }
  :is(#itop-comunica, #confraternizacao) .itop-comunica-copy details p { margin-top: 4px; }
  :is(#itop-comunica, #confraternizacao) a.itop-comunica-confirm {
   display: inline-block;
   margin-top: 7px;
   padding: 4px 9px;
   border-radius: 6px;
   background: #00134c;
   color: #fff;
   font-weight: 700;
   text-decoration: underline;
  }
  :is(#itop-comunica, #confraternizacao) .itop-comunica-read { align-self: flex-start; padding: 4px 8px !important; }
  @media (max-width: 600px) {
   :is(#itop-comunica, #confraternizacao) .itop-comunica-compact { gap: 8px; }
   :is(#itop-comunica, #confraternizacao) .itop-comunica-read { font-size: 11px !important; max-width: 84px; }
  }
  #itop-comunica-zoom { width: max-content; max-width: 94vw; max-height: 92dvh; padding: 12px; }
  #itop-comunica-zoom::backdrop { background: #000b; }
  #itop-comunica-zoom img { display: block; max-width: 100%; max-height: 73dvh; object-fit: contain; margin: auto; }
  #itop-comunica-zoom .actions { margin-top: 8px; }
 `;
 document.head.append(style);

 const zoom = document.createElement('dialog');
 zoom.id = 'itop-comunica-zoom';
 zoom.setAttribute('aria-label', 'Capa do comunicado ampliada');
 zoom.innerHTML = `<img alt=""><div class="actions"><button type="button">Copiar imagem</button><form method="dialog"><button>Fechar</button></form></div><p role="status"></p>`;
 document.body.append(zoom);
 const fullImage = zoom.querySelector('img');
 const copyStatus = zoom.querySelector('[role=status]');
 zoom.querySelector('button').addEventListener('click', async () => {
  try {
   if (!fullImage.naturalWidth || !navigator.clipboard?.write || !window.ClipboardItem) {
    throw new Error('Cópia indisponível');
   }
   const canvas = document.createElement('canvas');
   canvas.width = fullImage.naturalWidth;
   canvas.height = fullImage.naturalHeight;
   canvas.getContext('2d').drawImage(fullImage, 0, 0);
   const png = new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error('Imagem indisponível'));
   }, 'image/png'));
   await navigator.clipboard.write([new ClipboardItem({'image/png': png})]);
   copyStatus.textContent = 'Imagem copiada.';
  } catch {
   copyStatus.textContent = 'Use o clique direito ou pressione e segure sobre a imagem para copiá-la.';
  }
 });

 function compactCards() {
  for (const card of list.querySelectorAll('.comunica-item:not(.itop-comunica-compact)')) {
   const body = card.querySelector('p');
   const image = card.querySelector('.comunica-capa');
   const read = card.querySelector('button');
   const title = card.querySelector('h3');
   const date = card.querySelector('small');
   if (!body || !read || !title || !date) continue;
   card.classList.add('itop-comunica-compact');
   read.classList.add('itop-comunica-read');
   const copy = document.createElement('div');
   copy.className = 'itop-comunica-copy';
   const details = document.createElement('details');
   const summary = document.createElement('summary');
   const excerpt = document.createElement('span');
   excerpt.className = 'itop-comunica-excerpt';
   const confirmation = body.textContent.match(/\n\s*Confirme aqui: (https:\/\/docs\.google\.com\/forms\/d\/e\/[A-Za-z0-9_-]+\/viewform)\s*$/);
   if (confirmation) body.textContent = body.textContent.slice(0, confirmation.index).trimEnd();
   excerpt.textContent = body.textContent;
   summary.setAttribute('aria-label', 'Ver descrição completa');
   summary.append(excerpt);
   details.append(summary, body);
   copy.append(title, date, details);
   if (confirmation) {
    const confirm = document.createElement('a');
    confirm.className = 'itop-comunica-confirm';
    confirm.href = confirmation[1];
    confirm.target = '_blank';
    confirm.rel = 'noopener noreferrer';
    confirm.textContent = 'Confirmar presença';
    copy.append(confirm);
   }

   if (image) {
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.className = 'itop-comunica-cover';
    opener.setAttribute('aria-label', 'Ampliar capa do comunicado');
    image.removeAttribute('style');
    opener.append(image);
    opener.addEventListener('click', () => {
     fullImage.src = image.src;
     fullImage.alt = image.alt;
     copyStatus.textContent = '';
     zoom.showModal();
    });
    card.prepend(opener);
   }
   card.append(copy, read);
  }
 }
 new MutationObserver(compactCards).observe(list, {childList: true});
 compactCards();
})();
