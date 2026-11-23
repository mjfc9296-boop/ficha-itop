create table public.inova_blocos_estoque (
 id integer primary key check (id = 1),
 revisao uuid not null,
 saldos jsonb not null check (
  jsonb_typeof(saldos->'mascara') is not distinct from 'array'
  and jsonb_typeof(saldos->'blocos') is not distinct from 'array'
 )
);
alter table public.inova_blocos_estoque enable row level security;
revoke all on public.inova_blocos_estoque from public, anon, authenticated;
grant select, insert, update (revisao, saldos) on public.inova_blocos_estoque to authenticated;
create policy "Administradores aprovados consultam estoque"
 on public.inova_blocos_estoque for select to authenticated
 using (exists (select 1 from public.perfis where id = (select auth.uid()) and papel = 'administrador' and ativo and status_aprovacao = 'aprovado'));
create policy "Administradores aprovados criam estoque"
 on public.inova_blocos_estoque for insert to authenticated
 with check (exists (select 1 from public.perfis where id = (select auth.uid()) and papel = 'administrador' and ativo and status_aprovacao = 'aprovado'));
create policy "Administradores aprovados atualizam estoque"
 on public.inova_blocos_estoque for update to authenticated
 using (exists (select 1 from public.perfis where id = (select auth.uid()) and papel = 'administrador' and ativo and status_aprovacao = 'aprovado'))
 with check (exists (select 1 from public.perfis where id = (select auth.uid()) and papel = 'administrador' and ativo and status_aprovacao = 'aprovado'));
