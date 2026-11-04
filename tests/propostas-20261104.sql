-- All fixtures, audit entries and saves are rolled back.
BEGIN;
DO $$
DECLARE u uuid; c jsonb; r jsonb; id1 uuid:=gen_random_uuid(); id2 uuid:=gen_random_uuid(); id3 uuid:=gen_random_uuid(); p jsonb:='[{"name":"PLANO TESTE TRANSACIONAL","category":"Fibra","price":99.90,"q":1}]'; v integer; op uuid:=gen_random_uuid(); r2 jsonb; count_before integer; rejected boolean;
BEGIN
 SELECT id,jsonb_build_object('versao_formulario',2,'campos',jsonb_build_object('clienteItop','nao','nome','TESTE TRANSACIONAL','telefone','35999999999','cidade','ALFENAS','vendedor',nome,'consumo','600','tarifa','1,12','conta','800','categoria','30'),'indicacao','{}'::jsonb) INTO u,c FROM public.perfis WHERE papel='vendedor' AND ativo AND status_aprovacao='aprovado' LIMIT 1;
 IF u IS NULL THEN RAISE EXCEPTION 'VENDEDOR_DE_TESTE_INDISPONIVEL'; END IF;
 -- Fixtures are already concluded; do not touch any live open proposal.
 INSERT INTO public.itop_sondagens(id,vendedor_id,status,dados,oferecidos,escolhidos,bruto,desconto,resultado,fluxo_obrigatorio,fluxo_etapa,diagnostico_final,versao)
 VALUES(id1,u,'finalizada',c,p,p,99.9,0,'ok',true,3,'cliente_ficou_de_pensar',1),(id2,u,'perdida',c,p,p,99.9,0,'ok',true,3,'desistencia',1),(id3,u,'finalizada',c,p,p,99.9,0,'ok',true,3,'venda_fechada',1);
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 PERFORM set_config('role','authenticated',true);
 SELECT count(*) INTO count_before FROM public.itop_sondagens;
 IF jsonb_array_length(public.itop_buscar_propostas(id1::text,'cliente_ficou_de_pensar'))<>1 OR jsonb_array_length(public.itop_buscar_propostas(id2::text,'desistencia'))<>1 OR jsonb_array_length(public.itop_buscar_propostas(id3::text,'venda_fechada'))<>1 THEN RAISE EXCEPTION 'FILTROS_FALHARAM'; END IF;
 r:=public.itop_salvar_sondagem(id1,1,op,'finalizada',c,p,p,0,'Observação atualizada após finalizar.',null,false);
 IF r->>'id'<>id1::text OR r->>'status'<>'finalizada' OR r->>'diagnostico_final'<>'cliente_ficou_de_pensar' OR (r->>'versao')::integer<>2 THEN RAISE EXCEPTION 'SAVE_APOS_FINAL_FALHOU'; END IF;
 r2:=public.itop_salvar_sondagem(id1,1,op,'finalizada',c,p,p,0,'Observação atualizada após finalizar.',null,false);
 IF r2<>r THEN RAISE EXCEPTION 'IDEMPOTENCIA_FALHOU'; END IF;
 rejected:=false;BEGIN PERFORM public.itop_salvar_sondagem(id1,1,gen_random_uuid(),'finalizada',c,p,p,0,'ok',null,false);EXCEPTION WHEN serialization_failure THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'CONCORRENCIA_FALHOU'; END IF;
 r:=public.itop_salvar_sondagem(id2,1,gen_random_uuid(),'perdida',c,p,p,0,'Desistência preservada.',null,false);
 r:=public.itop_salvar_sondagem(id3,1,gen_random_uuid(),'finalizada',c,p,p,0,'Venda preservada.',null,false);
 IF (SELECT count(*) FROM public.itop_sondagens)<>count_before THEN RAISE EXCEPTION 'DUPLICOU_PROPOSTA'; END IF;
 IF (SELECT dados FROM public.itop_sondagens WHERE id=id1)<>c OR (SELECT resultado FROM public.itop_sondagens WHERE id=id1)<>'Observação atualizada após finalizar.' THEN RAISE EXCEPTION 'DADOS_NAO_SALVOS'; END IF;
 -- Another authenticated seller may not read or download these proposals.
 PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 IF EXISTS(SELECT 1 FROM public.itop_sondagens WHERE id IN(id1,id2,id3)) THEN RAISE EXCEPTION 'RLS_VAZOU'; END IF;
END $$;
ROLLBACK;
SELECT 'PASSOU: três status, atualização após finalizar, preservação, idempotência, concorrência, não duplicação e RLS; tudo revertido.' resultado;
