-- Leitura agregada; usa os mesmos filtros e RLS das sondagens existentes.
CREATE OR REPLACE FUNCTION public.itop_relatorio_inteligente(p_filtros jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE inicio timestamptz:=coalesce((p_filtros->>'inicio')::timestamptz,now()-interval '30 days'); fim timestamptz:=coalesce((p_filtros->>'fim')::timestamptz,now()+interval '1 day'); filtros jsonb;
BEGIN
 IF coalesce(itop_private.papel(),'') NOT IN ('administrador','coordenador','supervisor') THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 filtros:=jsonb_set(p_filtros,'{modo}',to_jsonb(CASE WHEN p_filtros->>'modo'='testes' THEN 'testes'::text ELSE 'producao'::text END));
 RETURN (
 WITH base AS MATERIALIZED(SELECT q.* FROM public.itop_sondagens_filtradas(filtros) q WHERE (coalesce(filtros->>'diagnostico','')='' OR (CASE WHEN q.status='venda_confirmada' THEN 'venda_fechada' WHEN q.status='perdida' THEN 'desistencia' ELSE coalesce(q.diagnostico_final,'sem_diagnostico') END)=filtros->>'diagnostico')),
 s AS MATERIALIZED(SELECT b.*,CASE WHEN b.status='venda_confirmada' THEN 'venda_fechada' WHEN b.status='perdida' THEN 'desistencia' ELSE b.diagnostico_final END tipo_fechamento FROM base b),
 rawprev AS MATERIALIZED(SELECT * FROM public.itop_sondagens_filtradas(jsonb_set(jsonb_set(filtros,'{inicio}',to_jsonb(inicio-(fim-inicio))),'{fim}',to_jsonb(inicio)))),
 anterior AS MATERIALIZED(SELECT * FROM rawprev q WHERE (coalesce(filtros->>'diagnostico','')='' OR (CASE WHEN q.status='venda_confirmada' THEN 'venda_fechada' WHEN q.status='perdida' THEN 'desistencia' ELSE coalesce(q.diagnostico_final,'sem_diagnostico') END)=filtros->>'diagnostico')),
 resumo AS(SELECT count(*) sondagens,count(*) FILTER(WHERE status='rascunho') rascunhos,count(*) FILTER(WHERE apresentada_at IS NOT NULL) apresentadas,count(*) FILTER(WHERE status IN ('finalizada','perdida','venda_confirmada')) finalizadas,
 count(*) FILTER(WHERE status='venda_confirmada') vendas,coalesce(sum(total) FILTER(WHERE status='venda_confirmada'),0) receita,coalesce(avg(total) FILTER(WHERE status='venda_confirmada'),0) ticket_medio,
 coalesce(100.0*count(*) FILTER(WHERE status='venda_confirmada')/nullif(count(*) FILTER(WHERE apresentada_at IS NOT NULL),0),0) conversao,
 count(*) FILTER(WHERE tipo_fechamento='venda_fechada') venda_fechada,count(*) FILTER(WHERE tipo_fechamento='desistencia') desistencia,count(*) FILTER(WHERE tipo_fechamento='cliente_ficou_de_pensar') pensar,
 count(*) FILTER(WHERE tipo_fechamento='venda_fechada' AND status<>'venda_confirmada') aguardando_validacao,
 count(*) FILTER(WHERE diagnostico_final IS NULL AND status IN ('rascunho','proposta')) abertas,
 count(*) FILTER(WHERE diagnostico_final IS NULL AND status IN ('rascunho','proposta') AND updated_at<now()-interval '7 days') paradas,
 count(*) FILTER(WHERE tipo_fechamento='cliente_ficou_de_pensar' AND status NOT IN ('venda_confirmada','perdida')) para_retorno,
 count(*) FILTER(WHERE diagnostico_final IS NOT NULL AND checklist_final @> '{"cliente":true,"produtos":true,"condicoes":true}') checklists,
 count(*) FILTER(WHERE equipe_id IS NULL) sem_equipe FROM s),
 previo AS(SELECT count(*) sondagens,count(*) FILTER(WHERE apresentada_at IS NOT NULL) apresentadas,count(*) FILTER(WHERE status='venda_confirmada') vendas,coalesce(sum(total) FILTER(WHERE status='venda_confirmada'),0) receita FROM anterior),
 vendedores AS(SELECT vendedor_id,count(*) sondagens,count(*) FILTER(WHERE apresentada_at IS NOT NULL) apresentadas,count(*) FILTER(WHERE status='venda_confirmada') vendas,
 coalesce(sum(total) FILTER(WHERE status='venda_confirmada'),0) receita,coalesce(avg(total) FILTER(WHERE status='venda_confirmada'),0) ticket,
 coalesce(100.0*count(*) FILTER(WHERE status='venda_confirmada')/nullif(count(*) FILTER(WHERE apresentada_at IS NOT NULL),0),0) conversao,
 count(*) FILTER(WHERE tipo_fechamento='venda_fechada') venda_fechada,count(*) FILTER(WHERE tipo_fechamento='desistencia') desistencia,count(*) FILTER(WHERE tipo_fechamento='cliente_ficou_de_pensar') pensar,
 count(*) FILTER(WHERE diagnostico_final IS NULL AND status IN ('rascunho','proposta')) abertas FROM s GROUP BY vendedor_id),
 equipes AS(SELECT equipe_id,count(*) sondagens,count(*) FILTER(WHERE apresentada_at IS NOT NULL) apresentadas,count(*) FILTER(WHERE status='venda_confirmada') vendas,coalesce(sum(total) FILTER(WHERE status='venda_confirmada'),0) receita FROM s GROUP BY equipe_id),
 funil AS(SELECT etapa,count(*) quantidade FROM (SELECT CASE WHEN diagnostico_final IS NOT NULL OR status IN ('finalizada','perdida','venda_confirmada') THEN 4 WHEN fluxo_obrigatorio THEN fluxo_etapa WHEN status='proposta' THEN 3 WHEN jsonb_array_length(escolhidos)>0 THEN 2 ELSE 1 END etapa FROM s) x GROUP BY etapa),
 diario AS(SELECT to_char(created_at AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD') dia,count(*) sondagens,count(*) FILTER(WHERE status='venda_confirmada') vendas FROM s GROUP BY 1),
 semanal AS(SELECT to_char(date_trunc('week',created_at AT TIME ZONE 'America/Sao_Paulo'),'YYYY-MM-DD') semana,count(*) sondagens,count(*) FILTER(WHERE status='venda_confirmada') vendas FROM s GROUP BY 1),
 mensal AS(SELECT to_char(created_at AT TIME ZONE 'America/Sao_Paulo','YYYY-MM') mes,count(*) sondagens,count(*) FILTER(WHERE status='venda_confirmada') vendas FROM s GROUP BY 1),
 produtos AS(SELECT x->>'category' produto,count(DISTINCT s.id) propostas,coalesce(sum((x->>'q')::numeric),0) quantidade,coalesce(sum((x->>'q')::numeric*(x->>'price')::numeric) FILTER(WHERE s.status='venda_confirmada'),0) receita FROM s CROSS JOIN LATERAL jsonb_array_elements(s.escolhidos) x GROUP BY 1),
 planos AS(SELECT x->>'name' plano,coalesce(sum((x->>'q')::numeric),0) quantidade,count(DISTINCT s.id) propostas FROM s CROSS JOIN LATERAL jsonb_array_elements(s.escolhidos) x GROUP BY 1),
 fila AS(SELECT id,vendedor_id,equipe_id,created_at,updated_at,status,diagnostico_final,fluxo_etapa,total,coalesce(dados#>>'{campos,nome}','Sem nome') cliente,
 CASE WHEN tipo_fechamento='venda_fechada' AND status<>'venda_confirmada' THEN 'validacao' WHEN tipo_fechamento='cliente_ficou_de_pensar' AND status NOT IN ('venda_confirmada','perdida') THEN 'retorno' ELSE 'aberta' END motivo
 FROM s WHERE (diagnostico_final='venda_fechada' AND status<>'venda_confirmada') OR (tipo_fechamento='cliente_ficou_de_pensar' AND status NOT IN ('venda_confirmada','perdida')) OR (diagnostico_final IS NULL AND status IN ('rascunho','proposta')) ORDER BY updated_at,id LIMIT 100)
 SELECT jsonb_build_object('gerado_em',now(),'modo',filtros->>'modo','resumo',(SELECT to_jsonb(resumo) FROM resumo),'anterior',(SELECT to_jsonb(previo) FROM previo),
 'vendedores',coalesce((SELECT jsonb_agg(to_jsonb(v) ORDER BY v.vendas DESC,v.receita DESC,v.vendedor_id) FROM vendedores v),'[]'::jsonb),
 'equipes',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.vendas DESC,e.receita DESC) FROM equipes e),'[]'::jsonb),
 'funil',coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.etapa) FROM funil f),'[]'::jsonb),
 'diario',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.dia) FROM diario d),'[]'::jsonb),
 'semanal',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.semana) FROM semanal d),'[]'::jsonb),
 'mensal',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.mes) FROM mensal d),'[]'::jsonb),
 'produtos',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.propostas DESC) FROM produtos p),'[]'::jsonb),
 'planos',coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM (SELECT * FROM planos ORDER BY quantidade DESC,plano LIMIT 30) p),'[]'::jsonb),
 'fila',coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.updated_at,f.id) FROM fila f),'[]'::jsonb))
 );
