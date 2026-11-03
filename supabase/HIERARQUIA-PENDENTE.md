# Hierarquia comercial — aplicação pendente

A revisão automática bloqueou a migração de produção. Este ramo contém a implementação pronta para revisão; não foi publicado nem aplicado ao banco.

- ADM 1 Mario Caputo; ADM 2 Bruno Gomes.
- Gabriel Martinez: coordenador das equipes Paula e Renato.
- Coordenador gerencia supervisores e vendedores vinculados; não remove administradores.
- Supervisores gerenciam somente seus vendedores.
- Cadastro público e botão + usam a mesma carteira; toda solicitação permanece pendente até aprovação autorizada.
- Renato é uma carteira reservada, sem conta inventada. O cadastro de supervisor pode solicitar essa carteira.
- Excluir encerra acesso e preserva histórico comercial.
- Catálogo público mínimo contém apenas nomes e identificadores das carteiras e respectivos supervisores, necessário antes do login.

Validação: JavaScript verificado; prévia com dados de demonstração verificou cartões, formulário + e contador 2 → 1 → oculto. Permissões e migração ainda precisam ser verificadas no banco após autorização explícita. Não mesclar este ramo antes dessa etapa.
