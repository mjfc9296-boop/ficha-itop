const sectors = {
  'Início': ['Dashboard'],
  'Documentos': {
    Biblioteca: ['Favoritos', 'Recentes', 'Compras', 'Comercial', 'Estoque', 'Produção'],
    Materiais: ['Arquivos úteis', 'Imagens úteis', 'Vídeos úteis', 'Lixeira']
  },
  'Compras': {
    'Visão geral': ['Painel de compras'],
    'Solicitações e cotações': ['Solicitações', 'Para cotar', 'Cotações', 'Para aprovar'],
    'Pedidos e fornecedores': ['Pedidos de compra', 'Notas de entrada', 'Fornecedores']
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

function overdue(row, today) {
  if (!row.dados?.dataEntrega || row.dados.dataEntrega >= today) return false;
  return row.itens.some((item, index) =>
    Number(item.quantidade) > row.inova_entregas.filter(delivery => delivery.item === index)
      .reduce((sum, delivery) => sum + Number(delivery.quantidade), 0));
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

export function mountErp(panel, legacy) {
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

  const products = () => allRows(client.from('inova_erp_produtos').select(
    'sku,nome,tipo,fisico,reservado,disponivel,estoque_minimo,preco_venda'), 'sku');
  const categories = () => allRows(client.from('inova_erp_categorias').select('id,nome'), 'nome');
  const purchases = () => allRows(client.from('inova_compras').select(
    'id,numero,fornecedor,entrega,enviado_para_aprovacao_em,inova_compras_orcamentos(id),inova_compras_decisoes(resultado),inova_compras_conclusoes(concluido_em)'), 'numero');
  const sales = () => allRows(client.from('inova_vendas').select(
    'id,dados,itens,inova_entregas(item,quantidade)').is('arquivada_em', null), 'id');

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
    const today = new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Sao_Paulo'}).format(new Date());
    const awaiting = orders?.filter(order => purchasePhase(order) === 2).length;
    notificationsCount(awaiting);
    const cards = element('div');
    cards.className = 'erp-cards';
    for (const [label, value, group, target] of [
      ['Estoque crítico', stock?.filter(item => item.disponivel < 0 || (item.estoque_minimo != null && item.disponivel <= item.estoque_minimo)).length, 'Estoque', 'Estoque mínimo'],
      ['Compras pendentes', orders?.filter(order => purchasePhase(order) >= 0 && purchasePhase(order) < 4).length, 'Compras', 'Painel de compras'],
      ['Cotações aguardando aprovação', awaiting, 'Compras', 'Painel de compras'],
      ['Entregas atrasadas', confirmed?.filter(row => overdue(row, today)).length, 'Comercial', 'Pedidos de venda'],
      ['Propostas em negociação', null, 'Comercial', 'CRM'],
      ['Vendas confirmadas', confirmed?.length, 'Comercial', 'Pedidos de venda'],
      ['Ordens de produção', null, 'Produção', 'Ordens de produção']
    ]) {
      const card = button(label, () => navigate(group, target));
      card.append(element('strong', value == null ? 'Indisponível' : number.format(value)));
      cards.append(card);
    }
    content.append(cards);
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
        heading(target, button('Novo produto', newProduct));
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
        heading(target, button('Nova categoria', newCategory));
        const list = await categories();
        if (current === revision) content.append(table(['Categoria'], list.map(item => [item.nome])));
      } else if ((group === 'Compras' && purchasePages.includes(target)) || legacyPages[target]) {
        heading(target);
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
    const normalize = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
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
