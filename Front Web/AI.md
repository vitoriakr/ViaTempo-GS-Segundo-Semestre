# Uso de inteligência artificial

## Como a IA foi usada no projeto

A IA foi utilizada como apoio ao desenvolvimento do front-end do ViaTempo. A equipe forneceu a ideia do produto, os documentos de escopo e o desafio FIAP, além das decisões de tecnologia e das revisões de interface. A partir desse material, a IA ajudou a:

- resumir os requisitos dos documentos e relacioná-los às telas e fluxos do protótipo;
- estruturar e implementar componentes, páginas e estilos em React, CSS e Bootstrap;
- desenvolver os fluxos de cadastro manual, agenda, locais e preferências;
- organizar estado React, efeitos de carregamento, cálculos derivados, uma classe `Agenda` para encapsular operações de domínio e operações assíncronas de CRUD;
- implementar validações de formulários e arquivos, tratamento de erros e feedback acessível de sucesso ou falha;
- documentar o adaptador REST opcional e a persistência local via `localStorage`, sem apresentar a API como configurada no pacote;
- implementar leitura e geração de arquivos `.ics` e JSON, incluindo o modelo utilizado pela análise Python da equipe;
- criar cálculos locais para horários de preparação e saída, conflitos de agenda e sugestões demonstrativas;
- iterar sobre identidade visual, acessibilidade básica, layout responsivo, calendário, perfil, tema noturno e a mascote Teca;
- analisar problemas relatados pela equipe, corrigir código e revisar a compilação;
- preparar e revisar documentação do projeto.

As recomendações da Teca são regras locais demonstrativas, não respostas de um modelo de IA em tempo de execução. A previsão de atraso também é simulada. As alterações sugeridas pela IA foram incorporadas ao código e à documentação e devem ser revisadas pela equipe antes da entrega.

As solicitações foram refinadas ao longo do trabalho por meio de feedback sobre telas, comportamento e prioridades. A IA não definiu o problema social, a proposta do produto ou os critérios do trabalho: esses elementos vieram da equipe e dos documentos fornecidos.
