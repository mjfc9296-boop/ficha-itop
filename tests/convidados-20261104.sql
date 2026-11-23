-- Transação revertida: nenhum usuário, proposta ou evento permanece.
BEGIN;
DO $$
DECLARE u uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); mario uuid; admin_id uuid; c jsonb; r jsonb; rejected boolean; before_metrics jsonb; after_metrics jsonb; test_metrics jsonb;
BEGIN
 SELECT id INTO mario FROM public.itop_equipes WHERE codigo_carteira='adm-mario' AND ativo;
 SELECT id INTO admin_id FROM public.perfis WHERE papel='administrador' AND ativo AND status_aprovacao='aprovado' LIMIT 1;
 -- Sem equipe_id: o banco deve resolver o destino, nunca confiar no navegador.
 INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(u,u::text||'@teste.invalid',jsonb_build_object('nome','CONVIDADO TESTE '||u::text,'solicitado_papel','convidado'));
 IF NOT EXISTS(SELECT 1 FROM public.perfis WHERE id=u AND NOT ativo AND status_aprovacao='pendente' AND solicitado_papel='convidado' AND equipe_solicitada_id=mario AND papel='vendedor') THEN RAISE EXCEPTION 'CADASTRO_DESTINO_OU_APROVACAO_FALHOU';END IF;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);PERFORM set_config('role','authenticated',true);
 rejected:=false;BEGIN PERFORM public.itop_comercial_contexto();EXCEPTION WHEN OTHERS THEN IF SQLERRM='ACESSO_NEGADO' THEN rejected:=true;ELSE RAISE;END IF;END;
 IF NOT rejected THEN RAISE EXCEPTION 'PENDENTE_OBTEVE_ACESSO';END IF;
 PERFORM set_config('request.jwt.claim.sub',admin_id::text,true);PERFORM public.aprovar_usuario(u);
 IF NOT EXISTS(SELECT 1 FROM public.itop_equipe_membros WHERE usuario_id=u AND equipe_id=mario) THEN RAISE EXCEPTION 'CARTEIRA_NAO_VINCULADA';END IF;
 before_metrics:=public.itop_relatorio_inteligente('{}')->'resumo';test_metrics:=public.itop_relatorio_inteligente('{"modo":"testes"}')->'resumo';
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 IF public.itop_comercial_contexto()->>'papel'<>'convidado' THEN RAISE EXCEPTION 'PERFIL_ERRADO';END IF;
 c:=jsonb_build_object('versao_formulario',2,'campos',jsonb_build_object('nome','CLIENTE FICTICIO','vendedor','CONVIDADO'),'indicacao','{}'::jsonb);
 r:=public.itop_salvar_sondagem(sid,0,gen_random_uuid(),'rascunho',c,'[]','[]',0,'Simulação de convidado.',null,false);
 IF NOT EXISTS(SELECT 1 FROM public.itop_sondagens WHERE id=sid AND origem_convidado AND NOT fluxo_obrigatorio AND equipe_id=mario) THEN RAISE EXCEPTION 'ORIGEM_OU_LEITURA_FALHOU';END IF;
 r:=public.itop_salvar_sondagem(sid,(r->>'versao')::integer,gen_random_uuid(),'proposta',c,'[]','[]',0,'Simulação atualizada.',null,false);
 IF NOT EXISTS(SELECT 1 FROM public.itop_sondagens_filtradas('{"modo":"todos"}') WHERE id=sid) THEN RAISE EXCEPTION 'CONVIDADO_NAO_RECUPERA_SIMULACAO';END IF;
 rejected:=false;BEGIN PERFORM public.itop_estrutura_equipes();EXCEPTION WHEN OTHERS THEN IF SQLERRM='ACESSO_NEGADO' THEN rejected:=true;ELSE RAISE;END IF;END;
 IF NOT rejected THEN RAISE EXCEPTION 'CONVIDADO_ACESSOU_GESTAO';END IF;
 rejected:=false;BEGIN PERFORM public.itop_relatorio_inteligente('{}');EXCEPTION WHEN OTHERS THEN IF SQLERRM='ACESSO_NEGADO' THEN rejected:=true;ELSE RAISE;END IF;END;
 IF NOT rejected THEN RAISE EXCEPTION 'CONVIDADO_ACESSOU_RELATORIO';END IF;
 PERFORM set_config('request.jwt.claim.sub',admin_id::text,true);
 after_metrics:=public.itop_relatorio_inteligente('{}')->'resumo';IF after_metrics<>before_metrics THEN RAISE EXCEPTION 'CONTABILIZOU_CONVIDADO';END IF;
 IF EXISTS(SELECT 1 FROM public.itop_sondagens_filtradas('{"modo":"producao"}') WHERE id=sid) OR EXISTS(SELECT 1 FROM public.itop_sondagens_filtradas('{"modo":"testes"}') WHERE id=sid) THEN RAISE EXCEPTION 'VAZOU_NOS_RELATORIOS';END IF;
 PERFORM public.itop_classificar_sondagem(sid,(r->>'versao')::integer,true);
 IF public.itop_relatorio_inteligente('{"modo":"testes"}')->'resumo'<>test_metrics THEN RAISE EXCEPTION 'CONTABILIZOU_COMO_TESTE';END IF;
END $$;
ROLLBACK;
SELECT 'PASSOU: cadastro pendente, aprovação, carteira Mario, salvar/ler, não contabilização e limites de permissão. Tudo revertido.' resultado;
