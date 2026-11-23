-- RLS is enabled. The only UPDATE or ALL policy requires an active, approved administrator
-- in both USING and WITH CHECK. This migration changes column privileges only.
grant update (
 cliente, vendedor, numero_pedido, documento, whatsapp, email, cep, logradouro,
 numero, bairro, cidade, uf, complemento, endereco, tipo_entrega, data_entrega,
 tipo_envio, item, quantidade, valor_unitario_centavos, itens_adicionais
) on public.inova_blocos_envios to authenticated;
