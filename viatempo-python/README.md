# ViaTempo – Seu caminho, no tempo certo

Solução em Python desenvolvida para a **Global Solution CitizenTech** da FIAP, na disciplina **Computational Thinking with Python**, do curso de Engenharia de Software, em Porto Alegre (2026).

**Equipe DEV.AK**

| Nome | RM |
|---|---|
| Anita Palhares | RM571264 |
| Kauã Coelho | RM568665 |
| Vitória Kereski | RM569438 |

---

## 1. Sobre o projeto

O ViaTempo é uma solução que utiliza dados e modelos matemáticos para ajudar as pessoas a organizarem seus deslocamentos urbanos.

O projeto surgiu a partir da **imprevisibilidade do trânsito nas cidades**. O tempo necessário para percorrer o mesmo caminho pode variar conforme o horário, a chuva, os acidentes e as obras. Isso dificulta a organização da rotina e aumenta as chances de atrasos.

A proposta é utilizar informações sobre os trajetos para estimar o tempo de deslocamento, calcular o melhor horário para sair e ajudar o usuário a se preparar com antecedência.

Nesta parte do projeto, desenvolvida em Python, os dados são armazenados, processados e analisados para gerar recomendações e apoiar decisões.

## 2. O que o Python faz no ViaTempo?

O Python é responsável pela lógica de processamento dos dados e pelos cálculos do ViaTempo.

Entre suas principais funcionalidades estão:

1. **Gerenciamento de dados:** armazena compromissos, locais frequentes e preferências do usuário em arquivos JSON.
2. **Análise do histórico de viagens:** utiliza os registros de deslocamentos para calcular médias de tempo por destino e horário.
3. **Estimativa de trajetos:** utiliza o histórico, a interpolação linear e o modelo matemático para estimar a duração dos deslocamentos.
4. **Planejamento da rotina:** calcula o horário mais tarde possível para sair de casa e o horário necessário para começar a se preparar.
5. **Nível de urgência:** identifica se o trânsito está tranquilo ou piorando, classificando a situação em verde, amarelo ou vermelho.
6. **Monitoramento:** simula acidentes, chuvas e obras, verificando se as mudanças justificam uma nova recomendação.
7. **Registro de decisões e feedbacks:** permite registrar se o usuário aceitou, rejeitou ou ajustou uma recomendação e como foi seu deslocamento.
8. **Identificação de conflitos:** verifica se dois compromissos do mesmo dia possuem horários incompatíveis.
9. **Relatórios e gráficos:** analisa os dados de viagens e feedbacks, apresentando informações que ajudam a compreender os impactos do trânsito.

## 3. Como os dados são processados?

O funcionamento do Python pode ser dividido em algumas etapas:

1. **Entrada:** o programa carrega os dados do usuário, compromissos, locais e histórico de viagens.
2. **Tratamento:** converte horários, organiza os registros e calcula as médias de deslocamento.
3. **Estimativa:** utiliza os dados históricos e o modelo matemático para estimar o tempo de trajeto.
4. **Planejamento:** calcula os horários recomendados de saída e preparação.
5. **Monitoramento:** simula mudanças nas condições do trânsito e verifica a necessidade de atualizar a recomendação.
6. **Saída:** apresenta os resultados no terminal, registra informações em arquivos e gera dados para o front-end.

## 4. Modelagem matemática

O ViaTempo utiliza os modelos matemáticos desenvolvidos na disciplina de Differentiated Problem Solving. Eles ajudam a representar o comportamento do tempo de deslocamento ao longo do dia.

### 4.1. Modelo de tempo de trajeto

O modelo considera dois períodos de maior movimento: manhã e tarde.

A função implementada em `src/modelo.py` é:

\[
T(t)=T_b+1{,}2T_b e^{-2(t-8)^2}+T_b e^{-2(t-18)^2}
\]

Onde:

