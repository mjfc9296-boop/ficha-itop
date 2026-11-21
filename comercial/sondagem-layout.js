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
    banner.src = 'comercial/sondagem-cabecalho-20261117.jpg';
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
  ['procedimentos', 'uvi-universidade-de-vendas-topo.webp', 'UVI — Universidade de Vendas ITOP', 2048, 684]
 ]) {
  const module = $(moduleId);
  if (!module) continue;
  const banner = document.createElement('img');
  banner.src = 'comercial/' + image;
  banner.alt = title;
  banner.width = width;
  banner.height = height;
  banner.style.cssText = 'display:block;width:100%;height:auto;margin:0 0 12px';
  if (moduleId === 'movel') {
   banner.style.width = 'calc(100% - 24px)';
   banner.style.margin = '8px auto 12px';
  }
  if (moduleId === 'procedimentos') {
   banner.style.clipPath = 'inset(0 round 5.4% / 16.2%)';
  }
  module.prepend(banner);
 }
 const comunicaBadge = $('comunicaBadge');
 if (comunicaBadge) {
  const badgeStyle = document.createElement('style');
  badgeStyle.textContent = `
   html body main .nav-tab #comunicaBadge:not([hidden]) {
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
