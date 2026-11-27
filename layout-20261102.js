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
  list.style.setProperty('padding-inline', '6px', 'important');
 }
 const railLayout = document.createElement('style');
 railLayout.textContent = `

  .itop-module-menu .nav-tab[data-module="inova-blocos"] > .itop-inova-cover-label {
   position: absolute;
   inset-inline: 0;
   bottom: 11%;
   color: #fff;
   font: 700 14px/1.1 system-ui, sans-serif;
   text-align: center;
   text-shadow: 0 1px 4px #000, 0 0 5px #000;
   pointer-events: none;
   z-index: 2;
  }
  @media screen and (min-width: 901px) {
   html body > main:has(> .itop-work-rail) {
    --itop-rail-width: clamp(198.4px, 16.8%, 299.712px);
    max-width: none !important;
    grid-template-columns: var(--itop-rail-width) minmax(0, 1fr) var(--itop-rail-width) !important;
    padding-inline: 8px !important;
    column-gap: 6px !important;
   }
   html body > main > .itop-work-rail {
    padding-inline: 3px !important;
   }
   html body > main > .itop-work-rail :is(.itop-module-menu, .itop-link-menu) {
    width: 100% !important;
    max-width: none !important;
    margin-inline: 0 !important;
   }
  }
 `;
 document.head.append(railLayout);
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
 const financeLink = document.createElement('a');
 financeLink.id = 'itop-fluxo-eficiente';
 financeLink.href = 'https://financeiro.fluxoeficiente.com/';
 financeLink.target = '_blank';
 financeLink.rel = 'noopener';
 financeLink.setAttribute('aria-label', '16 Fluxo Eficiente');
 financeLink.hidden = true;
 financeLink.style.cssText = 'position:relative;width:100%;border-radius:9px;background:#050505';

 const financeCover = document.createElement('img');
 financeCover.src = 'capas/fluxo-eficiente-16.webp';
 financeCover.alt = '';
 financeCover.width = 720;
 financeCover.height = 377;
 financeCover.style.cssText = 'display:block;width:100%;height:auto;border-radius:inherit';

 const financeNumber = document.createElement('span');
 financeNumber.textContent = '16';
 financeNumber.setAttribute('aria-hidden', 'true');
 financeNumber.style.cssText = 'position:absolute;top:5px;left:5px;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#fff;color:#111;font-size:13px;font-weight:800;line-height:1';
 financeLink.append(financeCover, financeNumber);
 menu.querySelector('.nav-tabs').append(financeLink);

 let financeAccessCheck = 0;
 async function updateFinanceAccess(profile) {
  const check = ++financeAccessCheck;
  financeLink.hidden = true;
  financeLink.style.display = 'none';
  if (profile?.papel !== 'administrador') return;
  try {
   const {data, error} = await window.itopAuthClient.auth.getUser();
   if (check !== financeAccessCheck || error || data?.user?.email?.toLowerCase() !== 'mjfc9296@gmail.com') return;
   financeLink.hidden = false;
   financeLink.style.display = 'flex';
  } catch {
   // O atalho permanece oculto enquanto a sessão não pode ser confirmada.
  }
 }
 window.addEventListener('itop:authorized', event => void updateFinanceAccess(event.detail));
 window.addEventListener('itop:logged-out', () => void updateFinanceAccess());
 if (document.documentElement.classList.contains('itop-authorized')) {
  void updateFinanceAccess(window.itopAuthorizedProfile);
 }

 const inovaTab = document.createElement('button');
 inovaTab.type = 'button';
 inovaTab.className = 'nav-tab';
 inovaTab.hidden = true;
 inovaTab.dataset.module = 'inova-blocos';
 inovaTab.setAttribute('aria-label', '17 Inova Blocos — Painel');
 inovaTab.setAttribute('aria-controls', 'inova-blocos');
 inovaTab.innerHTML = '<img alt="" class="itop-tab-art" src="capas/menu-bronze-inova-blocos.webp"><span class="step-ball" aria-hidden="true">17</span><span class="itop-nav-label">Inova Blocos</span>';
 const inovaCoverLabel = document.createElement('span');
 inovaCoverLabel.className = 'itop-inova-cover-label';
 inovaCoverLabel.textContent = 'Painel';
 inovaCoverLabel.setAttribute('aria-hidden', 'true');
 inovaTab.append(inovaCoverLabel);
 menu.querySelector('.nav-tabs').append(inovaTab);

 const inovaPanel = document.createElement('section');
 inovaPanel.className = 'module';
 inovaPanel.id = 'inova-blocos';
 inovaPanel.hidden = true;
 const galleryMaterials = [
  { id: 'imagem-rastreamento', title: 'Rastreamento pelo remetente', image: true },
  { id: 'imagem-carregamento', title: 'Capacidade de carregamento', image: true },
  { id: 'imagem-quantidade', title: 'Calcular quantidade de blocos', image: true },
  { id: 'material-comparativo', title: 'Comparativo de blocos', image: true },
  { id: 'material-precos', title: 'Tabela de preços', image: true },
  { id: 'material-reducao', title: 'Redução de custo na obra', image: true }
 ];
 const archiveMaterials = [
  { id: 'manual-assistente-expedicao', title: 'Manual do Assistente de Expedição', cover: 'capa-manual-assistente-expedicao' },
  { id: 'procedimento-expedicao', title: 'Procedimento de Expedição, Carga e Descarga', cover: 'capa-procedimento-expedicao' },
  { id: 'cartaz-procedimentos-expedicao', title: 'Cartaz de Procedimentos de Expedição', image: true },
  { id: 'locacao-munck-sao-judas-tadeu', title: 'Locação de Munck São Judas Tadeu', cover: 'capa-locacao-munck-sao-judas-tadeu' }
 ];
 function materialCards(materials) {
  return materials.map(({ id, title, image, cover }) => `
   <li>
    ${image
     ? `<button type="button" data-arquivo="${id}" data-visualizar><img alt="" data-capa="${id}"><span>${title}</span></button>`
     : `<span class="itop-inova-file-label"><img alt="" data-capa="${cover}"><span>${title} (PDF)</span></span>`}
    <button type="button" data-arquivo="${id}" ${image ? 'data-imagem' : ''} aria-label="Baixar ${title}">Baixar</button>
   </li>`).join('');
 }
 inovaPanel.innerHTML = `
  <h2>Inova Blocos</h2>
  <p role="status"></p>
  <section hidden id="inova-compras" aria-label="Compras"></section>
  <section hidden id="inova-estoque" aria-labelledby="inova-estoque-titulo">
   <div class="inova-view-heading">
    <h2 id="inova-estoque-titulo">Estoque</h2>
   </div>
   <p role="status"></p>
   <style>
    #inova-estoque [data-pedido-estoque] { display: grid; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); gap: 8px; margin-bottom: 16px; }
    #inova-estoque [data-pedido-estoque] label { display: grid; align-content: end; gap: 4px; }
    html body #inova-blocos #inova-estoque :is(input:not([type="checkbox"]), output, button) {
     box-sizing: border-box;
     background: #f2faed !important;
     color: #162610 !important;
     border: 1px solid #45872a !important;
     border-radius: 8px;
     padding: 6px;
    }
    #inova-estoque input:not([type="checkbox"]) { width: 100%; min-width: 0; }
    #inova-estoque td output { display: inline-block; }
   </style>
   <h3>Pedido</h3>
   <div data-pedido-estoque>
    <label>Item<input name="item" maxlength="150"></label>
    <label>Quantidade<input name="quantidade" type="number" min="0" max="999999" step="1"></label>
    <label>Valor unitário (R$)<input name="valor" type="number" min="0" max="999999.99" step="0.01"></label>
    <label>Total<output>R$ 0,00</output></label>
   </div>
   <form data-editar-estoque>
    <div class="inova-estoque-grupos"></div>
    <button type="submit" disabled>Salvar estoque</button>
   </form>
  </section>
  <section hidden id="inova-fornecedores" aria-labelledby="inova-fornecedores-titulo">
   <div class="inova-view-heading">
    <h2 id="inova-fornecedores-titulo">Fornecedores</h2>
   </div>
   <form data-fornecedor>
    <label>Nome <input name="nome" maxlength="160" required></label>
    <label>Telefone <input name="telefone" type="tel" maxlength="40"></label>
    <label>Endereço <input name="endereco" maxlength="300"></label>
    <label>CNPJ <input name="cnpj" maxlength="18"></label>
    <label>Segmento <input name="segmento" maxlength="120"></label>
    <label>Observação <textarea name="observacao" maxlength="2000" rows="3"></textarea></label>
    <button type="submit">Salvar fornecedor</button>
   </form>
   <p data-salvamento role="status"></p>
   <h3>Fornecedores cadastrados</h3>
   <p data-consulta role="status"></p>
   <ul data-fornecedores></ul>
   <footer>
    <button type="button" data-pagina="-1" hidden>Anterior</button>
    <button type="button" data-pagina="1" hidden>Próxima</button>
   </footer>
  </section>
  <section id="inova-videos-uteis" hidden>
   <h3>Vídeos Úteis</h3>
   <button type="button" data-arquivo="video-demonstracao-inova" data-video>Demonstração da Inova Blocos</button>
   <video controls playsinline hidden aria-label="Demonstração da Inova Blocos"></video>
  </section>
  <section id="inova-imagens-uteis" hidden>
   <h3>Imagens Úteis</h3>
   <ul class="itop-inova-materials">${materialCards(galleryMaterials)}</ul>
   <h3 id="inova-arquivos-titulo">Arquivos Úteis</h3>
   <ul id="inova-arquivos" class="itop-inova-materials" aria-labelledby="inova-arquivos-titulo">${materialCards(archiveMaterials)}</ul>
   <dialog class="itop-inova-image-dialog" aria-labelledby="inova-imagem-titulo">
    <form method="dialog"><button type="submit">Fechar</button></form>
    <h3 id="inova-imagem-titulo"></h3>
    <img alt="">
   </dialog>
  </section>
 `;
 document.getElementById('comercial').after(inovaPanel);
 const inovaViews = '#inova-compras, #inova-proposta, #inova-envios, #inova-solicitacoes, #inova-estoque, #inova-fornecedores, #inova-imagens-uteis, #inova-videos-uteis';
 let purchases;
 let selectedInovaView = '';
 function selectInovaView(id) {
  selectedInovaView = id;
  for (const view of inovaPanel.querySelectorAll(inovaViews)) {
   view.hidden = view.id !== id;
   if (!view.hidden) inovaPanel.querySelector('.erp-legacy-content')?.append(view);
  }
  for (const button of moduleRail.querySelectorAll('.itop-inova-slot > button[aria-controls]')) {
   const active = button.getAttribute('aria-controls') === id;
   button.setAttribute('aria-current', active ? 'page' : 'false');
   if (button.hasAttribute('aria-expanded')) button.setAttribute('aria-expanded', String(active));
  }
  if (id !== 'inova-videos-uteis') inovaPanel.querySelector('video')?.pause();
  if (id) inovaPanel.closest('.itop-work-content')?.scrollTo({top: 0, behavior: 'instant'});
 }

 const proposalScript = document.createElement('script');
 proposalScript.src = 'inova-fachada/proposta.js?v=8';
 document.head.append(proposalScript);
 function openInovaProposal() {
  if (inovaTab.hidden) return;
  if (!inovaPanel.classList.contains('active')) {
   switchModule(inovaPanel.id);
  }
  selectInovaView('inova-proposta');
  const open = () => {
   if (selectedInovaView === 'inova-proposta' && inovaPanel.classList.contains('active') && !inovaTab.hidden) {
    window.dispatchEvent(new Event('itop:open-inova-proposta'));
   }
  };
  if (document.getElementById('inova-proposta')) open();
  else proposalScript.addEventListener('load', open, {once: true});
 }

 const header = document.querySelector('body > header');
 const inovaHeaderStyle = document.createElement('link');
 inovaHeaderStyle.rel = 'stylesheet';
 inovaHeaderStyle.href = 'inova-fachada/cabecalho.css?v=30';
 document.head.append(inovaHeaderStyle);

 const inovaHeader = document.createElement('div');
 inovaHeader.className = 'itop-inova-header';
 inovaHeader.hidden = true;
 inovaHeader.innerHTML = `
  <div class="itop-inova-mark">
   <img src="inova-fachada/marca.webp" alt="Inova Blocos">
  </div>
  <div class="itop-inova-divider" aria-hidden="true"></div>
  <div class="itop-inova-detail">
   <figure>
    <img src="inova-fachada/palete.webp" alt="Blocos empilhados em um palete">
    <figcaption>Isolamento Térmico e Acústico</figcaption>
   </figure>
   <figure>
    <img src="inova-fachada/fundacao.webp" alt="Assentamento dos blocos na obra">
    <figcaption>Eficiência Energética</figcaption>
   </figure>
   <figure>
    <img src="inova-fachada/obra.webp" alt="Construção com blocos">
    <figcaption>Economia</figcaption>
   </figure>
   <figure>
    <img src="inova-fachada/linha-de-blocos-transparente.png"
     alt="Conheça nossa linha de blocos. Blocos com isopor de 10 cm, 13 cm, 20 cm e 15 cm.">
    <figcaption>Rapidez</figcaption>
   </figure>
  </div>
  <div class="itop-inova-divider" aria-hidden="true"></div>
  <address class="itop-inova-contact">
   <strong>INOVA BLOCOS SUL DE MINAS ARTEFATO DE CIMENTO LTDA</strong>
   <span>CNPJ 63.802.378/0001-29</span>
   <span>Rua Alberto de Oliveira, 887</span>
   <span>Jardim São Carlos · Alfenas/MG</span>
   <span>CEP 37137-214</span>
   <a href="mailto:comercial@inovablocos.com">comercial@inovablocos.com</a>
   <a href="tel:+553530700929">(35) 3070-0929</a>
  </address>
 `;
 header.prepend(inovaHeader);

 const returnButton = document.createElement('button');
 returnButton.type = 'button';
 returnButton.className = 'itop-inova-return';
 returnButton.innerHTML = '<img src="inova-fachada/voltar.webp" alt="Voltar à UVI">';

 const gallery = inovaPanel.querySelector('#inova-imagens-uteis');
 const videos = inovaPanel.querySelector('#inova-videos-uteis');
 const video = videos.querySelector('video');
 const videosButton = document.createElement('button');
 videosButton.type = 'button';
 videosButton.className = 'itop-inova-gallery-button';
 videosButton.innerHTML = '<img src="inova-fachada/videos-uteis.webp" alt="Vídeos Úteis">';
 videosButton.setAttribute('aria-controls', videos.id);
 videosButton.setAttribute('aria-expanded', 'false');
 videosButton.addEventListener('click', () => {
  if (inovaTab.hidden || !inovaPanel.classList.contains('active')) return;
  selectInovaView(videos.id);
 });
 const imageDialog = gallery.querySelector('dialog');
 const previewImage = imageDialog.querySelector('img');
 const galleryButton = document.createElement('button');
 galleryButton.type = 'button';
 galleryButton.className = 'itop-inova-gallery-button itop-inova-materials-button';
 galleryButton.setAttribute('aria-controls', gallery.id);
 galleryButton.setAttribute('aria-expanded', 'false');
 galleryButton.innerHTML = '<span>Imagens Úteis</span><span>Arquivos Úteis</span>';
 galleryButton.addEventListener('click', () => {
  if (inovaTab.hidden || !inovaPanel.classList.contains('active')) return;
  selectInovaView(gallery.id);
  void loadMaterialCovers(gallery);
 });
 let previewUrl;
 imageDialog.addEventListener('close', () => {
  if (imageDialog.open || !previewUrl) return;
  previewImage.removeAttribute('src');
  URL.revokeObjectURL(previewUrl);
  previewUrl = undefined;
 });

 const usefulLinks = [
  { file: 'olist.webp', title: 'Olist', href: 'https://erp.olist.com/' },
  { file: 'fretebras.webp', title: 'Fretebras', href: 'https://novacentral.fretebras.com.br/' }
 ];
 const sectionCovers = [
  { file: 'pedido.webp', title: 'Pedido' },
  { file: 'envios.webp', title: 'Envios' },
  { file: 'feedback.webp', title: 'Feedback' }
 ];
 const requestsButton = document.createElement('button');
 requestsButton.type = 'button';
 requestsButton.className = 'itop-inova-gallery-button';
 requestsButton.setAttribute('aria-controls', 'inova-solicitacoes');
 requestsButton.innerHTML = '<img src="inova-fachada/solicitacoes.webp" alt="Solicitações">';
 requestsButton.addEventListener('click', () => {
  if (inovaTab.hidden || !inovaPanel.classList.contains('active')) return;
  const dialog = inovaPanel.querySelector('#inova-solicitacoes');
  if (dialog) {
   selectInovaView(dialog.id);
   dialog.dispatchEvent(new Event('inova:solicitacoes-abriu'));
   return;
  }
  selectInovaView('inova-solicitacoes');
  requestsButton.disabled = true;
  const script = document.createElement('script');
  script.src = 'inova-fachada/solicitacoes.js?v=3';
  script.addEventListener('load', () => {
   requestsButton.disabled = false;
   if (!inovaTab.hidden && inovaPanel.classList.contains('active') && selectedInovaView === 'inova-solicitacoes') {
    selectInovaView('inova-solicitacoes');
    inovaPanel.querySelector('#inova-solicitacoes')?.dispatchEvent(new Event('inova:solicitacoes-abriu'));
   }
  });
  script.addEventListener('error', () => {
   requestsButton.disabled = false;
   script.remove();
   archiveStatus.textContent = 'Não foi possível abrir Solicitações. Tente novamente.';
  });
  document.head.append(script);
 });
 const stockDialog = inovaPanel.querySelector('#inova-estoque');
 const stockStatus = stockDialog.querySelector('[role="status"]');
 const stockGroups = stockDialog.querySelector('.inova-estoque-grupos');
 const stockNumber = new Intl.NumberFormat('pt-BR');
 const stockButton = document.createElement('button');
 stockButton.type = 'button';
 stockButton.className = 'itop-inova-gallery-button';
 stockButton.setAttribute('aria-controls', stockDialog.id);
 stockButton.innerHTML = '<img src="inova-fachada/estoque.webp" alt="Estoque">';

 const stockForm = stockDialog.querySelector('[data-editar-estoque]');
 const stockSave = stockForm.querySelector('button');
 let stockRevision = null;
 let stockRequest = 0;

 function stockTable(title, prefix, rows) {
  const section = document.createElement('div');
  section.innerHTML = `
   <h3 id="inova-estoque-${prefix}">${title}</h3>
   <table aria-labelledby="inova-estoque-${prefix}">
    <thead><tr><th>Medida (cm)</th><th>Base</th><th>Adicional</th><th>Novos</th><th>Total</th></tr></thead>
    <tbody></tbody>
   </table>`;
  const body = section.querySelector('tbody');
  body.dataset.stockGroup = prefix;
  for (const [size, base, extra, isNew] of rows) {
   const row = body.insertRow();
   for (const [label, value] of [['Medida', size], ['Base', base], ['Adicional', extra]]) {
    const number = document.createElement('input');
    number.type = 'number';
    number.min = label === 'Medida' ? 1 : 0;
    number.max = 999999999;
    number.step = 1;
    number.required = true;
    number.value = value ?? 0;
    number.setAttribute('aria-label', `${title} ${size} cm — ${label}`);
    row.insertCell().append(number);
   }
   const newItems = document.createElement('input');
   newItems.type = 'checkbox';
   newItems.checked = Boolean(isNew);
   newItems.setAttribute('aria-label', `${title} ${size} cm — adicional de itens novos`);
   row.insertCell().append(newItems);
   const total = document.createElement('output');
   row.insertCell().append(total);
   const refresh = () => {
    const [, baseInput, extraInput] = row.querySelectorAll('input');
    total.value = stockNumber.format((baseInput.valueAsNumber || 0) + (extraInput.valueAsNumber || 0));
   };
   row.addEventListener('input', refresh);
   refresh();
  }
  return section;
 }

 stockForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (stockSave.disabled || stockDialog.hidden) return;
  const session = archiveSession;
  const request = stockRequest;
  const saldos = Object.fromEntries([...stockGroups.querySelectorAll('[data-stock-group]')].map(group => [
   group.dataset.stockGroup,
   [...group.rows].map(row => {
    const [size, base, extra, isNew] = row.querySelectorAll('input');
    return [size.valueAsNumber, base.valueAsNumber, extra.valueAsNumber, isNew.checked];
   })
  ]));
  const revisao = crypto.randomUUID();
  stockSave.disabled = true;
  stockStatus.textContent = 'Salvando estoque…';
  try {
   const table = window.itopAuthClient.from('inova_blocos_estoque');
   const query = stockRevision
    ? table.update({saldos, revisao}).eq('id', 1).eq('revisao', stockRevision)
    : table.insert({id: 1, saldos, revisao});
   const {data, error} = await query.select('revisao').maybeSingle();
   if (session !== archiveSession || request !== stockRequest) return;
   if (error && error.code !== '23505') throw error;
   if (!data) {
    stockStatus.textContent = 'O estoque foi alterado em outra sessão. Abra Estoque novamente antes de salvar.';
    return;
   }
   stockRevision = data.revisao;
   stockStatus.textContent = 'Estoque salvo.';
  } catch {
   if (session === archiveSession && request === stockRequest) stockStatus.textContent = 'Não foi possível salvar o estoque.';
  } finally {
   if (session === archiveSession && request === stockRequest) stockSave.disabled = false;
  }
 });

 const stockOrder = stockDialog.querySelector('[data-pedido-estoque]');
 const orderQuantity = stockOrder.querySelector('[name="quantidade"]');
 const orderPrice = stockOrder.querySelector('[name="valor"]');
 const orderTotal = stockOrder.querySelector('output');
 const orderMoney = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'});
 stockOrder.addEventListener('input', () => {
  const quantity = orderQuantity.validity.valid ? orderQuantity.valueAsNumber || 0 : 0;
  const cents = orderPrice.validity.valid ? Math.round((orderPrice.valueAsNumber || 0) * 100) : 0;
  orderTotal.value = orderMoney.format(quantity * cents / 100);
 });

 stockButton.addEventListener('click', async () => {
  if (inovaTab.hidden || !inovaPanel.classList.contains('active')) return;
  if (!stockDialog.hidden && stockSave.disabled && stockGroups.children.length) return;
  const request = ++stockRequest;
  stockSave.disabled = true;
  stockGroups.replaceChildren();
  stockStatus.textContent = 'Carregando estoque…';
  selectInovaView(stockDialog.id);
  const session = archiveSession;
  try {
   const {stock, revision} = await getInovaStock();
   if (session !== archiveSession || request !== stockRequest || stockDialog.hidden) return;
   stockRevision = revision;
   stockGroups.replaceChildren(stockTable('Máscara', 'mascara', stock.mascara), stockTable('Blocos', 'blocos', stock.blocos));
   stockSave.disabled = false;
   stockStatus.textContent = '';
  } catch {
   if (session === archiveSession && request === stockRequest && !stockDialog.hidden) {
    stockStatus.textContent = 'Não foi possível carregar o estoque. Selecione Estoque novamente para tentar.';
   }
  }
 });

 async function getInovaStock() {
  const client = window.itopAuthClient;
  const {data, error} = await client.from('inova_blocos_estoque').select('saldos,revisao').eq('id', 1).maybeSingle();
  if (error) throw error;
  if (data?.saldos) return {stock: data.saldos, revision: data.revisao};
  const initial = await client.from('inova_blocos_arquivos').select('pdf').eq('id', 'estoque-inicial').single();
  if (initial.error) throw initial.error;
  return {stock: JSON.parse(await inovaFileBlob(initial.data.pdf, 'application/json').text()), revision: null};
 }

 const supplierDialog = inovaPanel.querySelector('#inova-fornecedores');
 const supplierForm = supplierDialog.querySelector('[data-fornecedor]');
 const supplierSave = supplierForm.querySelector('[type="submit"]');
 const supplierStatus = supplierDialog.querySelector('[data-salvamento]');
 const supplierListStatus = supplierDialog.querySelector('[data-consulta]');
 const supplierList = supplierDialog.querySelector('[data-fornecedores]');
 const supplierPages = [...supplierDialog.querySelectorAll('[data-pagina]')];
 const supplierButton = document.createElement('button');
 supplierButton.type = 'button';
 supplierButton.className = 'itop-inova-gallery-button';
 supplierButton.setAttribute('aria-controls', supplierDialog.id);
 supplierButton.innerHTML = '<img src="inova-fachada/fornecedores.webp" alt="Fornecedores">';
 const supplierPageSize = 30;
 let supplierPage = 0;
 let supplierQuery = 0;
 let supplierSaving = false;

 async function loadSuppliers(page = 0) {
  const request = ++supplierQuery;
  const offset = page * supplierPageSize;
  supplierListStatus.textContent = 'Carregando fornecedores…';
  supplierPages.forEach(button => { button.disabled = true; });
  try {
   const { data, error } = await window.itopAuthClient.from('inova_blocos_fornecedores')
    .select('id,nome,telefone,endereco,cnpj,segmento,observacao')
    .order('criado_em', { ascending: false }).order('id', { ascending: false })
    .range(offset, offset + supplierPageSize);
   if (error) throw error;
   if (request !== supplierQuery || supplierDialog.hidden) return;
   supplierPage = page;
   supplierList.replaceChildren(...data.slice(0, supplierPageSize).map(record => {
    const item = document.createElement('li');
    const name = document.createElement('strong');
    name.textContent = record.nome;
    item.append(name);
    for (const [field, label] of Object.entries({
     telefone: 'Telefone', endereco: 'Endereço', cnpj: 'CNPJ',
     segmento: 'Segmento', observacao: 'Observação'
    })) {
     if (!record[field]) continue;
     const detail = document.createElement('span');
     detail.textContent = `${label}: ${record[field]}`;
     item.append(detail);
    }
    return item;
   }));
   supplierListStatus.textContent = data.length ? '' : 'Nenhum fornecedor cadastrado.';
   supplierPages[0].hidden = page === 0;
   supplierPages[1].hidden = data.length <= supplierPageSize;
  } catch {
   if (request === supplierQuery && !supplierDialog.hidden) {
    supplierListStatus.textContent = 'Não foi possível consultar os fornecedores. Selecione Fornecedores novamente para tentar.';
   }
  } finally {
   if (request === supplierQuery) supplierPages.forEach(button => { button.disabled = false; });
  }
 }

 supplierButton.addEventListener('click', () => {
  if (inovaTab.hidden || !inovaPanel.classList.contains('active')) return;
  supplierList.replaceChildren();
  supplierPages.forEach(button => { button.hidden = true; });
  selectInovaView(supplierDialog.id);
  loadSuppliers();
 });
 supplierPages.forEach(button => button.addEventListener('click', () => {
  loadSuppliers(supplierPage + Number(button.dataset.pagina));
 }));

 async function saveSupplier(form) {
  const fields = Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, value.trim() || null]));
  if (!fields.nome) {
   throw Object.assign(new Error('Preencha o nome do fornecedor.'), {field:'nome'});
  }
  if (fields.cnpj) {
   fields.cnpj = fields.cnpj.replace(/[.\/\s-]/g, '').toUpperCase();
   if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(fields.cnpj)) {
    throw Object.assign(new Error('Confira o formato do CNPJ.'), {field:'cnpj'});
   }
  }
  const {error} = await window.itopAuthClient.from('inova_blocos_fornecedores').insert(fields);
  if (error) throw error;
  return fields.nome;
 }

 function supplierError(error, form) {
  if (error?.field) {
   form.elements[error.field].focus();
   return error.message;
  }
  return error?.code === '23505' ? 'Já existe um fornecedor com esse CNPJ.'
   : 'Não foi possível salvar o fornecedor. Tente novamente.';
 }

 supplierForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (supplierSaving || inovaTab.hidden) return;
  const session = archiveSession;
  supplierSaving = supplierSave.disabled = true;
  supplierStatus.textContent = 'Salvando fornecedor…';
  try {
   await saveSupplier(supplierForm);
   if (session !== archiveSession) return;
   supplierForm.reset();
   supplierStatus.textContent = 'Fornecedor cadastrado.';
   if (!supplierDialog.hidden) loadSuppliers();
  } catch (error) {
   if (session !== archiveSession) return;
   supplierStatus.textContent = supplierError(error, supplierForm);
  } finally {
   supplierSaving = supplierSave.disabled = false;
  }
 });

 const moduleSlots = [requestsButton, stockButton, supplierButton, videosButton, returnButton];
 for (const rail of [moduleRail, linkRail]) {
  const slots = document.createElement('div');
  slots.className = 'itop-inova-slots';
  slots.hidden = true;
  const slotCount = rail === moduleRail ? 1 + sectionCovers.length + moduleSlots.length : usefulLinks.length;
  for (let index = 0; index < slotCount; index += 1) {
   const slot = document.createElement('div');
   slot.className = 'itop-inova-slot';
   const sectionCover = rail === moduleRail ? sectionCovers[index - 1] : undefined;
   if (rail === moduleRail && index === 0) slot.append(galleryButton);
   else if (sectionCover) {
    const image = document.createElement('img');
    image.className = 'itop-inova-section-cover';
    image.src = 'inova-fachada/' + sectionCover.file;
    image.alt = sectionCover.title;
    if (sectionCover.file === 'pedido.webp' || sectionCover.file === 'envios.webp') {
     const button = document.createElement('button');
     button.type = 'button';
     button.className = 'itop-inova-gallery-button';
     if (sectionCover.file === 'pedido.webp') {
      button.setAttribute('aria-controls', 'inova-proposta');
      button.addEventListener('click', openInovaProposal);
     } else {
      button.setAttribute('aria-controls', 'inova-envios');
      const openEnvios = () => {
       const dialog = inovaPanel.querySelector('#inova-envios');
       if (!dialog || selectedInovaView !== dialog.id || inovaTab.hidden || !inovaPanel.classList.contains('active')) return;
       selectInovaView(dialog.id);
       dialog.dispatchEvent(new Event('inova:abriu'));
      };
      button.addEventListener('click', () => {
       if (inovaTab.hidden || !inovaPanel.classList.contains('active')) return;
       selectInovaView('inova-envios');
       if (inovaPanel.querySelector('#inova-envios')) return openEnvios();
       button.disabled = true;
       const script = document.createElement('script');
       script.src = 'inova-fachada/envios.js?v=14';
       script.addEventListener('load', () => {
        button.disabled = false;
        openEnvios();
       });
       script.addEventListener('error', () => {
        button.disabled = false;
        script.remove();
        archiveStatus.textContent = 'Não foi possível abrir Envios. Tente novamente.';
       });
       document.head.append(script);
      });
     }
     button.append(image);
     slot.append(button);
    } else slot.append(image);
   } else if (rail === moduleRail) slot.append(moduleSlots[index - 1 - sectionCovers.length]);
   else {
    const { file, title, href } = usefulLinks[index];
    const link = document.createElement('a');
    link.className = 'itop-inova-covered-link';
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const image = document.createElement('img');
    image.src = 'inova-fachada/' + file;
    image.alt = title;
    link.append(image);
    slot.append(link);
   }
   slots.append(slot);
  }
  rail.append(slots);
 }

 returnButton.addEventListener('click', () => {
  switchModule('procedimentos');
  if (mq.matches) menu.open = true;
  menu.querySelector('.nav-tab.active')?.focus({ preventScroll: true });
 });

 const archiveStatus = inovaPanel.querySelector('[role="status"]');
 let archiveSession = 0;

 const materialCovers = [...inovaPanel.querySelectorAll('img[data-capa]')];
 const loadingCovers = new Set();

 function inovaFileBlob(hexData, type) {
  if (!hexData?.startsWith(String.fromCharCode(92) + 'x')) throw new Error('Arquivo indisponível');
  const hex = hexData.slice(2);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return new Blob([bytes], { type });
 }

 async function loadMaterialCovers(section) {
  const client = window.itopAuthClient;
  const missing = [...section.querySelectorAll('img[data-capa]:not([src])')];
  if (!client || inovaTab.hidden || loadingCovers.has(section) || !missing.length) return;
  const session = archiveSession;
  loadingCovers.add(section);
  try {
   const { data, error } = await client.from('inova_blocos_arquivos')
    .select('id,pdf').in('id', missing.map(image => image.dataset.capa));
   if (error || session !== archiveSession || inovaTab.hidden) return;
   for (const row of data) {
    for (const image of missing.filter(item => item.dataset.capa === row.id)) {
     image.src = URL.createObjectURL(inovaFileBlob(row.pdf, 'image/jpeg'));
    }
   }
  } catch {
   // O download continua disponível mesmo sem miniaturas.
  } finally {
   loadingCovers.delete(section);
  }
 }

 function setInovaAccess(allowed) {
  inovaTab.hidden = !allowed;
  if (!allowed) erp?.close();
  if (allowed) {
   inovaPanel.hidden = false;
   return;
  }
  inovaPanel.hidden = true;
  archiveSession += 1;
  if (inovaPanel.classList.contains('active')) switchModule('sondagem');
  inovaPanel.classList.remove('active');
  inovaTab.classList.remove('active');
  gallery.hidden = true;
  for (const cover of materialCovers) {
   if (cover.hasAttribute('src')) URL.revokeObjectURL(cover.src);
   cover.removeAttribute('src');
  }
  videos.hidden = video.hidden = true;
  videosButton.setAttribute('aria-expanded', 'false');
  if (video.hasAttribute('src')) {
   URL.revokeObjectURL(video.src);
   video.removeAttribute('src');
   video.load();
  }
  galleryButton.setAttribute('aria-expanded', 'false');
  if (imageDialog.open) imageDialog.close();
  selectInovaView('');
  purchases?.reset();
  inovaPanel.querySelector('#inova-envios')?.dispatchEvent(new Event('inova:saiu'));

  supplierQuery += 1;
  supplierForm.reset();
  supplierList.replaceChildren();
  supplierStatus.textContent = supplierListStatus.textContent = '';
  stockGroups.replaceChildren();
  stockRevision = null;
  for (const input of stockOrder.querySelectorAll('input')) input.value = '';
  orderTotal.value = orderMoney.format(0);
  stockStatus.textContent = '';
  archiveStatus.textContent = '';
 }

 const inovaRoute = new URLSearchParams(location.search).get('app') === 'inova-blocos';
 let erp;
 let inovaAccessCheck = 0;
 async function verifyInovaAccess(profile) {
  const check = ++inovaAccessCheck;
  if (profile?.papel !== 'administrador') {
   setInovaAccess(false);
   return;
  }
  let isOwner = false;
  try {
   const {data, error} = await window.itopAuthClient.auth.getUser();
   isOwner = !error && data?.user?.email?.toLowerCase() === 'mjfc9296@gmail.com';
  } catch {
   // Keep the module hidden when the session cannot be verified.
  }
  if (check !== inovaAccessCheck) return;
  setInovaAccess(isOwner);
  if (isOwner && inovaRoute) {
   switchModule(inovaPanel.id);
   try {
    const {mountErp} = await import('./inova-fachada/erp.js?v=1');
    if (check !== inovaAccessCheck || inovaTab.hidden) return;
    erp ??= mountErp(inovaPanel, {
     client: window.itopAuthClient,
     stock: stockButton,
     suppliers: supplierButton,
     requests: requestsButton,
     gallery: galleryButton,
     videos: videosButton,
     sales: moduleRail.querySelector('[aria-controls="inova-proposta"]'),
     shipments: moduleRail.querySelector('[aria-controls="inova-envios"]'),
     purchases: openPurchases,
     clear: () => selectInovaView('')
    });
    erp.open();
   } catch {
    void openPurchases();
   }
  }
 }
 window.addEventListener('itop:authorized', event => void verifyInovaAccess(event.detail));
 window.addEventListener('itop:logged-out', () => {
  inovaAccessCheck += 1;
  setInovaAccess(false);
 });
 if (document.documentElement.classList.contains('itop-authorized')) {
  void verifyInovaAccess(window.itopAuthorizedProfile);
 }

 const compras = inovaPanel.querySelector('#inova-compras');
 const comprasStyle = document.createElement('link');
 comprasStyle.rel = 'stylesheet';
 comprasStyle.href = 'inova-fachada/compras.css?v=7';
 document.head.append(comprasStyle);
 inovaTab.addEventListener('click', () => {
  if (inovaTab.hidden) return;
  const url = new URL(location.href);
  url.searchParams.set('app', 'inova-blocos');
  url.hash = '';
  location.assign(url);
 });
 async function openPurchases() {
  if (inovaTab.hidden) return;
  switchModule(inovaPanel.id);
  selectInovaView(compras.id);
  try {
   if (!purchases) {
    compras.textContent = 'Carregando Compras…';
    const {mountPurchases} = await import('./inova-fachada/compras.js?v=13');
    if (inovaTab.hidden || compras.hidden || !inovaPanel.classList.contains('active')) return;
    purchases ??= mountPurchases(compras, async () => (await getInovaStock()).stock, {supplierForm, saveSupplier, supplierError});
    compras.querySelector('[data-return]').onclick = () => returnButton.click();
   }
   void purchases.open();
  } catch {
   compras.textContent = 'Não foi possível abrir Compras. Selecione o módulo novamente.';
  }
 }
 for (const button of inovaPanel.querySelectorAll('button[data-arquivo]')) {
  button.addEventListener('click', async () => {
   const client = window.itopAuthClient;
   if (!client || inovaTab.hidden) return;
   const session = archiveSession;
   button.disabled = true;
   archiveStatus.textContent = 'Carregando arquivo…';
   try {
    const { data, error } = await client.from('inova_blocos_arquivos')
     .select('titulo,pdf').eq('id', button.dataset.arquivo).single();
    if (session !== archiveSession) return;
    if (error || !data) throw new Error('Arquivo indisponível');
    if (button.hasAttribute('data-video')) {
     if (!inovaPanel.classList.contains('active') || videos.hidden) {
      archiveStatus.textContent = '';
      return;
     }
     if (video.hasAttribute('src')) URL.revokeObjectURL(video.src);
     video.src = URL.createObjectURL(inovaFileBlob(data.pdf, 'video/mp4'));
     video.hidden = false;
     void video.play().catch(() => {});
     archiveStatus.textContent = '';
     return;
    }
    const showImage = button.hasAttribute('data-visualizar');
    if (showImage && (!inovaPanel.classList.contains('active') || button.closest('[hidden]') || imageDialog.open)) {
     archiveStatus.textContent = '';
     return;
    }
    const isImage = showImage || button.hasAttribute('data-imagem');
    const url = URL.createObjectURL(inovaFileBlob(data.pdf, isImage ? 'image/jpeg' : 'application/pdf'));
    if (showImage) {
     if (previewUrl) URL.revokeObjectURL(previewUrl);
     previewUrl = url;
     imageDialog.querySelector('h3').textContent = data.titulo;
     previewImage.alt = data.titulo;
     previewImage.src = url;
     imageDialog.showModal();
     archiveStatus.textContent = '';
     return;
    }
    const download = document.createElement('a');
    download.href = url;
    const suffix = button.dataset.arquivo === 'locacao-munck-sao-judas-tadeu' ? '' : ' - Inova Blocos';
    download.download = data.titulo + suffix + (isImage ? '.jpg' : '.pdf');
    download.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    archiveStatus.textContent = '';
   } catch {
    if (session === archiveSession) archiveStatus.textContent = 'Não foi possível abrir o arquivo. Tente novamente.';
   } finally {
    button.disabled = false;
   }
  });
 }

 const tabs=[...document.querySelectorAll('.nav-tab[data-module]')];
 function sync(){tabs.forEach(tab=>tab.setAttribute('aria-current',tab.classList.contains('active')?'page':'false'));}
 tabs.forEach(tab=>{tab.addEventListener('click',()=>{sync();if(mq.matches){menu.open=false;document.querySelector('.module.active')?.scrollIntoView({behavior:'smooth',block:'start'});}});});
 new MutationObserver(sync).observe(document.querySelector('nav.nav-tabs'),{subtree:true,attributes:true,attributeFilter:['class']});
 const action=document.getElementById('simulateEnergy')?.closest('.actions');
 if(action)document.querySelector('#pacote')?.append(action);
 sync();

 const telemedicineScript = document.createElement('script');
 telemedicineScript.src = 'telemedicina.js?v=20261127-reativar';
 document.head.append(telemedicineScript);
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

  const netz = sidebar.find(link => link.href === 'https://www.netzenergia.com.br/');
  const mkMovidesk = sidebar.find(link => link.hostname === 'mksolutions.movidesk.com');
  if (netz && mkMovidesk) {
    mkMovidesk.after(netz);
    sidebar.splice(sidebar.indexOf(netz), 1);
    sidebar.splice(sidebar.indexOf(mkMovidesk) + 1, 0, netz);
  }

  const dryRecharge = sidebar.find(link => link.hostname === 'itop.drytelecom.tech');
  const brazRecharge = sidebar.find(link => link.href === 'https://parceiro.brazmovel.com.br/');
  if (dryRecharge && brazRecharge) {
    dryRecharge.after(brazRecharge);
    sidebar.splice(sidebar.indexOf(brazRecharge), 1);
    sidebar.splice(sidebar.indexOf(dryRecharge) + 1, 0, brazRecharge);
    brazRecharge.title = 'Recarga Braz';
    brazRecharge.setAttribute('aria-label', 'Recarga Braz (abre em nova aba)');
    brazRecharge.querySelector('img').alt = 'Recarga Braz';
  }

  const links = [...grid.querySelectorAll('.useful-link-item')];
  const sidebarOrder = new Map(sidebar.map((link, position) => [link.href, position]));
  const primaryLink = item => item.querySelector('a.useful-link');
  const position = item => sidebarOrder.get(primaryLink(item)?.href) ?? sidebar.length;
  links.sort((first, second) => position(first) - position(second));
  grid.append(...links);
  grid.style.setProperty('grid-template-columns', 'minmax(0, 1fr)', 'important');

  const zeusUrl = 'https://administrator.tipbrasil.com.br/zeus_admin/cp_zeus/login';
  const covers = new Map([
    ['mkbot.itop.net.br/mk/mkcore/Login/', 'capas/link-portal-mk.webp?v=20261122-artes'],
    ['mksolutions.movidesk.com/Account/Login', 'capas/link-mk-movidesk.webp?v=20261122-artes'],
    ['tip.movidesk.com/Ticket/Create', 'capas/link-tip-movidesk.webp?v=20261122-artes'],
    ['easy2use.com.br/mvno/wp-login.php', 'capas/link-tip-easy.webp?v=20261122-artes'],
    ['tip.movidesk.com/kb/pt-br/article/526696/portabilidade-via-easy-servicos', 'capas/link-tip-manual.webp?v=20261122-artes'],
    ['administrator.tipbrasil.com.br/zeus_admin/cp_zeus/login', 'capas/link-tip-zeus.webp?v=20261122-artes'],
    ['site.dryconecta.com.br/ativar-chip/informacoes-basicas', 'capas/link-dry-ativar.webp?v=20261122-artes'],
    ['www.tim.com.br/para-voce/cobertura-e-roaming/mapa-de-cobertura', 'capas/link-dry-cobertura.webp?v=20261122-artes'],
    ['itop.drytelecom.tech/index.php', 'capas/link-dry-recargas.webp?v=20261122-artes'],
    ['vivo.com.br/para-voce/por-que-vivo/qualidade/cobertura', 'capas/link-braz-cobertura.webp?v=20261122-artes'],
    ['parceiro.brazmovel.com.br/', 'capas/link-braz-recargas.webp?v=20261122-artes'],
    ['www.google.com/maps/d/u/0/viewer', 'capas/link-itop-fibra.webp?v=20261122-artes'],
    ['www.portaldoassinante.com/itoptelecom/login', 'capas/link-assinante.webp?v=20261122-artes'],
    ['tarefas.fluxoeficiente.com/sectors', 'capas/link-tarefas.webp?v=20261122-artes'],
    ['www.netzenergia.com.br/', 'capas/link-netz.webp?v=20261122-artes'],
    ['remuneratop.itop.net.br/product/', 'capas/link-remunera.webp?v=20261122-artes'],
    ['www.playhub.com.br/APP/login', 'capas/link-playhub.webp?v=20261122-artes'],
    ['plataforma.celetihub.com.br/login', 'capas/link-celeti.webp?v=20261122-artes'],
    ['dashboard.aliviaapp.com.br/authentication/sign-in', 'capas/link-telemedicina.webp?v=20261122-artes'],
    ['consultanumero.abrtelecom.com.br/consultanumero/consulta/consultaHistoricoRecenteCtg', 'capas/link-consulta-numero.webp?v=20261122-artes'],
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
    if (link && link.href === brazRecharge?.href) {
      item.querySelector('.useful-link-copy strong').textContent = 'Recarga Braz';
      item.querySelector('.itop-useful-cover').alt = 'Recarga Braz';
    }
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
      background: #000000 !important;
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
        background: '#000000', color: '#fff', border: '0',
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
      cover: 'capas/uvi-novos-planos-capa.webp',
      pdf: 'Itop-Apresentacao-Comercial-11-11-2026-v2-versao-clara.pdf',
      pages: 10,
      description: 'Tabela comercial atualizada em 11/11/2026.'
    });
    setMaterial(blackFriday, {
      title: 'Black Friday 2026',
      cover: 'capas/uvi-black-friday-2026-capa.webp',
      pdf: 'Itop-Black-Friday-2026-v2.pdf',
      pages: 4,
      description: 'Material da campanha Black Friday 2026.'
    });
    blackFriday.dataset.category = 'black-friday';
    blackFriday.querySelector('.training-meta').textContent = 'Black Friday';
    plans.after(blackFriday);
    const count = document.querySelector('[data-filter="planos-combos"] b');
    if (count) count.textContent = String(document.querySelectorAll('#procedimentos .training-grid [data-category="planos-combos"]').length);
    const allCount = document.querySelector('[data-filter="all"] b');
    if (allCount && /^\d+$/.test(allCount.textContent.trim())) allCount.textContent = Number(allCount.textContent) + 1;
    document.querySelector('#trainingSearch')?.dispatchEvent(new Event('input'));
  }

  const hub = document.querySelector('#procedimentos .itop-hub');
  const svaList = document.querySelector('#svas-area .sva-horizontal-list');
  if (hub && svaList) {
    const videos = [...hub.querySelectorAll('.hub-material:has(video)')];
    for (const source of videos) {
      const video = source.querySelector('video');
      const title = source.querySelector('h3').textContent;
      const link = source.querySelector('a');
      const row = document.createElement('article');
      row.className = 'training-card sva-horizontal-row';
      const cover = link.cloneNode();
      cover.className = 'training-cover';
      cover.setAttribute('aria-label', 'Abrir vídeo: ' + title);
      const image = document.createElement('img');
      image.src = video.getAttribute('poster');
      image.alt = '';
      image.loading = 'lazy';
      cover.append(image);
      const description = document.createElement('p');
      description.textContent = 'Vídeo de ativação';
      const actions = document.createElement('div');
      actions.className = 'training-actions';
      link.className = 'training-open';
      actions.append(link);
      row.append(cover, source.querySelector('h3'), description, actions);
      svaList.append(row);
      source.remove();
    }
    const count = document.querySelector('#svas-area .section-tag');
    if (count) count.textContent = svaList.children.length + ' MATERIAIS';
    hub.querySelector('p').textContent = 'Campanhas e materiais internos para a equipe de vendas.';
  }

  const talos = document.querySelector('#procedimentos [data-training^="TALOS"]');
  const talosCover = talos?.querySelector('.training-cover img');
  if (talosCover) talosCover.src = 'capa-talos-uvi.webp';
  const moduleHeading = document.querySelector('#portaria-seguranca section > h3');
  const moduleActions = moduleHeading?.nextElementSibling;
  if (moduleActions?.matches('.training-actions')) {
    const portfolio = 'Itop-Apresentacao-Comercial-11-11-2026-v2-versao-clara.pdf';
    const card = document.createElement('article');
    card.className = 'training-card';
    card.innerHTML = `
      <a class="training-cover" href="${portfolio}" target="_blank" rel="noopener" aria-label="Visualizar portfólio Security">
        <img src="capas/security-portfolio.webp" alt="ITOP Security — Portfólio de planos" loading="lazy" style="object-fit:contain">
      </a>
      <h3>Security · Portfólio de planos</h3>
      <div class="training-actions">
        <a class="training-open" href="${portfolio}" target="_blank" rel="noopener">Visualizar PDF</a>
        <a class="training-download" href="${portfolio}" download>Baixar</a>
      </div>`;
    moduleHeading.replaceWith(card);
    moduleActions.remove();
  }
})();

