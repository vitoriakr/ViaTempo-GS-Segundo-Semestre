"""ViaTempo – Seu caminho, no tempo certo.

Menu principal da aplicação. Executar com:  python main.py
"""
from datetime import date, datetime

from src.analise import imprimir_relatorio
from src.armazenamento import adicionar_linha_csv, ler_json, salvar_json
from src.horarios import horario_valido, texto_para_minutos
from src.monitoramento import recalcular, registrar_decisao
from src.rotina import calcular_plano, verificar_conflitos
from src.trajetos import carregar_historico


# ---------------------------- leitura segura do teclado ----------------------------
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
        if resposta.isdigit() and minimo <= int(resposta) <= maximo:
            return int(resposta)
        print(f"  Digite um número entre {minimo} e {maximo}.")


def ler_horario(pergunta):
    while True:
        resposta = input(pergunta).strip()
        if horario_valido(resposta):
            return resposta
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


# ---------------------------------- funções do menu ----------------------------------
def proxima_data(compromissos):
    hoje = date.today().isoformat()
    futuras = sorted(c["data"] for c in compromissos if c["data"] >= hoje)
    return futuras[0] if futuras else hoje


def compromissos_da_data(compromissos, data):
    do_dia = [c for c in compromissos if c["data"] == data]
    return sorted(do_dia, key=lambda c: texto_para_minutos(c["horario"]))


def mostrar_plano(plano):
    print(f"\n  {plano['compromisso']}  {plano['titulo']}" +
          (f" ({plano['destino']})" if plano["destino"] else " (sem deslocamento)"))
    print(f"     Começar a se preparar: {plano['despertar'] or '--'}")
    if plano["destino"]:
        print(f"     Sair de casa:          {plano['saida'] or '--'}   "
              f"(trajeto previsto: {plano['trajeto_min'] or '--'} min, fonte: {plano.get('fonte', '-')})")
    print(f"     [{plano['urgencia'].upper()}] {plano['mensagem']}")


def salvar_plano_para_front(plano, usuario, alerta=None):
    """Gera data/plano.json, lido pela tela 'Meu Dia' do front-end."""
    salvar_json("plano.json", {
        "usuario": usuario["nome"], "compromisso": plano["compromisso"],
        "saida": plano["saida"], "despertar": plano["despertar"],
        "trajeto_min": plano["trajeto_min"], "urgencia": plano["urgencia"],
        "mensagem": plano["mensagem"], "alerta": alerta})


def ver_meu_dia(dados):
    data = ler_data("Data", proxima_data(dados["compromissos"]))
    do_dia = compromissos_da_data(dados["compromissos"], data)
    if not do_dia:
        print("\nNenhum compromisso nessa data.")
        return

    print(f"\n===== MEU DIA – {data} =====")
    planos = [calcular_plano(c, dados["usuario"], dados["locais"], dados["historico"]) for c in do_dia]
    for plano in planos:
        mostrar_plano(plano)

    for alerta in verificar_conflitos(do_dia):
        print(f"\n  ⚠ Conflito: {alerta}")

    com_saida = [p for p in planos if p["saida"]]
    if com_saida:
        salvar_plano_para_front(com_saida[0], dados["usuario"])
        print("\n  (Plano do primeiro deslocamento salvo em data/plano.json para o front-end)")


def cadastrar_compromisso(dados):
    print("\n--- Novo compromisso ---")
    titulo = ler_texto("Título: ")
    data = ler_data("Data", date.today().isoformat())
    horario = ler_horario("Horário (HH:MM): ")
    nomes = [local["nome"] for local in dados["locais"]]
    print(f"Locais cadastrados: {', '.join(nomes)}")
    destino = ler_texto("Destino (Enter se não precisar se deslocar): ", obrigatorio=False)
    if destino and destino.lower() not in [n.lower() for n in nomes]:
        print("  Local não cadastrado. Cadastre-o primeiro na opção 4.")
        return
    duracao = ler_inteiro("Duração em minutos: ", 5, 720)
    preparacao = ler_inteiro("Tempo de preparação (Enter = padrão): ", 0, 240, True)
    margem = ler_inteiro("Margem de segurança (Enter = padrão): ", 0, 120, True)

    novo_id = max((c["id"] for c in dados["compromissos"]), default=0) + 1
    dados["compromissos"].append({"id": novo_id, "titulo": titulo, "data": data, "horario": horario,
                                  "destino": destino or None, "duracao_min": duracao,
                                  "preparacao": preparacao, "margem": margem})
    salvar_json("compromissos.json", dados["compromissos"])
    print(f"Compromisso '{titulo}' salvo!")


