"""Relatório de dados: responde 'como os dados ajudam a entender o problema e decidir?'."""
from src.armazenamento import PASTA_DADOS, ler_csv, ler_json
from src.horarios import minutos_para_texto
from src.trajetos import medias_por_horario

DIAS_UTEIS_MES = 22


def media(valores):
    return sum(valores) / len(valores) if valores else 0


def tempo_medio_por_hora(historico, destino):
    """Agrupa o histórico (condição normal) por hora cheia: {7: 33.1, 8: 52.4, ...}."""
    grupos = {}
    for registro in historico:
        if registro["destino"] == destino and registro["condicao"] == "normal":
            hora = registro["saida"] // 60
            grupos.setdefault(hora, []).append(registro["tempo"])
    return {hora: media(tempos) for hora, tempos in sorted(grupos.items())}


def melhor_e_pior_horario(medias, inicio=330, fim=600):
    """Entre 5h30 e 10h, acha o horário com o menor e o maior tempo médio."""
    manha = {m: t for m, t in medias.items() if inicio <= m <= fim}
    melhor = min(manha, key=manha.get)
    pior = max(manha, key=manha.get)
    return (melhor, manha[melhor]), (pior, manha[pior])


def impacto_das_condicoes(historico, destino, medias_normais):
    """Compara cada viagem com chuva/acidente com a média normal do MESMO horário."""
    diferencas = {"chuva": [], "acidente": []}
    for registro in historico:
        condicao = registro["condicao"]
        if registro["destino"] == destino and condicao in diferencas:
            normal = medias_normais.get(registro["saida"])
            if normal:
                diferencas[condicao].append(registro["tempo"] - normal)
    return {condicao: (media(lista), len(lista)) for condicao, lista in diferencas.items()}


def analisar_feedback():
    """Pontualidade de quem seguiu a recomendação x quem não seguiu."""
    grupos = {"sim": [], "nao": []}
    for linha in ler_csv("feedback.csv"):
        grupos[linha["seguiu_recomendacao"]].append(linha["chegou_no_horario"] == "sim")
    return {chave: (100 * media(valores), len(valores)) for chave, valores in grupos.items()}


def salvar_grafico(por_hora, destino):
    """Gera um gráfico de barras do tempo médio por hora (precisa do matplotlib)."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return None
    horas = [f"{h}h" for h in por_hora]
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.bar(horas, list(por_hora.values()), color="#1F5A96")
    ax.set_title(f"Tempo médio de trajeto até {destino} por horário de saída")
    ax.set_ylabel("minutos")
    fig.tight_layout()
    caminho = PASTA_DADOS / f"grafico_{destino.lower().replace(' ', '_')}.png"
    fig.savefig(caminho, dpi=120)
    plt.close(fig)
    return caminho


def imprimir_relatorio(historico, destino):
    medias = medias_por_horario(historico, destino)
    if not medias:
        print(f"\nNão há histórico para '{destino}'.")
        return

    total = sum(1 for r in historico if r["destino"] == destino)
    print(f"\n===== RELATÓRIO DE DADOS – {destino.upper()} ({total} viagens) =====")

    print("\n1) Tempo médio de trajeto por hora de saída (dias normais):")
    por_hora = tempo_medio_por_hora(historico, destino)
    for hora, tempo in por_hora.items():
        print(f"   {hora:02d}h  {'█' * round(tempo / 2):<35} {tempo:5.1f} min")

    (melhor, t_melhor), (pior, t_pior) = melhor_e_pior_horario(medias)
    economia_dia = t_pior - t_melhor
    print("\n2) Melhor e pior horário para sair de manhã:")
    print(f"   Melhor: {minutos_para_texto(melhor)} → {t_melhor:.1f} min")
    print(f"   Pior:   {minutos_para_texto(pior)} → {t_pior:.1f} min")
    print(f"   Diferença: {economia_dia:.1f} min por dia ≈ "
          f"{economia_dia * DIAS_UTEIS_MES / 60:.1f} horas por mês")

    print("\n3) Impacto de eventos no trajeto (comparado com o mesmo horário normal):")
    for condicao, (aumento, quantidade) in impacto_das_condicoes(historico, destino, medias).items():
        print(f"   {condicao.capitalize():<9} +{aumento:4.1f} min em média ({quantidade} viagens)")

    print("\n4) Pontualidade dos usuários (feedback):")
    feedback = analisar_feedback()
    print(f"   Seguiram a recomendação:     {feedback['sim'][0]:5.1f}% no horário ({feedback['sim'][1]} registros)")
    print(f"   Não seguiram a recomendação: {feedback['nao'][0]:5.1f}% no horário ({feedback['nao'][1]} registros)")

    decisoes = ler_json("historico_recomendacoes.json", [])
    if decisoes:
        aceitas = sum(1 for d in decisoes if d["decisao"] == "Aceitar")
        print(f"   Recomendações aceitas: {aceitas} de {len(decisoes)}")

    print("\n5) O que os dados mostram (decisão):")
    print(f"   Sair às {minutos_para_texto(melhor)} em vez de {minutos_para_texto(pior)} economiza "
          f"~{economia_dia:.0f} min por dia. Por isso o ViaTempo recomenda horários fora do pico")
    print("   e aumenta a margem em dias de chuva ou com acidentes.")

    grafico = salvar_grafico(por_hora, destino)
    if grafico:
        print(f"\n   Gráfico salvo em: data/{grafico.name}")
