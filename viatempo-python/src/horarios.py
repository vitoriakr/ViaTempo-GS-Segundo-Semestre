"""Funções de apoio para converter e validar horários."""


def texto_para_minutos(texto):
    """Converte '07:15' em 435 (minutos desde a meia-noite)."""
    horas, minutos = texto.split(":")
    return int(horas) * 60 + int(minutos)


def minutos_para_texto(minutos):
    """Converte 435 em '07:15'."""
    minutos = round(minutos)
    return f"{minutos // 60:02d}:{minutos % 60:02d}"


def normalizar_horario(horario):
    """Padroniza um horário no formato HH:MM."""
    horario = horario.strip()

    if not horario_valido(horario):
        return None

    hora, minuto = horario.split(":")
    return f"{int(hora):02d}:{int(minuto):02d}"

def horario_valido(texto):
    """Confere se o texto está no formato HH:MM e é um horário possível."""
    partes = texto.split(":")
    if len(partes) != 2 or not partes[0].isdigit() or not partes[1].isdigit():
        return False
    return 0 <= int(partes[0]) <= 23 and 0 <= int(partes[1]) <= 59
