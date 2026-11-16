"""Menu principal da aplicação. Executar com:  python main.py
"""
from datetime import date, datetime

from src.analise import imprimir_relatorio
from src.armazenamento import PASTA_SAIDA, adicionar_linha_csv, ler_json, salvar_json
from src.entrada import escolher_opcao, ler_data, ler_horario, ler_inteiro, ler_texto
from src.horarios import texto_para_minutos
from src.monitoramento import recalcular, registrar_decisao
from src.rotina import buscar_local, calcular_plano, verificar_conflitos
from src.trajetos import carregar_historico

TIPOS_DE_EVENTO = {"1": "acidente", "2": "chuva", "3": "obra"}
DECISOES = {"1": "Aceitar", "2": "Rejeitar", "3": "Ajustar"}

def proxima_data(compromissos):
    hoje = date.today().isoformat()
    futuras = sorted(c["data"] for c in compromissos if c["data"] >= hoje)
    return futuras[0] if futuras else hoje


def compromissos_da_data(compromissos, data):
    do_dia = [c for c in compromissos if c["data"] == data]
    return sorted(do_dia, key=lambda c: texto_para_minutos(c["horario"]))


def mostrar_plano(plano):
    destino = f" ({plano['destino']})" if plano["destino"] else " (sem deslocamento)"
    print(f"\n  {plano['compromisso']}  {plano['titulo']}{destino}")
    print(f"     Começar a se preparar: {plano['despertar'] or '--'}")
    if plano["destino"]:
        print(f"     Sair de casa:          {plano['saida'] or '--'}   "
              f"(trajeto previsto: {plano['trajeto_min'] or '--'} min, fonte: {plano.get('fonte', '-')})")
    print(f"     [{plano['urgencia'].upper()}] {plano['mensagem']}")


def salvar_plano_para_front(planos, usuario, data, alerta=None):
    """Gera saida/meu_dia.json com todos os compromissos do dia."""
    salvar_json("meu_dia.json", {
        "usuario": usuario["nome"],
        "data": data,
        "compromissos": [
            {
                "id": plano["id"],
                "titulo": plano["titulo"],
                "horario": plano["compromisso"],
                "destino": plano["destino"],
                "saida": plano["saida"],
                "despertar": plano["despertar"],
                "trajeto_min": plano["trajeto_min"],
                "fonte": plano.get("fonte"),
                "urgencia": plano["urgencia"],
                "mensagem": plano["mensagem"]
            }
            for plano in planos
        ],
        "alerta": alerta
    }, PASTA_SAIDA)
# ---------------------------------- opções do menu ----------------------------------
def ver_meu_dia(dados):
    data = ler_data("Data", proxima_data(dados["compromissos"]))
    do_dia = compromissos_da_data(dados["compromissos"], data)
    if not do_dia:
        print("Nenhum compromisso nessa data.")
        salvar_plano_para_front([], dados["usuario"], data)
        return

    print(f"\n===== MEU DIA – {data} =====")
    planos = calcular_plano(c, dados["usuario"], dados["locais"], dados["historico"])
    for plano in planos:
        mostrar_plano(plano)

    for alerta in verificar_conflitos(do_dia):
        print(f"\n  [!] Conflito: {alerta}")

    salvar_plano_para_front(planos, dados["usuario"], data)
    print("\n  (Todos os compromissos foram salvos em saida/meu_dia.json para o front-end)")


