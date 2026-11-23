/* Portfólio comercial ITOP, páginas 6–10. Valores publicados em 11/11/2026. */
const monitoramento = [
  ['Security Fit · monitoramento de alarme', 16990, 15290, 25000],
  ['Security Pró · monitoramento de alarme', 18999, 17090, 25000],
  ['Security Vip · monitoramento de alarme', 26990, 24290, 25000]
];
const cameras = [['iTop Cameras · automonitoramento', 4990, 4490, 0]];
const cameraIA = [
  ['IA Detect · 1 câmera', 5990, 5390, 0],
  ['IA Detect · 2 câmeras', 10980, 9780, 0],
  ['IA Detect · 3 câmeras', 14970, 13470, 0],
  ['IA Detect · 4 câmeras', 17960, 15960, 0]
];
const rastreamento = [['Fit · rastreamento veicular', 7400, 6590, 37944]];
const portaria = [['Portaria Virtual · por condomínio', 390000, null, 1735007]];
const iaAvulsa = 'IA Detect · 4 ou mais câmeras (valor por câmera)';
const avulsos = {
  'Monitoramento de alarme': monitoramento,
  'Câmeras Security': cameras,
  'Câmeras IA Detect': [...cameraIA.slice(0, 3), [iaAvulsa, 4490, null, 0]],
  'Rastreamento veicular': rastreamento,
  'Portaria virtual': portaria
};
const fibra = [
  ['ECO 400 Mega', 6990], ['BASIC 500 Mega', 7990], ['START 600 Mega', 8990],
  ['PRO 700 Mega', 9990], ['MAX 800 Mega', 10990], ['ULTRA 1 Giga', 11990]
];
const comboProducts = [...monitoramento, ...cameras, ...cameraIA, ...rastreamento];
const combos = fibra.flatMap(([fiberName, cents]) => comboProducts.map(([name, , withFiber, setup]) =>
  [fiberName + ' + ' + name, cents + withFiber, null, setup]));
const comboKey = 'Internet + Security';
const extraKey = 'Câmeras adicionais no combo';
const extraCameras = [
  ['iTop Cameras · câmera adicional no combo', 4490, null, 0],
  ['IA Detect · câmera adicional no combo (a partir da 5ª)', 3990, null, 0]
];
const extraBase = [cameras[0][0], cameraIA[3][0]];
const fiberLabel = 'Fibra / combos';
const products = new Map([...Object.values(avulsos).flat(), ...combos, ...extraCameras].map(record => [record[0], record]));
const comboNames = new Set(combos.map(([name]) => name));
const isCombo = name => comboNames.has(name);
const minimumQuantity = name => name === iaAvulsa ? 4 : 1;
const setupAmount = item => (products.get(item.name)?.[3] || 0) * item.q;
const isPortaria = name => name === portaria[0][0];

function quoteNotes(items) {
  const fees = items.filter(item => setupAmount(item) > 0);
  const lines = fees.map(item => item.name + ': ' + money(setupAmount(item) / 100));
  if (fees.length) lines.push('Total de kit, ativação ou implantação (pagamento único): ' +
    money(fees.reduce((sum, item) => sum + setupAmount(item), 0) / 100) + '.');
  if (items.some(item => isPortaria(item.name))) {
    lines.push('Portaria virtual tem contratação separada. A visita técnica define o projeto e o orçamento final.');
  }
  return lines.join('\n');
}

function addOptions(select, key) {
  const group = document.createElement('optgroup');
  group.label = key;
  for (const [name, price] of catalogData[key]) {
    const option = new Option(name + ' — ' + money(price), name);
    option.dataset.price = price;
    group.append(option);
  }
  select.append(group);
}

