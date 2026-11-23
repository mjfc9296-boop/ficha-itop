create table public.inova_blocos_atas_visita (
 id uuid primary key,
 usuario_id uuid not null default auth.uid() references auth.users(id),
 responsavel text not null default 'MARIO JOSE FERREIRA CAPUTO',
 data_visita date not null,
 contato text not null check (length(btrim(contato)) between 1 and 180),
 solicitacao_produtos text not null check (length(btrim(solicitacao_produtos)) > 0),
 criada_em timestamptz not null default now()
);

create index inova_blocos_atas_visita_ordem
 on public.inova_blocos_atas_visita (data_visita desc, criada_em desc, id desc);

alter table public.inova_blocos_atas_visita enable row level security;
revoke all on public.inova_blocos_atas_visita from public, anon, authenticated;
grant select on public.inova_blocos_atas_visita to authenticated;
grant insert (id, data_visita, contato, solicitacao_produtos)
 on public.inova_blocos_atas_visita to authenticated;

create policy atas_visita_consultar on public.inova_blocos_atas_visita
 for select to authenticated
 using (exists (
  select 1 from public.perfis
  where id = (select auth.uid()) and papel = 'administrador'
   and ativo and status_aprovacao = 'aprovado'
 ));

create policy atas_visita_gravar on public.inova_blocos_atas_visita
 for insert to authenticated
 with check (usuario_id = (select auth.uid()) and exists (
  select 1 from public.perfis
  where id = (select auth.uid()) and papel = 'administrador'
   and ativo and status_aprovacao = 'aprovado'
 ));
