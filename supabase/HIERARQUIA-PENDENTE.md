# Hierarquia comercial — aguardando autorização

Este ramo não foi publicado e a migração hierarchy-commercial.sql não foi aplicada. A revisão automática bloqueou a mudança por ampliar permissões de produção e disponibilizar o catálogo mínimo de carteiras antes do login.

Estrutura preparada: ADM 1 Mario Caputo; ADM 2 Bruno Gomes; coordenador Gabriel Martinez; supervisores Paula e Renato. Renato tem carteira reservada, sem conta inventada. O coordenador gerencia seus supervisores e vendedores; não remove administradores. Supervisores gerenciam apenas seus vendedores. O cadastro público e o botão + usam a mesma carteira, com acesso liberado somente após aprovação. Exclusão preserva autoria comercial e encerra o acesso.

O fluxo obrigatório 1–2–3, checklist e diagnóstico final dos vendedores já foi aplicado separadamente e está incluído neste ramo para preservar a atualização. Os três diagnósticos e os bloqueios foram testados no banco com transação revertida. O alerta vermelho de pendências também está na main.

Validação da hierarquia: JavaScript e IDs verificados, cartões e formulário testados em prévia de demonstração. Permissões específicas da hierarquia ainda precisam ser verificadas após autorização e aplicação da migração. Não mesclar este ramo antes dessa etapa.
