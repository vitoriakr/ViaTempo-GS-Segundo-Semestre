# ViaTempo – Seu caminho, no tempo certo

Solução em Python desenvolvida para a **Global Solution CitizenTech** da FIAP, na disciplina **Computational Thinking with Python** (Engenharia de Software, Porto Alegre, 2026).

**Equipe DEV.AK**

| Nome | RM |
|---|---|
| Anita Palhares | RM571264 |
| Kauã Coelho | RM568665 |
| Vitória Kereski | RM569438 |

---

## Qual problema da cidade foi escolhido?

A **imprevisibilidade dos deslocamentos urbanos**. O tempo para fazer o mesmo caminho muda muito ao longo do dia: é baixo bem cedo, quase dobra no horário de pico e ainda aumenta com chuva, obras e acidentes. Os aplicativos de mapa mostram o trânsito, mas a pessoa ainda precisa calcular sozinha a que horas deve se arrumar e sair, e muitas vezes percebe tarde demais que vai se atrasar.

A pergunta que guiou o projeto foi: **como os dados de trajeto podem ajudar a entender esse problema e decidir o melhor horário para sair de casa?**

## O que a solução proposta faz?

O ViaTempo é um programa de terminal que:

1. **Guarda os dados do usuário**: compromissos, locais frequentes, tempo de preparação e margem de segurança (arquivos JSON).
2. **Usa o histórico de viagens** (arquivo CSV com 1.360 trajetos) para estimar quanto tempo o caminho leva em cada horário.
3. **Calcula o plano do dia**: o horário mais tarde para sair que ainda chega a tempo e o horário para começar a se preparar.
4. **Avisa o nível de urgência** (verde, amarelo ou vermelho) olhando a velocidade com que o trânsito está piorando naquele horário.
5. **Simula mudanças no trânsito** (acidente, chuva ou obra). Se a mudança passar do limite do usuário, recalcula e mostra uma recomendação explicando a causa, o impacto e o novo horário. O usuário decide se aceita, rejeita ou ajusta.
6. **Detecta conflitos** entre compromissos do mesmo dia.
7. **Gera um relatório de dados** com os melhores e piores horários, o impacto da chuva e dos acidentes e a pontualidade de quem segue ou não as recomendações.
8. **Exporta o plano para o front-end** em `data/meu_dia.json`, que é lido pela tela "Meu Dia" da plataforma.

### Como os dados viram decisão

Com os dados do repositório, o relatório (opção 8, destino FIAP) mostra que:

- saindo às **08:00** o trajeto leva em média **54,4 min**; saindo às **06:15**, leva **24,5 min**. São cerca de **30 min por dia**, ou **11 horas por mês**;
- a **chuva** soma em média **+9,8 min** e um **acidente** soma **+16,8 min** em relação ao mesmo horário em dias normais;
- quem **seguiu** a recomendação chegou no horário em **89,7%** das vezes, contra **45,5%** de quem **não seguiu**.

Por isso, o ViaTempo recomenda horários fora do pico e aumenta a folga em dias de chuva ou com acidentes.

---

## Quickstart

Pré-requisito: **Python 3.10 ou superior**.

```bash
# 1. Clonar o repositório
git clone <link-do-repositorio>
cd viatempo-python

# 2. (Opcional) criar um ambiente virtual
python -m venv .venv
# Windows: .venv\Scripts\activate    |    Linux/Mac: source .venv/bin/activate

# 3. Instalar as dependências (usadas só para o gráfico do relatório)
pip install -r requirements.txt

# 4. Executar
python main.py
```

Os dados já vêm prontos na pasta `data/`. Para gerar o histórico simulado de novo, execute `python scripts/gerar_dados.py`.

### Roteiro rápido para testar

1. Opção **1 (Meu dia)** e Enter: mostra o plano de 19/11/2026 da usuária Marina.
2. Opção **6 (Simular mudança)** → Enter → ID **1** → **1 (Acidente)** → **6** minutos: o sistema avisa e sugere sair mais cedo.
3. Opção **6** de novo com **2** minutos de acidente: a mudança é pequena e nenhum aviso é enviado.
4. Opção **1** com a data **2026-11-20**: aparece um alerta de conflito entre dois compromissos.
5. Opção **8 (Relatório)** → **FIAP**: mostra a análise dos dados e salva um gráfico em `data/`.

