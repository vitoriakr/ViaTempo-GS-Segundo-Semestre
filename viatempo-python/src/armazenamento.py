"""Leitura e gravação dos arquivos de dados (JSON e CSV) da pasta data/.

Pastas do projeto:
- data/   dados de entrada (cadastros) e dados gerados por gerar_dados.py
- saida/  resultados da aplicação """
import csv
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PASTA_DADOS = RAIZ / "data"
PASTA_SAIDA = RAIZ / "saida"


def ler_json(nome_arquivo, padrao, pasta=PASTA_DADOS):
    """Lê um arquivo JSON. Se ele não existir, devolve o valor padrão."""
    try:
        with open(pasta / nome_arquivo, encoding="utf-8") as arquivo:
            return json.load(arquivo)
    except FileNotFoundError:
        return padrao
    except json.JSONDecodeError:
        print(f"Aviso: o arquivo {nome_arquivo} está com formato inválido. Usando valores padrão.")
        return padrao


def salvar_json(nome_arquivo, dados,pasta=PASTA_DADOS):
    """Grava os dados em JSON. Devolve True se deu certo e False se houve erro de gravação."""
    try:
        pasta.mkdir(parents=True, exist_ok=True)
        with open(pasta / nome_arquivo, "w", encoding="utf-8") as arquivo:
            json.dump(dados, arquivo, ensure_ascii=False, indent=2)
        return True
    except OSError as erro:
        print(f"Erro ao salvar {nome_arquivo}: {erro}")
        return False


def ler_csv(nome_arquivo):
    """Lê um CSV e devolve uma lista de dicionários (uma linha = um dicionário)."""
    try:
        with open(PASTA_DADOS / nome_arquivo, encoding="utf-8", newline="") as arquivo:
            return list(csv.DictReader(arquivo))
    except FileNotFoundError:
        return []

def salvar_csv(nome_arquivo, linhas):
    """Cria (ou sobrescreve) um CSV a partir de uma lista de dicionários."""
    PASTA_DADOS.mkdir(parents=True, exist_ok=True)
    with open(PASTA_DADOS / nome_arquivo, "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=list(linhas[0].keys()), lineterminator="\n")
        escritor.writeheader()
        escritor.writerows(linhas)


def adicionar_linha_csv(nome_arquivo, linha):
    """Acrescenta uma linha no fim do CSV, criando o cabeçalho se for preciso."""
    caminho = PASTA_DADOS / nome_arquivo
    arquivo_novo = not caminho.exists()
    with open(caminho, "a", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=list(linha.keys()), lineterminator="\n")
        if arquivo_novo:
            escritor.writeheader()
        escritor.writerow(linha)


def salvar_texto(nome_arquivo, linhas, pasta=PASTA_SAIDA):
    """Grava uma lista de linhas em um arquivo .txt."""
    pasta.mkdir(parents=True, exist_ok=True)
    with open(pasta / nome_arquivo, "w", encoding="utf-8") as arquivo:
        arquivo.write("\n".join(linhas) + "\n")
