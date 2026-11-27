const sectors = {
  'Início': ['Dashboard'],
  'Documentos': {
    Biblioteca: ['Favoritos', 'Recentes', 'Compras', 'Comercial', 'Estoque', 'Produção'],
    Materiais: ['Arquivos úteis', 'Imagens úteis', 'Vídeos úteis', 'Lixeira']
  },
  'Compras': {
    'Visão geral': ['Painel de compras'],
    'Solicitações e cotações': ['Solicitações', 'Para cotar', 'Cotações', 'Para aprovar'],
    'Pedidos e fornecedores': ['Pedidos de compra', 'Recebimentos', 'Notas de entrada', 'Fornecedores']
  },
  'Comercial': {
    Vendas: ['CRM', 'Propostas comerciais', 'Pedidos de venda', 'PDV'],
    'Pós-venda': ['Expedição', 'Devoluções', 'Pesquisa de satisfação'],
    'Equipe e ferramentas': ['Vendedores', 'Comissões', 'Calculadoras comerciais']
  },
  'Estoque': {
    Produtos: ['Produtos e serviços', 'Equipamentos', 'Patrimônio'],
    Movimentação: ['Entradas', 'Saídas', 'Reservas', 'Transferências', 'Ajustes', 'Histórico'],
    Saldos: ['Locais de armazenamento', 'Estoque mínimo', 'Estoque anterior']
  },
  'Produção': ['Ordens de produção'],
  'Serviços': ['Atas de visita e reposição', 'Links úteis'],
  'Cadastros': ['Categorias', 'Fornecedores']
};

const icons = ['⌂', '▤', '▣', '◈', '▦', '⚙', '✓', '☷'];
const phases = ['Para cotar', 'Cotando', 'Para aprovar', 'Com o fornecedor', 'Recebido'];
const types = ['EPI', 'EPS', 'Patrimonial', 'Matéria-prima', 'Insumo', 'Produto acabado', 'Ferramenta', 'Equipamento', 'Serviço'];
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const number = new Intl.NumberFormat('pt-BR');
const routes = Object.entries(sectors).flatMap(([sector, groups]) =>
  (Array.isArray(groups) ? groups : Object.values(groups).flat()).map(page => [sector, page]));

function element(tag, value) {
  const node = document.createElement(tag);
  if (value != null) node.textContent = value;
  return node;
}

