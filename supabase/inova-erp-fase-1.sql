-- Resolve o UUID na implantação e mantém a identidade fora do repositório.
create schema inova_erp_privado;
revoke all on schema inova_erp_privado from public, anon, authenticated;
grant usage on schema inova_erp_privado to anon, authenticated;

do $$
declare titular uuid;
begin
  select u.id into strict titular from auth.users u join public.perfis p on p.id = u.id
  where lower(u.email) = 'mjfc9296@gmail.com' and p.papel = 'administrador'
    and p.ativo and p.status_aprovacao = 'aprovado';
  execute format(
    'create function inova_erp_privado.e_titular() returns boolean language sql stable security invoker set search_path = %L as %L',
    '', format('select coalesce((select auth.uid()) = %L::uuid, false)', titular)
  );
end $$;
revoke all on function inova_erp_privado.e_titular() from public, anon, authenticated;
grant execute on function inova_erp_privado.e_titular() to anon, authenticated;

-- Preserva o estoque anterior. Os saldos de abertura são lidos do sistema.
create table public.inova_erp_categorias (
  id bigint generated always as identity primary key,
  nome text not null check (length(btrim(nome)) > 0)
);
create unique index inova_erp_categoria_nome on public.inova_erp_categorias (lower(btrim(nome)));

create sequence public.inova_erp_sku_seq start with 1;
create table public.inova_erp_produtos (
  sku text primary key default lpad(nextval('public.inova_erp_sku_seq')::text, 8, '0')
    check (length(btrim(sku)) between 1 and 32),
  nome text not null check (length(btrim(nome)) > 0),
  tipo text not null check (tipo in ('EPI','EPS','Patrimonial','Matéria-prima','Insumo','Produto acabado','Ferramenta','Equipamento','Serviço')),
  uso text,
  categoria_id bigint references public.inova_erp_categorias(id),
  foto text check (length(foto) <= 730000 and foto ~ '^data:image/(png|jpeg|webp);base64,'),
  unidade text not null default 'UN',
  quantidade_embalagem numeric not null default 1 check (quantidade_embalagem > 0),
  estoque_minimo numeric check (estoque_minimo >= 0),
  fisico numeric not null default 0 check (fisico >= 0),
  reservado numeric not null default 0 check (reservado >= 0),
  disponivel numeric generated always as (fisico - reservado) stored,
  preco_custo numeric(14,2) check (preco_custo >= 0),
  preco_venda numeric(14,2) check (preco_venda >= 0),
  fornecedor text,
  local_armazenamento text,
  observacoes text,
  ncm text check (ncm ~ '^[0-9]{8}$'),
  cest text check (cest ~ '^[0-9]{7}$'),
  origem_fiscal smallint check (origem_fiscal between 0 and 8)
);

create function public.inova_erp_proximo_sku() returns text
language sql volatile security invoker set search_path = ''
as $$
  select lpad(nextval('public.inova_erp_sku_seq')::text, 8, '0')
  from public.perfis
  where id = (select auth.uid()) and papel = 'administrador' and ativo
    and status_aprovacao = 'aprovado'
    and (select inova_erp_privado.e_titular());
$$;
revoke all on function public.inova_erp_proximo_sku() from public, anon, authenticated;
grant execute on function public.inova_erp_proximo_sku() to authenticated;
grant usage on sequence public.inova_erp_sku_seq to authenticated;

alter table public.inova_erp_produtos enable row level security;
alter table public.inova_erp_categorias enable row level security;
revoke all on public.inova_erp_produtos, public.inova_erp_categorias from public, anon, authenticated;
grant select on public.inova_erp_produtos, public.inova_erp_categorias to authenticated;
grant insert(nome) on public.inova_erp_categorias to authenticated;
grant insert(sku,nome,tipo,uso,categoria_id,foto,unidade,quantidade_embalagem,estoque_minimo,fisico,
  preco_custo,preco_venda,fornecedor,local_armazenamento,observacoes,ncm,cest,origem_fiscal)
  on public.inova_erp_produtos to authenticated;

do $$
declare relation text;
  owner_check constant text := $guard$
    (select inova_erp_privado.e_titular())
    and exists (
      select 1 from public.perfis p where p.id = (select auth.uid())
        and p.papel = 'administrador' and p.ativo and p.status_aprovacao = 'aprovado'
    )
  $guard$;
begin
  foreach relation in array array['inova_erp_produtos','inova_erp_categorias'] loop
    execute format('create policy inova_erp_admin on public.%I for all to authenticated using (%s) with check (%s)',
      relation, owner_check, owner_check);
  end loop;
end $$;

-- Abertura do catálogo a partir dos saldos reais cadastrados na Inova.
with origem as (
  select coalesce((select saldos::jsonb from public.inova_blocos_estoque where id=1),
    (select convert_from(pdf,'UTF8')::jsonb from public.inova_blocos_arquivos where id='estoque-inicial')) as saldos
), itens as (
  select (case grupo.key when 'blocos' then 'Bloco' else 'Máscara' end) || ' ' || (item->>0) || ' cm' as nome,
    case grupo.key when 'blocos' then 'Produto acabado' else 'EPS' end as tipo,
    (item->>1)::numeric + coalesce((item->>2)::numeric,0) as saldo
  from origem, lateral jsonb_each(saldos) grupo, lateral jsonb_array_elements(grupo.value) item
  where grupo.key in ('mascara','blocos')
)
insert into public.inova_erp_produtos(nome,tipo,fisico,estoque_minimo)
select nome,tipo,saldo,m.minimo from itens left join public.inova_compras_minimos m on m.produto=itens.nome order by nome;
