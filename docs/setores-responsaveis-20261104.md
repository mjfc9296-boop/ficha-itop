# Setores e responsáveis de convidados

Supervisores informam o setor no cadastro: Comercial/Vendas, Financeiro, Suporte ou Back Office. Um novo supervisor pode solicitar acesso sem depender de uma carteira vazia: a aprovação cria a equipe do setor. Os supervisores anteriores permanecem classificados em Comercial/Vendas.

Convidados escolhem setor e responsável aprovado. O seletor apresenta os supervisores daquele setor e os administradores, que podem receber convidados de qualquer setor. A carteira é resolvida no servidor durante a aprovação, inclusive a carteira de cada ADM. O cadastro continua pendente e inativo até ser aprovado.

Supervisores podem aprovar e gerir somente os convidados vinculados a eles. As permissões existentes dos administradores e coordenadores permanecem. Convidados continuam sem poderes de gestão e com suas propostas fora dos indicadores pela marca permanente de origem.

A janela 12 exibe setor e responsável nas solicitações e permite cadastrar convidados nas carteiras dos supervisores e ADMs. O formulário gerencial também qualifica o setor do supervisor.

Validação: teste SQL transacional em `tests/setores-responsaveis-20261104.sql`, revertido integralmente. Verificou novo supervisor financeiro, seleção filtrada, rejeição de supervisor de outro setor, aprovação e leitura pela própria equipe, responsabilidade de ADM e exclusão dos indicadores. Conferência visual dos cadastros no navegador e testes de regressão Node. Nenhuma conta permanente de teste ou convite foi criado.

Compatibilidade: solicitações antigas sem setor usam Comercial/Vendas. Convidados antigos sem responsável preservam o caminho de aprovação na carteira do ADM Mario. A nova tela exige as escolhas explícitas.
