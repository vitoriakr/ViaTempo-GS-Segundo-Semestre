# ViaTempo

**Seu caminho, no tempo certo.** Aplicação web responsiva para planejar compromissos e estimar quando começar a preparação e sair para um destino.

## Requisitos e funcionalidades cobertos

- Criar, listar, editar e excluir compromissos e destinos.
- Apresentar uma tela inicial sem compromissos prontos para que cada pessoa escolha cadastro manual, importação automática de um arquivo `.ics` ou JSON, ou exploração com agenda vazia.
- Calcular preparação e saída: `saída = compromisso - deslocamento - margem`; `preparação = saída - tempo de preparação`.
- Simular atraso de trajeto, mostrar causa e impacto, e permitir aceitar ou rejeitar a sugestão.
- Registrar retorno pós-compromisso sobre pontualidade.
- Consultar a Teca, mascote tartaruga do assistente, que personaliza recomendações e evolui visualmente com o XP da Jornada.
- Importar `.ics` do Google Calendar, Apple Calendar ou Microsoft Outlook e JSON ViaTempo/Python; exportar calendário `.ics` e dados no modelo Python.
- Salvar no navegador sem conta, com aviso claro; habilitar persistência REST externa via variável de ambiente.
- Interface responsiva, campos identificados, foco de teclado visível, feedback de carregamento/erro/sucesso, estados vazios e confirmações.

## Tecnologias

React, React DOM, Bootstrap 5 e Vite. Não usamos bibliotecas adicionais de ícones, calendário, estado ou análise.

## Interações e regras de negócio

- O estado compartilhado da agenda, dos locais, das preferências e dos retornos fica no componente principal; `useState` controla formulários e modais locais, `useEffect` carrega/sincroniza dados e `useMemo` prepara listas, conflitos e recomendações.
- As regras de horário estão em `src/utils/schedule.js`: o sistema calcula preparação e saída a partir do compromisso, deslocamento e margem; também detecta sobreposição de períodos e gera sugestões explicáveis.
- O CRUD de compromissos e locais é assíncrono e centralizado em `src/services/api.js`. Sem API configurada, usa `localStorage`; com `VITE_API_URL`, consome as rotas REST descritas abaixo. Erros são apresentados na interface e o estado só é atualizado após a operação.
- Formulários e importadores verificam campos obrigatórios, limites e formatos de data/hora/arquivo; falhas de leitura ou gravação mostram mensagens acessíveis, e ações concluídas mostram confirmação.
- Os dados são organizados em objetos e listas de eventos/locais; `Map` e `Set` apoiam a associação de destinos, deduplicação e detecção de conflitos. A classe `Agenda` encapsula a ordenação e a detecção de conflitos; os eventos são objetos e listas, com `Map`/`Set` usados para associações e deduplicação.

## Como executar

O aplicativo está na pasta `Front Web` dentro do repositório. Requer Node.js 20.19+ ou 22.12+ e npm (incluído na instalação do Node.js).

Se você acabou de clonar o repositório, entre na pasta do aplicativo:

```bash
cd "Front Web"
npm install
npm run dev
```

O `npm install` baixa as dependências descritas em `package-lock.json`. O `npm run dev` inicia o servidor local; abra no navegador o endereço exibido no terminal (normalmente `http://localhost:5173`). Para parar o servidor, pressione `Ctrl+C` no terminal.

Para gerar e visualizar a versão de produção:

```bash
npm run build
npm run preview
```

O comando `npm run build` cria os arquivos prontos para publicação em `dist/`. O `npm run preview` serve essa versão localmente e informa no terminal o endereço para abrir.

Sem configuração adicional, o app persiste no `localStorage` deste navegador. Esses dados não são sincronizados entre dispositivos.

## API REST externa opcional

Defina `VITE_API_URL` no ambiente de desenvolvimento. O adaptador espera estes recursos JSON no serviço configurado:

| Método | Caminho          | Uso                                                                             |
| ------ | ---------------- | ------------------------------------------------------------------------------- |
| GET    | `/viatempo`      | Retornar `{ "events": [], "locations": [], "preferences": {}, "feedback": [] }` |
| PUT    | `/viatempo`      | Salvar o conjunto importado, preferências e remoção de dados                    |
| POST   | `/events`        | Criar compromisso                                                               |
| PUT    | `/events/:id`    | Atualizar compromisso ou feedback                                               |
| DELETE | `/events/:id`    | Excluir compromisso                                                             |
| POST   | `/locations`     | Criar local                                                                     |
| DELETE | `/locations/:id` | Excluir local                                                                   |

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
- `src/components/Assistant.jsx` e `src/components/Teca.jsx` — assistente local e identidade visual reutilizável da mascote.
- `src/services/api.js` — persistência local e operações REST.
- `src/utils/schedule.js` — cálculo da rotina e recomendações.
- `src/utils/calendar.js` — importação e exportação ICS/JSON.
- `src/data/initialData.js` — estado inicial vazio e preferências padrão.

## Acessibilidade e limitações conhecidas

O projeto usa HTML semântico, rótulos de formulário, avisos acessíveis, comandos de teclado, foco visível, modo de movimento reduzido e layout adaptável. A validação completa WCAG 2.2 AA requer avaliação com leitor de tela e navegação manual em dispositivos-alvo.

Importar `.ics` ou carregar um JSON ViaTempo/Python é a integração de agenda disponível nesta entrega; OAuth e sincronização direta com Google, Apple ou Microsoft não estão configurados. Para Outlook, salve/exporte a agenda como `.ics` e selecione o arquivo. A previsão de mobilidade é simulada e não deve ser usada como garantia de pontualidade. Não há cadastro/autenticação real nesta versão; o protótipo evita armazenar credenciais.

O primeiro acesso usa uma tela de entrada progressiva. Compromissos antigos de demonstração (`source: demo`) são removidos na migração local; dados reais já salvos no navegador são preservados.

## Limites do protótipo e revisão FIAP

A interface reúne mais de oito componentes React reutilizáveis e mantém apresentação, agenda/cálculos e acesso a dados em módulos distintos. Conflitos entre períodos de preparação e compromissos são sinalizados. O assistente é uma simulação local baseada em regras, não um modelo de IA nem aconselhamento automatizado. Do escopo funcional do produto, autenticação e recuperação de senha, estimativa por serviço de mapas, monitoramento de trânsito e notificações configuráveis ainda dependem de serviços que não acompanham este front-end. O atraso disponível é simulado e informado como tal.

O histórico do repositório contém 19 commits, atendendo ao mínimo de 15 commits significativos indicado no desafio de Front-end. A equipe deve manter o histórico atualizado com commits reais e descritivos. O acesso do professor ao repositório privado deve ser concedido pela equipe na plataforma Git.

## Equipe

A entrega inclui [AI.md](./AI.md), [PROMPT.md](./PROMPT.md) e [INTEGRANTES.md](./INTEGRANTES.md).
