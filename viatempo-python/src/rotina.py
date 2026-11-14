"""Cálculo do plano do dia: horários de sair e acordar (RN01, RN02, RN05, RN07)."""
from src.horarios import minutos_para_texto, texto_para_minutos
from src.trajetos import estimar_trajeto, medias_por_horario

JANELA_BUSCA = 240  # procura horários de saída até 4 horas antes do compromisso


def buscar_local(locais, nome):
    for local in locais:
        if local["nome"].lower() == nome.lower():
            return local
    return None


def calcular_saida(inicio, margem, medias, tempo_base, atraso_extra=0):
    """RN01: acha o horário de saída MAIS TARDE que ainda chega a tempo.

    Testa minuto a minuto, começando no horário do compromisso e voltando:
    a primeira saída que respeita  saída + trajeto + margem <= início  é a escolhida.
    """
    for saida in range(inicio, inicio - JANELA_BUSCA, -1):
        trajeto = estimar_trajeto(medias, saida, tempo_base) + atraso_extra
        if saida + trajeto + margem <= inicio:
            return saida, trajeto
    return None, None  # não existe horário viável dentro da janela


def nivel_urgencia(medias, saida, tempo_base):
    """Usa a taxa de variação do trajeto (ideia de derivada) para escolher a cor do aviso.

    taxa = quanto o trajeto aumenta (min) para cada hora de atraso na saída.
    """
    agora = estimar_trajeto(medias, saida, tempo_base)
    daqui_5_min = estimar_trajeto(medias, saida + 5, tempo_base)
    taxa = (daqui_5_min - agora) / (5 / 60)
    if taxa >= 25:
        return "vermelho", "Saia no horário! Cada minuto de atraso aumenta bastante o trajeto."
    if taxa >= 10:
        return "amarelo", "Atenção: o trânsito está começando a piorar."
    if agora >= 1.5 * tempo_base:
        return "amarelo", "Você vai sair no horário de pico. Sair mais cedo encurta o trajeto."
    return "verde", "Trânsito tranquilo: alguns minutos a mais não mudam muito."


def calcular_plano(compromisso, usuario, locais, historico):
    """Monta o plano de um compromisso usando os dados do usuário e do histórico."""
    inicio = texto_para_minutos(compromisso["horario"])
    # RF04/RF05: valor do compromisso se existir, senão o padrão do usuário
    preparacao = compromisso.get("preparacao") or usuario["preparacao_padrao"]
    margem = compromisso.get("margem") or usuario["margem_padrao"]

    plano = {"id": compromisso["id"], "titulo": compromisso["titulo"],
             "compromisso": compromisso["horario"], "destino": compromisso.get("destino"),
             "preparacao": preparacao, "margem": margem}

    # RN05: compromisso sem destino só recebe planejamento da rotina
    if not compromisso.get("destino"):
        plano.update({"saida": None, "trajeto_min": 0,
                      "despertar": minutos_para_texto(inicio - preparacao),
                      "urgencia": "verde", "mensagem": "Compromisso sem deslocamento."})
        return plano

    local = buscar_local(locais, compromisso["destino"])
    tempo_base = local["tempo_base"] if local else 30
    medias = medias_por_horario(historico, compromisso["destino"])
    saida, trajeto = calcular_saida(inicio, margem, medias, tempo_base)

    if saida is None:
        plano.update({"saida": None, "despertar": None, "trajeto_min": None,
                      "urgencia": "vermelho",
                      "mensagem": "Não há horário viável. Revise este compromisso."})
        return plano

    cor, mensagem = nivel_urgencia(medias, saida, tempo_base)
    plano.update({"saida": minutos_para_texto(saida),
                  "despertar": minutos_para_texto(saida - preparacao),  # RN02
                  "trajeto_min": round(trajeto), "urgencia": cor, "mensagem": mensagem,
                  "fonte": "histórico" if medias else "modelo matemático"})
    return plano


def verificar_conflitos(compromissos_do_dia):
    """RN07: avisa quando um compromisso começa antes do anterior terminar.

    Só gera alerta, nunca altera nada automaticamente.
    """
    alertas = []
    ordenados = sorted(compromissos_do_dia, key=lambda c: texto_para_minutos(c["horario"]))
    for anterior, proximo in zip(ordenados, ordenados[1:]):
        fim_anterior = texto_para_minutos(anterior["horario"]) + anterior.get("duracao_min", 60)
        if texto_para_minutos(proximo["horario"]) < fim_anterior:
            alertas.append(f"'{anterior['titulo']}' termina às {minutos_para_texto(fim_anterior)}, "
                           f"mas '{proximo['titulo']}' começa às {proximo['horario']}.")
    return alertas
