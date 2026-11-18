# Registro de interações com IA

Este arquivo registra, por assunto, as principais solicitações feitas durante a construção e a revisão do front-end. Os itens abaixo são **resumos fiéis das interações**, não transcrições literais de cada mensagem. As decisões e os ajustes foram iterativos, com novas instruções da equipe após avaliar os resultados.

## 1. Escopo e implementação inicial

- Ler o escopo do ViaTempo e o desafio FIAP, distinguir as instruções nos documentos das solicitações da equipe e realizar a entrega de desenvolvimento web e front-end.
- Usar React e Bootstrap, com importação e exportação de agenda e geração de JSON que possa ser usado pela análise Python da equipe.
- Orientar a execução local e investigar o problema relatado de tela em branco ao abrir o projeto.

## 2. Fluxo inicial e identidade visual

- Fazer a primeira tela perguntar se a pessoa quer cadastrar a rotina manualmente, importar um calendário ou explorar o site sem dados iniciais.
- Simplificar as telas e manter uma identidade visual coerente; experimentar glassmorphism e, depois, reduzir a paleta para branco, azul e preto.
- Adaptar a tela inicial ao wireframe fornecido e corrigir áreas visuais que não ocupavam a largura esperada.
- Usar uma identidade inspirada em ampulheta, criar favicon e remover arquivos desnecessários sem retirar funções existentes.

## 3. Calendários e dados

- Fazer um único fluxo de seleção de arquivo reconhecer formatos de calendário e JSON.
- Ler o modelo JSON enviado pela equipe e gerar JSON compatível com a análise Python.
- Permitir importar arquivos `.ics` exportados de Google Calendar, Apple Calendar e Outlook; exportar agenda e backup.
- Adicionar uma visualização de agenda inspirada em calendários semanais, com modos de dia, semana, mês e lista; simplificar a interface e corrigir áreas brancas ou grandes demais.
- Incluir instruções curtas de como exportar calendários para importar no ViaTempo.

## 4. Agenda, rotina e recomendações

- Permitir informar o destino de compromissos, além de data, hora e tempos da rotina.
- Calcular horários de preparação e saída, sinalizar conflitos e mostrar recomendações acionáveis, com opções para aplicar ou recusar.
- Simplificar os textos, remover conteúdo redundante e manter causas e horários relevantes nas recomendações.
- Adicionar uma aba Jornada gamificada, com trilha de compromissos, XP, níveis, avatar, obstáculos e ilhas de progresso.

## 5. Assistente e mascote Teca

- Criar um assistente flutuante demonstrativo que converse sobre os pontos principais da rotina e responda perguntas sobre agenda e horários.
- Dar ao assistente uma identidade de tartaruga organizada e pontual, escolher o nome Teca e incluir sua ilustração no site.
- Fazer as frases da Teca variarem conforme o horário e o tipo de recomendação, evitando mensagens repetidas.
- Integrar a Teca à Jornada, com perguntas e respostas rápidas e um desafio opcional de margem extra, aceito ou recusado pela pessoa, com XP ao concluir.
- Padronizar os elementos visuais da Teca, recompensas e notificações em azul-marinho e azul.

## 6. Perfil, navegação e acabamento

- Substituir Preferências por um menu de Conta com edição de perfil e tempos padrão; adicionar modo noturno.
- Facilitar o retorno a Meu dia, destacar ações importantes e tornar a navegação lateral recolhida em ícones, expandida ao passar o mouse ou focar por teclado.
- Ajustar ícones, hover, responsividade, cartões de importar/exportar e aparência da tela inicial.
- Organizar os arquivos do projeto na pasta `Front Web`, dentro do repositório ViaTempo, e atualizar o pacote ZIP de entrega.

## 7. Revisão

- Conferir os requisitos do projeto e do desafio FIAP, registrar o que está atendido ou depende de integrações futuras e compilar o projeto depois das alterações.

## 8. Requisitos de interatividade e entrega WebDev

- Desenvolver as funcionalidades do ViaTempo conectando dados, regras de negócio e ações da pessoa usuária.
- Organizar estado, efeitos e lógica reutilizável em React; tratar operações de criação, leitura, edição e exclusão de forma assíncrona.
- Validar dados e arquivos, lidar com falhas e informar claramente o resultado de cada ação.
- Registrar como o projeto atende aos requisitos de lógica, estruturas de dados, gerenciamento de estado, armazenamento local, consumo opcional de API, documentação e versionamento.
- Preparar a entrega WebDev com repositório, ZIP executável, README, AI.md, PROMPT.md e INTEGRANTES.md.
