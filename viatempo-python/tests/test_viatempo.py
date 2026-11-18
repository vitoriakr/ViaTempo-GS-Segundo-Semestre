import pytest

from src.horarios import horario_valido, minutos_para_texto, normalizar_horario, texto_para_minutos
from src.monitoramento import recalcular
from src.rotina import calcular_plano, calcular_saida, nivel_urgencia, verificar_conflitos
from src.trajetos import carregar_historico, estimar_trajeto, medias_por_horario

USUARIO = {"nome": "Teste", "preparacao_padrao": 45, "margem_padrao": 10, "limite_variacao": 5}
LOCAIS = [{"nome": "FIAP", "tempo_base": 25}]


# --- TESTES DE HORÁRIOS ---

def test_conversao_ida_e_volta():
    assert texto_para_minutos("07:15") == 435
    assert minutos_para_texto(435) == "07:15"


def test_horario_valido():
    assert horario_valido("08:00") is True
    assert horario_valido("25:00") is False
    assert horario_valido("abc") is False
    assert horario_valido("") is False


def test_normalizar():
    assert normalizar_horario("7:5") == "07:05"


def test_horario_negativo_volta_para_o_dia_anterior():
    assert minutos_para_texto(-30) == "23:30"


# --- TESTES DE TRAJETOS ---

def test_media_por_horario():
    historico = [
        {"destino": "FIAP", "condicao": "normal", "saida": 480, "tempo": 40.0},
        {"destino": "FIAP", "condicao": "normal", "saida": 480, "tempo": 50.0},
        {"destino": "FIAP", "condicao": "chuva", "saida": 480, "tempo": 70.0},
    ]
    assert medias_por_horario(historico, "FIAP") == {480: 45.0}


def test_interpolacao_linear():
    medias = {480: 40.0, 495: 50.0}
    assert estimar_trajeto(medias, 485, 25) == pytest.approx(43.333, abs=1e-2)


def test_sem_historico_usa_modelo_matematico():
    assert estimar_trajeto({}, 480, 25) > 25  # 8h é horário de pico


def test_historico_do_projeto_tem_1360_viagens():
    assert len(carregar_historico()) == 1360


# --- TESTES DE ROTINA ---

def test_rn01_saida_e_a_mais_tarde_possivel():
    inicio, margem, tempo_base = 810, 10, 25  # compromisso às 13:30
    saida, trajeto = calcular_saida(inicio, margem, {}, tempo_base)
    assert saida + trajeto + margem <= inicio  # chega a tempo
    proxima = saida + 1  # um minuto depois já não chegaria
    assert proxima + estimar_trajeto({}, proxima, tempo_base) + margem > inicio


def test_margem_zero_nao_e_ignorada():
    compromisso = {
        "id": 1, "titulo": "Teste", "horario": "13:30", "destino": "FIAP",
        "preparacao": 0, "margem": 0
    }
    plano = calcular_plano(compromisso, USUARIO, LOCAIS, [])
    assert plano["margem"] == 0
    assert plano["preparacao"] == 0
    assert plano["saida"] == plano["despertar"]


def test_rn05_sem_destino_nao_calcula_trajeto():
    compromisso = {
        "id": 2, "titulo": "Almoço", "horario": "12:00", "destino": None,
        "preparacao": 15, "margem": None
    }
    plano = calcular_plano(compromisso, USUARIO, LOCAIS, [])
    assert plano["saida"] is None
    assert plano["despertar"] == "11:45"


def test_destino_em_minusculo_encontra_o_local():
    compromisso = {
        "id": 3, "titulo": "Aula", "horario": "13:30", "destino": "fiap",
        "preparacao": None, "margem": None
    }
    plano = calcular_plano(compromisso, USUARIO, LOCAIS, [])
    assert plano["saida"] is not None


def test_rn07_conflito_de_compromissos():
    agenda = [
        {"titulo": "A", "horario": "09:00", "duracao_min": 120},
        {"titulo": "B", "horario": "10:30", "duracao_min": 30}
    ]
    assert len(verificar_conflitos(agenda)) == 1
    agenda[1]["horario"] = "11:00"
    assert verificar_conflitos(agenda) == []


def test_urgencia_devolve_cor_valida():
    cor, mensagem = nivel_urgencia({}, 450, 25)
    assert cor in ["verde", "amarelo", "vermelho"]
    assert bool(mensagem)


# --- TESTES DE MONITORAMENTO ---

@pytest.fixture
def contexto_monitoramento():
    compromisso = {
        "id": 1, "titulo": "Aula", "horario": "08:00", "destino": "FIAP",
        "preparacao": None, "margem": None
    }
    historico = carregar_historico()
    plano = calcular_plano(compromisso, USUARIO, LOCAIS, historico)
    return plano, historico


def test_rn03_variacao_pequena_nao_gera_aviso(contexto_monitoramento):
    plano, historico = contexto_monitoramento
    assert recalcular(plano, "acidente", USUARIO, LOCAIS, historico, 2) is None


def test_chuva_antecipa_a_saida(contexto_monitoramento):
    plano, historico = contexto_monitoramento
    recomendacao = recalcular(plano, "chuva", USUARIO, LOCAIS, historico)
    assert recomendacao is not None
    assert texto_para_minutos(recomendacao["nova_saida"]) < texto_para_minutos(plano["saida"])


def test_rnf09_recomendacao_explica_causa_e_impacto(contexto_monitoramento):
    plano, historico = contexto_monitoramento
    recomendacao = recalcular(plano, "obra", USUARIO, LOCAIS, historico)
    for campo in ("causa", "impacto", "nova_saida", "opcoes"):
        assert campo in recomendacao
