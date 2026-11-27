create table public.inova_compras (
 id uuid primary key,
 numero bigint generated always as identity unique,
 fornecedor text not null check (length(trim(fornecedor)) between 1 and 200),
 entrega date,
 itens jsonb not null check (jsonb_typeof(itens) = 'array' and jsonb_array_length(itens) between 1 and 100),
 observacoes text not null default '' check (length(observacoes) <= 2000),
 criado_em timestamptz not null default now()
);
create table public.inova_compras_minimos (
 produto text primary key,
 minimo integer not null check (minimo between 0 and 999999999)
);
alter table public.inova_compras enable row level security;
alter table public.inova_compras_minimos enable row level security;
revoke all on public.inova_compras, public.inova_compras_minimos from public, anon, authenticated;
grant select, insert (id, fornecedor, entrega, itens, observacoes) on public.inova_compras to authenticated;
grant select, insert, update on public.inova_compras_minimos to authenticated;

create policy "Painel Inova consulta compras" on public.inova_compras
 for select to authenticated using (
  (select auth.jwt()->>'email') = 'mjfc9296@gmail.com'
  and exists (select 1 from public.perfis where id = (select auth.uid()) and papel = 'administrador' and ativo and status_aprovacao = 'aprovado')
 );
create policy "Painel Inova cria compras" on public.inova_compras
 for insert to authenticated with check (
  (select auth.jwt()->>'email') = 'mjfc9296@gmail.com'
  and exists (select 1 from public.perfis where id = (select auth.uid()) and papel = 'administrador' and ativo and status_aprovacao = 'aprovado')
 );
create policy "Painel Inova configura estoque mínimo" on public.inova_compras_minimos
 for all to authenticated using (
  (select auth.jwt()->>'email') = 'mjfc9296@gmail.com'
  and exists (select 1 from public.perfis where id = (select auth.uid()) and papel = 'administrador' and ativo and status_aprovacao = 'aprovado')
 );
