# ViaTempo – Seu caminho, no tempo certo

Solução desenvolvida para a **Global Solution CitizenTech**, na disciplina **Computational Thinking with Python**, do curso de Engenharia de Software da FIAP, em Porto Alegre (2026).

> 🌐 **A aplicação web do ViaTempo já está hospedada na Vercel:** [https://viatempon.vercel.app](https://viatempon.vercel.app/)
>
> Este repositório contém a **aplicação Python** (processamento de dados, modelos matemáticos, simulações e recomendações), que se integra à aplicação web por meio de arquivos JSON. Veja a seção [3. Como o Python se conecta ao app completo](#3-como-o-python-se-conecta-ao-app-completo).

## Equipe DEV.AK

| Nome | RM |
|---|---|
| Anita Palhares | RM571264 |
| Kauã Coelho | RM568665 |
| Vitória Kereski | RM569438 |

## Sumário

1. [Qual problema da cidade foi escolhido?](#1-qual-problema-da-cidade-foi-escolhido)
2. [O que a solução proposta faz?](#2-o-que-a-solução-proposta-faz)
3. [Como o Python se conecta ao app completo](#3-como-o-python-se-conecta-ao-app-completo)
4. [Relação com as outras disciplinas](#4-relação-com-as-outras-disciplinas)
5. [Quickstart – Como executar a aplicação](#5-quickstart--como-executar-a-aplicação)
6. [Como utilizar o programa Python](#6-como-utilizar-o-programa-python)
7. [Como os dados são armazenados](#7-como-os-dados-são-armazenados)
8. [Como os dados são processados](#8-como-os-dados-são-processados)
9. [Modelagem matemática](#9-modelagem-matemática)
10. [Simulação e monitoramento](#10-simulação-e-monitoramento)
11. [Geração de dados simulados](#11-geração-de-dados-simulados)
12. [Feedback, relatórios e visualização dos dados](#12-feedback-relatórios-e-visualização-dos-dados)
13. [Tecnologias e bibliotecas](#13-tecnologias-e-bibliotecas)
14. [Estrutura do projeto](#14-estrutura-do-projeto)
15. [Testes automatizados](#15-testes-automatizados)
16. [Considerações finais](#16-considerações-finais)

---

## 1. Qual problema da cidade foi escolhido?

O ViaTempo surgiu a partir de um problema comum nas cidades: a **imprevisibilidade do trânsito** e seus impactos na organização da rotina.

O tempo necessário para percorrer um mesmo caminho pode variar conforme o horário, a chuva, os acidentes e as obras. Essas mudanças dificultam o planejamento dos deslocamentos e aumentam as chances de atraso em compromissos, como aulas, reuniões e consultas.

A proposta é ajudar as pessoas a se organizarem melhor, utilizando dados e modelos matemáticos para estimar o tempo de deslocamento e recomendar **quando começar a se preparar** e **quando sair de casa**.

## 2. O que a solução proposta faz?

O ViaTempo é uma solução que ajuda o usuário a organizar seus compromissos e planejar seus deslocamentos urbanos.

O projeto possui duas partes que se complementam:

- **Aplicação web (já hospedada na Vercel):** apresenta as informações de forma visual e facilita a interação com o planejamento.
- **Aplicação Python (este repositório):** processa os dados, realiza os cálculos, simula mudanças no trânsito e gera recomendações.

Nesta entrega, o foco está na aplicação Python, que oferece as seguintes funcionalidades:

- Cadastro, consulta e exclusão de compromissos.
- Cadastro de locais frequentes e seus tempos-base de deslocamento.
- Configuração do tempo de preparação e da margem de segurança.
- Estimativa de trajetos com base em dados históricos e modelos matemáticos.
- Recomendação dos horários de saída e preparação.
- Classificação do nível de urgência do deslocamento.
- Simulação de acidentes, chuvas e obras.
- Registro das decisões do usuário e de feedbacks.
- Identificação de conflitos entre compromissos.
- Geração de relatórios e gráficos para análise dos deslocamentos.
- Exportação do planejamento em JSON para ser exibido na aplicação web.

## 3. Como o Python se conecta ao app completo

O ViaTempo é um produto único, formado por duas camadas que trabalham juntas:

```text
┌──────────────────────────────┐                        ┌──────────────────────────────┐
│     APLICAÇÃO PYTHON         │                        │    APLICAÇÃO WEB (VERCEL)    │
│  (este repositório)          │                        │                              │
│                              │      saida/            │                              │
│  • Estimativa de trajetos    │   meu_dia.json         │  • Interface visual          │
│  • Modelos matemáticos       │ ─────────────────────► │  • Visualização do dia       │
│  • Simulação de trânsito     │   (importação do       │  • Horários de saída e       │
│  • Recomendação de horários  │    arquivo na web)     │    preparação                │
│  • Relatórios e gráficos     │                        │  • Alertas e urgência        │
└──────────────────────────────┘                        └──────────────────────────────┘
```

**Divisão de responsabilidades**

| Camada | Responsabilidade |
|---|---|
| **Python** | Processar os dados, calcular o tempo de trajeto, simular eventos, recomendar horários, registrar decisões e feedbacks, e gerar relatórios. |
| **Web (Vercel)** | Apresentar o planejamento de forma visual e facilitar a interação do usuário com a rotina. |

**Como acontece a comunicação**

A comunicação entre as duas partes é feita por meio de **arquivos JSON**:

1. No programa Python, o usuário consulta o planejamento de uma data (opção **1 – Meu dia**).
2. O Python calcula as recomendações e gera o arquivo `saida/meu_dia.json`.
3. O usuário **importa esse arquivo na aplicação web** (já hospedada na Vercel).
4. A interface exibe o planejamento calculado pelo Python.

> **Importante:** a integração entre as duas partes é **feita por arquivo**. Não há API nem comunicação automática em tempo real: o Python gera o `meu_dia.json` e o usuário o utiliza na aplicação web para visualizar o planejamento.

O arquivo `meu_dia.json` reúne:

- Nome do usuário.
- Data selecionada.
- Lista de compromissos.
- Horários recomendados de saída e preparação.
- Tempo estimado de trajeto.
- Fonte da estimativa (histórico, interpolação ou modelo matemático).
- Nível de urgência.
- Mensagens e alertas.

Assim, o Python realiza o processamento e os cálculos, enquanto a aplicação web apresenta os resultados ao usuário.

## 4. Relação com as outras disciplinas

O ViaTempo integra conhecimentos de diferentes disciplinas do semestre:

| Disciplina | Contribuição para o ViaTempo |
|---|---|
| **Computational Thinking with Python** | Aplicação Python: menu, validação de entradas, leitura e escrita de JSON/CSV, análise de dados, gráficos, simulações e testes automatizados. |
| **Differentiated Problem Solving** | Modelos matemáticos implementados em Python: função do tempo de trajeto com horários de pico, função de atraso por acidente e interpolação linear. |
| **WebDev** | Desenvolvimento e publicação da aplicação web na Vercel, incluindo a importação do arquivo `meu_dia.json` gerado pelo Python. |
| **Front-End** | Interface visual do ViaTempo: exibição dos compromissos, horários de saída e preparação, nível de urgência e alertas. |

## 5. Quickstart – Como executar a aplicação

### Opção A – Aplicação web (sem instalar nada)

A aplicação web já está no ar na Vercel: **[https://viatempon.vercel.app](https://viatempon.vercel.app/)**

Para ver o planejamento calculado pelo Python, gere o arquivo `saida/meu_dia.json` (opção B) e importe-o na aplicação.

### Opção B – Aplicação Python (local)

**Pré-requisitos**

- Python 3.10 ou superior.
- Pip para instalação das dependências.
- Git para clonar o repositório.

**Passo a passo**

**1. Clone o repositório:**

```bash
git clone https://github.com/vitoriakr/viatempo
```

**2. Entre na pasta do projeto Python:**

```bash
cd viatempo/viatempo-python
```

**3. Crie um ambiente virtual (recomendado):**

```bash
python -m venv .venv
```

No Windows:

```bash
.venv\Scripts\activate
```

No Linux ou macOS:

```bash
source .venv/bin/activate
```

**4. Instale as dependências:**

```bash
pip install -r requirements.txt
```

**5. Execute o programa:**

```bash
python main.py
```

Pronto! O menu principal será exibido no terminal e você poderá começar a utilizar o ViaTempo.

Os dados de exemplo já estão disponíveis na pasta `data/`. Não é necessário gerar os dados novamente para executar o programa.

**6. (Opcional) Integre com a aplicação web:**

No menu, escolha a opção **1 – Meu dia**. O arquivo `saida/meu_dia.json` será gerado e poderá ser importado na aplicação hospedada na Vercel.

### Gerar os dados simulados novamente

Caso queira recriar o histórico de viagens e os feedbacks:

```bash
python gerar_dados.py
```

**Atenção:** esse comando sobrescreve os arquivos `trajetos_historicos.csv` e `feedback.csv`.

### Executar os testes

```bash
python -m pytest -q
```

## 6. Como utilizar o programa Python

Ao iniciar o Python, o usuário encontra uma breve apresentação do ViaTempo e, em seguida, o menu principal.

### 6.1. Cadastro de compromissos

Um compromisso representa uma atividade que o usuário precisa realizar em determinado dia e horário, como uma aula, reunião, consulta ou atividade pessoal.

| Informação | Descrição |
|---|---|
| Título | Nome ou descrição da atividade. |
| Data | Dia em que o compromisso acontecerá. |
| Horário | Horário marcado para a atividade. |
| Destino | Local para onde o usuário precisa se deslocar. É opcional. |
| Duração | Tempo previsto para a atividade, em minutos. |
| Preparação | Tempo necessário para se arrumar antes de sair. |
| Margem de segurança | Tempo extra considerado para evitar atrasos. |

Os valores de preparação e margem podem utilizar as configurações padrões do usuário.

Quando o compromisso possui um destino, o sistema também estima o tempo de deslocamento e recomenda os horários de saída e preparação. Quando não possui destino, calcula apenas o horário de preparação.

Caso o destino informado ainda não esteja cadastrado, o programa oferece a possibilidade de adicioná-lo como um local frequente.

### 6.2. Locais frequentes

O usuário pode cadastrar locais que costuma visitar, como faculdade, trabalho ou academia. Para cada local, é informado um tempo-base de deslocamento, em minutos, que representa a duração do trajeto sem considerar as variações do trânsito.

### 6.3. Menu principal

| Opção | Funcionalidade |
|---|---|
| 1 | Meu dia: consulta os compromissos e os horários recomendados para uma data (gera o `meu_dia.json` para a aplicação web). |
| 2 | Novo compromisso: cadastra uma atividade. |
| 3 | Ver/excluir compromissos: consulta os registros e permite excluir um compromisso pelo ID. |
| 4 | Novo local frequente: cadastra um destino e seu tempo-base. |
| 5 | Configurar preparação e margem: altera os valores padrões e o limite de variação. |
| 6 | Simular mudança no trânsito: simula um evento e recalcula a recomendação. |
| 7 | Registrar feedback: registra como foi o deslocamento. |
| 8 | Relatório de dados: apresenta análises de um destino. |
| 0 | Sair do programa. |

## 7. Como os dados são armazenados

O ViaTempo utiliza arquivos JSON e CSV para armazenar e organizar as informações. O próprio Python realiza a leitura e a atualização desses arquivos durante a utilização do programa. Os arquivos de dados ficam na pasta `data/`.

### Arquivos JSON

| Arquivo | Informações armazenadas |
|---|---|
| `usuario.json` | Nome do usuário, tempo padrão de preparação, margem de segurança e limite de variação. |
| `locais.json` | Destinos cadastrados e seus tempos-base de deslocamento. |
| `compromissos.json` | Compromissos cadastrados, com data, horário, destino, duração e configurações individuais. |
| `historico_recomendacoes.json` | Registros das decisões tomadas sobre as recomendações. |

### Arquivos CSV

| Arquivo | Informações armazenadas |
|---|---|
| `trajetos_historicos.csv` | Registros de viagens utilizados para analisar e estimar os tempos de deslocamento. |
| `feedback.csv` | Registros sobre o cumprimento das recomendações e a pontualidade dos usuários. |

## 8. Como os dados são processados

1. **Entrada:** carrega as informações do usuário, compromissos, locais e histórico de viagens.
2. **Tratamento:** organiza os registros, converte horários e calcula as médias de deslocamento.
3. **Estimativa:** utiliza os dados históricos, a interpolação linear e o modelo matemático para estimar o tempo de trajeto.
4. **Planejamento:** calcula os horários recomendados de saída e preparação.
5. **Monitoramento:** simula mudanças nas condições do trânsito e verifica a necessidade de atualizar a recomendação.
6. **Decisão:** permite que o usuário aceite, rejeite ou ajuste a recomendação.
7. **Saída:** apresenta os resultados no terminal, atualiza os arquivos e gera um JSON que pode ser utilizado pelo front-end.

## 9. Modelagem matemática

O ViaTempo utiliza modelos matemáticos desenvolvidos na disciplina de **Differentiated Problem Solving** para representar o comportamento do tempo de deslocamento ao longo do dia.

### 9.1. Modelo de tempo de trajeto

O modelo considera dois períodos de maior movimento: manhã e tarde. A função implementada em `src/modelo.py` é:


T(t)=T_b+1{,}2T_b e^{-2(t-8)^2}+T_b e^{-2(t-18)^2}


Onde:

- \(T(t)\): tempo estimado do trajeto, em minutos.
- \(T_b\): tempo-base do deslocamento, sem trânsito.
- \(t\): horário de saída, representado em horas.

A função representa o aumento do tempo de deslocamento nos horários de pico, com maior intensidade pela manhã e outro aumento no período da tarde.

### 9.2. Modelo de atraso por acidente


D(t)=20(1-e^{-t/15})


Onde:

- \(D(t)\): atraso acumulado, em minutos.
- \(t\): tempo decorrido desde o acidente, em minutos.
- \(20\): atraso máximo previsto pelo modelo.
- \(15\): constante que controla a velocidade de crescimento do atraso.

O modelo representa um atraso que aumenta com o passar do tempo e se aproxima de 20 minutos.

### 9.3. Interpolação linear

Quando existem registros históricos próximos ao horário desejado, mas não exatamente naquele minuto, o sistema utiliza a interpolação linear para estimar o tempo de trajeto. A estimativa é feita a partir dos dois horários registrados mais próximos. Quando não existem dados próximos o suficiente, o sistema utiliza o modelo matemático como alternativa.

### 9.4. Cálculo do horário de saída

O programa procura, minuto a minuto, o horário mais tarde em que o usuário ainda consegue chegar ao compromisso respeitando a margem de segurança:

\[
S+T(S)+M\leq C
\]

Onde:

- \(S\): horário de saída.
- \(T(S)\): tempo estimado do trajeto.
- \(M\): margem de segurança.
- \(C\): horário do compromisso.

O horário de preparação é calculado subtraindo o tempo necessário para se arrumar do horário recomendado de saída.

## 10. Simulação e monitoramento

O projeto não utiliza uma API de trânsito em tempo real. Por isso, foram criadas simulações para representar situações que podem alterar o tempo de deslocamento.

O usuário pode selecionar um compromisso que possua destino e simular três tipos de evento: **acidente**, **chuva forte** e **obra**. No caso de acidente, também é informado há quantos minutos ele aconteceu.

Depois da simulação, o sistema calcula o impacto da mudança e verifica se ele ultrapassa o limite de variação configurado pelo usuário. Quando a mudança é relevante, o programa apresenta a causa, o impacto estimado, o horário de saída anterior e a nova recomendação.

O usuário pode:

- **Aceitar:** incorpora o impacto à margem de segurança do compromisso.
- **Rejeitar:** mantém o planejamento anterior.
- **Ajustar:** permite acrescentar minutos à margem de segurança.

Após a decisão, o sistema registra o resultado e atualiza o planejamento dos compromissos daquela data.

## 11. Geração de dados simulados

Como o projeto não utiliza dados reais de trânsito em tempo real, foram criados registros simulados para permitir os testes e as análises. O arquivo `gerar_dados.py` gera:

- **1.360 registros de viagens:** distribuídos em 20 dias úteis, com saídas a cada 15 minutos, para dois destinos.
- **100 registros de feedback:** simulam situações em que os usuários seguem ou não os horários recomendados.

A geração considera:

- Horários de saída entre 5h30 e 10h e entre 16h e 19h30.
- Variações aleatórias nos tempos de deslocamento.
- Probabilidade de 15% de chuva por dia.
- Probabilidade de 5% de acidente por viagem, em dias sem chuva.
- Probabilidade de 60% de o usuário seguir a recomendação nos dados de feedback.

Foi utilizada uma semente aleatória fixa (`random.seed(42)`), permitindo gerar os mesmos dados novamente e manter os testes reproduzíveis.

**Importante:** os registros são simulados e não representam medições reais do trânsito. Eles foram criados para testar o funcionamento do sistema e demonstrar como os dados podem ser transformados em informações para apoiar decisões.

Ao executar novamente `gerar_dados.py`, os arquivos `trajetos_historicos.csv` e `feedback.csv` são sobrescritos. Portanto, os feedbacks registrados anteriormente nesse arquivo também serão substituídos.

## 12. Feedback, relatórios e visualização dos dados

### 12.1. Registro de feedback

Depois de um compromisso, o usuário pode registrar como foi seu deslocamento. O programa pergunta se o usuário seguiu o horário recomendado, se chegou no horário e, caso não tenha chegado, quantos minutos de atraso teve. Essas informações são armazenadas em `feedback.csv` e utilizadas nas análises.

### 12.2. Relatórios

O ViaTempo permite selecionar um destino e visualizar:

- Tempo médio de trajeto por horário em dias normais.
- Melhor e pior horário para sair pela manhã.
- Diferença estimada de tempo entre os horários.
- Impacto médio da chuva e dos acidentes.
- Comparação da pontualidade entre quem seguiu e quem não seguiu as recomendações.
- Quantidade de recomendações aceitas, quando existem registros.

Também é gerado um gráfico com o **Matplotlib**, comparando os tempos médios de deslocamento em dias normais e chuvosos. Os resultados são salvos na pasta `saida/`:

- `relatorio_fiap.txt`: relatório em texto.
- `grafico_fiap.png`: gráfico de análise do destino FIAP.

## 13. Tecnologias e bibliotecas

| Tecnologia | Utilização |
|---|---|
| Python | Desenvolvimento da lógica e processamento dos dados. |
| Matplotlib | Criação dos gráficos do relatório. |
| CSV | Armazenamento dos históricos de viagens e feedbacks. |
| JSON | Armazenamento dos dados do usuário, compromissos, locais e resultados, e integração com o front-end. |
| Pytest | Execução dos testes automatizados. |
| Vercel | Hospedagem da aplicação web. |

As bibliotecas `csv`, `json`, `math`, `datetime` e `pathlib` fazem parte da biblioteca padrão do Python.

## 14. Estrutura do projeto

```text
viatempo-python/
│
├── main.py
├── gerar_dados.py
├── requirements.txt
├── README.md
│
├── src/
│   ├── __init__.py
│   ├── armazenamento.py
│   ├── entrada.py
│   ├── horarios.py
│   ├── modelo.py
│   ├── trajetos.py
│   ├── rotina.py
│   ├── monitoramento.py
│   └── analise.py
│
├── data/
│   ├── usuario.json
│   ├── locais.json
│   ├── compromissos.json
│   ├── trajetos_historicos.csv
│   ├── feedback.csv
│   └── historico_recomendacoes.json
│
├── saida/
│   ├── meu_dia.json
│   ├── relatorio_fiap.txt
│   └── grafico_fiap.png
│
└── tests/
    └── test_viatempo.py
```

### Responsabilidade dos arquivos

| Arquivo | Responsabilidade |
|---|---|
| `main.py` | Menu principal e interação com o usuário. |
| `gerar_dados.py` | Geração dos dados simulados. |
| `armazenamento.py` | Leitura e gravação de arquivos JSON e CSV. |
| `entrada.py` | Validação das informações digitadas pelo usuário. |
| `horarios.py` | Conversão e validação de horários. |
| `modelo.py` | Implementação dos modelos matemáticos. |
| `trajetos.py` | Leitura do histórico, cálculo de médias e estimativa de trajetos. |
| `rotina.py` | Planejamento dos horários e identificação de conflitos. |
| `monitoramento.py` | Simulação de eventos e recálculo das recomendações. |
| `analise.py` | Análise dos dados, geração de relatórios e gráficos. |
| `test_viatempo.py` | Testes automatizados das funcionalidades. |

## 15. Testes automatizados

O projeto utiliza Pytest para verificar o funcionamento das principais funções:

```bash
python -m pytest -q
```

Os testes verificam, entre outros pontos:

- Conversão e validação de horários.
- Cálculo das médias de deslocamento.
- Interpolação linear.
- Utilização do modelo matemático quando não há histórico.
- Cálculo do horário de saída.
- Tratamento de margem e preparação iguais a zero.
- Compromissos sem destino.
- Identificação de conflitos.
- Níveis de urgência.
- Recálculo de recomendações diante de mudanças no trânsito.

## 16. Considerações finais

O ViaTempo demonstra como a programação, a análise de dados e a modelagem matemática podem ser utilizadas para lidar com um problema presente na rotina de muitas pessoas.

Com o histórico de viagens, os modelos matemáticos e as simulações de mudanças no trânsito, o sistema estima deslocamentos, recomenda horários e apresenta informações que ajudam o usuário a organizar melhor seus compromissos.

A integração com a aplicação web hospedada na Vercel permite que os resultados gerados em Python também sejam apresentados em uma interface visual, aproximando o processamento dos dados da experiência do usuário e unindo o que foi aprendido nas diferentes disciplinas do semestre.

**ViaTempo – Seu caminho, no tempo certo.**