function button(label, action) {
  const node = element('button', label);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

function table(headers, rows) {
  const node = element('table');
  const header = node.createTHead().insertRow();
  for (const name of headers) {
    const cell = element('th', name);
    cell.scope = 'col';
    header.append(cell);
  }
  const body = node.createTBody();
  for (const values of rows) {
    const row = body.insertRow();
    values.forEach(value => { row.insertCell().textContent = value; });
  }
  return node;
}

function purchasePhase(order) {
  const decision = order.inova_compras_decisoes?.resultado;
  if (order.inova_compras_conclusoes) return 4;
  if (decision === 'aprovado') return 3;
  if (decision === 'reprovado') return -1;
  if (order.enviado_para_aprovacao_em) return 2;
  return order.inova_compras_orcamentos.length ? 1 : 0;
}

function deliveryState(row) {
  const items = Array.isArray(row.itens) ? row.itens : [];
  const delivered = row.inova_entregas ?? [];
  if (!items.length) return 'pending';
  const complete = items.every((item, index) =>
    Number(item.quantidade) <= delivered.filter(delivery => delivery.item === index)
      .reduce((sum, delivery) => sum + Number(delivery.quantidade), 0));
  return complete ? 'complete' : delivered.length ? 'partial' : 'pending';
}

async function allRows(query, key) {
  const rows = [];
  for (let offset = 0;; offset += 500) {
    const {data, error} = await query.order(key).range(offset, offset + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}

const normalize = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function mountErp(panel, legacy, {layoutOnly = false} = {}) {
  const {client} = legacy;
  const style = element('link');
  style.rel = 'stylesheet';
  style.href = new URL('./erp.css?v=1', import.meta.url);
  document.head.append(style);

  const root = element('div');
  root.className = 'inova-erp';
  root.innerHTML = `
    <header class="erp-top">
      <img src="inova-fachada/marca.webp" alt="Inova Blocos">
      <button type="button" data-menu aria-expanded="true" aria-controls="erp-secondary">Menu</button>
      <div class="erp-search">
        <input type="search" placeholder="Buscar na plataforma" aria-label="Buscar na plataforma" autocomplete="off">
        <div data-results hidden></div>
      </div>
      <button type="button" data-notifications>Notificações</button>
      ${layoutOnly ? '<a href="?app=inova-blocos-atual">Painel atual</a>' : ''}
      <a href="./">Voltar ITOP</a>
    </header>
    <div class="erp-body">
      <nav aria-label="Setores" data-primary></nav>
      <nav aria-label="Páginas do setor" id="erp-secondary"></nav>
      <section class="erp-content" aria-label="Conteúdo"></section>
    </div>
    <dialog class="erp-dialog"><div data-dialog-content></div></dialog>`;
  panel.prepend(root);
  const content = root.querySelector('.erp-content');
  const secondary = root.querySelector('#erp-secondary');
  const primary = root.querySelector('[data-primary]');
  const search = root.querySelector('input[type=search]');
  const results = root.querySelector('[data-results]');
  const notifications = root.querySelector('[data-notifications]');
  const dialog = root.querySelector('dialog');
  const dialogContent = root.querySelector('[data-dialog-content]');
  const legacyContent = element('div');
  legacyContent.className = 'erp-legacy-content';
  content.append(legacyContent);
  let sector;
  let page;
  let revision = 0;

  const products = async () => layoutOnly ? [] : allRows(client.from('inova_erp_produtos').select(
    'sku,nome,tipo,fisico,reservado,disponivel,estoque_minimo,preco_venda'), 'sku');
  const categories = async () => layoutOnly ? [] : allRows(client.from('inova_erp_categorias').select('id,nome'), 'nome');
  const purchases = async () => layoutOnly ? [] : allRows(client.from('inova_compras').select(
    'id,numero,fornecedor,entrega,criado_em,enviado_para_aprovacao_em,inova_compras_orcamentos(id),inova_compras_decisoes(resultado),inova_compras_conclusoes(concluido_em)'), 'numero');
  const sales = async () => layoutOnly ? [] : allRows(client.from('inova_vendas').select(
    'id,data_venda,pesquisa_em,dados,itens,inova_entregas(item,quantidade)').is('arquivada_em', null), 'id');

  const legacyPages = {
    'Arquivos úteis': legacy.gallery, 'Imagens úteis': legacy.gallery, 'Vídeos úteis': legacy.videos,
    'Propostas comerciais': legacy.sales, 'Pedidos de venda': legacy.sales, 'Expedição': legacy.shipments,
    'Pesquisa de satisfação': legacy.shipments, 'Atas de visita e reposição': legacy.requests,
    'Fornecedores': legacy.suppliers, 'Estoque anterior': legacy.stock
  };
  const purchasePages = ['Solicitações', 'Para cotar', 'Cotações', 'Para aprovar', 'Pedidos de compra', 'Notas de entrada'];

  function heading(title, action) {
    const row = element('div');
    row.className = 'erp-heading';
    const name = element('h1', title);
    row.append(name);
    if (action) {
      action.className = 'erp-action';
      row.append(action);
    }
    content.append(row);
  }

  function notificationsCount(count) {
    notifications.textContent = count == null ? 'Notificações' : `Notificações (${count})`;
  }

  function openDialog(title) {
    const heading = element('h2', title);
    heading.id = 'erp-dialog-title';
    dialog.setAttribute('aria-labelledby', heading.id);
    dialogContent.replaceChildren(heading, button('Fechar', () => dialog.close()));
    if (!dialog.open) dialog.showModal();
  }

  function report(message) {
    const status = element('p', message);
    status.setAttribute('role', 'status');
    content.append(status);
  }

  async function dashboard(current) {
    const data = await Promise.allSettled([products(), purchases(), sales()]);
    if (current !== revision) return;
    const [stock, orders, confirmed] = data.map(result => result.status === 'fulfilled' ? result.value : null);
    const localDate = new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Sao_Paulo'});
    const today = localDate.format(new Date());
    const dateAtNoon = value => new Date(value + 'T12:00:00-03:00');
    const filter = element('form');
    filter.className = 'erp-period';
    filter.innerHTML = `
      <label>Período <select name="periodo">
        <option value="">Todo o período</option><option value="dia">Hoje</option>
        <option value="semana">Semana atual</option><option value="mes">Mês atual</option>
        <option value="trimestre">Trimestre atual</option><option value="ano">Ano atual</option>
        <option value="personalizado">Personalizado</option>
      </select></label>
      <label hidden>De <input type="date" name="inicio"></label>
      <label hidden>Até <input type="date" name="fim"></label>`;
    filter.onsubmit = event => event.preventDefault();
    const cards = element('div');
    cards.className = 'erp-cards';
    const totals = key => stock?.reduce((sum, item) => sum + Number(item[key]), 0);
    const overdueDeliveries = confirmed?.filter(row =>
      row.dados?.dataEntrega && row.dados.dataEntrega < today && deliveryState(row) !== 'complete').length;
    const awaiting = orders?.filter(order => purchasePhase(order) === 2).length;

    function updateCards() {
      const {periodo,inicio,fim} = filter.elements;
      const custom = periodo.value === 'personalizado';
      inicio.parentElement.hidden = fim.parentElement.hidden = !custom;
      const currentDate = dateAtNoon(today);
      const month = currentDate.getUTCMonth();
      const year = currentDate.getUTCFullYear();
      currentDate.setUTCDate(currentDate.getUTCDate() - (currentDate.getUTCDay() + 6) % 7);
      const boundaries = {
        dia: today,
        semana: localDate.format(currentDate),
        mes: today.slice(0,7) + '-01',
        trimestre: year + '-' + String(Math.floor(month / 3) * 3 + 1).padStart(2, '0') + '-01',
        ano: year + '-01-01'
      };
      const start = custom ? inicio.value : boundaries[periodo.value];
      const end = custom ? fim.value : periodo.value ? today : '';
      const inPeriod = date => (!start && !end) || Boolean(date && (!start || date >= start) && (!end || date <= end));
      const periodSales = confirmed?.filter(row => inPeriod(row.data_venda));
      const periodOrders = orders?.filter(row => inPeriod(row.criado_em && localDate.format(new Date(row.criado_em))));
      const periodDeliveries = confirmed?.filter(row => inPeriod(row.dados?.dataEntrega));
      cards.replaceChildren();
      for (const [label, value, group, target] of [
        ['Produtos cadastrados', stock?.length, 'Estoque', 'Produtos e serviços'],
        ['Estoque físico', totals('fisico'), 'Estoque', 'Produtos e serviços'],
        ['Estoque reservado', totals('reservado'), 'Estoque', 'Produtos e serviços'],
        ['Estoque disponível', totals('disponivel'), 'Estoque', 'Produtos e serviços'],
        ['Estoque crítico', stock?.filter(item => item.disponivel < 0 || (item.estoque_minimo != null && item.disponivel <= item.estoque_minimo)).length, 'Estoque', 'Estoque mínimo'],
        ['Produtos sem estoque físico', stock?.filter(item => Number(item.fisico) === 0).length, 'Estoque', 'Produtos e serviços'],
        ['Compras pendentes', orders?.filter(order => purchasePhase(order) >= 0 && purchasePhase(order) < 4).length, 'Compras', 'Painel de compras'],
        ['Cotações em andamento', orders?.filter(order => purchasePhase(order) === 1).length, 'Compras', 'Cotações'],
        ['Cotações aguardando aprovação', awaiting, 'Compras', 'Para aprovar'],
        ['Compras com entrega atrasada', orders?.filter(order => purchasePhase(order) === 3 && order.entrega && order.entrega < today).length, 'Compras', 'Pedidos de compra'],
        ['Compras cadastradas no período', periodOrders?.length, 'Compras', 'Pedidos de compra'],
        ['Entregas programadas no período', periodDeliveries?.filter(row => row.dados?.dataEntrega && deliveryState(row) !== 'complete').length, 'Comercial', 'Pedidos de venda'],
        ['Entregas atrasadas', overdueDeliveries, 'Comercial', 'Pedidos de venda'],
        ['Entregas parciais', confirmed?.filter(row => deliveryState(row) === 'partial').length, 'Comercial', 'Pedidos de venda'],
        ['Avaliações pendentes', confirmed?.filter(row => deliveryState(row) === 'complete' && !row.pesquisa_em).length, 'Comercial', 'Pesquisa de satisfação'],
        ['Propostas em negociação', null, 'Comercial', 'CRM'],
        ['Vendas confirmadas no período', periodSales?.length, 'Comercial', 'Pedidos de venda'],
        ['Ordens de produção', null, 'Produção', 'Ordens de produção']
      ]) {
        const card = button(label, () => navigate(group, target));
        card.append(element('strong', value == null ? 'Indisponível' : number.format(value)));
        cards.append(card);
      }
    }

    filter.addEventListener('change', updateCards);
    notificationsCount(awaiting);
    content.append(filter, cards);
    updateCards();
  }

  async function board(current) {
    const orders = await purchases();
    if (current !== revision) return;
    const waiting = orders.filter(order => purchasePhase(order) === 2);
    notificationsCount(waiting.length);
    const tasks = element('section');
    tasks.className = 'erp-tasks';
    tasks.append(element('h2', 'Sua vez'), button(
      waiting.length ? `${waiting.length} pedido(s) aguardando aprovação` : 'Nenhum pedido aguarda aprovação',
      () => navigate('Compras', 'Para aprovar')));
    const columns = element('div');
    columns.className = 'erp-board';
    phases.forEach((name, index) => {
      const column = element('section');
      const entries = orders.filter(order => purchasePhase(order) === index).reverse();
      column.append(element('h2', `${name} (${entries.length})`));
      for (const order of entries) {
        const card = button(String(order.numero), () => navigate('Compras', index === 2 ? 'Para aprovar' : index === 4 ? 'Notas de entrada' : 'Pedidos de compra'));
        card.append(element('small', order.fornecedor || 'Fornecedor a definir'));
        column.append(card);
      }
      columns.append(column);
    });
    content.append(tasks, columns);
  }

  async function catalog(current) {
    const list = await products();
    if (current !== revision) return;
    const filters = {
      Equipamentos: item => item.tipo === 'Equipamento',
      Patrimônio: item => item.tipo === 'Patrimonial',
      'Estoque mínimo': item => item.estoque_minimo != null || item.disponivel < 0
    };
    const rows = filters[page] ? list.filter(filters[page]) : list;
    content.append(table(['SKU', 'Produto', 'Tipo', 'Físico', 'Reservado', 'Disponível', 'Preço de venda'],
      rows.map(item => [item.sku, item.nome, item.tipo, ...[item.fisico,item.reservado,item.disponivel].map(value => number.format(value)),
        item.preco_venda == null ? '—' : money.format(item.preco_venda)])));
    if (!rows.length) report('Nenhum produto nesta visão.');
  }

  async function newCategory() {
    openDialog('Nova categoria');
    const form = element('form');
    form.innerHTML = '<label>Nome da categoria<input name="nome" required maxlength="120"></label><p role="status"></p><button class="erp-action">Salvar categoria</button>';
    dialogContent.append(form);
    form.onsubmit = async event => {
      event.preventDefault();
      const submit = form.querySelector('button');
      const name = form.elements.nome.value.trim();
      if (!name) return;
      submit.disabled = true;
      try {
        const {error} = await client.from('inova_erp_categorias').insert({nome:name});
        if (error) throw error;
        dialog.close();
        navigate('Cadastros', 'Categorias');
      } catch (error) {
        form.querySelector('[role=status]').textContent = error.code === '23505' ? 'Esta categoria já existe.' : 'Não foi possível salvar a categoria.';
      } finally {
        submit.disabled = false;
      }
    };
  }

  async function newProduct() {
    openDialog('Novo produto');
    const loading = element('p', 'Preparando cadastro…');
    dialogContent.append(loading);
    try {
      const [next, list] = await Promise.all([client.rpc('inova_erp_proximo_sku'), categories()]);
      if (!loading.isConnected || !dialog.open) return;
      if (next.error || !next.data) throw next.error || new Error('SKU indisponível');
      loading.remove();
      const form = element('form');
      form.innerHTML = `
        <div class="erp-form-tabs" role="group" aria-label="Seções do cadastro"></div>
        <fieldset data-general>
          <label>SKU<input name="sku" required maxlength="32"></label>
          <label>Nome do produto<input name="nome" required maxlength="180"></label>
          <label>Tipo<select name="tipo" required></select></label>
          <label>Uso<input name="uso"></label>
          <label>Categoria<select name="categoria_id"><option value="">Selecionar</option></select></label>
          <label>Foto do produto<input name="foto" type="file" accept="image/png,image/jpeg,image/webp"></label>
          <label>Unidade de medida<input name="unidade" required value="UN"></label>
          <label>Quantidade por embalagem<input name="quantidade_embalagem" type="number" required min="0.001" step="any" value="1"></label>
          <label>Estoque mínimo<input name="estoque_minimo" type="number" min="0" step="any"></label>
          <label>Preço de custo (R$)<input name="preco_custo" type="number" min="0" step="0.01"></label>
          <label>Preço de venda (R$)<input name="preco_venda" type="number" min="0" step="0.01"></label>
          <label>Fornecedor<input name="fornecedor"></label>
          <label>Local de armazenamento<input name="local_armazenamento"></label>
          <label>Observações<textarea name="observacoes"></textarea></label>
        </fieldset>
        <fieldset data-tax hidden>
          <label>NCM<input name="ncm" inputmode="numeric" pattern="[0-9]{8}" maxlength="8"></label>
          <label>CEST<input name="cest" inputmode="numeric" pattern="[0-9]{7}" maxlength="7"></label>
          <label>Origem fiscal<input name="origem_fiscal" type="number" min="0" max="8"></label>
        </fieldset>
        <p role="status"></p><button class="erp-action">Salvar produto</button>`;
      const general = form.querySelector('[data-general]');
      const tax = form.querySelector('[data-tax]');
      const generalTab = button('Dados Gerais', () => showTab(general));
      const taxTab = button('Dados Fiscais', () => showTab(tax));
      function showTab(target) {
        general.hidden = target !== general;
        tax.hidden = target !== tax;
        generalTab.setAttribute('aria-pressed', String(!general.hidden));
        taxTab.setAttribute('aria-pressed', String(!tax.hidden));
      }
      form.querySelector('.erp-form-tabs').append(generalTab, taxTab);
      showTab(general);
      form.addEventListener('invalid', event => showTab(event.target.closest('fieldset')), true);
      form.elements.sku.value = next.data;
      types.forEach(name => form.elements.tipo.add(new Option(name, name)));
      list.forEach(item => form.elements.categoria_id.add(new Option(item.nome, item.id)));
      dialogContent.append(form);
      form.onsubmit = async event => {
        event.preventDefault();
        const submit = form.querySelector('button.erp-action');
        const status = form.querySelector('[role=status]');
        const values = Object.fromEntries(new FormData(form));
        const photo = values.foto;
        delete values.foto;
        for (const key of Object.keys(values)) values[key] = values[key].trim() || null;
        submit.disabled = true;
        try {
          if (photo.size) {
            if (photo.size > 540000 || !['image/png','image/jpeg','image/webp'].includes(photo.type)) {
              status.textContent = 'Selecione uma imagem PNG, JPEG ou WebP de até 540 KB.';
              return;
            }
            values.foto = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(photo);
            });
          }
          const {error} = await client.from('inova_erp_produtos').insert(values);
          if (error) throw error;
          dialog.close();
          navigate('Estoque', 'Produtos e serviços');
        } catch (error) {
          status.textContent = error.code === '23505' ? 'Este SKU já está em uso.' : 'Não foi possível salvar o produto. Confira os campos.';
        } finally {
          submit.disabled = false;
        }
      };
    } catch {
      loading.textContent = 'Não foi possível preparar o cadastro.';
    }
  }

  async function receiving(current) {
    const [orders, stock] = layoutOnly ? [[], []] : await Promise.all([
      allRows(client.from('inova_compras').select(
        'id,numero,fornecedor,entrega,observacoes,inova_compras_conclusoes(concluido_em),inova_compras_decisoes!inner(resultado,orcamento_id),inova_compras_orcamentos(id,fornecedor,itens,frete_centavos,pagamento,prazo_dias,data_orcamento,observacoes),inova_erp_recebimentos(id,recebido_em,nota_fiscal,observacoes,inova_erp_entradas_compra(linha,sku,quantidade))'
      ).eq('inova_compras_decisoes.resultado', 'aprovado'), 'numero'),
      products()
    ]);
    if (current !== revision) return;
    const today = new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Sao_Paulo'}).format(new Date());
    const filter = element('input');
    filter.type = 'search';
    filter.placeholder = 'Número, fornecedor ou produto';
    filter.setAttribute('aria-label', 'Buscar recebimentos');
    const filters = element('div');
    filters.className = 'erp-period';
    const statusLabel = element('label', 'Situação');
    const status = element('select');
    for (const value of ['Aguardando entrega', 'Recebido parcialmente', 'Recebido integralmente', 'Atrasado', 'Encerrado no fluxo anterior']) {
      status.add(new Option(value));
    }
    status.add(new Option('Todas as situações', ''), 0);
    status.value = '';
    statusLabel.append(status);
    const dates = ['Entrega prevista de', 'Entrega prevista até'].map(label => {
      const field = element('label', label);
      const input = element('input');
      input.type = 'date';
      field.append(input);
      filters.append(field);
      return input;
    });
    const [from, to] = dates;
    const clear = button('Limpar filtros', () => {
      filter.value = status.value = from.value = to.value = '';
      render();
    });
    filters.prepend(filter, statusLabel);
    filters.append(clear);
    content.append(filters);
    const list = element('div');
    list.className = 'erp-receiving-list';
    content.append(list);

    function render() {
      list.replaceChildren();
      if (from.value && to.value && from.value > to.value) {
        list.append(element('p', 'A data inicial deve ser anterior ou igual à data final.'));
        return;
      }
      for (const order of [...orders].reverse()) {
        if (from.value && (!order.entrega || order.entrega < from.value)) continue;
        if (to.value && (!order.entrega || order.entrega > to.value)) continue;
        const quote = order.inova_compras_orcamentos.find(row => row.id === order.inova_compras_decisoes.orcamento_id);
        if (!quote) continue;
        const code = 'SC-' + String(order.numero).padStart(5, '0');
        const supplier = quote.fornecedor || order.fornecedor;
        const terms = normalize([code, supplier, order.fornecedor, ...quote.itens.map(item => item.produto)].join(' '));
        if (!terms.includes(normalize(filter.value.trim()))) continue;
        const receipts = order.inova_erp_recebimentos;
        const entries = receipts.flatMap(receipt => receipt.inova_erp_entradas_compra);
        const lines = quote.itens.map((item, index) => {
          const previous = entries.filter(row => row.linha === index + 1);
          const received = previous.reduce((sum, row) => sum + Number(row.quantidade), 0);
          return {item, index: index + 1, received, pending: Number(item.quantidade) - received, sku: previous[0]?.sku};
        });
        const closed = Boolean(order.inova_compras_conclusoes);
        const pending = !closed && lines.some(line => line.pending > 0);
        const state = closed ? 'Encerrado no fluxo anterior' : !pending ? 'Recebido integralmente'
          : entries.length ? 'Recebido parcialmente' : 'Aguardando entrega';
        const late = pending && Boolean(order.entrega && order.entrega < today);
        if (status.value && (status.value === 'Atrasado' ? !late : state !== status.value)) continue;
        const details = element('details');
        const summary = element('summary', [code, supplier, state, ...(late ? ['Atrasado'] : [])].join(' · '));
        if (pending) {
          const dot = element('span');
          dot.className = 'erp-receiving-pending';
          dot.setAttribute('aria-hidden', 'true');
          summary.prepend(dot);
        }
        details.append(summary, table(['Produto', 'Comprado', 'Recebido', 'Pendente'],
          lines.map(line => [line.item.produto, number.format(line.item.quantidade),
            closed && !entries.length ? '—' : number.format(line.received),
            closed ? '—' : number.format(line.pending)])));
        const pdfStatus = element('p');
        pdfStatus.setAttribute('role', 'status');
        const pdf = button('Baixar pedido de compra em PDF', async () => {
          pdf.disabled = true;
          pdfStatus.textContent = '';
          try {
            const {downloadPurchasePdf} = await import('./pedido-compra-pdf.js?v=1');
            await downloadPurchasePdf(order, quote, root.querySelector('.erp-top img').src);
          } catch (error) {
            pdfStatus.textContent = quote.itens.some(item => item.valor_centavos == null || item.total_centavos == null)
              ? 'A cotação aprovada precisa ter preço para todos os itens.'
              : 'Falha ao gerar o PDF. Tente novamente.';
          } finally {
            pdf.disabled = false;
          }
        });
        details.append(pdf, pdfStatus);
        if (receipts.length) {
          details.append(table(['Data', 'Nota fiscal', 'Observações'],
            receipts.map(receipt => [receipt.recebido_em, receipt.nota_fiscal, receipt.observacoes])));
        }
        if (pending) details.append(button('Registrar recebimento', () => receiptForm(order.id, lines, stock, today)));
        list.append(details);
      }
      if (!list.childElementCount) list.append(element('p', 'Nenhum pedido aprovado corresponde aos filtros.'));
    }
    filter.addEventListener('input', render);
    for (const control of [status, from, to]) control.addEventListener('change', render);
    render();
  }

  function receiptForm(orderId, lines, stock, today) {
    openDialog('Registrar recebimento');
    const form = element('form');
    form.innerHTML = `
      <fieldset>
        <label>Data de recebimento<input name="date" type="date" required></label>
        <label>Nota fiscal<input name="invoice" maxlength="120" required></label>
        <label>Observações<textarea name="notes" maxlength="2000"></textarea></label>
      </fieldset>
      <div class="erp-receiving-items"></div>
      <p role="status"></p><button class="erp-action">Confirmar entrada no estoque</button>`;
    form.elements.date.value = form.elements.date.max = today;
    const controls = lines.filter(line => line.pending > 0).map(line => {
      const fields = element('fieldset');
      fields.append(element('legend', line.item.produto + ' · Pendente: ' + number.format(line.pending)));
      const sku = element('select');
      sku.add(new Option('Selecione o produto no estoque', ''));
      stock.forEach(product => sku.add(new Option(product.sku + ' · ' + product.nome, product.sku)));
      if (line.sku) {
        sku.value = line.sku;
        sku.disabled = true;
      }
      const quantity = element('input');
      quantity.type = 'number';
      quantity.min = '0';
      quantity.max = String(line.pending);
      quantity.step = 'any';
      const skuLabel = element('label', 'Produto no estoque');
      const quantityLabel = element('label', 'Quantidade recebida');
      skuLabel.append(sku);
      quantityLabel.append(quantity);
      fields.append(skuLabel, quantityLabel);
      form.querySelector('.erp-receiving-items').append(fields);
      return {line, sku, quantity};
    });
    dialogContent.append(form);
    const key = crypto.randomUUID();
    let signature;
    form.onsubmit = async event => {
      event.preventDefault();
      const status = form.querySelector('[role=status]');
      const submit = form.querySelector('button');
      if (submit.disabled) return;
      const items = controls.filter(control => control.quantity.valueAsNumber > 0).map(control => ({
        linha: control.line.index, sku: control.sku.value, quantidade: control.quantity.valueAsNumber
      }));
      if (!items.length || items.some(item => !item.sku) || !form.elements.invoice.value.trim()) {
        status.textContent = 'Informe a nota fiscal, a quantidade recebida e o SKU de cada linha recebida.';
        return;
      }
      const payload = {pedido:orderId, data_recebimento:form.elements.date.value,
        documento:form.elements.invoice.value.trim(), notas:form.elements.notes.value, linhas:items};
      const nextSignature = JSON.stringify(payload);
      if (signature && signature !== nextSignature) {
        status.textContent = 'Repita com os mesmos dados ou reabra o pedido para conferir o saldo.';
        return;
      }
      signature = nextSignature;
      submit.disabled = true;
      try {
        const {error} = await client.rpc('inova_erp_confirmar_recebimento', {chave:key, ...payload});
        if (error) throw error;
        if (!form.isConnected || !dialog.open) return;
        dialog.close();
        void navigate('Compras', 'Recebimentos');
      } catch {
        status.textContent = 'A confirmação falhou. Confira o saldo e tente novamente com os mesmos dados.';
      } finally {
        submit.disabled = false;
      }
    };
  }

  async function navigate(group, target) {
    sector = group;
    page = target;
    const current = ++revision;
    legacy.clear();
    panel.append(...legacyContent.children);
    panel.classList.remove('erp-show-legacy');
    content.replaceChildren();
    search.value = '';
    results.hidden = true;
    for (const item of primary.children) {
      item.setAttribute('aria-current', item.dataset.sector === group ? 'true' : 'false');
    }
    secondary.replaceChildren(element('h2', group));
    const groups = sectors[group];
    function navItem(name) {
      const item = button(name, () => navigate(group, name));
      if (name === target) item.setAttribute('aria-current', 'page');
      return item;
    }
    if (Array.isArray(groups)) groups.forEach(name => secondary.append(navItem(name)));
    else for (const [label, names] of Object.entries(groups)) {
      const details = element('details');
      details.open = names.includes(target);
      details.append(element('summary', label), ...names.map(navItem));
      secondary.append(details);
    }
    try {
      if (group === 'Início') {
        heading('Início');
        await dashboard(current);
      } else if (group === 'Compras' && target === 'Painel de compras') {
        heading(target, button('Abrir operações de compras', () => navigate('Compras', 'Pedidos de compra')));
        await board(current);
      } else if (group === 'Estoque' && ['Produtos e serviços','Equipamentos','Patrimônio','Estoque mínimo'].includes(target)) {
        heading(target, layoutOnly ? undefined : button('Novo produto', newProduct));
        await catalog(current);
      } else if (group === 'Serviços' && target === 'Links úteis') {
        heading(target);
        for (const link of legacy.links) {
          const row = element('p');
          const anchor = element('a', link.title);
          anchor.href = link.href;
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
          row.append(anchor);
          content.append(row);
        }
      } else if (group === 'Cadastros' && target === 'Categorias') {
        heading(target, layoutOnly ? undefined : button('Nova categoria', newCategory));
        const list = await categories();
        if (current === revision) content.append(table(['Categoria'], list.map(item => [item.nome])));
      } else if (group === 'Compras' && target === 'Recebimentos') {
        heading(target);
        await receiving(current);
      } else if ((group === 'Compras' && purchasePages.includes(target)) || legacyPages[target]) {
        heading(target);
        if (layoutOnly) {
          report('Nenhum registro cadastrado neste layout.');
          return;
        }
        content.append(legacyContent);
        panel.classList.add('erp-show-legacy');
        if (group === 'Compras' && purchasePages.includes(target)) {
          await legacy.purchases();
          if (current !== revision) return;
          const controls = {'Solicitações':'form','Para cotar':'quotes','Cotações':'quotes','Para aprovar':'status','Pedidos de compra':'orders','Notas de entrada':'complete'};
          panel.querySelector(`#inova-compras button[data-open="${controls[target]}"]`)?.click();
        } else legacyPages[target].click();
      } else {
        heading(target);
        report('Esta tela será integrada em uma próxima etapa.');
      }
    } catch {
      if (current === revision) report('Não foi possível carregar os dados. Selecione a página novamente para tentar.');
    }
  }

  Object.keys(sectors).forEach((group, index) => {
    const item = button(group, () => navigate(...routes.find(([name]) => name === group)));
    const icon = element('span', icons[index]);
    icon.setAttribute('aria-hidden', 'true');
    item.prepend(icon);
    item.dataset.sector = group;
    primary.append(item);
  });
  root.querySelector('[data-menu]').onclick = event => {
    secondary.hidden = !secondary.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!secondary.hidden));
  };
  search.addEventListener('input', () => {
    const query = normalize(search.value.trim());
    results.replaceChildren();
    results.hidden = !query;
    if (!query) return;
    for (const [group, target] of routes.filter(route => normalize(route.join(' ')).includes(query)).slice(0, 12)) {
      results.append(button(`${group} › ${target}`, () => navigate(group, target)));
    }
    if (!results.childElementCount) results.append(element('p', 'Nenhuma página encontrada.'));
  });
  search.addEventListener('keydown', event => {
    if (event.key === 'Escape') results.hidden = true;
    if (event.key === 'Enter') results.querySelector('button')?.click();
  });
  notifications.onclick = async () => {
    openDialog('Central de notificações');
    const loading = element('p', 'Carregando pendências…');
    dialogContent.append(loading);
    try {
      const waiting = (await purchases()).filter(order => purchasePhase(order) === 2);
      loading.textContent = waiting.length ? `${waiting.length} pedido(s) aguardando aprovação.` : 'Nenhum pedido aguarda aprovação.';
      if (waiting.length && loading.isConnected) dialogContent.append(button('Revisar pedidos', () => {
        dialog.close();
        navigate('Compras','Para aprovar');
      }));
    } catch {
      loading.textContent = 'Não foi possível carregar as pendências.';
    }
  };
  return {
    open() {
      document.documentElement.classList.add('inova-erp-active');
      navigate(sector || 'Início', page || 'Dashboard');
    },
    close() {
      revision += 1;
      if (dialog.open) dialog.close();
      panel.append(...legacyContent.children);
      content.replaceChildren();
      document.documentElement.classList.remove('inova-erp-active');
    }
  };
}
