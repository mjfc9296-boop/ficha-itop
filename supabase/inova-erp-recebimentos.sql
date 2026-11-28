create table public.inova_erp_recebimentos (
  id uuid primary key,
  pedido_id uuid not null references public.inova_compras(id),
  recebido_em date not null,
  responsavel uuid not null,
  nota_fiscal text not null check (length(btrim(nota_fiscal)) between 1 and 120),
  observacoes text not null check (length(observacoes) <= 2000),
  criado_em timestamptz not null default now()
);
create index inova_erp_recebimentos_pedido on public.inova_erp_recebimentos(pedido_id);
create table public.inova_erp_entradas_compra (
  recebimento_id uuid references public.inova_erp_recebimentos(id),
  linha integer check (linha between 1 and 100),
  sku text not null references public.inova_erp_produtos(sku),
  quantidade numeric not null check (quantidade > 0 and quantidade <= 999999),
  primary key (recebimento_id, linha)
);
create index inova_erp_entradas_compra_sku on public.inova_erp_entradas_compra(sku);

alter table public.inova_erp_recebimentos enable row level security;
alter table public.inova_erp_entradas_compra enable row level security;
revoke all on public.inova_erp_recebimentos, public.inova_erp_entradas_compra from public, anon, authenticated;
grant select on public.inova_erp_recebimentos, public.inova_erp_entradas_compra to authenticated;

create policy titular_le_recebimentos on public.inova_erp_recebimentos for select to authenticated using (
  (select inova_erp_privado.e_titular()) and exists (
    select 1 from public.perfis where id = (select auth.uid()) and ativo
      and papel = 'administrador' and status_aprovacao = 'aprovado'
  )
);
create policy titular_le_entradas on public.inova_erp_entradas_compra for select to authenticated using (
  exists (select 1 from public.inova_erp_recebimentos r where r.id = recebimento_id)
);

-- O proprietário da função pode alterar o saldo. A API de tabelas continua sem permissão de escrita.
create function public.inova_erp_confirmar_recebimento(
  chave uuid, pedido uuid, data_recebimento date, documento text, notas text, linhas jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  cotados jsonb;
  existente public.inova_erp_recebimentos%rowtype;
  item record;
  anterior record;
begin
  if not inova_erp_privado.e_titular() or not exists (
    select 1 from public.perfis where id = auth.uid() and ativo
      and papel = 'administrador' and status_aprovacao = 'aprovado'
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  perform 1 from public.inova_compras where id = pedido for update;
  if not found then raise exception 'Pedido inexistente'; end if;

  if coalesce(jsonb_typeof(linhas), '') <> 'array' then raise exception 'Itens inválidos'; end if;
  if jsonb_array_length(linhas) not between 1 and 100 then raise exception 'Itens inválidos'; end if;
  if exists (
    select 1 from jsonb_to_recordset(linhas) as x(linha integer, sku text, quantidade numeric)
    where x.linha is null or x.sku is null or x.quantidade is null or x.quantidade not between 0.000001 and 999999
  ) or (select count(distinct x.linha) from jsonb_to_recordset(linhas) as x(linha integer)) <> jsonb_array_length(linhas) then
    raise exception 'Itens inválidos ou repetidos';
  end if;

  select * into existente from public.inova_erp_recebimentos where id = chave;
  if found then
    if existente.pedido_id is distinct from pedido or existente.recebido_em is distinct from data_recebimento
      or existente.nota_fiscal is distinct from btrim(documento) or existente.observacoes is distinct from coalesce(notas,'')
      or (select count(*) from public.inova_erp_entradas_compra where recebimento_id = chave) <> jsonb_array_length(linhas)
      or exists (
        select 1 from jsonb_to_recordset(linhas) as x(linha integer, sku text, quantidade numeric)
        where not exists (
          select 1 from public.inova_erp_entradas_compra e where e.recebimento_id = chave
            and (e.linha,e.sku,e.quantidade) = (x.linha,x.sku,x.quantidade)
        )
      ) then raise exception 'Chave de recebimento já utilizada'; end if;
    return chave;
  end if;

  if data_recebimento is null or data_recebimento > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Informe uma data de recebimento válida';
  end if;
  if exists (select 1 from public.inova_compras_conclusoes where pedido_id = pedido) then
    raise exception 'Pedido já encerrado pelo fluxo anterior';
  end if;
  select o.itens into cotados
  from public.inova_compras_decisoes d
  join public.inova_compras_orcamentos o on o.id = d.orcamento_id and o.pedido_id = d.pedido_id
  where d.pedido_id = pedido and d.resultado = 'aprovado';
  if not found then raise exception 'Cotação aprovada não encontrada'; end if;

  insert into public.inova_erp_recebimentos values (chave,pedido,data_recebimento,auth.uid(),btrim(documento),coalesce(notas,''),default);
  for item in select * from jsonb_to_recordset(linhas) as x(linha integer, sku text, quantidade numeric) order by sku, linha loop
    if item.linha not between 1 and jsonb_array_length(cotados)
      or (cotados->(item.linha - 1)->>'quantidade') is null then
      raise exception 'Linha inexistente na cotação';
    end if;
    select coalesce(sum(e.quantidade),0) as total, min(e.sku) as sku into anterior
    from public.inova_erp_entradas_compra e
    join public.inova_erp_recebimentos r on r.id = e.recebimento_id
    where r.pedido_id = pedido and e.linha = item.linha;
    if anterior.sku is not null and anterior.sku <> item.sku then raise exception 'O SKU da linha já está definido'; end if;
    if item.quantidade + anterior.total > (cotados->(item.linha - 1)->>'quantidade')::numeric then
      raise exception 'Quantidade acima do saldo pendente';
    end if;
    update public.inova_erp_produtos set fisico = fisico + item.quantidade where sku = item.sku;
    if not found then raise exception 'SKU inexistente'; end if;
    insert into public.inova_erp_entradas_compra values (chave,item.linha,item.sku,item.quantidade);
  end loop;
  return chave;
end;
$$;
revoke all on function public.inova_erp_confirmar_recebimento(uuid,uuid,date,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.inova_erp_confirmar_recebimento(uuid,uuid,date,text,text,jsonb) to authenticated;

-- Serializa com o fluxo legado e protege contra encerramento de um recebimento parcial.
create function inova_erp_privado.validar_conclusao_compra() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cotados jsonb;
begin
  perform 1 from public.inova_compras where id = new.pedido_id for update;
  if exists (select 1 from public.inova_erp_recebimentos where pedido_id = new.pedido_id) then
    select o.itens into cotados from public.inova_compras_decisoes d
    join public.inova_compras_orcamentos o on o.id = d.orcamento_id
    where d.pedido_id = new.pedido_id and d.resultado = 'aprovado';
    if cotados is null or exists (
      select 1 from jsonb_array_elements(cotados) with ordinality as c(item,linha)
      where (c.item->>'quantidade')::numeric > coalesce((
        select sum(e.quantidade) from public.inova_erp_entradas_compra e
        join public.inova_erp_recebimentos r on r.id = e.recebimento_id
        where r.pedido_id = new.pedido_id and e.linha = c.linha
      ),0)
    ) then raise exception 'Ainda há itens a receber'; end if;
  end if;
  return new;
end;
$$;
revoke all on function inova_erp_privado.validar_conclusao_compra() from public, anon, authenticated;
create trigger inova_validar_conclusao_compra before insert on public.inova_compras_conclusoes
for each row execute function inova_erp_privado.validar_conclusao_compra();
