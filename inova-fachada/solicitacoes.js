(() => {
 const panel = document.getElementById('inova-blocos');
 const dialog = document.createElement('section');
 dialog.id = 'inova-solicitacoes';
 dialog.hidden = true;
 dialog.setAttribute('aria-labelledby', 'inova-solicitacoes-titulo');
 dialog.innerHTML = `
  <div class="inova-view-heading">
   <h2 id="inova-solicitacoes-titulo">Solicitações</h2>
  </div>
  <nav aria-label="Tipo de solicitação">
   <button type="button" data-tipo="visita" aria-controls="inova-ata-visita" aria-pressed="true">Ata de Visita</button>
   <button type="button" data-tipo="reposicao" aria-controls="inova-reposicao" aria-pressed="false">Reposição</button>
  </nav>
  <form id="inova-ata-visita">
   <h3>Ata de Visita</h3>
   <p>MARIO JOSE FERREIRA CAPUTO</p>
   <div class="inova-solicitacoes-dados">
    <label>Data da visita<input name="data" type="date" required></label>
    <label>Falei com<input name="contato" type="text" maxlength="180" required></label>
   </div>
   <label>Solicitação de produtos
    <textarea name="itens" rows="6" required placeholder="Digite um produto por linha."></textarea>
   </label>
   <div>
    <button type="submit">Salvar ata</button>
    <button type="submit" data-pdf>Salvar e gerar PDF</button>
   </div>
  </form>
  <form id="inova-reposicao" hidden>
   <h3>Reposição</h3>
   <p>SUPERVISÃO: MARIO CAPUTO</p>
   <label>Data<input name="data" type="date" required></label>
   <label>Observações
    <textarea name="itens" rows="6" required aria-describedby="inova-reposicao-dica"></textarea>
   </label>
   <small id="inova-reposicao-dica">Separe os itens por linha ou ponto e vírgula. O PDF vai numerá-los.</small>
   <button type="submit">Gerar PDF da Reposição</button>
  </form>
  <p data-status role="status"></p>
  <section data-historico aria-labelledby="inova-atas-titulo">
   <h3 id="inova-atas-titulo">Histórico de atas de visita</h3>
   <button type="button" data-atualizar>Atualizar histórico</button>
   <p data-historico-status role="status"></p>
   <div data-atas></div>
   <button type="button" data-mais hidden>Carregar mais atas</button>
  </section>`;
 panel.append(dialog);

 const forms = [...dialog.querySelectorAll('form')];
 const choices = [...dialog.querySelectorAll('[data-tipo]')];
 const status = dialog.querySelector('[data-status]');
 const history = dialog.querySelector('[data-historico]');
 const historyStatus = history.querySelector('[data-historico-status]');
 const records = history.querySelector('[data-atas]');
 const more = history.querySelector('[data-mais]');
 const table = 'inova_blocos_atas_visita';
 const pageSize = 20;
 let offset = 0;
 let historyRequest = 0;
 let sessionVersion = 0;
 let visitDraft;
 let saving = false;

 function renderVisit(visit) {
  const entry = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = visit.data_visita.split('-').reverse().join('/') + ' · ' + visit.contato;
  const author = document.createElement('p');
  author.textContent = visit.responsavel;
  const products = document.createElement('p');
  products.style.whiteSpace = 'pre-wrap';
  products.textContent = visit.solicitacao_produtos;
  const pdf = document.createElement('button');
  pdf.type = 'button';
  pdf.textContent = 'Gerar PDF';
  pdf.addEventListener('click', () => {
   try {
    downloadPdf(visit, parseItems(visit.solicitacao_produtos, false), true);
    status.textContent = 'PDF gerado.';
   } catch {
    status.textContent = 'Não foi possível gerar o PDF. Tente novamente.';
   }
  });
  entry.append(summary, author, products, pdf);
  return entry;
 }

 async function loadVisits(append = false) {
  const request = ++historyRequest;
  const start = append ? offset : 0;
  more.hidden = true;
  historyStatus.textContent = 'Carregando atas…';
  try {
   const {data, error} = await window.itopAuthClient.from(table)
    .select('id,responsavel,data_visita,contato,solicitacao_produtos')
    .order('data_visita', {ascending: false})
    .order('criada_em', {ascending: false})
    .order('id', {ascending: false})
    .range(start, start + pageSize);
   if (request !== historyRequest) return;
   if (error) throw error;
   const page = data.slice(0, pageSize).map(renderVisit);
   if (append) records.append(...page);
   else records.replaceChildren(...page);
   offset = start + page.length;
   more.hidden = data.length <= pageSize;
   historyStatus.textContent = offset ? '' : 'Nenhuma ata de visita registrada.';
  } catch {
   if (request !== historyRequest) return;
   more.hidden = !append;
   historyStatus.textContent = 'Não foi possível carregar o histórico. Tente novamente.';
  }
 }

 history.querySelector('[data-atualizar]').addEventListener('click', () => loadVisits());
 more.addEventListener('click', () => loadVisits(true));
 dialog.addEventListener('inova:solicitacoes-abriu', () => {
  if (!history.hidden) loadVisits();
 });

 function select(index) {
  choices.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  forms.forEach((form, i) => { form.hidden = i !== index; });
  history.hidden = index !== 0;
  status.textContent = '';
 }

 function reset() {
  const today = new Intl.DateTimeFormat('sv-SE', {timeZone: 'America/Sao_Paulo'}).format(new Date());
  for (const form of forms) {
   form.reset();
   form.elements.data.value = today;
   form.elements.itens.setCustomValidity('');
   form.elements.contato?.setCustomValidity('');
  }
  select(0);
 }

 choices.forEach((button, index) => button.addEventListener('click', () => {
  select(index);
  if (index === 0) loadVisits();
 }));
 window.addEventListener('itop:logged-out', () => {
  dialog.hidden = true;
  sessionVersion += 1;
  historyRequest += 1;
  visitDraft = undefined;
  offset = 0;
  records.replaceChildren();
  historyStatus.textContent = '';
  more.hidden = true;
  reset();
 });
 reset();

 function parseItems(value, numbered) {
  return value.split(numbered ? /[\r\n;]+/ : /[\r\n]+/)
   .map(item => item.trim().replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, ''))
   .filter(Boolean);
 }

 function downloadPdf(visit, items, isVisit) {
  const doc = new window.jspdf.jsPDF({unit: 'mm', format: 'a4'});
  const title = isVisit ? 'Ata de Visita' : 'Reposição';
  const date = visit.data_visita.split('-').reverse().join('/');
  let y;

  function pageHeader() {
   doc.setFillColor(24, 30, 26);
   doc.rect(0, 0, 210, 30, 'F');
   doc.setFillColor(111, 204, 43);
   doc.rect(0, 30, 210, 2, 'F');
   doc.setTextColor(255);
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(10);
   doc.text('INOVA BLOCOS', 15, 11);
   doc.setFontSize(20);
   doc.text(title, 15, 23);
   doc.setTextColor(25);
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(11);
   y = 43;
  }

  function write(text, x, width) {
   for (const line of doc.splitTextToSize(text, width)) {
    if (y > 272) {
     doc.addPage();
     pageHeader();
    }
    doc.text(line, x, y);
    y += 6;
   }
  }

  pageHeader();
  write(isVisit ? visit.responsavel : 'SUPERVISÃO: MARIO CAPUTO', 15, 180);
  write((isVisit ? 'Data da visita: ' : 'Data: ') + date, 15, 180);
  if (isVisit) write('Falei com: ' + visit.contato, 15, 180);
  y += 5;
  doc.setFont('helvetica', 'bold');
  write(isVisit ? 'Solicitação de produtos' : 'Itens de reposição', 15, 180);
  doc.setFont('helvetica', 'normal');
  items.forEach((item, index) => {
   write((isVisit ? '• ' : (index + 1) + '. ') + item, 15, 180);
   y += 2;
  });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
   doc.setPage(page);
   doc.setFontSize(9);
   doc.text(page + ' / ' + pages, 195, 287, {align: 'right'});
  }
  doc.save((isVisit ? 'Ata-de-Visita' : 'Reposicao') + '-Inova-Blocos-' + visit.data_visita + '.pdf');
 }

 forms.forEach((form, index) => {
  form.addEventListener('input', event => {
   event.target.setCustomValidity('');
   status.textContent = '';
  });
  form.addEventListener('submit', async event => {
   event.preventDefault();
   if (panel.hidden || !panel.classList.contains('active') || dialog.hidden) return;
   const isVisit = index === 0;
   const {itens, contato} = form.elements;
   const items = parseItems(itens.value, !isVisit);
   itens.setCustomValidity(items.length ? '' : 'Informe pelo menos um item.');
   if (isVisit) contato.setCustomValidity(contato.value.trim() ? '' : 'Informe com quem você falou.');
   if (!form.reportValidity()) return;
   const visit = {
    data_visita: form.elements.data.value,
    contato: contato?.value.trim(),
    solicitacao_produtos: itens.value
   };
   if (isVisit) {
    if (saving) return;
    saving = true;
    const version = sessionVersion;
    const buttons = [...form.querySelectorAll('button[type="submit"]')];
    buttons.forEach(button => { button.disabled = true; });
    status.textContent = 'Salvando ata…';
    try {
     const snapshot = JSON.stringify(visit);
     if (visitDraft?.snapshot !== snapshot) {
      visitDraft = {snapshot, id: crypto.randomUUID()};
     }
     const {error} = await window.itopAuthClient.from(table)
      .upsert({id: visitDraft.id, ...visit}, {onConflict: 'id', ignoreDuplicates: true});
     if (error) throw error;
    } catch {
     if (version === sessionVersion) status.textContent = 'Não foi possível salvar a ata. Tente novamente.';
     return;
    } finally {
     saving = false;
     buttons.forEach(button => { button.disabled = false; });
    }
    if (version !== sessionVersion) return;
    loadVisits();
    if (!event.submitter?.hasAttribute('data-pdf')) {
     status.textContent = 'Ata salva.';
     return;
    }
    visit.responsavel = form.querySelector('h3 + p').textContent;
   }
   try {
    downloadPdf(visit, items, isVisit);
    status.textContent = isVisit ? 'Ata salva e PDF gerado.' : 'PDF gerado.';
   } catch {
    status.textContent = isVisit ? 'Ata salva. Gere o PDF pelo histórico.' : 'Não foi possível gerar o PDF. Tente novamente.';
   }
  });
 });
})();
