"""Simulação de mudanças no trânsito e recálculo do plano (RN03, RN04, RF10, RF11)."""
from datetime import datetime

from src.armazenamento import ler_json, salvar_json
from src.horarios import minutos_para_texto, texto_para_minutos
from src.modelo import atraso_acidente
from src.rotina import calcular_saida
from src.trajetos import medias_por_horario

ATRASO_MAXIMO_ACIDENTE = 20
AUMENTO_CHUVA = 0.30  # chuva forte deixa o trajeto 30% mais longo
ATRASO_OBRA = 10


def medir_impacto(tipo, plano, minutos_desde_acidente=0):
    """Calcula quanto o evento já atrasou o trajeto e qual o impacto previsto."""
    if tipo == "acidente":
        atraso_atual = atraso_acidente(minutos_desde_acidente)
        return atraso_atual, ATRASO_MAXIMO_ACIDENTE, "Acidente no trajeto"
    if tipo == "chuva":
        atraso = round(plano["trajeto_min"] * AUMENTO_CHUVA)
        return atraso, atraso, "Chuva forte na região"
    return ATRASO_OBRA, ATRASO_OBRA, "Obra no caminho"


def recalcular(plano, tipo, usuario, locais, historico, minutos_desde_acidente=0):
    """Recalcula o plano se a variação passar do limite do usuário (RN03).

    Devolve a recomendação ou None quando a mudança não é relevante.
    """
    atraso_atual, impacto, causa = medir_impacto(tipo, plano, minutos_desde_acidente)
    limite = usuario.get("limite_variacao", 5)
    if atraso_atual < limite:
        return None

    local = buscar_local(locais, plano["destino"])
    tempo_base = local["tempo_base"] if local else 30
    medias = medias_por_horario(historico, plano["destino"])
    inicio = texto_para_minutos(plano["compromisso"])
    nova_saida, _ = calcular_saida(inicio, plano["margem"], medias, tempo_base, impacto)
    if nova_saida is None:
        return {"causa": causa, "impacto": f"até +{round(impacto)} min", "nova_saida": None,
                "mensagem": "Não dá mais tempo de chegar. Considere avisar sobre o atraso."}

    # RNF09: toda recomendação explica causa, impacto e horário sugerido
    return {"causa": causa, "impacto": f"até +{round(impacto)} min",
            "impacto_min": round(impacto),
            "atraso_detectado": round(atraso_atual, 1),
            "saida_anterior": plano["saida"],
            "nova_saida": minutos_para_texto(nova_saida),
            "novo_despertar": minutos_para_texto(nova_saida - plano["preparacao"]),
            "opcoes": ["Aceitar", "Rejeitar", "Ajustar"]}


def registrar_decisao(plano, recomendacao, decisao):
    """Guarda o que o usuário decidiu. O ViaTempo nunca muda nada sozinho (RN04)."""
    historico = ler_json("historico_recomendacoes.json", [])
    historico.append({"data_hora": datetime.now().strftime("%Y-%m-%d %H:%M"),
                      "compromisso": plano["titulo"], "causa": recomendacao["causa"],
                      "saida_sugerida": recomendacao["nova_saida"], "decisao": decisao})
    salvar_json("historico_recomendacoes.json", historico)