- \(T(t)\): tempo estimado do trajeto, em minutos.
- \(T_b\): tempo-base do deslocamento, sem trânsito.
- \(t\): horário de saída, representado em horas.

A função representa o aumento do tempo de deslocamento nos horários de pico, com maior intensidade pela manhã e outro aumento no período da tarde.

### 4.2. Modelo de atraso por acidente

Para representar o aumento do atraso depois de um acidente, é utilizada a função:

\[
D(t)=20(1-e^{-t/15})
\]

Onde:

- \(D(t)\): atraso acumulado, em minutos.
- \(t\): tempo decorrido desde o acidente, em minutos.
- 20: atraso máximo previsto pelo modelo.
- 15: constante que controla a velocidade de crescimento do atraso.

O modelo representa um atraso que aumenta com o passar do tempo e se aproxima de 20 minutos.

### 4.3. Interpolação linear

Quando existem registros históricos próximos ao horário desejado, mas não exatamente naquele minuto, o sistema utiliza a interpolação linear para estimar o tempo de trajeto.

A estimativa é feita a partir dos dois horários registrados mais próximos. Quando não existem dados próximos o suficiente, o sistema utiliza o modelo matemático como alternativa.

### 4.4. Cálculo do horário de saída

O programa procura, minuto a minuto, o horário mais tarde em que o usuário ainda consegue chegar ao compromisso respeitando a margem de segurança.

A condição utilizada é:

\[
S+T(S)+M\leq C
\]

Onde:

- \(S\): horário de saída.
- \(T(S)\): tempo estimado do trajeto.
- \(M\): margem de segurança.
- \(C\): horário do compromisso.

O horário de preparação é calculado subtraindo o tempo necessário para se arrumar do horário recomendado de saída.

## 5. Regras e funcionalidades implementadas

| Regra | Implementação |
|---|---|
| RN01 – Horário de saída | Calcula a saída mais tarde possível sem comprometer a chegada. |
| RN02 – Horário de preparação | Calcula quando o usuário deve começar a se arrumar. |
| RN03 – Variação do trânsito | Só apresenta um aviso quando a mudança ultrapassa o limite configurado. |
| RN04 – Decisão do usuário | Não altera a recomendação sem a decisão do usuário. |
| RN05 – Compromisso sem destino | Calcula o horário de preparação sem estimar deslocamento. |
| RN07 – Conflitos | Identifica compromissos com horários incompatíveis, sem alterá-los automaticamente. |
| RNF09 – Explicação da recomendação | Apresenta a causa, o impacto e o horário sugerido. |

Além dessas regras, o programa utiliza médias históricas, interpolação linear e o modelo matemático para estimar os trajetos.

## 6. Simulação e geração de dados

Como o projeto não utiliza uma API de trânsito em tempo real, foram criados dados simulados para permitir os testes e as análises.

O arquivo `gerar_dados.py` é responsável por gerar:

- **1.360 registros de viagens:** distribuídos em 20 dias úteis, com saídas a cada 15 minutos, para dois destinos.
- **100 registros de feedback:** simulam situações em que os usuários seguem ou não os horários recomendados.

A geração considera:

- Horários de saída entre 5h30 e 10h e entre 16h e 19h30.
- Variações aleatórias nos tempos de deslocamento.
- Probabilidade de 15% de chuva por dia.
- Probabilidade de 5% de acidente por viagem, em dias sem chuva.
- Probabilidade de 60% de o usuário seguir a recomendação nos dados de feedback.

Foi utilizada uma semente aleatória fixa (`random.seed(42)`), permitindo gerar os mesmos dados novamente e manter os testes reproduzíveis.

**Importante:** os registros são simulados, não representam medições reais do trânsito. Eles foram criados para testar o funcionamento do sistema e demonstrar como os dados podem ser transformados em informações para apoiar decisões.