def listar_e_excluir(dados):
    if not dados["compromissos"]:
        print("\nNenhum compromisso cadastrado.")
        return
    print("\n--- Compromissos ---")
    for c in sorted(dados["compromissos"], key=lambda c: (c["data"], c["horario"])):
        print(f"  [{c['id']}] {c['data']} {c['horario']}  {c['titulo']} – {c['destino'] or 'sem destino'}")
    escolha = ler_inteiro("ID para excluir (Enter para voltar): ", 1, 100000, True)
    if escolha is None:
        return
    restantes = [c for c in dados["compromissos"] if c["id"] != escolha]
    if len(restantes) == len(dados["compromissos"]):
        print("  ID não encontrado.")
        return
    dados["compromissos"] = restantes
    salvar_json("compromissos.json", restantes)
    print("Compromisso excluído.")


def cadastrar_local(dados):
    print("\n--- Novo local frequente ---")
    nome = ler_texto("Nome do local (ex.: Academia): ")
    if any(l["nome"].lower() == nome.lower() for l in dados["locais"]):
        print("  Esse local já existe.")
        return
    tempo_base = ler_inteiro("Tempo de trajeto SEM trânsito, em minutos: ", 1, 300)
    dados["locais"].append({"nome": nome, "tempo_base": tempo_base})
    salvar_json("locais.json", dados["locais"])
    print(f"Local '{nome}' salvo! Sem histórico, o ViaTempo usará o modelo matemático para ele.")


def configurar(dados):
    u = dados["usuario"]
    print(f"\nAtual: preparação {u['preparacao_padrao']} min | margem {u['margem_padrao']} min | "
          f"avisar a partir de {u['limite_variacao']} min de variação")
    u["preparacao_padrao"] = ler_inteiro("Novo tempo de preparação padrão: ", 0, 240)
    u["margem_padrao"] = ler_inteiro("Nova margem de segurança padrão: ", 0, 120)
    u["limite_variacao"] = ler_inteiro("Avisar quando o trajeto mudar a partir de (min): ", 1, 60)
    salvar_json("usuario.json", u)
    print("Configurações salvas!")


