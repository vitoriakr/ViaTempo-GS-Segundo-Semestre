"""Leitura segura do teclado: cada função repete a pergunta até a resposta ser válida."""
from datetime import datetime

from src.horarios import horario_valido, normalizar_horario


def ler_texto(pergunta, obrigatorio=True):
    while True:
        resposta = input(pergunta).strip()
        if resposta or not obrigatorio:
            return resposta
        print("  Campo obrigatório.")


def ler_inteiro(pergunta, minimo=0, maximo=600, vazio_permitido=False):
    while True:
        resposta = input(pergunta).strip()
        if vazio_permitido and resposta == "":
            return None
        try:
            numero = int(resposta)
            if minimo <= numero <= maximo:
                return numero
        except ValueError:  # o usuário digitou letras, símbolos ou um decimal
            pass
        print(f"  Digite um número inteiro entre {minimo} e {maximo}.")


def ler_horario(pergunta):
    """Devolve o horário sempre no formato HH:MM (ex.: '7:5' vira '07:05')."""
    while True:
        resposta = input(pergunta).strip()
        if horario_valido(resposta):
            return normalizar_horario(resposta)
        print("  Use o formato HH:MM (ex.: 08:00).")


def ler_data(pergunta, padrao):
    while True:
        resposta = input(f"{pergunta} [Enter = {padrao}]: ").strip() or padrao
        try:
            datetime.strptime(resposta, "%Y-%m-%d")
            return resposta
        except ValueError:
            print("  Use o formato AAAA-MM-DD (ex.: 2026-11-19).")


def escolher_opcao(pergunta, opcoes):
    while True:
        resposta = input(pergunta).strip()
        if resposta in opcoes:
            return resposta
        print(f"  Opção inválida. Escolha entre: {', '.join(opcoes)}")