Ao executar novamente `gerar_dados.py`, os arquivos `trajetos_historicos.csv` e `feedback.csv` são sobrescritos com novos dados gerados a partir da mesma configuração.

## 7. Relatórios e visualização dos dados

O ViaTempo possui uma funcionalidade de análise que permite selecionar um destino e visualizar informações sobre os deslocamentos.

O relatório apresenta:

- Tempo médio de trajeto por horário em dias normais.
- Melhor e pior horário para sair pela manhã.
- Diferença estimada de tempo entre os horários.
- Impacto médio da chuva e dos acidentes.
- Comparação da pontualidade entre quem seguiu e quem não seguiu as recomendações.
- Quantidade de recomendações aceitas, quando existem registros.

Também é gerado um gráfico com o **Matplotlib**, comparando os tempos médios de deslocamento em dias normais e chuvosos.

Os resultados são salvos na pasta `saida/`:

- `relatorio_fiap.txt`: relatório em texto.
- `grafico_fiap.png`: gráfico de análise do destino FIAP.

O gráfico é salvo como imagem PNG e pode ser aberto separadamente.

## 8. Integração com o front-end

A comunicação entre o Python e o front-end é realizada por meio de um arquivo JSON, sem a utilização de Flask ou de uma API.

Quando o usuário consulta o planejamento do dia, o Python gera o arquivo:

`saida/meu_dia.json`

Esse arquivo contém informações como:

- Nome do usuário.
- Data selecionada.
- Lista de compromissos.
- Horários de saída e preparação.
- Tempo estimado de trajeto.
- Nível de urgência.
- Mensagens e alertas.

O front-end utiliza essas informações para apresentar o planejamento na tela **Meu Dia**.

Dessa forma, o Python fica responsável pelos cálculos e pelo processamento dos dados, enquanto o front-end apresenta os resultados ao usuário.

## 9. Tecnologias e bibliotecas

| Tecnologia | Utilização |
|---|---|
| Python | Desenvolvimento da lógica e processamento dos dados. |
| Matplotlib | Criação dos gráficos do relatório. |
| CSV | Armazenamento dos históricos de viagens e feedbacks. |
| JSON | Armazenamento dos dados do usuário, compromissos, locais e resultados. |
| Pytest | Execução dos testes automatizados. |

As bibliotecas `csv`, `json`, `math`, `datetime` e `pathlib` fazem parte da biblioteca padrão do Python.

## 10. Estrutura do projeto

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

## 11. Como executar o projeto

### Pré-requisitos

- Python 3.10 ou superior.
- Pip para instalação das dependências.

### Instalação

**1. Clone o repositório:**

```bash
git clone https://github.com/vitoriakr/viatempo
```

**2. Entre na pasta do projeto:**

```bash
cd viatempo-python
```

**3. Crie um ambiente virtual (opcional, mas recomendado):**

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

Os dados de exemplo já estão disponíveis na pasta `data/`. Não é necessário gerar os dados novamente para executar o programa.

### Gerar os dados simulados novamente

Caso queira recriar o histórico de viagens e os feedbacks:

```bash
python gerar_dados.py
```

**Atenção:** esse comando sobrescreve os arquivos `trajetos_historicos.csv` e `feedback.csv`.

## 12. Testes automatizados

O projeto utiliza Pytest para verificar o funcionamento das principais funções.

Para executar os testes, utilize:

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

## 13. Considerações finais

A parte desenvolvida em Python demonstra como dados podem ser utilizados para compreender um problema urbano e apoiar decisões do cotidiano.

Com o histórico de viagens, os modelos matemáticos e as simulações de mudanças no trânsito, o ViaTempo consegue estimar deslocamentos, sugerir horários e apresentar informações que ajudam o usuário a organizar melhor sua rotina.

O projeto também permite integrar o processamento de dados com a interface desenvolvida pela equipe, conectando a análise em Python à experiência apresentada ao usuário.

**ViaTempo – Seu caminho, no tempo certo.**