def simular_mudanca(dados):
    data = ler_data("Data do compromisso", proxima_data(dados["compromissos"]))
    do_dia = [c for c in compromissos_da_data(dados["compromissos"], data) if c.get("destino")]
    if not do_dia:
        print("\nNenhum compromisso com deslocamento nessa data.")
        return
    for c in do_dia:
        print(f"  [{c['id']}] {c['horario']} {c['titulo']}")
    ids = [str(c["id"]) for c in do_dia]
    id_escolhido = escolher_opcao("ID do compromisso: ", ids)
    escolhido = next(c for c in do_dia if str(c["id"]) == id_escolhido)
    plano = calcular_plano(escolhido, dados["usuario"], dados["locais"], dados["historico"])
    if not plano["saida"]:
        print("  Esse compromisso não tem horário de saída viável.")
        return

    print("\nO que aconteceu?  [1] Acidente  [2] Chuva forte  [3] Obra")
    tipo = {"1": "acidente", "2": "chuva", "3": "obra"}[escolher_opcao("Escolha: ", ["1", "2", "3"])]
    minutos = ler_inteiro("Há quantos minutos foi o acidente? ", 0, 180) if tipo == "acidente" else 0

    recomendacao = recalcular(plano, tipo, dados["usuario"], dados["locais"], dados["historico"], minutos)
    if recomendacao is None:
        print(f"\nA mudança ainda é menor que {dados['usuario']['limite_variacao']} min. "
              "Nenhum aviso enviado (RN03).")
        return

    print(f"\n🔔 {recomendacao['causa']} ({recomendacao['impacto']})")
    if not recomendacao["nova_saida"]:
        print(f"   {recomendacao['mensagem']}")
        return
    print(f"   Atraso já detectado: {recomendacao['atraso_detectado']} min")
    print(f"   Antes: sair às {recomendacao['saida_anterior']}")
    print(f"   Agora: sair às {recomendacao['nova_saida']} e começar a se preparar às "
          f"{recomendacao['novo_despertar']}")

    decisao = {"1": "Aceitar", "2": "Rejeitar", "3": "Ajustar"}[
        escolher_opcao("[1] Aceitar  [2] Rejeitar  [3] Ajustar: ", ["1", "2", "3"])]
    if decisao == "Ajustar":
        extra = ler_inteiro("Quantos minutos a mais de margem você quer? ", 0, 60)
        escolhido["margem"] = plano["margem"] + extra
        salvar_json("compromissos.json", dados["compromissos"])
        print("Margem ajustada. Veja o novo plano na opção 1.")
    elif decisao == "Aceitar":
        # somar o impacto na margem gera exatamente o novo horário sugerido
        escolhido["margem"] = plano["margem"] + recomendacao["impacto_min"]
        salvar_json("compromissos.json", dados["compromissos"])
        print(f"Recomendação aceita! O compromisso agora considera +{recomendacao['impacto_min']} min.")
    else:
        print("Recomendação rejeitada. Seu plano continua igual.")
    registrar_decisao(plano, recomendacao, decisao)
    salvar_plano_para_front(plano, dados["usuario"], recomendacao)


def registrar_feedback(dados):
    print("\n--- Como foi o seu compromisso? ---")
    titulo = ler_texto("Compromisso: ")
    seguiu = escolher_opcao("Seguiu o horário recomendado? (s/n): ", ["s", "n"])
    chegou = escolher_opcao("Chegou no horário? (s/n): ", ["s", "n"])
    atraso = 0 if chegou == "s" else ler_inteiro("Quantos minutos de atraso? ", 1, 300)
    adicionar_linha_csv("feedback.csv", {
        "data": date.today().isoformat(), "compromisso": titulo,
        "seguiu_recomendacao": "sim" if seguiu == "s" else "nao",
        "chegou_no_horario": "sim" if chegou == "s" else "nao", "atraso_min": atraso})
    print("Obrigado! Seu feedback ajuda o ViaTempo a melhorar.")


def relatorio(dados):
    nomes = [l["nome"] for l in dados["locais"]]
    print(f"Destinos: {', '.join(nomes)}")
    destino = ler_texto("Analisar qual destino? ")
    imprimir_relatorio(dados["historico"], next((n for n in nomes if n.lower() == destino.lower()), destino))


# -------------------------------------- menu --------------------------------------
def carregar_dados():
    return {"usuario": ler_json("usuario.json", {"nome": "Usuário", "preparacao_padrao": 45,
                                                  "margem_padrao": 10, "limite_variacao": 5}),
            "locais": ler_json("locais.json", []),
            "compromissos": ler_json("compromissos.json", []),
            "historico": carregar_historico()}


def main():
    dados = carregar_dados()
    acoes = {"1": ver_meu_dia, "2": cadastrar_compromisso, "3": listar_e_excluir,
             "4": cadastrar_local, "5": configurar, "6": simular_mudanca,
             "7": registrar_feedback, "8": relatorio}
    while True:
        print(f"\n========== VIATEMPO – Olá, {dados['usuario']['nome']}! ==========")
        print("[1] Meu dia                    [5] Configurar preparação e margem")
        print("[2] Novo compromisso           [6] Simular mudança no trânsito")
        print("[3] Ver/excluir compromissos   [7] Registrar feedback")
        print("[4] Novo local frequente       [8] Relatório de dados")
        print("[0] Sair")
        opcao = escolher_opcao("Escolha uma opção: ", ["0"] + list(acoes))
        if opcao == "0":
            print("Até logo! Seu caminho, no tempo certo.")
            break
        acoes[opcao](dados)


if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print("\nPrograma encerrado.")
