-- Revisar e aplicar somente após aprovação. Preserva as políticas operacionais.
begin;
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
