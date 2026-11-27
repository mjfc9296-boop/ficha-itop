const money = new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'});
const units = new Intl.NumberFormat('pt-BR', {maximumFractionDigits:6});
const currency = cents => money.format(cents / 100);
const date = value => value ? value.split('-').reverse().join('/') : 'A definir';

export function createPurchasePdf(JsPDF, order, quote, logo) {
  if (!quote?.itens?.length || quote.itens.some(item => item.valor_centavos == null || item.total_centavos == null)) {
    throw new Error('A cotação aprovada precisa ter preço para todos os itens.');
  }
  const doc = new JsPDF({unit:'mm',format:'a4'});
  const code = 'SC-' + String(order.numero).padStart(5, '0');
  const green = [8, 90, 66];
  let y;

  function pageHeader() {
    doc.setFillColor(...green);
    doc.rect(0, 0, 210, 3, 'F');
    if (logo) {
      const image = doc.getImageProperties(logo);
      const scale = Math.min(48 / image.width, 15 / image.height);
      doc.addImage(logo, 'PNG', 14, 8, image.width * scale, image.height * scale);
    }
    doc.setTextColor(...green);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Pedido de compra ' + code, 14, logo ? 31 : 22);
    doc.setTextColor(32);
    y = logo ? 40 : 31;
  }

  function reserve(height) {
    if (y + height > 278) {
      doc.addPage();
      pageHeader();
      return true;
    }
    return false;
  }

  function paragraph(text) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    for (const line of doc.splitTextToSize(text, 182)) {
      reserve(5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(line, 14, y);
      y += 5;
    }
  }

  function tableHeading() {
    doc.setFillColor(232, 245, 239);
    doc.rect(14, y - 4, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Produto', 16, y + 1);
    doc.text('Quantidade', 124, y + 1, {align:'right'});
    doc.text('Valor unitário', 156, y + 1, {align:'right'});
    doc.text('Subtotal', 194, y + 1, {align:'right'});
    y += 9;
  }

  pageHeader();
  paragraph('Fornecedor: ' + quote.fornecedor);
  paragraph('Condições de pagamento: ' + (quote.pagamento || 'A definir'));
  paragraph('Previsão de entrega: ' + date(order.entrega));
  if (quote.prazo_dias != null) paragraph('Prazo informado pelo fornecedor: ' + quote.prazo_dias + ' dia(s)');
  if (quote.data_orcamento) paragraph('Data da cotação: ' + date(quote.data_orcamento));
  y += 4;
  reserve(12);
  tableHeading();

  for (const item of quote.itens) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const label = doc.splitTextToSize(item.produto, 83);
    if (reserve(label.length * 4 + 5)) tableHeading();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(label, 16, y);
    doc.text(units.format(item.quantidade), 124, y, {align:'right'});
    doc.text(currency(item.valor_centavos), 156, y, {align:'right'});
    doc.text(currency(item.total_centavos), 194, y, {align:'right'});
    y += label.length * 4 + 3;
  }

  const subtotal = quote.itens.reduce((sum, item) => sum + Number(item.total_centavos), 0);
  const freight = Number(quote.frete_centavos ?? 0);
  reserve(24);
  paragraph('Subtotal dos produtos: ' + currency(subtotal));
  paragraph('Frete: ' + currency(freight));
  doc.setFont('helvetica', 'bold');
  doc.text('Total do pedido: ' + currency(subtotal + freight), 14, y);
  y += 8;
  if (order.observacoes) paragraph('Observações do pedido: ' + order.observacoes);
  if (quote.observacoes) paragraph('Observações da cotação: ' + quote.observacoes);

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Inova Blocos  |  ' + code + '  |  ' + page + '/' + pages, 14, 287);
  }
  return {doc, filename:'pedido-compra-' + code + '.pdf'};
}

export async function downloadPurchasePdf(order, quote, brand) {
  const logo = await new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 360;
        canvas.height = Math.round(360 * image.naturalHeight / image.naturalWidth);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = brand;
  });
  const {doc, filename} = createPurchasePdf(window.jspdf.jsPDF, order, quote, logo);
  doc.save(filename);
}
