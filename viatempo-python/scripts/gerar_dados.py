"""Gera os dados SIMULADOS usados pelo ViaTempo.

- data/trajetos_historicos.csv: 4 semanas de viagens (dias úteis), a cada 15 min,
  com variações aleatórias, dias de chuva e acidentes.
- data/feedback.csv: respostas simuladas de usuários depois dos compromissos.

Os tempos seguem o modelo matemático do relatório de Matemática, com "ruído" para
parecerem dados reais. Executar a partir da raiz:  python scripts/gerar_dados.py
"""
import csv
import random
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from src.modelo import atraso_acidente, tempo_modelo  # noqa: E402

PASTA_DADOS = Path(__file__).resolve().parent.parent / "data"
DESTINOS = {"FIAP": 25, "Estágio": 35}  # tempo sem trânsito (min)
INICIO = date(2026, 10, 19)
SEMANAS = 4
CHANCE_CHUVA = 0.15     # por dia
CHANCE_ACIDENTE = 0.05  # por viagem

DIAS_SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]
random.seed(42)  # mesma semente = mesmos dados sempre


def horarios_de_saida():
    """Saídas a cada 15 min das 5h30 às 10h e das 16h às 19h30 (em minutos)."""
    return list(range(330, 601, 15)) + list(range(960, 1171, 15))


def gerar_trajetos():
    linhas = []
    for dia in range(SEMANAS * 7):
        data = INICIO + timedelta(days=dia)
        if data.weekday() >= 5:  # pula sábado e domingo
            continue
        dia_de_chuva = random.random() < CHANCE_CHUVA
        for destino, tempo_base in DESTINOS.items():
            for saida in horarios_de_saida():
                tempo = tempo_modelo(saida / 60, tempo_base) + random.gauss(0, 2)
                condicao = "normal"
                if dia_de_chuva:
                    tempo *= 1.3
                    condicao = "chuva"
                if random.random() < CHANCE_ACIDENTE:
                    tempo += atraso_acidente(random.randint(5, 40))
                    condicao = "acidente"
                linhas.append({"data": data.isoformat(), "dia_semana": DIAS_SEMANA[data.weekday()],
                               "destino": destino,
                               "horario_saida": f"{saida // 60:02d}:{saida % 60:02d}",
                               "condicao": condicao,
                               "tempo_min": round(max(tempo, tempo_base * 0.9), 1)})
    return linhas


def gerar_feedback():
    linhas = []
    for i in range(40):
        seguiu = random.random() < 0.6
        chance_pontual = 0.92 if seguiu else 0.55
        no_horario = random.random() < chance_pontual
        linhas.append({"data": (INICIO + timedelta(days=i % 26)).isoformat(),
                       "compromisso": random.choice(["Aula na FIAP", "Estágio", "Reunião de grupo"]),
                       "seguiu_recomendacao": "sim" if seguiu else "nao",
                       "chegou_no_horario": "sim" if no_horario else "nao",
                       "atraso_min": 0 if no_horario else random.randint(3, 25)})
    return linhas


def salvar_csv(nome, linhas):
    with open(PASTA_DADOS / nome, "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=list(linhas[0].keys()))
        escritor.writeheader()
        escritor.writerows(linhas)
    print(f"{nome}: {len(linhas)} linhas geradas")


if __name__ == "__main__":
    salvar_csv("trajetos_historicos.csv", gerar_trajetos())
    salvar_csv("feedback.csv", gerar_feedback())
