begin;
CREATE OR REPLACE FUNCTION public.inova_compras_e_administrador()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select lower((select auth.jwt()->>'email')) = 'mjfc9296@gmail.com'
  and exists (
   select 1 from public.perfis where id = (select auth.uid())
    and papel = 'administrador' and ativo and status_aprovacao = 'aprovado'
  );
$function$
;
alter policy "Painel Inova consulta compras" on public.inova_compras using (((( SELECT (auth.jwt() ->> 'email'::text)) = 'mjfc9296@gmail.com'::text) AND (EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = ( SELECT auth.uid() AS uid)) AND (perfis.papel = 'administrador'::text) AND perfis.ativo AND (perfis.status_aprovacao = 'aprovado'::text))))));
alter policy "Painel Inova cria compras" on public.inova_compras with check (((( SELECT (auth.jwt() ->> 'email'::text)) = 'mjfc9296@gmail.com'::text) AND (EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = ( SELECT auth.uid() AS uid)) AND (perfis.papel = 'administrador'::text) AND perfis.ativo AND (perfis.status_aprovacao = 'aprovado'::text))))));
alter policy "Painel Inova envia compras para aprovação" on public.inova_compras using (((enviado_para_aprovacao_em IS NULL) AND (( SELECT (auth.jwt() ->> 'email'::text)) = 'mjfc9296@gmail.com'::text) AND (EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = ( SELECT auth.uid() AS uid)) AND (perfis.papel = 'administrador'::text) AND perfis.ativo AND (perfis.status_aprovacao = 'aprovado'::text)))))) with check (((enviado_para_aprovacao_em IS NOT NULL) AND (( SELECT count(*) AS count
   FROM inova_compras_orcamentos orcamento
  WHERE ((orcamento.pedido_id = inova_compras.id) AND ((orcamento.posicao >= 1) AND (orcamento.posicao <=
        CASE
            WHEN inova_compras.fornecedor_exclusivo THEN 1
            ELSE 3
        END)))) =
CASE
    WHEN fornecedor_exclusivo THEN 1
    ELSE 3
END) AND (( SELECT (auth.jwt() ->> 'email'::text)) = 'mjfc9296@gmail.com'::text) AND (EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = ( SELECT auth.uid() AS uid)) AND (perfis.papel = 'administrador'::text) AND perfis.ativo AND (perfis.status_aprovacao = 'aprovado'::text))))));
alter policy "Painel Inova configura estoque mínimo" on public.inova_compras_minimos using (((( SELECT (auth.jwt() ->> 'email'::text)) = 'mjfc9296@gmail.com'::text) AND (EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = ( SELECT auth.uid() AS uid)) AND (perfis.papel = 'administrador'::text) AND perfis.ativo AND (perfis.status_aprovacao = 'aprovado'::text))))));
alter policy "Painel Inova acessa orçamentos" on public.inova_compras_orcamentos using (((lower(( SELECT (auth.jwt() ->> 'email'::text))) = 'mjfc9296@gmail.com'::text) AND (EXISTS ( SELECT 1
   FROM perfis
  WHERE ((perfis.id = ( SELECT auth.uid() AS uid)) AND (perfis.papel = 'administrador'::text) AND perfis.ativo AND (perfis.status_aprovacao = 'aprovado'::text))))));
drop policy if exists inova_admin_exclusivo on public.inova_blocos_arquivos;
drop policy if exists inova_admin_exclusivo on public.inova_blocos_atas_visita;
drop policy if exists inova_admin_exclusivo on public.inova_blocos_envios;
drop policy if exists inova_admin_exclusivo on public.inova_blocos_estoque;
drop policy if exists inova_admin_exclusivo on public.inova_blocos_fornecedores;
drop policy if exists inova_admin_exclusivo on public.inova_compras;
drop policy if exists inova_admin_exclusivo on public.inova_compras_conclusoes;
drop policy if exists inova_admin_exclusivo on public.inova_compras_decisoes;
drop policy if exists inova_admin_exclusivo on public.inova_compras_minimos;
drop policy if exists inova_admin_exclusivo on public.inova_compras_orcamentos;
drop policy if exists inova_admin_exclusivo on public.inova_entregas;
drop policy if exists inova_admin_exclusivo on public.inova_vendas;
drop policy if exists inova_arquivos_admin_exclusivo on storage.objects;
commit;
