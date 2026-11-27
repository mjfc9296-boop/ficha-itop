begin;

alter table public.inova_compras add column enviado_para_aprovacao_em timestamptz;
grant update (enviado_para_aprovacao_em) on public.inova_compras to authenticated;

create policy "Painel Inova envia compras para aprovação" on public.inova_compras
 for update to authenticated using (
  enviado_para_aprovacao_em is null
  and (select auth.jwt()->>'email') = 'mjfc9296@gmail.com'
  and exists (select 1 from public.perfis where id = (select auth.uid()) and papel = 'administrador' and ativo and status_aprovacao = 'aprovado')
 ) with check (
  enviado_para_aprovacao_em is not null
  and (select auth.jwt()->>'email') = 'mjfc9296@gmail.com'
  and exists (select 1 from public.perfis where id = (select auth.uid()) and papel = 'administrador' and ativo and status_aprovacao = 'aprovado')
 );

notify pgrst, 'reload schema';
commit;
