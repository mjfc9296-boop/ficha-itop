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
   <button type="submit">Gerar PDF da Ata de Visita</button>
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
  <p data-status role="status"></p>`;
 panel.append(dialog);

 const forms = [...dialog.querySelectorAll('form')];
 const choices = [...dialog.querySelectorAll('[data-tipo]')];
 const status = dialog.querySelector('[data-status]');

 function select(index) {
  choices.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  forms.forEach((form, i) => { form.hidden = i !== index; });
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

 choices.forEach((button, index) => button.addEventListener('click', () => select(index)));
 window.addEventListener('itop:logged-out', () => {
  dialog.hidden = true;
  reset();
 });
 reset();

 function parseItems(value, numbered) {
  return value.split(numbered ? /[\r\n;]+/ : /[\r\n]+/)
   .map(item => item.trim().replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, ''))
   .filter(Boolean);
 }

 function downloadPdf(form, items, isVisit) {
  const doc = new window.jspdf.jsPDF({unit: 'mm', format: 'a4'});
  const title = isVisit ? 'Ata de Visita' : 'Reposição';
  const date = form.elements.data.value.split('-').reverse().join('/');
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
  write(isVisit ? 'MARIO JOSE FERREIRA CAPUTO' : 'SUPERVISÃO: MARIO CAPUTO', 15, 180);
  write((isVisit ? 'Data da visita: ' : 'Data: ') + date, 15, 180);
  if (isVisit) write('Falei com: ' + form.elements.contato.value.trim(), 15, 180);
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
  doc.save((isVisit ? 'Ata-de-Visita' : 'Reposicao') + '-Inova-Blocos-' + form.elements.data.value + '.pdf');
 }

 forms.forEach((form, index) => {
  form.addEventListener('input', event => {
   event.target.setCustomValidity('');
   status.textContent = '';
  });
  form.addEventListener('submit', event => {
   event.preventDefault();
   if (panel.hidden || !panel.classList.contains('active') || dialog.hidden) return;
   const isVisit = index === 0;
   const {itens, contato} = form.elements;
   const items = parseItems(itens.value, !isVisit);
   itens.setCustomValidity(items.length ? '' : 'Informe pelo menos um item.');
   if (isVisit) contato.setCustomValidity(contato.value.trim() ? '' : 'Informe com quem você falou.');
   if (!form.reportValidity()) return;
   try {
    downloadPdf(form, items, isVisit);
    status.textContent = 'PDF gerado.';
   } catch {
    status.textContent = 'Não foi possível gerar o PDF. Tente novamente.';
   }
  });
 });
})();