---

## Estrutura do repositório

```
viatempo-python/
├── main.py                   # menu principal e interação com o usuário
├── requirements.txt
├── README.md
├── src/
│   ├── armazenamento.py      # leitura e gravação de JSON e CSV
│   ├── horarios.py           # conversão e validação de horários
│   ├── modelo.py             # modelos matemáticos (mesmos do relatório de Matemática)
│   ├── trajetos.py           # estimativa do trajeto a partir do histórico
│   ├── rotina.py             # cálculo do plano do dia e conflitos
│   ├── monitoramento.py      # simulação de eventos e recálculo
│   └── analise.py            # relatório de dados
├── scripts/
│   └── gerar_dados.py        # gera os dados simulados
└── data/
    ├── usuario.json              # perfil e preferências
    ├── locais.json               # locais frequentes
    ├── compromissos.json         # agenda
    ├── trajetos_historicos.csv   # histórico de viagens (simulado)
    ├── feedback.csv              # respostas dos usuários (simulado)
    ├── plano.json                # gerado: plano lido pelo front-end
    └── grafico_fiap.png          # gerado: gráfico do relatório
```

## Dados utilizados

| Arquivo | Conteúdo | Colunas / campos |
|---|---|---|
| `trajetos_historicos.csv` | 1.360 viagens em 20 dias úteis, a cada 15 min (5h30–10h e 16h–19h30), para 2 destinos | data, dia_semana, destino, horario_saida, condicao (normal, chuva, acidente), tempo_min |
| `feedback.csv` | 40 respostas após compromissos | data, compromisso, seguiu_recomendacao, chegou_no_horario, atraso_min |
| `usuario.json` | preferências | nome, preparacao_padrao, margem_padrao, limite_variacao |
| `locais.json` | destinos frequentes | nome, tempo_base (trajeto sem trânsito) |
| `compromissos.json` | agenda | id, titulo, data, horario, destino, duracao_min, preparacao, margem |

> **Importante:** o histórico e o feedback são **dados simulados**, criados por `scripts/gerar_dados.py` com base no modelo matemático do projeto, com variações aleatórias, dias de chuva (15%) e acidentes (5% das viagens). A semente aleatória é fixa, então os dados são sempre os mesmos. Numa versão real, eles viriam de uma API de mapas e dos próprios usuários.

## Lógica e regras implementadas

| Regra do projeto | Onde está | Como funciona |
|---|---|---|
| RN01 – saída = compromisso − trajeto − margem | `rotina.calcular_saida` | testa minuto a minuto, de trás para frente, até achar a saída mais tarde que ainda chega a tempo |
| RN02 – preparação = saída − tempo de preparação | `rotina.calcular_plano` | subtrai o tempo de preparação do horário de saída |
| RN03 – só avisar se a variação passar do limite | `monitoramento.recalcular` | compara o atraso detectado com o limite do usuário (padrão de 5 min) |
| RN04 – nada muda sem o usuário aceitar | `main.simular_mudanca` | o usuário escolhe aceitar, rejeitar ou ajustar, e a decisão é registrada |
| RN05 – compromisso sem destino não calcula trajeto | `rotina.calcular_plano` | calcula só o horário de preparação |
| RN07 – conflito gera alerta, não alteração | `rotina.verificar_conflitos` | avisa se um compromisso começa antes do anterior terminar |
| RNF09 – recomendação explicável | `monitoramento.recalcular` | toda recomendação traz causa, impacto e novo horário |
| Estimativa por dados | `trajetos.estimar_trajeto` | usa a média do histórico; entre dois horários faz interpolação linear; sem dados, usa o modelo matemático |
| Nível de urgência | `rotina.nivel_urgencia` | calcula a taxa de variação do trajeto nos próximos 5 min (ideia de derivada) |

## Integração com as outras disciplinas

- **Matemática**: as funções de `src/modelo.py` são as mesmas do relatório de Differentiated Problem Solving.
- **Front-end / Web Development**: a tela "Meu Dia" lê o arquivo `data/plano.json` gerado por este programa.
- **Software & Total Experience Design**: as regras RN01 a RN07 e a persona Marina vêm do documento de escopo do produto.