function install() {
  for (const [key, entries] of Object.entries({...avulsos, [comboKey]: combos, [extraKey]: extraCameras})) {
    catalogData[key] = entries.map(([name, price]) => [name, price / 100]);
  }

  const fiberRow = compactRows.find(row => row.label === fiberLabel);
  addOptions(fiberRow.sel, comboKey);
  const section = document.createElement('div');
  section.className = 'multi-product-section';
  const heading = document.createElement('h3');
  heading.textContent = 'Security';
  section.append(heading);
  fiberRow.sel.closest('.multi-product-section').after(section);
  const rows = Object.keys(avulsos).map(key => createPlanRow(key, [key], section));
  const aiRow = rows.find(row => row.label === 'Câmeras IA Detect');
  const extraRow = createPlanRow(extraKey, [extraKey], section);
  const extraContainer = extraRow.sel.closest('.compact-row');
  const notes = document.createElement('p');
  notes.className = 'hint';
  notes.setAttribute('aria-live', 'polite');
  section.append(notes);

  const survey = document.createElement('details');
  survey.className = 'multi-product-section';
  survey.innerHTML = '<summary>Planos Security</summary><p class="hint">Selecione os serviços que o cliente quer cotar. As escolhas seguem para Adicionar Serviços.</p>';
  $('recommend').before(survey);
  const surveyFields = [...rows.map(row => row.label), comboKey].map(key => {
    const label = document.createElement('label');
    label.className = 'field';
    label.textContent = key;
    const select = document.createElement('select');
    select.setAttribute('aria-label', key + ' na sondagem');
    select.add(new Option('Selecione um plano', ''));
    addOptions(select, key);
    label.append(select);
    survey.append(label);
    return {key, select};
  });

  const surveyTotal = document.createElement('p');
  surveyTotal.className = 'hint';
  surveyTotal.setAttribute('aria-live', 'polite');
  survey.append(surveyTotal);

  const originalProposal = proposalState;
  proposalState = () => {
    const result = originalProposal();
    if (!window.ITOPApprovedOperator.valid()) return result;
    const additions = surveyFields.flatMap(({key, select}) => {
      if (!select.value) return [];
      return [{
        name: select.value, price: Number(select.selectedOptions[0].dataset.price),
        category: key === comboKey ? fiberLabel : key, q: minimumQuantity(select.value)
      }];
    });
    if (!additions.length) return result;
    const replacesFiber = additions.some(item => item.category === fiberLabel);
    const isKept = item => !replacesFiber || item.category !== fiberLabel;
    return {...result, choices: (result.choices || []).filter(isKept),
      proposal: [...result.proposal.filter(isKept), ...additions]};
  };

  const originalRecalc = recalc;
  recalc = () => {
    aiRow.quantity.min = aiRow.sel.value === iaAvulsa ? '4' : '0';
    if (aiRow.sel.value === iaAvulsa && Number(aiRow.quantity.value) < 4) aiRow.quantity.value = '4';
    if (isCombo(fiberRow.sel.value) && Number(fiberRow.quantity.value) > 1) fiberRow.quantity.value = '1';
    originalRecalc();
    extraCameras.forEach(([name], index) => {
      const option = [...extraRow.sel.options].find(item => item.value === name);
      option.disabled = !fiberRow.sel.value.endsWith(' + ' + extraBase[index]) || Number(fiberRow.quantity.value) < 1;
      option.hidden = option.disabled;
    });
    if (extraRow.sel.selectedOptions[0]?.disabled) {
      extraRow.sel.value = '';
      extraRow.quantity.value = '0';
      originalRecalc();
    }
    extraContainer.style.display = [...extraRow.sel.options].some(option => option.value && !option.disabled) ? '' : 'none';
    notes.textContent = quoteNotes(selected);
    const surveyItems = proposed.filter(item => products.has(item.name));
    surveyTotal.textContent = surveyItems.length
      ? 'Security na proposta: ' + money(surveyItems.reduce((sum, item) => sum + item.price * item.q, 0)) + '/mês.'
      : '';
  };
  notes.style.whiteSpace = 'pre-line';
  recalc();
}

install();
export {isCombo, isPortaria, minimumQuantity, quoteNotes};
