"""Leitura e gravação dos arquivos de dados (JSON e CSV) da pasta data/."""
import csv
import json
from pathlib import Path

PASTA_DADOS = Path(__file__).resolve().parent.parent / "data"


def ler_json(nome_arquivo, padrao):
    """Lê um arquivo JSON. Se ele não existir, devolve o valor padrão."""
    caminho = PASTA_DADOS / nome_arquivo
    if not caminho.exists():
        return padrao
    with open(caminho, encoding="utf-8") as arquivo:
        return json.load(arquivo)


def salvar_json(nome_arquivo, dados):
    with open(PASTA_DADOS / nome_arquivo, "w", encoding="utf-8") as arquivo:
        json.dump(dados, arquivo, ensure_ascii=False, indent=2)


def ler_csv(nome_arquivo):
    """Lê um CSV e devolve uma lista de dicionários (uma linha = um dicionário)."""
    caminho = PASTA_DADOS / nome_arquivo
    if not caminho.exists():
        return []
    with open(caminho, encoding="utf-8", newline="") as arquivo:
        return list(csv.DictReader(arquivo))


def adicionar_linha_csv(nome_arquivo, linha):
    """Acrescenta uma linha no fim do CSV, criando o cabeçalho se for preciso."""
    caminho = PASTA_DADOS / nome_arquivo
    arquivo_novo = not caminho.exists()
    with open(caminho, "a", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=list(linha.keys()))
        if arquivo_novo:
            escritor.writeheader()
        escritor.writerow(linha)
