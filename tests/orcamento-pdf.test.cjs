const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const jspdf = require('../jspdf.umd.min.js');
const source = fs.readFileSync(path.join(__dirname, '../comercial/orcamento-pdf.js'), 'utf8');
const unit = ['Alfenas / MG', 'ITOP INTERNET LTDA', '11.767.198/0001-50', 'Praça Getúlio Vargas, 25 — Centro'];
const products = [
  {name: 'Link dedicado 850 Mbps', category: 'Fibra / combos', q: 1, price: 4700.5},
  {name: 'ITOPT até 16 GB', category: 'ITOP móvel 1', q: 1, price: 40},
  {name: 'ITOPT até 55 GB', category: 'ITOP móvel 2', q: 1, price: 85},
  {name: 'ITOPT até 35 GB', category: 'ITOP móvel 3', q: 1, price: 55},
  {name: 'Gravação 15 dias', category: 'Câmeras', q: 1, price: 59.9}
];
const draft = {id: '00000000-0000-4000-8000-000000000001', cliente_nome: 'Cliente de Exemplo', cliente_email: 'cliente@example.com', cliente_documento: 'Documento de exemplo', cliente_telefone: '(35) 3000-0000', cliente_whatsapp: '(35) 90000-0000', cliente_endereco: 'Rua de Exemplo', cliente_numero: '10', cliente_bairro: 'Centro', cliente_cidade: 'Alfenas / MG', emissao_data: '2026-11-06', emissao_hora: '11:35', validade: '2026-11-30', consultor_nome: 'Consultora de Exemplo', produtos: products, valor_mensal: 4940.4, observacoes: 'Condições sujeitas à confirmação de cobertura.'};
function renderer(overrides = {}) {
  const context = {window: {jspdf, ...overrides}, Intl};
  vm.runInNewContext(source, context);
  return context;
}
function pdfText(result) {
  const raw = result.doc.output();
  const chunks = [];
  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      const decoded = require('node:zlib').inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
      if (decoded.includes('BT')) chunks.push(decoded);
    } catch { /* Other PDF streams need no text inspection. */ }
  }
  return chunks.join('\n').replace(/\u00a0/g, ' ');
}
test('gera PDF A4 de uma página com total, campos e nome de arquivo seguro', () => {
  const {window} = renderer();
  const result = window.ITOPBudgetPDF.create(draft, unit);
  assert.equal(result.doc.getNumberOfPages(), 1);
  assert.match(result.name, /^Orcamento-ITOP-Cliente-de-Exemplo-2026-11-06\.pdf$/);
  assert.equal(Math.round(result.doc.internal.pageSize.getWidth()), 210);
  assert.equal(Math.round(result.doc.internal.pageSize.getHeight()), 297);
  const raw = pdfText(result);
  assert.match(raw, /R\$ 4\.940,40/);
  assert.match(raw, /cliente@example\.com/);
  assert.match(result.doc.output(), /\/Subtype \/Image/);
  assert.match(result.doc.output(), /\/SMask/); // Transparência da logo preservada no PDF.
});
test('pagina muitos produtos e observações extensas sem perder o último item', () => {
  const {window} = renderer();
  const many = Array.from({length: 100}, (_, i) => ({...products[i % products.length], name: 'ServicoNumero' + i}));
  const result = window.ITOPBudgetPDF.create({...draft, produtos: many, observacoes: 'Observacao longa. '.repeat(1000)}, unit);
  assert.ok(result.doc.getNumberOfPages() > 3);
  assert.match(pdfText(result), /ServicoNumero99/);
});
test('mantém promoções por quantidade e simulação de energia separada da mensalidade', () => {
  const context = renderer();
  context.planPromotion = () => ({label: '3 PRIMEIRAS FATURAS A R$ 49,95'});
  context.promoSchedule = () => 'PRIMEIRAS FATURAS: R$ 99,90';
  context.firstYearCost = () => 2097.9;
  const result = context.window.ITOPBudgetPDF.create({...draft, produtos: [{name: 'Plano promocional', category: 'Fibra', q: 2, price: 99.9}], valor_mensal: 199.8}, unit, {valid: true, bill: 300, residual: 100, newval: 160, combined: 260, saving: 40});
  const raw = pdfText(result);
  for (const amount of ['R$ 199,80', 'R$ 99,90', 'R$ 2.097,90', 'R$ 300,00', 'R$ 260,00', 'R$ 159,80']) assert.ok(raw.includes(amount), amount);
});
test('emite simulação de energia sem produtos', () => {
  const {window} = renderer();
  const result = window.ITOPBudgetPDF.create({...draft, produtos: [], valor_mensal: 0}, unit, {valid: true, bill: 300, residual: 100, newval: 160, combined: 260, saving: 40});
  assert.match(pdfText(result), /R\$ 260,00/);
  assert.doesNotMatch(pdfText(result), /INVESTIMENTO MENSAL REGULAR/);
});
test('reporta biblioteca ou unidade indisponível', () => {
  const {window} = renderer({jspdf: null});
  assert.throws(() => window.ITOPBudgetPDF.create(draft, unit), /Biblioteca de PDF/);
  assert.throws(() => renderer().window.ITOPBudgetPDF.create(draft), /unidade ITOP/);
});
