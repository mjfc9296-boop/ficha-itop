alter table public.inova_blocos_envios
  add column status text not null default 'preparado'
  check (status in ('preparado', 'entregue'));

grant insert (status), update (status) on public.inova_blocos_envios to authenticated;

create policy "Admins aprovados atualizam status dos envios"
  on public.inova_blocos_envios for update to authenticated
  using (exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'administrador'
      and ativo and status_aprovacao = 'aprovado'
  ))
  with check (exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'administrador'
      and ativo and status_aprovacao = 'aprovado'
  ));