END $$;
REVOKE ALL ON FUNCTION public.itop_relatorio_inteligente(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.itop_relatorio_inteligente(jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
CREATE OR REPLACE FUNCTION public.itop_relatorio_propostas(p_filtros jsonb DEFAULT '{}'::jsonb,p_cursor jsonb DEFAULT NULL,p_limite integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE filtros jsonb:=jsonb_set(p_filtros,'{modo}',to_jsonb(CASE WHEN p_filtros->>'modo'='testes' THEN 'testes'::text ELSE 'producao'::text END));
BEGIN
 IF coalesce(itop_private.papel(),'') NOT IN ('administrador','coordenador','supervisor') THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 RETURN (WITH pagina AS(SELECT s.* FROM public.itop_sondagens_filtradas(filtros) s
 WHERE (coalesce(p_filtros->>'diagnostico','')='' OR (CASE WHEN s.status='venda_confirmada' THEN 'venda_fechada' WHEN s.status='perdida' THEN 'desistencia' ELSE coalesce(s.diagnostico_final,'sem_diagnostico') END)=p_filtros->>'diagnostico')
 AND (p_cursor IS NULL OR (s.created_at,s.id)<((p_cursor->>'created_at')::timestamptz,(p_cursor->>'id')::uuid)) ORDER BY s.created_at DESC,s.id DESC LIMIT least(greatest(p_limite,1),100))
 SELECT jsonb_build_object('itens',coalesce(jsonb_agg(to_jsonb(pagina) ORDER BY created_at DESC,id DESC),'[]'::jsonb)) FROM pagina);
END $$;
REVOKE ALL ON FUNCTION public.itop_relatorio_propostas(jsonb,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.itop_relatorio_propostas(jsonb,jsonb,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
