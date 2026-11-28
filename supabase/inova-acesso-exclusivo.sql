-- Revisar e aplicar somente após aprovação. Preserva as políticas operacionais.
begin;
create or replace function public.inova_compras_e_administrador()
returns boolean language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'administrador'
      and ativo and status_aprovacao = 'aprovado'
  );
$$;

alter policy "Painel Inova consulta compras" on public.inova_compras
  using ((select public.inova_compras_e_administrador()));
alter policy "Painel Inova cria compras" on public.inova_compras
  with check ((select public.inova_compras_e_administrador()));
alter policy "Painel Inova configura estoque mínimo" on public.inova_compras_minimos
  using ((select public.inova_compras_e_administrador()))
  with check ((select public.inova_compras_e_administrador()));
alter policy "Painel Inova acessa orçamentos" on public.inova_compras_orcamentos
  using ((select public.inova_compras_e_administrador()))
  with check ((select public.inova_compras_e_administrador()));
alter policy "Painel Inova envia compras para aprovação" on public.inova_compras
  using (enviado_para_aprovacao_em is null and (select public.inova_compras_e_administrador()))
  with check (
    enviado_para_aprovacao_em is not null and (select public.inova_compras_e_administrador())
    and (select count(*) from public.inova_compras_orcamentos o
         where o.pedido_id = inova_compras.id
           and o.posicao between 1 and case when inova_compras.fornecedor_exclusivo then 1 else 3 end)
      = case when fornecedor_exclusivo then 1 else 3 end
  );
do $$
declare tabela regclass;
begin
  foreach tabela in array array[
    'public.inova_blocos_arquivos'::regclass, 'public.inova_blocos_atas_visita'::regclass,
    'public.inova_blocos_envios'::regclass, 'public.inova_blocos_estoque'::regclass,
    'public.inova_blocos_fornecedores'::regclass, 'public.inova_compras'::regclass,
    'public.inova_compras_conclusoes'::regclass, 'public.inova_compras_decisoes'::regclass,
    'public.inova_compras_minimos'::regclass, 'public.inova_compras_orcamentos'::regclass,
    'public.inova_entregas'::regclass, 'public.inova_vendas'::regclass
  ] loop
    execute format('drop policy if exists inova_admin_exclusivo on %s', tabela);
    execute format('create policy inova_admin_exclusivo on %s as restrictive for all to public using ((select public.inova_compras_e_administrador())) with check ((select public.inova_compras_e_administrador()))', tabela);
  end loop;
end $$;
-- Mantém as condições existentes de pedido aprovado, vínculo e tipo do arquivo.
drop policy if exists inova_arquivos_admin_exclusivo on storage.objects;
create policy inova_arquivos_admin_exclusivo on storage.objects
  as restrictive for all to public
  using (case when bucket_id in ('inova-comprovantes','inova-compras-documentos')
         then (select public.inova_compras_e_administrador()) else true end)
  with check (case when bucket_id in ('inova-comprovantes','inova-compras-documentos')
              then (select public.inova_compras_e_administrador()) else true end);
commit;