/* Capas da navegação lateral, associadas aos módulos pelo identificador. */
for (const moduleId of ["sondagem","pacote","fechamento","energia","itop-movel","movel","itop-comunica","procedimentos","svas-area","comissionamento-area","portaria-seguranca","gestao-usuarios","comercial"]) {
  const cover = document.querySelector('.itop-module-menu .nav-tab[data-module="' + moduleId + '"] .itop-tab-art');
  if (!cover) continue;
  if (moduleId === 'portaria-seguranca') {
    cover.src = 'capas/menu-security.webp';
    cover.alt = '';
    const tab = cover.closest('button');
    tab.setAttribute('aria-label', '13 Security');
    tab.querySelector('.step-ball')?.remove();
    tab.querySelector('.itop-nav-label').textContent = 'Security';
  } else {
    cover.src = 'capas/menu-bronze-' + moduleId + '.webp';
  }
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

(() => {
  const fields = 'input:not([type=hidden],[type=checkbox],[type=radio],[type=range],[type=color],[type=button],[type=submit],[type=reset]), select, textarea';
  const buttons = 'button, input[type=button], input[type=submit], [role=button], a.training-open, a.training-download, a.useful-link, .training-actions a';

  function hasColor(value, matches) {
    return [...value.matchAll(/rgba?\(([^)]+)\)/g)].some((color) => {
      const [red, green, blue, alpha = 1] = color[1].split(',').map(Number);
      return alpha > 0 && matches(red, green, blue);
    });
  }

  const orange = (red, green, blue) => red >= 150 && red - green >= 30 && green - blue >= 30;
  const blue = (red, green, blue) => blue - red >= 24 && blue - green >= 14;

  function applyColors() {
    for (const element of document.querySelectorAll(fields + ', ' + buttons)) {
      const style = getComputedStyle(element);
      if (element.matches(fields)) {
        const orangeBorder = ['Top', 'Right', 'Bottom', 'Left'].some((side) =>
          parseFloat(style['border' + side + 'Width']) > 0 &&
          hasColor(style['border' + side + 'Color'], orange)
        );
        if (orangeBorder) element.style.setProperty('background-color', '#fff1e3', 'important');
      } else if (element.id !== 'itop-closing-energy-simulation' && !style.backgroundImage.includes('url(') &&
        (hasColor(style.backgroundColor, blue) || hasColor(style.backgroundImage, blue))) {
        element.style.setProperty('background', '#000', 'important');
        element.style.setProperty('color', '#fff', 'important');
        element.style.setProperty('-webkit-text-fill-color', '#fff', 'important');
      }
    }
  }

  let pending = false;
  function scheduleColors() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      applyColors();
    });
  }

  const styles = document.createElement('style');
  styles.textContent = `
    html.itop-authorized body main #sondagem .itop-sondagem-panel .itop-survey-proposal-row
    :is(#itop-flow-new, #recover-proposal, #itop-phone-action, #itop-search-toggle, #itop-return-bell, .commercial-test-toggle):not([hidden]) {
      box-sizing: border-box;
      width: 100% !important;
      height: 40px !important;
      min-height: 40px !important;
      max-height: 40px !important;
      margin: 0 !important;
      padding: 2px 5px !important;
      display: flex !important;
      align-items: center;
      justify-content: center;
      font-size: 12px !important;
      line-height: 1.1 !important;
      white-space: normal !important;
    }
  `;
  document.head.append(styles);
  new MutationObserver(scheduleColors).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'hidden']
  });
  document.addEventListener('load', (event) => {
    if (event.target.matches?.('link[rel=stylesheet]')) scheduleColors();
  }, true);
  window.addEventListener('resize', scheduleColors);
  scheduleColors();
})();
