"""Modelos matemáticos do ViaTempo (os mesmos do relatório de Matemática).

São usados para gerar os dados simulados e como plano B quando não existe
histórico de trajeto para um destino.
"""
import math


def tempo_modelo(hora, tempo_base):
    """Tempo de trajeto (min) saindo na 'hora' (ex.: 7.5 = 7h30).

    Para tempo_base = 25 é exatamente T(t) = 25 + 30·e^(−2(t−8)²) do relatório.
    Somamos também um pico à tarde (18h) para cobrir compromissos do dia todo.
    """
    pico_manha = 1.2 * tempo_base * math.exp(-2 * (hora - 8) ** 2)
    pico_tarde = 1.0 * tempo_base * math.exp(-2 * (hora - 18) ** 2)
    return tempo_base + pico_manha + pico_tarde


def atraso_acidente(minutos_desde_acidente, atraso_maximo=20, constante=15):
    """Atraso acumulado D(t) = 20·(1 − e^(−t/15)) depois de um acidente."""
    return atraso_maximo * (1 - math.exp(-minutos_desde_acidente / constante))
