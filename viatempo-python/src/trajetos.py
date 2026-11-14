"""Estimativa do tempo de trajeto a partir do histórico (data/trajetos_historicos.csv).

Aqui os dados viram decisão: em vez de usar um tempo fixo, o ViaTempo usa a
média dos trajetos já registrados para aquele destino e horário.
"""
from src.armazenamento import ler_csv
from src.horarios import texto_para_minutos
from src.modelo import tempo_modelo


def carregar_historico():
    """Lê o histórico e já converte os números."""
    historico = []
    for linha in ler_csv("trajetos_historicos.csv"):
        historico.append({
            "data": linha["data"],
            "destino": linha["destino"],
            "saida": texto_para_minutos(linha["horario_saida"]),
            "condicao": linha["condicao"],
            "tempo": float(linha["tempo_min"]),
        })
    return historico


def medias_por_horario(historico, destino, condicao="normal"):
    """Devolve {horário em minutos: tempo médio} para um destino e condição."""
    somas, contagens = {}, {}
    for registro in historico:
        if registro["destino"] == destino and registro["condicao"] == condicao:
            saida = registro["saida"]
            somas[saida] = somas.get(saida, 0) + registro["tempo"]
            contagens[saida] = contagens.get(saida, 0) + 1
    return {saida: somas[saida] / contagens[saida] for saida in sorted(somas)}


def estimar_trajeto(medias, minuto_saida, tempo_base):
    """Estima o trajeto saindo em 'minuto_saida'.

    1. Se existe média exatamente nesse horário, usa ela.
    2. Se o horário está entre dois horários do histórico, faz interpolação linear.
    3. Se não há dados por perto, usa o modelo matemático (plano B).
    """
    if minuto_saida in medias:
        return medias[minuto_saida]

    antes = [m for m in medias if m < minuto_saida]
    depois = [m for m in medias if m > minuto_saida]
    if antes and depois:
        m1, m2 = max(antes), min(depois)
        if m2 - m1 <= 30:  # só interpola se os pontos estiverem próximos
            proporcao = (minuto_saida - m1) / (m2 - m1)
            return medias[m1] + proporcao * (medias[m2] - medias[m1])

    return tempo_modelo(minuto_saida / 60, tempo_base)
