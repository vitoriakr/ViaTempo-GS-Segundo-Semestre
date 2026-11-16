# ViaTempo

**Seu caminho, no tempo certo.** Aplicação web responsiva para planejar compromissos e estimar quando começar a preparação e sair para um destino.

## Ficha CitizenTech

- **Cidade:** Porto Alegre, RS.
- **Cidadão beneficiado:** estudantes, trabalhadores e pessoas com compromissos presenciais e deslocamentos recorrentes.
- **Problema:** mudanças no deslocamento são percebidas tarde e exigem que cada pessoa reorganize manualmente sua rotina.
- **Como funciona:** a pessoa cria ou importa compromissos, informa destino, duração da preparação, deslocamento e margem. O ViaTempo calcula horários e apresenta sugestões explicáveis que podem ser aceitas ou rejeitadas.
- **Partes:** interface React e Bootstrap; regras de horário no navegador; JSON interoperável com o processamento em Python; adaptador REST para persistência externa.
- **Indicador proposto:** proporção de compromissos em que a pessoa relata chegada no horário; registrar também a taxa de recomendações aceitas e a variação entre o horário recomendado e o realizado.
- **ODS:** ODS 11 — Cidades e comunidades sustentáveis, com contribuição para deslocamentos urbanos mais previsíveis e melhor acesso a compromissos. ODS 10 — Redução das desigualdades, pela intenção de tornar informação de rotina mais compreensível e acessível.

O primeiro acesso começa sem compromissos: a pessoa escolhe cadastrar a rotina, importar um calendário ou carregar um JSON. A interface usa uma identidade monocromática consistente e mostra os detalhes de planejamento sob demanda. Esta versão não lê trânsito em tempo real, não se conecta ainda às APIs de calendário e não altera calendários, alarmes ou reuniões externos.

## Requisitos e funcionalidades cobertos

- Criar, listar, editar e excluir compromissos e destinos.
- Apresentar uma tela inicial sem compromissos prontos para que cada pessoa escolha cadastro manual, calendário Google/Apple por `.ics`, importação JSON ou exploração com agenda vazia.
- Calcular preparação e saída: `saída = compromisso - deslocamento - margem`; `preparação = saída - tempo de preparação`.
- Simular atraso de trajeto, mostrar causa e impacto, e permitir aceitar ou rejeitar a sugestão.
- Registrar retorno pós-compromisso sobre pontualidade.
- Importar `.ics` de calendários comuns e JSON ViaTempo; exportar calendário `.ics` e dados JSON para análise Python.
- Salvar no navegador sem conta, com aviso claro; habilitar persistência REST externa via variável de ambiente.
- Interface responsiva, campos identificados, foco de teclado visível, feedback de carregamento/erro/sucesso, estados vazios e confirmações.

## Tecnologias

React, React DOM, Bootstrap 5 e Vite. Não usamos bibliotecas adicionais de ícones, calendário, estado ou análise.

## Como executar

Requer Node.js 20.19+ ou 22.12+.

```bash
npm install
npm run dev
```

O terminal mostrará o endereço local do Vite. Para gerar a versão estática:

```bash
npm run build
npm run preview
```

Sem configuração adicional, o app persiste no `localStorage` deste navegador. Esses dados não são sincronizados entre dispositivos.

## API REST externa opcional

Defina `VITE_API_URL` no ambiente de desenvolvimento. O adaptador espera estes recursos JSON no serviço configurado:

| Método | Caminho | Uso |
|---|---|---|
| GET | `/viatempo` | Retornar `{ "events": [], "locations": [], "preferences": {}, "feedback": [] }` |
| PUT | `/viatempo` | Salvar o conjunto importado, preferências e remoção de dados |
| POST | `/events` | Criar compromisso |
| PUT | `/events/:id` | Atualizar compromisso ou feedback |
| DELETE | `/events/:id` | Excluir compromisso |
| POST | `/locations` | Criar local |
| DELETE | `/locations/:id` | Excluir local |

O navegador envia e recebe JSON com `Content-Type: application/json`. A API deve permitir CORS para a origem do front-end e proteger os dados em trânsito e em repouso. Este repositório não contém um servidor/API configurado; sem `VITE_API_URL`, o CRUD funciona localmente. Para conectar a API que será entregue em outra disciplina, o contrato de rotas pode ser ajustado em `src/services/api.js`.

## Formato JSON para Python

O importador e exportador aceitam o modelo usado pela análise Python: `usuario`, `data`, `compromissos` e `alerta`. O app também mantém a leitura dos formatos ViaTempo (`events`) e de lista de eventos legada.

```json
{
  "usuario": "Marina",
  "data": "2026-11-19",
  "compromissos": [
    {
      "id": 1,
      "titulo": "Aula na FIAP",
      "horario": "08:00",
      "destino": "FIAP",
      "saida": "07:15",
      "despertar": "06:30",
      "trajeto_min": 35,
      "fonte": "histórico",
      "urgencia": "vermelho",
      "mensagem": "Saia no horário!"
    }
  ],
  "alerta": null
}
```

`data` define o dia dos compromissos quando cada item não informa sua própria data. Na exportação, cada compromisso também inclui `data` para manter agendas com mais de um dia. `despertar` e `saida` são calculados a partir do horário, deslocamento, preparação e margem cadastrados.

## Estrutura

- `src/components/` — navegação, páginas, modais, cards, importação/exportação.
- `src/services/api.js` — persistência local e operações REST.
- `src/utils/schedule.js` — cálculo da rotina e recomendações.
- `src/utils/calendar.js` — importação e exportação ICS/JSON.
- `src/data/initialData.js` — estado inicial vazio e preferências padrão.

## Acessibilidade e limitações conhecidas

O projeto usa HTML semântico, rótulos de formulário, avisos acessíveis, comandos de teclado, foco visível, modo de movimento reduzido e layout adaptável. A validação completa WCAG 2.2 AA requer avaliação com leitor de tela e navegação manual em dispositivos-alvo.

Importar `.ics` ou carregar um JSON ViaTempo é a integração de agenda disponível nesta entrega; OAuth e sincronização direta com Google/Apple não estão configurados. A previsão de mobilidade é simulada e não deve ser usada como garantia de pontualidade. Não há cadastro/autenticação real nesta versão; o protótipo evita armazenar credenciais.

O primeiro acesso usa uma tela de entrada progressiva. Compromissos antigos de demonstração (`source: demo`) são removidos na migração local; dados reais já salvos no navegador são preservados.

## Equipe

Veja [INTEGRANTES.md](./INTEGRANTES.md). O professor deve receber acesso ao repositório privado conforme a tarefa FIAP.
