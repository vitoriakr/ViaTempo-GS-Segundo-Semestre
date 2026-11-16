"""Gera os dados SIMULADOS usados pelo ViaTempo.  Executar com:  python gerar_dados.py

- data/trajetos_historicos.csv: 2 semanas de viagens (dias úteis), a cada 15 min,
  com variações aleatórias, dias de chuva e acidentes.
- data/feedback.csv: respostas simuladas de usuários depois dos compromissos.

Os tempos seguem o modelo matemático do relatório de Matemática, com "ruído" para
parecerem dados reais.

Sobre o feedback: o script NÃO define a pontualidade "no chute". Ele simula cada
compromisso: calcula a saída recomendada com a mesma lógica do programa, decide se o
usuário seguiu ou não, sorteia como foi o trânsito naquele dia e confere se a pessoa
chegou a tempo. A diferença entre quem segue e quem não segue vem dessa simulação.
"""
import random
from datetime import date, timedelta

from src.armazenamento import salvar_csv
from src.horarios import minutos_para_texto, texto_para_minutos
from src.modelo import atraso_acidente, tempo_modelo
from src.rotina import calcular_saida
from src.trajetos import carregar_historico, medias_por_horario

DESTINOS = {"FIAP": 25, "Estágio": 35}  # tempo sem trânsito (min)
INICIO = date(2026, 10, 19)
SEMANAS = 4
CHANCE_CHUVA = 0.15      # por dia
CHANCE_ACIDENTE = 0.05   # por viagem (só em dias sem chuva)
NUM_FEEDBACKS = 100
CHANCE_SEGUIR = 0.6      # chance de o usuário seguir o horário recomendado
MARGEM = 10              # margem de segurança (min) usada nas recomendações do feedback
DIAS_SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]
COMPROMISSOS_FEEDBACK = [  # (título, destino, horário de início)
    ("Aula na FIAP", "FIAP", "08:00"),
    ("Reunião de grupo", "FIAP", "09:00"),
    ("Estágio", "Estágio", "13:30"),
]

random.seed(42)  # mesma semente = mesmos dados sempre


def dias_uteis():
    """Lista as datas de segunda a sexta do período simulado."""
    datas = [INICIO + timedelta(days=d) for d in range(SEMANAS * 7)]
    return [d for d in datas if d.weekday() < 5]


def horarios_de_saida():
    """Saídas a cada 15 min das 5h30 às 10h e das 16h às 19h30 (em minutos)."""
    return list(range(330, 601, 15)) + list(range(960, 1171, 15))


def simular_viagem(saida, tempo_base, chuva=False, acidente=False):
    """Tempo de uma viagem: modelo matemático + ruído + efeito de chuva ou acidente."""
    tempo = tempo_modelo(saida / 60, tempo_base) + random.gauss(0, 2)
    if chuva:
        tempo *= 1.3
    if acidente:
        tempo += atraso_acidente(random.randint(5, 40))
    return max(tempo, tempo_base * 0.9)


def gerar_trajetos():
    linhas = []
    for data in dias_uteis():
        dia_de_chuva = random.random() < CHANCE_CHUVA
        for destino, tempo_base in DESTINOS.items():
            for saida in horarios_de_saida():
                acidente = (not dia_de_chuva) and random.random() < CHANCE_ACIDENTE
                condicao = "chuva" if dia_de_chuva else "acidente" if acidente else "normal"
                tempo = simular_viagem(saida, tempo_base, dia_de_chuva, acidente)
                linhas.append({"data": data.isoformat(), "dia_semana": DIAS_SEMANA[data.weekday()],
                               "destino": destino, "horario_saida": minutos_para_texto(saida),
                               "condicao": condicao, "tempo_min": round(tempo, 1)})
    return linhas


def gerar_feedback(historico):
    """Simula o resultado de cada compromisso, seguindo ou não a recomendação."""
    medias_por_destino = {d: medias_por_horario(historico, d) for d in DESTINOS}
    datas = dias_uteis()
    linhas = []
    for _ in range(NUM_FEEDBACKS):
        titulo, destino, horario = random.choice(COMPROMISSOS_FEEDBACK)
        inicio = texto_para_minutos(horario)
        recomendada, _ = calcular_saida(inicio, MARGEM, medias_por_destino[destino], DESTINOS[destino])

        seguiu = random.random() < CHANCE_SEGUIR
        # quem não segue sai "quando acha melhor": de 10 min antes a 25 min depois
        saida_real = recomendada if seguiu else recomendada + random.randint(-10, 25)

        chuva = random.random() < CHANCE_CHUVA
        acidente = (not chuva) and random.random() < CHANCE_ACIDENTE
        chegada = saida_real + simular_viagem(saida_real, DESTINOS[destino], chuva, acidente)
        atraso = max(0, round(chegada - inicio))

        linhas.append({"data": random.choice(datas).isoformat(), "compromisso": titulo,
                       "seguiu_recomendacao": "sim" if seguiu else "nao",
                       "chegou_no_horario": "sim" if atraso == 0 else "nao",
                       "atraso_min": atraso})
    return sorted(linhas, key=lambda linha: linha["data"])


if __name__ == "__main__":
    trajetos = gerar_trajetos()
    salvar_csv("trajetos_historicos.csv", trajetos)
    print(f"trajetos_historicos.csv: {len(trajetos)} linhas geradas")

    feedback = gerar_feedback(carregar_historico())  # usa o histórico que acabou de ser salvo
    salvar_csv("feedback.csv", feedback)
    print(f"feedback.csv: {len(feedback)} linhas geradas")