def cadastrar_compromisso(dados):
    print("\n--- Novo compromisso ---")

    titulo = ler_texto("Título: ")
    data = ler_data("Data", date.today().isoformat())
    horario = ler_horario("Horário (HH:MM): ")
    destino = ler_texto("Destino (Enter se não precisar se deslocar): ", obrigatorio=False)

    if destino:
        local = buscar_local(dados["locais"], destino)

        if not local:
            print(f"\nO local '{destino}' ainda não está cadastrado.")

            resposta = input("Deseja cadastrar esse local? (s/n): ").strip().lower()

            if resposta == "s":
                dados["locais"].append({
                    "nome": destino.strip(),
                    "tempo_base": 30
                })

                salvar_json("locais.json", dados["locais"])
                print("Local cadastrado com sucesso!")

    duracao = ler_inteiro("Duração em minutos: ", 5, 720)
    preparacao = ler_inteiro("Tempo de preparação (Enter = padrão): ", 0, 240, True)
    margem = ler_inteiro("Margem de segurança (Enter = padrão): ", 0, 120, True)

    novo_id = max((c["id"] for c in dados["compromissos"]), default=0) + 1

    dados["compromissos"].append({
        "id": novo_id,
        "titulo": titulo,
        "data": data,
        "horario": horario,
        "destino": destino.strip() or None,
        "duracao_min": duracao,
        "preparacao": preparacao,
        "margem": margem
    })

    salvar_json("compromissos.json", dados["compromissos"])
    print(f"\nCompromisso '{titulo}' salvo com sucesso!")

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
    if buscar_local(dados["locais"], nome):
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


def escolher_compromisso_com_destino(dados):
    """Pergunta a data e o ID de um compromisso com deslocamento. Devolve None se não houver."""
    data = ler_data("Data do compromisso", proxima_data(dados["compromissos"]))
    com_destino = [c for c in compromissos_da_data(dados["compromissos"], data) if c.get("destino")]
    if not com_destino:
        print("\nNenhum compromisso com deslocamento nessa data.")
        return None
    for c in com_destino:
        print(f"  [{c['id']}] {c['horario']} {c['titulo']}")
    id_escolhido = escolher_opcao("ID do compromisso: ", [str(c["id"]) for c in com_destino])
    return next(c for c in com_destino if str(c["id"]) == id_escolhido)


def simular_mudanca(dados):
    escolhido = escolher_compromisso_com_destino(dados)
    if escolhido is None:
        return
    plano = calcular_plano(c, dados["usuario"], dados["locais"], dados["historico"])
    if not plano["saida"]:
        print("  Esse compromisso não tem horário de saída viável.")
        return

    print("\nO que aconteceu?  [1] Acidente  [2] Chuva forte  [3] Obra")
    tipo = TIPOS_DE_EVENTO[escolher_opcao("Escolha: ", list(TIPOS_DE_EVENTO))]
    minutos = ler_inteiro("Há quantos minutos foi o acidente? ", 0, 180) if tipo == "acidente" else 0

    recomendacao = recalcular(
    plano, tipo, dados["usuario"],
    dados["locais"], dados["historico"], minutos)
    if recomendacao is None:
        print(f"\nA mudança ainda é menor que {dados['usuario']['limite_variacao']} min. "
              "Nenhum aviso enviado (RN03).")
        return

    print(f"\n[!] {recomendacao['causa']} ({recomendacao['impacto']})")
    if not recomendacao["nova_saida"]:
        print(f"   {recomendacao['mensagem']}")
        return
    print(f"   Atraso já detectado: {recomendacao['atraso_detectado']} min")
    print(f"   Antes: sair às {recomendacao['saida_anterior']}")
    print(f"   Agora: sair às {recomendacao['nova_saida']} e começar a se preparar às "
          f"{recomendacao['novo_despertar']}")

    decisao = DECISOES[escolher_opcao("[1] Aceitar  [2] Rejeitar  [3] Ajustar: ", list(DECISOES))]
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
    print(f"Destinos: {', '.join(l['nome'] for l in dados['locais'])}")
    destino = ler_texto("Analisar qual destino? ")
    local = buscar_local(dados["locais"], destino)
    imprimir_relatorio(dados["historico"], local["nome"] if local else destino)


# -------------------------------------- menu --------------------------------------
def carregar_dados():
    padrao_usuario = {"nome": "Usuário", "preparacao_padrao": 45,
                      "margem_padrao": 10, "limite_variacao": 5}
    return {
    "usuario": ler_json("usuario.json", padrao_usuario),
    "locais": ler_json("locais.json", []),
    "compromissos": ler_json("compromissos.json", []),
    "historico": carregar_historico()
}


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
