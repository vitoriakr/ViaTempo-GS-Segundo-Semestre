"""Relatório de dados: responde 'como os dados ajudam a entender o problema e decidir?'."""
from src.armazenamento import PASTA_SAIDA, ler_csv, ler_json, salvar_texto
from src.horarios import minutos_para_texto
from src.trajetos import medias_por_horario

DIAS_UTEIS_MES = 22
INICIO_MANHA = 330  # 05h30, em minutos
FIM_MANHA = 600   


def media(valores):
    return sum(valores) / len(valores) if valores else 0


def tempo_medio_por_hora(historico, destino, condicao="normal"):
    """Agrupa o histórico (condição normal) por hora cheia: {7: 33.1, 8: 52.4, ...}."""
    grupos = {}
    for registro in historico:
        if registro["destino"] == destino and registro["condicao"] == condicao:
            hora = registro["saida"] // 60
            grupos.setdefault(hora, []).append(registro["tempo"])
    return {hora: media(tempos) for hora, tempos in sorted(grupos.items())}


def melhor_e_pior_horario(medias):
    """Entre 5h30 e 10h, acha o horário com o menor e o maior tempo médio."""
    manha = {m: t for m, t in medias.items() if INICIO_MANHA <= m <= FIM_MANHA}
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
        if linha["seguiu_recomendacao"] in grupos:
            grupos[linha["seguiu_recomendacao"]].append(linha)
    resultado = {}
    for chave, linhas in grupos.items():
        pontuais = [l["chegou_no_horario"] == "sim" for l in linhas]
        atrasos = [int(l["atraso_min"]) for l in linhas]
        resultado[chave] = (100 * media(pontuais), media(atrasos), len(linhas))
    return resultado


def salvar_grafico(historico, destino):
    """Gráfico de barras: tempo médio por hora em dias normais x dias de chuva.

    Usa matplotlib. Se a biblioteca não estiver instalada, o relatório continua sem o gráfico.
    """
    try:
        import matplotlib
        matplotlib.use("Agg")  # modo sem janela: só grava o arquivo
        import matplotlib.pyplot as plt
    except ImportError:
        return None

    normal = tempo_medio_por_hora(historico, destino, "normal")
    chuva = tempo_medio_por_hora(historico, destino, "chuva")
    horas = list(normal)
    posicoes = range(len(horas))

    fig, ax = plt.subplots(figsize=(9, 4))
    ax.bar([p - 0.2 for p in posicoes], [normal[h] for h in horas], width=0.4,
           label="Dia normal", color="#1F5A96")
    ax.bar([p + 0.2 for p in posicoes], [chuva.get(h, 0) for h in horas], width=0.4,
           label="Dia de chuva", color="#E08A1E")
    ax.set_xticks(list(posicoes))
    ax.set_xticklabels([f"{h}h" for h in horas])
    ax.set_title(f"Tempo médio de trajeto até {destino} por horário de saída")
    ax.set_ylabel("minutos")
    ax.legend()
    fig.tight_layout()

    PASTA_SAIDA.mkdir(parents=True, exist_ok=True)
    caminho = PASTA_SAIDA / f"grafico_{destino.lower().replace(' ', '_')}.png"
    fig.savefig(caminho, dpi=120)
    plt.close(fig)
    return caminho


def montar_relatorio(historico, destino):
    """Devolve o relatório como lista de linhas (assim dá para mostrar na tela e salvar em arquivo)."""
    medias = medias_por_horario(historico, destino)
    if not medias:
        return []

    total = sum(1 for r in historico if r["destino"] == destino)
    linhas = [f"===== RELATÓRIO DE DADOS – {destino.upper()} ({total} viagens) =====",
              "", "1) Tempo médio de trajeto por hora de saída (dias normais):"]
    por_hora = tempo_medio_por_hora(historico, destino)
    for hora, tempo in por_hora.items():
        linhas.append(f"   {hora:02d}h  {'█' * round(tempo / 2):<35} {tempo:5.1f} min")

    (melhor, t_melhor), (pior, t_pior) = melhor_e_pior_horario(medias)
    economia_dia = t_pior - t_melhor
    linhas += ["", "2) Melhor e pior horário para sair de manhã:",
               f"   Melhor: {minutos_para_texto(melhor)} → {t_melhor:.1f} min",
               f"   Pior:   {minutos_para_texto(pior)} → {t_pior:.1f} min",
               f"   Diferença: {economia_dia:.1f} min por dia ≈ "
               f"{economia_dia * DIAS_UTEIS_MES / 60:.1f} horas por mês"]

    linhas += ["", "3) Impacto de eventos no trajeto (comparado com o mesmo horário normal):"]
    for condicao, (aumento, quantidade) in impacto_das_condicoes(historico, destino, medias).items():
        linhas.append(f"   {condicao.capitalize():<9} +{aumento:4.1f} min em média ({quantidade} viagens)")

    feedback = analisar_feedback()
    seguiu, nao_seguiu = feedback["sim"], feedback["nao"]
    linhas += ["", "4) Pontualidade dos usuários (feedback):",
               f"   Seguiram a recomendação:     {seguiu[0]:5.1f}% no horário "
               f"(atraso médio {seguiu[1]:.1f} min, {seguiu[2]} registros)",
               f"   Não seguiram a recomendação: {nao_seguiu[0]:5.1f}% no horário "
               f"(atraso médio {nao_seguiu[1]:.1f} min, {nao_seguiu[2]} registros)"]

    decisoes = ler_json("historico_recomendacoes.json", [])
    if decisoes:
        aceitas = sum(1 for d in decisoes if d["decisao"] == "Aceitar")
        linhas.append(f"   Recomendações aceitas: {aceitas} de {len(decisoes)}")

    linhas += ["", "5) O que os dados mostram (decisão):",
            f"   Sair às {minutos_para_texto(melhor)} em vez de {minutos_para_texto(pior)} "
            f"economiza ~{economia_dia:.0f} min de trajeto por dia.",
            "   Por isso o ViaTempo calcula a saída com a média do horário real (e não com um",
            "   tempo fixo) e avisa quando chuva, acidente ou obra aumentam o trajeto."]
    if seguiu[2] and nao_seguiu[2] and seguiu[0] > nao_seguiu[0]:
        linhas.append(f"   Quem seguiu as recomendações chegou no horário {seguiu[0] - nao_seguiu[0]:.0f} "
                    "pontos percentuais mais vezes.")
    return linhas


def imprimir_relatorio(historico, destino):
    linhas = montar_relatorio(historico, destino)
    if not linhas:
        print(f"\nNão há histórico para '{destino}'.")
        return

    grafico = salvar_grafico(historico, destino)
    if grafico:
        linhas += ["", f"   Gráfico salvo em: saida/{grafico.name}"]
    nome_relatorio = f"relatorio_{destino.lower().replace(' ', '_')}.txt"
    salvar_texto(nome_relatorio, linhas)
    linhas.append(f"   Relatório salvo em: saida/{nome_relatorio}")

    print()
    print("\n".join(linhas))
