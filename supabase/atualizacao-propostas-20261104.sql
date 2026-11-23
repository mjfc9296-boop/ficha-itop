CREATE OR REPLACE FUNCTION itop_private.itop_salvar_sondagem(p_id uuid, p_versao integer, p_operacao uuid, p_status text, p_dados jsonb, p_oferecidos jsonb, p_escolhidos jsonb, p_desconto numeric DEFAULT 0, p_resultado text DEFAULT ''::text, p_confirmacao text DEFAULT NULL::text, p_teste boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); papel text:=itop_private.papel(); s public.itop_sondagens; e uuid; v_bruto numeric:=0; item jsonb; resposta jsonb; op itop_private.operacoes; estado_anterior text; desconto_anterior numeric; teste_anterior boolean;
begin
 
 if papel is null then raise exception 'ACESSO_NEGADO'; end if;
 if papel='vendedor' then
  perform pg_advisory_xact_lock(hashtextextended('fluxo:'||u::text,0));
  if exists(select 1 from public.itop_sondagens x where x.vendedor_id=u and x.fluxo_obrigatorio and x.diagnostico_final is null and x.excluida_at is null and x.id<>p_id) and not exists(select 1 from public.itop_sondagens x where x.id=p_id and x.vendedor_id=u and x.diagnostico_final is not null and x.status=p_status) then raise exception 'CONCLUA_DIAGNOSTICO_DA_PROPOSTA_ABERTA'; end if;
  if p_status in ('finalizada','perdida','venda_confirmada') and not exists(select 1 from public.itop_sondagens x where x.id=p_id and x.vendedor_id=u and x.diagnostico_final is not null and x.status=p_status and x.status<>'venda_confirmada') then raise exception 'UTILIZE_CHECKLIST_E_DIAGNOSTICO_FINAL'; end if;
  if exists(select 1 from public.itop_sondagens x where x.id=p_id and x.fluxo_obrigatorio and x.fluxo_etapa>1 and coalesce(x.dados#>>'{campos,clienteItop}','')<>'sim' and (x.dados#>>'{campos,nome}' is distinct from p_dados#>>'{campos,nome}' or x.dados#>>'{campos,telefone}' is distinct from p_dados#>>'{campos,telefone}')) then raise exception 'CLIENTE_DA_PROPOSTA_NAO_PODE_SER_TROCADO'; end if;
 end if;
 if p_status in ('finalizada','perdida','venda_confirmada') and exists(select 1 from public.itop_sondagens x where x.id=p_id and x.fluxo_obrigatorio and x.diagnostico_final is null) then raise exception 'CONCLUA_CHECKLIST_E_DIAGNOSTICO_FINAL'; end if;
 
 if nullif(lower(split_part(regexp_replace(trim(coalesce(p_dados#>>'{campos,vendedor}','')),'\s+',' ','g'),' ',1)),'') is null
 or lower(split_part(regexp_replace(trim(coalesce(p_dados#>>'{campos,vendedor}','')),'\s+',' ','g'),' ',1))
 is distinct from (select lower(split_part(regexp_replace(trim(p.nome),'\s+',' ','g'),' ',1)) from public.perfis p where p.id=coalesce((select vendedor_id from public.itop_sondagens where id=p_id),u))
 then raise exception 'OPERADOR_CADASTRADO_OBRIGATORIO'; end if;
 if papel = 'vendedor' and coalesce(p_teste,false) then raise exception 'MODO_TESTE_GERENCIAL_OBRIGATORIO'; end if;
 if p_id is null or p_operacao is null or p_versao is null or p_versao<0 then raise exception 'IDENTIFICACAO_INVALIDA'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into op from itop_private.operacoes where id=p_operacao;
 if found then
  if op.ator<>u or op.sondagem_id<>p_id then raise exception 'OPERACAO_INVALIDA'; end if;
  return op.resposta;
 end if;
 if p_status is null or p_status not in ('rascunho','proposta','finalizada','venda_confirmada','perdida') then raise exception 'SITUACAO_INVALIDA'; end if;
 if p_dados is null or jsonb_typeof(p_dados)<>'object' or octet_length(p_dados::text)>32768 then raise exception 'DADOS_INVALIDOS'; end if;
 if exists(select 1 from jsonb_object_keys(p_dados) k where k not in ('campos','versao_formulario','indicacao')) or coalesce(jsonb_typeof(p_dados->'campos'),'')<>'object' then raise exception 'DADOS_INVALIDOS'; end if;
 -- Allowlist: dados de contato e valores comerciais; nunca senha, CPF ou dados de saúde.
 if exists(select 1 from jsonb_object_keys(p_dados->'campos') k where k !~ '^(clienteItop|nome|telefone|cidade|vendedor|operadora|fibraMega|internetValor|fixoOperadora|fixoNumero|fixoValor|m(op|numero|gb|valor)[0-9]+|energia(Nome|Telefone|Cidade|Vendedor)|conta|categoria|tarifa|consumo);
CREATE OR REPLACE FUNCTION public.itop_buscar_propostas(p_busca text DEFAULT '',p_status text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR itop_private.papel() IS NULL THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 IF p_status NOT IN ('','venda_fechada','cliente_ficou_de_pensar','desistencia') THEN RAISE EXCEPTION 'STATUS_INVALIDO'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) FROM (
 SELECT id,versao,dados#>>'{campos,nome}' cliente,dados#>>'{campos,telefone}' telefone,created_at,teste,status,
 CASE WHEN status='venda_confirmada' THEN 'venda_fechada' WHEN status='perdida' THEN 'desistencia' ELSE diagnostico_final END diagnostico_final
 FROM public.itop_sondagens WHERE excluida_at IS NULL AND status IN ('finalizada','perdida','venda_confirmada')
 AND (itop_private.papel()<>'vendedor' OR (vendedor_id=auth.uid() AND NOT teste))
 AND (p_status='' OR CASE WHEN status='venda_confirmada' THEN 'venda_fechada' WHEN status='perdida' THEN 'desistencia' ELSE diagnostico_final END=p_status)
 AND (coalesce(trim(p_busca),'')='' OR position(lower(left(trim(p_busca),100)) in lower(coalesce(dados#>>'{campos,nome}','')||' '||coalesce(dados#>>'{campos,telefone}','')||' '||id::text))>0)
 ORDER BY updated_at DESC,id LIMIT 50) q);
END $$;
REVOKE ALL ON FUNCTION public.itop_buscar_propostas(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.itop_buscar_propostas(text,text) TO authenticated;) then raise exception 'CAMPO_NAO_PERMITIDO'; end if;
 if p_oferecidos is null or p_escolhidos is null or jsonb_typeof(p_oferecidos)<>'array' or jsonb_typeof(p_escolhidos)<>'array' or jsonb_array_length(p_oferecidos)>100 or jsonb_array_length(p_escolhidos)>100 or octet_length(p_oferecidos::text)+octet_length(p_escolhidos::text)>32768 then raise exception 'PRODUTOS_INVALIDOS'; end if;
 for item in select value from jsonb_array_elements(p_oferecidos||p_escolhidos) loop
  if jsonb_typeof(item)<>'object' or coalesce(length(item->>'name'),0) not between 1 and 200 or coalesce(length(item->>'category'),0) not between 1 and 100 or (item->>'price') is null or (item->>'q') is null or (item->>'price')::numeric not between 0 and 100000 or (item->>'q')::numeric not between 1 and 100 or (item->>'q')::numeric<>trunc((item->>'q')::numeric) then raise exception 'PRODUTO_INVALIDO'; end if;
 end loop;
 select coalesce(sum(round((x->>'price')::numeric,2)*(x->>'q')::integer),0) into v_bruto from jsonb_array_elements(p_escolhidos) x;
 if p_desconto is null or p_desconto<0 or p_desconto>v_bruto or p_resultado is null or length(p_resultado)>500 then raise exception 'VALORES_INVALIDOS'; end if;
 if p_status<>'rascunho' and coalesce(length(trim(p_dados->'campos'->>'nome')),0)<2 then raise exception 'PREENCHA_CLIENTE_E_PRODUTOS'; end if;
 if p_status='perdida' and length(trim(p_resultado))=0 then raise exception 'INFORME_RESULTADO'; end if;
 select * into s from public.itop_sondagens where id=p_id for update;
 if found then
  if papel = 'vendedor' and s.teste then raise exception 'ACESSO_NEGADO'; end if;
  p_teste:=coalesce(p_teste,s.teste);
  if s.excluida_at is not null or not itop_private.pode_ler(s.vendedor_id,s.equipe_id) then raise exception 'ACESSO_NEGADO'; end if;
  if s.diagnostico_final is not null and p_status is distinct from s.status and p_status<>'venda_confirmada' then raise exception 'STATUS_FINAL_DEVE_SER_PRESERVADO'; end if;
  if p_versao<>s.versao then raise exception 'CONFLITO_VERSAO' using errcode='40001'; end if;
  if s.vendedor_id<>u and not itop_private.pode_equipe(s.equipe_id) then raise exception 'ACESSO_NEGADO'; end if;
  if s.status in ('venda_confirmada','perdida','finalizada') and not itop_private.pode_equipe(s.equipe_id) and not (s.vendedor_id=u and s.diagnostico_final is not null and p_status=s.status and s.status<>'venda_confirmada') then raise exception 'REGISTRO_FINALIZADO'; end if;
  if s.teste is distinct from p_teste and s.status<>'rascunho' and not itop_private.pode_equipe(s.equipe_id) then raise exception 'CLASSIFICACAO_GERENCIAL_OBRIGATORIA'; end if;
  if s.status<>'rascunho' and p_status='rascunho' then raise exception 'TRANSICAO_INVALIDA'; end if;
 else
  p_teste:=coalesce(p_teste,false);
  if p_versao<>0 then raise exception 'CONFLITO_VERSAO' using errcode='40001'; end if;
  select m.equipe_id into e from public.itop_equipe_membros m join public.itop_equipes q on q.id=m.equipe_id and q.ativo where m.usuario_id=u;
  insert into public.itop_sondagens(id,vendedor_id,equipe_id,fluxo_obrigatorio) values(p_id,u,e,papel IN ('vendedor','administrador','coordenador','supervisor')) returning * into s;
 end if;
 if p_status='venda_confirmada' and s.status='venda_confirmada' then p_confirmacao:=s.confirmacao_ref; end if;
 if p_status='venda_confirmada' and (not itop_private.pode_equipe(s.equipe_id) or coalesce(length(trim(p_confirmacao)),0)=0) then raise exception 'CONFIRMACAO_GERENCIAL_OBRIGATORIA'; end if;
 if p_versao>0 and (s.dados is distinct from p_dados or s.escolhidos is distinct from p_escolhidos or s.resultado is distinct from p_resultado) then
 insert into public.itop_sondagem_auditoria(sondagem_id,ator,acao,detalhes) values(p_id,u,'proposta:editar',jsonb_build_object('anterior',to_jsonb(s),'versao_nova',s.versao+1));
 end if;
 estado_anterior:=s.status; desconto_anterior:=s.desconto; teste_anterior:=s.teste;
 update public.itop_sondagens set status=p_status,teste=p_teste,dados=p_dados,oferecidos=p_oferecidos,escolhidos=p_escolhidos,bruto=v_bruto,desconto=round(p_desconto,2),resultado=p_resultado,
 confirmacao_ref=case when p_status='venda_confirmada' then p_confirmacao else null end,confirmado_por=case when p_status='venda_confirmada' then u else null end,
 confirmada_at=case when p_status='venda_confirmada' then coalesce(s.confirmada_at,now()) else null end,
 apresentada_at=case when p_status<>'rascunho' then coalesce(s.apresentada_at,now()) else s.apresentada_at end,
 finalizada_at=case when p_status in ('finalizada','venda_confirmada','perdida') then coalesce(s.finalizada_at,now()) else null end,
 versao=case when p_versao=0 then 1 else s.versao+1 end,updated_at=now() where id=p_id returning * into s;
 if p_versao=0 or estado_anterior is distinct from p_status or desconto_anterior is distinct from p_desconto or teste_anterior is distinct from p_teste then
 insert into public.itop_sondagem_auditoria(sondagem_id,ator,acao,detalhes) values(p_id,u,'salvar',jsonb_build_object('status',s.status,'versao',s.versao,'teste',s.teste));
 end if;
 resposta:=jsonb_build_object('id',s.id,'versao',s.versao,'updated_at',s.updated_at,'status',s.status,'total',s.total,'teste',s.teste,'fluxo_etapa',s.fluxo_etapa,'diagnostico_final',s.diagnostico_final);
 insert into itop_private.operacoes(id,ator,sondagem_id,resposta) values(p_operacao,u,p_id,resposta);
 return resposta;
end $function$
;
CREATE OR REPLACE FUNCTION public.itop_buscar_propostas(p_busca text DEFAULT '',p_status text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR itop_private.papel() IS NULL THEN RAISE EXCEPTION 'ACESSO_NEGADO'; END IF;
 IF p_status NOT IN ('','venda_fechada','cliente_ficou_de_pensar','desistencia') THEN RAISE EXCEPTION 'STATUS_INVALIDO'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) FROM (
 SELECT id,versao,dados#>>'{campos,nome}' cliente,dados#>>'{campos,telefone}' telefone,created_at,teste,status,
 CASE WHEN status='venda_confirmada' THEN 'venda_fechada' WHEN status='perdida' THEN 'desistencia' ELSE diagnostico_final END diagnostico_final
 FROM public.itop_sondagens WHERE excluida_at IS NULL AND status IN ('finalizada','perdida','venda_confirmada')
 AND (itop_private.papel()<>'vendedor' OR (vendedor_id=auth.uid() AND NOT teste))
 AND (p_status='' OR CASE WHEN status='venda_confirmada' THEN 'venda_fechada' WHEN status='perdida' THEN 'desistencia' ELSE diagnostico_final END=p_status)
 AND (coalesce(trim(p_busca),'')='' OR position(lower(left(trim(p_busca),100)) in lower(coalesce(dados#>>'{campos,nome}','')||' '||coalesce(dados#>>'{campos,telefone}','')||' '||id::text))>0)
 ORDER BY updated_at DESC,id LIMIT 50) q);
END $$;
REVOKE ALL ON FUNCTION public.itop_buscar_propostas(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.itop_buscar_propostas(text,text) TO authenticated;