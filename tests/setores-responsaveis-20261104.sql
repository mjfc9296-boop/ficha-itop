BEGIN;
DO $$
DECLARE sup uuid:=gen_random_uuid(); guest_sup uuid:=gen_random_uuid(); guest_adm uuid:=gen_random_uuid(); forged uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); adm uuid; adm2 uuid; team uuid; p jsonb; before_metrics jsonb; rejected boolean; c jsonb; result jsonb;
BEGIN
 SELECT id INTO adm FROM public.perfis WHERE papel='administrador' AND ativo AND status_aprovacao='aprovado' ORDER BY nome LIMIT 1;
 SELECT id INTO adm2 FROM public.perfis WHERE papel='administrador' AND ativo AND status_aprovacao='aprovado' AND id<>adm LIMIT 1;
 IF adm2 IS NULL THEN RAISE EXCEPTION 'DOIS_ADMS_NECESSARIOS';END IF;
 -- Supervisor de setor novo, sem depender de uma equipe vazia pré-criada.
 INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(sup,sup::text||'@teste.invalid',jsonb_build_object('nome','SUPERVISOR FINANCEIRO '||sup::text,'solicitado_papel','supervisor','setor','financeiro'));
 IF NOT EXISTS(SELECT 1 FROM public.perfis WHERE id=sup AND setor='financeiro' AND status_aprovacao='pendente' AND NOT ativo) THEN RAISE EXCEPTION 'SETOR_OU_PENDENCIA_FALHOU';END IF;
 PERFORM set_config('request.jwt.claim.sub',adm::text,true);PERFORM set_config('role','authenticated',true);
 PERFORM public.aprovar_usuario(sup);
 SELECT id INTO team FROM public.itop_equipes WHERE supervisor_origem=sup AND ativo AND setor='financeiro';
 IF team IS NULL THEN RAISE EXCEPTION 'CARTEIRA_DO_SUPERVISOR_NAO_CRIADA';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.itop_responsaveis_cadastro('financeiro') WHERE id=sup AND papel='supervisor') OR EXISTS(SELECT 1 FROM public.itop_responsaveis_cadastro('suporte') WHERE id=sup) THEN RAISE EXCEPTION 'CATALOGO_SETOR_INCORRETO';END IF;
 IF (SELECT count(*) FROM public.itop_responsaveis_cadastro('suporte') WHERE id IN(adm,adm2))<>2 THEN RAISE EXCEPTION 'ADMS_NAO_DISPONIVEIS';END IF;
 PERFORM set_config('role','postgres',true);
 rejected:=false;BEGIN INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(forged,forged::text||'@teste.invalid',jsonb_build_object('nome','VINCULO INVALIDO '||forged::text,'solicitado_papel','convidado','setor','suporte','responsavel_id',sup));EXCEPTION WHEN OTHERS THEN IF SQLERRM='SUPERVISOR_DE_OUTRO_SETOR' THEN rejected:=true;ELSE RAISE;END IF;END;
 IF NOT rejected THEN RAISE EXCEPTION 'ACEITOU_SUPERVISOR_OUTRO_SETOR';END IF;
 INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(guest_sup,guest_sup::text||'@teste.invalid',jsonb_build_object('nome','CONVIDADO FINANCEIRO '||guest_sup::text,'solicitado_papel','convidado','setor','financeiro','responsavel_id',sup));
 INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(guest_adm,guest_adm::text||'@teste.invalid',jsonb_build_object('nome','CONVIDADO SUPORTE '||guest_adm::text,'solicitado_papel','convidado','setor','suporte','responsavel_id',adm2));
 PERFORM set_config('request.jwt.claim.sub',sup::text,true);PERFORM set_config('role','authenticated',true);
 IF NOT itop_private.pode_gerir_usuario(guest_sup) OR itop_private.pode_gerir_usuario(guest_adm) THEN RAISE EXCEPTION 'ESCOPO_GERENCIAL_FALHOU';END IF;
 PERFORM public.aprovar_usuario(guest_sup);
 IF NOT EXISTS(SELECT 1 FROM public.itop_equipe_membros WHERE usuario_id=guest_sup AND equipe_id=team) THEN RAISE EXCEPTION 'VINCULO_SUPERVISOR_FALHOU';END IF;
 rejected:=false;BEGIN PERFORM public.aprovar_usuario(guest_adm);EXCEPTION WHEN OTHERS THEN IF SQLERRM='ACESSO_NEGADO' THEN rejected:=true;ELSE RAISE;END IF;END;
 IF NOT rejected THEN RAISE EXCEPTION 'SUPERVISOR_APROVOU_CONVIDADO_DO_ADM';END IF;
 PERFORM set_config('request.jwt.claim.sub',adm2::text,true);PERFORM public.aprovar_usuario(guest_adm);
 IF NOT EXISTS(SELECT 1 FROM public.itop_equipe_membros m JOIN public.itop_equipes e ON e.id=m.equipe_id WHERE m.usuario_id=guest_adm AND e.administrador_id=adm2 AND e.ativo) THEN RAISE EXCEPTION 'VINCULO_ADM_FALHOU';END IF;
 before_metrics:=public.itop_relatorio_inteligente('{}')->'resumo';
 PERFORM set_config('request.jwt.claim.sub',guest_sup::text,true);
 c:=jsonb_build_object('versao_formulario',2,'campos',jsonb_build_object('nome','CLIENTE FICTICIO','vendedor','CONVIDADO'),'indicacao','{}'::jsonb);
 result:=public.itop_salvar_sondagem(sid,0,gen_random_uuid(),'rascunho',c,'[]','[]',0,'Simulação do setor financeiro.',null,false);
 IF NOT EXISTS(SELECT 1 FROM public.itop_sondagens WHERE id=sid AND origem_convidado AND equipe_id=team) THEN RAISE EXCEPTION 'SIMULACAO_NA_CARTEIRA_ERRADA';END IF;
 PERFORM set_config('request.jwt.claim.sub',sup::text,true);IF NOT EXISTS(SELECT 1 FROM public.itop_sondagens WHERE id=sid) THEN RAISE EXCEPTION 'SUPERVISOR_NAO_LE_CONVIDADO';END IF;
 PERFORM set_config('request.jwt.claim.sub',adm2::text,true);IF public.itop_relatorio_inteligente('{}')->'resumo'<>before_metrics THEN RAISE EXCEPTION 'CONTABILIZOU_CONVIDADO';END IF;
END $$;
ROLLBACK;
SELECT 'PASSOU: setor obrigatório, novo supervisor, catálogo por setor, ADM como responsável, aprovação limitada à própria equipe, carteiras e exclusão dos indicadores. Tudo revertido.' resultado;
