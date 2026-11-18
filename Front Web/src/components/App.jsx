import React, { useEffect, useMemo, useState } from 'react';
import { api, makeId } from '../services/api';
import { Agenda, todayISO, buildRecommendation, formatDate, formatTime } from '../utils/schedule';
import { Sidebar, Topbar, Toast, Modal, Brand } from './Primitives';
import { EmptyState, EventCard, EventModal, RecommendationMessage } from './EventComponents';
import { ImportExportPanel, LocationsPanel, AccountModal } from './DataComponents';
import Onboarding from './Onboarding';
import AssistantWidget from './Assistant';
import { TecaAvatar, TecaTip } from './Teca';

const viewTitles = { home: 'Meu dia', agenda: 'Minha agenda', journey: 'Jornada', places: 'Meus locais', data: 'Seus dados' };

export default function App() {
  const [data, setData] = useState({ events: [], locations: [], preferences: {}, feedback: [] });
  const [view, setView] = useState('home');
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [eventModal, setEventModal] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [agendaDate, setAgendaDate] = useState('');
  const [toast, setToast] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const today = todayISO();

  useEffect(() => {
    api.load().then((loaded) => setData({ events: [], locations: [], preferences: {}, feedback: [], ...loaded }))
      .catch((error) => setToast({ message: `Não foi possível carregar os dados: ${error.message}`, type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const agenda = useMemo(() => new Agenda(data.events), [data.events]);
  const sortedEvents = agenda.sortedEvents;
  const eventConflicts = agenda.conflicts;
  const todayEvents = sortedEvents.filter((event) => event.date === today);
  const upcoming = sortedEvents.filter((event) => new Date(`${event.date}T${event.time}`) >= new Date());
  const nextEvent = upcoming[0];
  const recommendations = upcoming.flatMap((event) => {
    const plan = buildRecommendation(event);
    if (!event.recommendationStatus && plan.change) return [{ event, plan, type: 'delay' }];
    if (!event.recommendationStatus && event.message) return [{ event, plan, type: 'message' }];
    if (!event.bufferRecommendationStatus && Number(event.travelMinutes) > 0 && Number(event.bufferMinutes) < 5) return [{ event, plan, type: 'margin' }];
    return [];
  }).slice(0, 4);
  const totalXp = sortedEvents.filter((event) => event.userFeedback).reduce((sum,event)=>sum+(event.userFeedback==='on-time'?30:10),0);
  const tecaBonus = sortedEvents.filter((event)=>event.tecaChallengeStatus==='accepted').length*10;
  const tecaLevel = Math.floor((totalXp+tecaBonus)/100)+1;
  const placeFull = (id) => { const place = data.locations.find((item) => item.id === id); return place ? `${place.name} · ${place.address}` : ''; };

  async function completeOnboarding(payload) {
    const next = { events: [], locations: [], preferences: {}, feedback: [], ...payload, onboardingCompleted: true };
    try {
      await api.save(next);
      setData(next);
    } catch (error) {
      setToast({ message: `Não foi possível salvar sua configuração: ${error.message}`, type: 'error' });
    }
  }

  async function saveEvent(form) {
    try {
      const isNew = !form.id;
      const record = { ...form, id: form.id || makeId('event'), recommendationStatus: form.recommendationStatus || '', source: form.source || 'manual' };
      delete record._isNew;
      const next = await api.upsertEvent({ ...record, _isNew: isNew }, data);
      next.events = next.events.map((item) => { const updated = { ...item }; delete updated._isNew; return updated; });
      setData(next); setEventModal(null);
      setToast({ message: isNew ? 'Compromisso adicionado à agenda.' : 'Compromisso atualizado.', type: 'success' });
    } catch (error) { setToast({ message: `Não foi possível salvar o compromisso: ${error.message}`, type: 'error' }); }
  }

  async function deleteEvent() {
    if (!pendingDelete) return;
    try {
      const next = await api.removeEvent(pendingDelete.id, data);
      next.feedback = data.feedback || [];
      setData(next); setToast({ message: 'Compromisso removido.', type: 'success' });
    } catch (error) { setToast({ message: `Não foi possível excluir: ${error.message}`, type: 'error' }); }
    setPendingDelete(null);
  }

  async function changeRecommendation(event, decision) {
    const chosen = decision === 'accepted'
      ? { ...event, bufferMinutes: Number(event.bufferMinutes) + Number(event.trafficDelay), trafficDelay: 0, recommendationStatus: 'accepted' }
      : decision === 'margin'
        ? { ...event, bufferMinutes: Number(event.bufferMinutes) + 5, bufferRecommendationStatus: 'accepted' }
        : { ...event, trafficDelay: 0, recommendationStatus: 'rejected' };
    const feedback = [...(data.feedback || []), { eventId: event.id, type: `recommendation-${decision}`, createdAt: new Date().toISOString() }];
    try {
      const next = await api.upsertEvent(chosen, data);
      next.feedback = feedback; setData(next);
      if (api.mode === 'local') await api.save(next);
      setToast({ message: decision === 'accepted' ? 'Horário atualizado na agenda.' : decision === 'margin' ? 'Margem de segurança adicionada.' : 'Horário original mantido.', type: 'success' });
    } catch (error) { setToast({ message: `Não foi possível atualizar a sugestão: ${error.message}`, type: 'error' }); }
  }

  async function recordOutcome(event, outcome) {
    const updatedEvent = { ...event, userFeedback: outcome };
    const feedback = [...(data.feedback || []), { eventId: event.id, type: outcome, createdAt: new Date().toISOString() }];
    try {
      const next = await api.upsertEvent(updatedEvent, data);
      next.feedback = feedback;
      if (api.mode === 'local') await api.save(next);
      setData(next); setToast({ message: 'Obrigado pelo retorno. Isso ajuda a melhorar seu planejamento.', type: 'success' });
    } catch (error) { setToast({ message: `Não foi possível registrar seu retorno: ${error.message}`, type: 'error' }); }
  }

  async function answerTecaChallenge(event, accepted) {
    const updated = { ...event, tecaChallengeStatus: accepted ? 'accepted' : 'declined', ...(accepted ? { bufferMinutes: Number(event.bufferMinutes || 0) + 5 } : {}) };
    try {
      const next = await api.upsertEvent(updated, data);
      if (api.mode === 'local') await api.save(next);
      setData(next);
      setToast({ message: accepted ? 'Desafio concluído: +5 min de margem e +10 XP.' : 'Combinado. A Teca mantém o plano original.', type: 'success' });
    } catch (error) { setToast({ message: `Não foi possível salvar a escolha: ${error.message}`, type: 'error' }); }
  }

  async function addPlace(place) {
    try {
      const next = await api.saveLocation({ ...place, id: makeId('place') }, data);
      setData(next); setToast({ message: 'Local salvo com sucesso.', type: 'success' });
    } catch (error) { setToast({ message: `Não foi possível salvar o local: ${error.message}`, type: 'error' }); }
  }

  async function removePlace(place) {
    const linked = data.events.some((event) => event.locationId === place.id);
    if (linked) {
      setToast({ message: 'Este local está ligado a um compromisso. Edite o compromisso antes de excluir o local.', type: 'error' });
      return;
    }
    try {
      const next = await api.removeLocation(place.id, data); setData(next);
      if (api.mode === 'local') await api.save(next);
      setToast({ message: 'Local excluído.', type: 'success' });
    } catch (error) { setToast({ message: `Não foi possível excluir: ${error.message}`, type: 'error' }); }
  }

  async function importData(payload) {
    const importedLocations = payload.locations.map((place) => ({ id: place.id || makeId('place'), name: String(place.name || 'Local importado').slice(0, 60), address: String(place.address || '').slice(0, 140) }));
    const locationMap = new Map();
    const locations = [...data.locations];
    importedLocations.forEach((place) => { const found = locations.find((existing) => existing.name === place.name && existing.address === place.address); if (found) locationMap.set(place.id, found.id); else { locations.push(place); locationMap.set(place.id, place.id); } });
    const events = payload.events.map((event) => {
      let locationId = event.locationId ? (locationMap.get(event.locationId) || (data.locations.some((place) => place.id === event.locationId) ? event.locationId : '')) : '';
      if (!locationId && event.importedLocation) {
        let place = locations.find((existing) => existing.address.toLowerCase() === event.importedLocation.toLowerCase());
        if (!place) { place = { id: makeId('place'), name: event.importedLocation.split(',')[0].slice(0, 60) || 'Local importado', address: event.importedLocation.slice(0, 140) }; locations.push(place); }
        locationId = place.id;
      }
      return { ...event, id: makeId('event'), locationId };
    });
    const next = { ...data, usuario: payload.usuario || data.usuario || '', alerta: payload.alerta ?? data.alerta ?? null, events: [...data.events, ...events], locations, preferences: { ...data.preferences, ...payload.preferences } };
    try {
      await api.save(next);
      setData(next); setToast({ message: `${events.length} ${events.length === 1 ? 'compromisso importado' : 'compromissos importados'} com sucesso.`, type: 'success' });
    } catch (error) { setToast({ message: `A importação não foi salva: ${error.message}`, type: 'error' }); }
  }

  async function saveAccount({ usuario, preferences }) {
    const next = { ...data, usuario, preferences };
    try { await api.save(next); setData(next); setAccountOpen(false); setToast({ message: 'Conta atualizada.', type: 'success' }); }
    catch (error) { setToast({ message: `Não foi possível salvar: ${error.message}`, type: 'error' }); }
  }

  function deleteAllData() { setPendingDelete({ all: true, title: 'apagar todos os dados deste navegador' }); }
  async function confirmDeleteAll() {
    const empty = { events: [], locations: [], preferences: {}, feedback: [] };
    try { await api.save(empty); setData(empty); setPendingDelete(null); setToast({ message: 'Seus dados foram apagados deste navegador.', type: 'success' }); }
    catch (error) { setToast({ message: `Não foi possível apagar os dados: ${error.message}`, type: 'error' }); }
  }

  const formattedToday = formatDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (loading) return <div className="loading-screen"><Brand /><div className="spinner-border" role="status"><span className="visually-hidden">Carregando seus dados</span></div><p>Preparando seu dia…</p></div>;

  if (!data.onboardingCompleted && !data.events.length) return <><Onboarding onComplete={completeOnboarding} /><Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} /></>;

  return <div className={`app-frame${data.preferences?.darkMode ? ' is-dark' : ''}`} data-theme={data.preferences?.darkMode ? 'dark' : 'light'}>
    <Sidebar active={view} onNavigate={(next) => { setView(next); setMenuOpen(false); }} open={menuOpen} onClose={() => setMenuOpen(false)} />
    <main className="main-area"><Topbar title={viewTitles[view]} date={formattedToday} onMenu={() => setMenuOpen(true)} onAccount={() => setAccountOpen(true)} showHome={view !== 'home'} onHome={() => setView('home')} />
      <div className="page-body">
        {view === 'home' && <Dashboard todayEvents={todayEvents} nextEvent={nextEvent} recommendations={recommendations} conflicts={eventConflicts} today={today} placeFull={placeFull} tecaLevel={tecaLevel} onNew={() => setEventModal({ mode: 'new' })} onEdit={setEventModal} onDelete={setPendingDelete} onFeedback={changeRecommendation} onEventFeedback={recordOutcome} onNavigate={setView} />}
        {view === 'journey' && <JourneyPage events={todayEvents} allEvents={sortedEvents} conflicts={eventConflicts} placeFull={placeFull} onNew={() => setEventModal({ mode: 'new' })} onEdit={setEventModal} onFeedback={recordOutcome} onTecaChallenge={answerTecaChallenge} />}
        {view === 'agenda' && <AgendaPage events={sortedEvents} conflicts={eventConflicts} placeFull={placeFull} filter={agendaDate} setFilter={setAgendaDate} onNew={() => setEventModal({ mode: 'new' })} onEdit={setEventModal} onDelete={setPendingDelete} onFeedback={changeRecommendation} onEventFeedback={recordOutcome} />}
        {view === 'places' && <LocationsPanel locations={data.locations} onSave={addPlace} onDelete={removePlace} />}
        {view === 'data' && <ImportExportPanel data={data} onImport={importData} onDeleteData={deleteAllData} onNavigate={setView} />}
      </div>
    </main>
    <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    {eventModal && <EventModal event={eventModal.mode === 'new' ? null : eventModal} initialDate={agendaDate || today} locations={data.locations} preferences={data.preferences} onClose={() => setEventModal(null)} onSave={saveEvent} />}
    <AssistantWidget todayEvents={todayEvents} events={sortedEvents} nextEvent={nextEvent} conflicts={eventConflicts} recommendations={recommendations} onFeedback={changeRecommendation} />
    {accountOpen && <AccountModal usuario={data.usuario} preferences={data.preferences} onClose={() => setAccountOpen(false)} onSave={saveAccount} onDeleteData={deleteAllData} eventCount={data.events.length} locationCount={data.locations.length} onExport={() => { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify({ ...data, exportedAt: new Date().toISOString(), format: 'viatempo-backup-v1' }, null, 2)], { type: 'application/json' })); link.download = 'viatempo-backup.json'; link.click(); URL.revokeObjectURL(link.href); }} />}
    {pendingDelete && <Modal title={pendingDelete.all ? 'Apagar seus dados?' : 'Excluir compromisso?'} eyebrow="CONFIRMAR AÇÃO" onClose={() => setPendingDelete(null)} footer={<><button className="btn btn-light" onClick={() => setPendingDelete(null)}>Cancelar</button><button className="btn btn-danger" onClick={pendingDelete.all ? confirmDeleteAll : deleteEvent}>{pendingDelete.all ? 'Apagar dados' : 'Excluir compromisso'}</button></>}><p>Confirme que deseja {pendingDelete.all ? pendingDelete.title : `remover “${pendingDelete.title}” da sua agenda`}. Essa ação não pode ser desfeita.</p></Modal>}
  </div>;
}

function tecaSuggestionText(event, type, plan) {
  const hour = Number((event.time || '12:00').slice(0, 2));
  const morning = ['O dia está começando: deixe o essencial separado e saia sem correria.', 'Uma conferida rápida no destino agora pode deixar sua manhã mais leve.', 'Vamos no ritmo certo: prepare suas coisas com um pouco de antecedência.'];
  const midday = ['Entre um compromisso e outro, reserve um respiro antes de seguir.', 'O caminho fica mais tranquilo quando a gente não aperta o relógio.', 'Se puder, confira o trajeto e mantenha uma pequena folga.'];
  const evening = ['Fim de dia pede calma: não deixe a saída para a última hora.', 'Vamos fechar o dia sem correria; uma margem extra ajuda bastante.', 'Separe um minuto para se organizar antes de seguir para o próximo lugar.'];
  const phrases = hour < 11 ? morning : hour < 17 ? midday : evening;
  const seed = [...(event.title || '')].reduce((sum, char) => sum + char.charCodeAt(0), hour) % phrases.length;
  if (type === 'delay') return `O trajeto pode levar mais ${plan.delay} min. ${phrases[seed]} Saída sugerida: ${formatTime(plan.recommendedDeparture)}.`;
  if (type === 'margin') return `${phrases[seed]} Que tal acrescentar cinco minutos de margem?`;
  return `${phrases[seed]} Confira este aviso antes de sair.`;
}

function Dashboard({ todayEvents, nextEvent, recommendations, conflicts, today, placeFull, tecaLevel, onNew, onEdit, onDelete, onFeedback, onEventFeedback, onNavigate }) {
  const plan = nextEvent && buildRecommendation(nextEvent);
  return <>
    <header className="page-intro"><div><h2>Meu dia</h2></div><div className="page-intro-actions"><button className="btn btn-dark" onClick={onNew}>＋ Novo compromisso</button></div></header>
    {nextEvent && <section className="next-plan"><div><span className="eyebrow">PRÓXIMO COMPROMISSO</span><h3>{nextEvent.title}</h3><p>{formatDate(nextEvent.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {nextEvent.time}{placeFull(nextEvent.locationId) || nextEvent.importedLocation ? ` · ${placeFull(nextEvent.locationId) || nextEvent.importedLocation}` : ''}</p>{nextEvent.date !== today && (conflicts.get(nextEvent.id) || []).map((title, index) => <p className="conflict-warning" role="note" key={`${title}-${index}`}>Conflita com “{title}”</p>)}</div><div className="next-plan-times"><span>Preparar <strong>{formatTime(plan.recommendedPrepare)}</strong></span><span>Sair <strong>{formatTime(plan.recommendedDeparture)}</strong></span></div></section>}
    {recommendations.length > 0 && <section className="recommendation-section" aria-labelledby="recommendation-title"><div className="section-heading"><h2 id="recommendation-title">Recomendações <span>{recommendations.length}</span></h2></div><div className="recommendation-list">{recommendations.map(({ event, plan: suggestion, type }) => {
      return <article className="recommendation-card" key={event.id}><div className="recommendation-copy"><TecaTip level={tecaLevel}>{tecaSuggestionText(event,type,suggestion)}</TecaTip><span>{formatDate(event.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {event.title}</span>{type === 'delay' && <p>O trajeto pode levar {suggestion.delay} min a mais. Mude a saída de <strong>{formatTime(suggestion.departure)}</strong> para <strong>{formatTime(suggestion.recommendedDeparture)}</strong>.</p>}{type === 'message' && <RecommendationMessage event={event} />}{type === 'margin' && <p>Sua margem é de {event.bufferMinutes} min. Adicione 5 min para ter mais tempo em caso de imprevisto.</p>}</div>{type === 'delay' && <><button className="btn btn-dark" onClick={() => onFeedback(event, 'accepted')}>Mudar horário</button><button className="recommendation-dismiss" onClick={() => onFeedback(event, 'rejected')}>Manter atual</button></>}{type === 'margin' && <button className="btn btn-dark" onClick={() => onFeedback(event, 'margin')}>Adicionar 5 min</button>}</article>;
    })}</div></section>}
    <section className="today-section"><div className="section-heading"><h2>Compromissos de hoje <span>{todayEvents.length}</span></h2><button className="text-button" onClick={() => onNavigate('agenda')}>Ver agenda →</button></div>
      {todayEvents.length ? <div className="event-list">{todayEvents.map((event) => <EventCard key={event.id} event={event} location={placeFull(event.locationId)} conflicts={conflicts.get(event.id)} onEdit={onEdit} onDelete={onDelete} onFeedback={onFeedback} onEventFeedback={onEventFeedback} />)}</div> : <EmptyState title="Nada planejado para hoje" text="Adicione um compromisso para criar seu primeiro plano." action={<button className="btn btn-outline-dark" onClick={onNew}>＋ Adicionar compromisso</button>} />}
    </section>
  </>;
}

function JourneyPage({ events, allEvents, conflicts, placeFull, onNew, onEdit, onFeedback, onTecaChallenge }) {
  const [tecaReply, setTecaReply] = useState('');
  const now = new Date();
  const past = events.filter((event) => new Date(`${event.date}T${event.time}`) < now);
  const recorded = past.filter((event) => event.userFeedback);
  const xp = allEvents.filter((event) => event.userFeedback).reduce((sum, event) => sum + (event.userFeedback === 'on-time' ? 30 : 10), 0) + allEvents.filter((event)=>event.tecaChallengeStatus==='accepted').length*10;
  const level = Math.floor(xp / 100) + 1;
  const avatar = level >= 6 ? { emoji: '🧙', name: 'Mestre do Tempo', skin: 'master' } : level >= 4 ? { emoji: '🦊', name: 'Guardião da Trilha', skin: 'guardian' } : level >= 2 ? { emoji: '🧭', name: 'Navegador', skin: 'navigator' } : { emoji: '🐣', name: 'Explorador', skin: 'explorer' };
  const islands = [{ xp: 0, name: 'Ilha do Começo', emoji: '🌱' }, { xp: 100, name: 'Ilha das Rotinas', emoji: '🌴' }, { xp: 300, name: 'Ilha da Pontualidade', emoji: '🏝️' }, { xp: 600, name: 'Arquipélago do Tempo', emoji: '🌋' }];
  const next = events.find((event) => new Date(`${event.date}T${event.time}`) >= now);
  const challengeEvent = events.find((event) => new Date(`${event.date}T${event.time}`) >= now && !event.tecaChallengeStatus);
  const challengePlan = challengeEvent && buildRecommendation(challengeEvent);
  return <div className="journey-page">
    <header className="page-intro"><div><span className="eyebrow">SEU DIA EM MOVIMENTO</span><h2>Jornada de hoje</h2></div><button className="btn btn-dark" onClick={onNew}>＋ Nova missão</button></header>
    <section className="journey-score"><div className="journey-level"><span className={`journey-avatar ${avatar.skin}`} aria-label={`Avatar: ${avatar.name}`}>{avatar.emoji}</span><div><span>NÍVEL {level} · {avatar.name}</span><strong>{xp} XP</strong></div></div><div className="journey-progress"><div><strong>{recorded.length} de {events.length}</strong><span>missões de hoje</span></div><div className="journey-progress-track"><i style={{width:`${events.length ? Math.round(recorded.length/events.length*100) : 0}%`}} /></div><small>{100-(xp%100)} XP para o próximo nível</small></div><div className="journey-next"><span>PRÓXIMO PASSO</span><strong>{next ? `${next.time} · ${next.title}` : events.length ? 'Dia concluído!' : 'Sua jornada começa aqui'}</strong></div></section>
    <section className="teca-journey-panel"><div className="teca-journey-intro"><TecaAvatar level={level} /><div><span>UM DESAFIO DA TECA</span><strong>{challengeEvent ? `Topa sair com 5 min extras para ${challengeEvent.title}?` : 'Seu plano está no ritmo certo.'}</strong><small>{challengeEvent ? `Adicionar margem à saída das ${challengeEvent.time} · +10 XP` : 'Volte quando tiver um próximo compromisso.'}</small></div></div>{challengeEvent?<div className="teca-challenge-actions"><button className="btn btn-sm btn-dark" onClick={()=>onTecaChallenge(challengeEvent,true)}>Aceitar desafio</button><button className="teca-skip" onClick={()=>onTecaChallenge(challengeEvent,false)}>Agora não</button></div>:<span className="teca-challenge-done">✓ Jornada em dia</span>}<div className="teca-qa"><span>Pergunte à Teca</span><div><button onClick={()=>setTecaReply(next?`Seu próximo passo é ${next.title}, às ${next.time}. A Teca sugere se preparar às ${formatTime(buildRecommendation(next).recommendedPrepare)} e sair às ${formatTime(buildRecommendation(next).recommendedDeparture)}.`:'Sua agenda está livre. Quando adicionar um compromisso, eu ajudo a planejar a saída.')}>Qual é meu próximo passo?</button><button onClick={()=>setTecaReply(events.length?`Hoje você tem ${events.length} compromisso${events.length===1?'':'s'}. ${recorded.length} já tiveram retorno registrado. Um passo de cada vez!`:'Ainda não há compromissos para hoje.')}>Como está minha jornada?</button></div>{tecaReply&&<p aria-live="polite">{tecaReply}</p>}</div></section>
    <section className="island-map"><div className="island-map-title"><h3>Ilhas da jornada</h3><span>Desbloqueadas com XP</span></div><div className="island-chain">{islands.map((island,index)=>{const unlocked=xp>=island.xp;return <div className={`island-stop${unlocked?' unlocked':''}`} key={island.name}><span className="island-link" aria-hidden="true">{index>0?'······':''}</span><div className="island-art">{unlocked?island.emoji:'🔒'}</div><strong>{island.name}</strong><small>{island.xp===0?'Desbloqueada':unlocked?'Conquistada':`${island.xp} XP`}</small></div>;})}</div></section>
    <div className="journey-heading"><h3>Trilha de compromissos</h3><span>{events.length} no roteiro</span></div>
    {!events.length ? <div className="journey-empty"><span>✧</span><h3>Uma página em branco</h3><p>Adicione o primeiro compromisso e monte sua trilha de hoje.</p><button className="btn btn-dark" onClick={onNew}>Criar compromisso</button></div> : <div className="journey-track">{events.map((event,index)=>{const done=Boolean(event.userFeedback);const isPast=new Date(`${event.date}T${event.time}`)<now;const plan=buildRecommendation(event);const obstacle=conflicts.get(event.id)?.length?'Conflito de horários':event.trafficDelay>=(event.alertThreshold||5)&&event.trafficDelay>0?'Atraso no trajeto':'';return <article className={`journey-stop${done?' is-done':''}${!done&&isPast?' needs-checkin':''}`} key={event.id}><div className="journey-node"><span>{done?'✓':String(index+1).padStart(2,'0')}</span></div><div className="journey-card"><div className="journey-card-top"><time>{event.time}</time><span className="journey-status">{done?(event.userFeedback==='on-time'?'No horário · +30 XP':'Cheguei · +10 XP'):isPast?'Registrar chegada':next?.id===event.id?'Próxima parada':'A caminho'}</span></div><h4>{event.title}</h4><p>{placeFull(event.locationId)||event.importedLocation||'Sem destino'}</p>{obstacle&&<div className="journey-obstacle"><span aria-hidden="true">⚠</span><div><strong>Obstáculo na trilha</strong><small>{obstacle}{conflicts.get(event.id)?.length?` · ${conflicts.get(event.id).join(', ')}`:''}{event.trafficDelay>0?` · +${event.trafficDelay} min`:''}</small></div></div>}{!done&&!isPast&&<div className="journey-plan"><TecaTip level={level}>Saída {formatTime(plan.recommendedDeparture)} · preparação {formatTime(plan.recommendedPrepare)}</TecaTip></div>}<div className="journey-actions"><button className="journey-edit" onClick={()=>onEdit(event)}>Editar</button>{isPast&&!done&&<><button className="btn btn-sm btn-dark" onClick={()=>onFeedback(event,'on-time')}>Cheguei no horário</button><button className="journey-late" onClick={()=>onFeedback(event,'late')}>Com atraso</button></>}</div></div></article>;})}</div>}
  </div>;
}

function AgendaPage({ events, conflicts, placeFull, filter, setFilter, onNew, onEdit, onDelete, onFeedback, onEventFeedback }) {
  const [mode, setMode] = useState('week');
  const [anchor, setAnchor] = useState(() => filter || todayISO());
  const selectedDate = dateFromISO(anchor);
  const shown = filter ? events.filter((event) => event.date === filter) : events;
  const days = mode === 'day' ? [startOfDay(selectedDate)] : weekDays(selectedDate);
  const periodTitle = mode === 'month'
    ? selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : mode === 'day' ? formatDate(anchor, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : `${formatDate(dateToISO(days[0]), { day: 'numeric', month: 'short' })} – ${formatDate(dateToISO(days[6]), { day: 'numeric', month: 'short', year: 'numeric' })}`;
  function shiftPeriod(direction) {
    const next = new Date(selectedDate);
    if (mode === 'month') next.setMonth(next.getMonth() + direction);
    else next.setDate(next.getDate() + direction * (mode === 'day' ? 1 : 7));
    setAnchor(dateToISO(next)); setFilter('');
  }
  function jumpToDate(value) { if (!value) return; setAnchor(value); setFilter(value); setMode('day'); }
  function openEvent(event) { onEdit(event); }
  return <><header className="page-intro"><div><span className="eyebrow">SEUS COMPROMISSOS</span><h2>Agenda</h2></div><button className="btn btn-dark" onClick={() => onNew()}>＋ Novo compromisso</button></header>
    <section className="agenda-panel calendar-panel">
      <div className="calendar-toolbar"><div className="calendar-navigation"><button className="calendar-arrow" aria-label="Período anterior" onClick={() => shiftPeriod(-1)}>‹</button><button className="calendar-arrow" aria-label="Próximo período" onClick={() => shiftPeriod(1)}>›</button><button className="btn btn-outline-dark calendar-today" onClick={() => { setAnchor(todayISO()); setFilter(''); }}>Hoje</button><h3>{periodTitle}</h3></div><div className="calendar-controls"><div className="calendar-modes" role="tablist" aria-label="Visualização da agenda">{[['week','Semana'],['month','Mês'],['list','Lista']].map(([value,label])=><button key={value} role="tab" aria-selected={mode===value} className={mode===value?'active':''} onClick={()=>setMode(value)}>{label}</button>)}</div><label className="visually-hidden" htmlFor="agenda-date">Ir para uma data</label><input id="agenda-date" type="date" className="form-control calendar-date-input" value={filter || anchor} onChange={(e)=>jumpToDate(e.target.value)} /></div></div>
      {mode === 'week' && <WeekCalendar days={days} events={events} onEvent={openEvent} onNew={onNew} />}
      {mode === 'day' && <WeekCalendar days={days} events={events} onEvent={openEvent} onNew={onNew} single />}
      {mode === 'month' && <MonthCalendar date={selectedDate} events={events} onSelect={(day)=>{setAnchor(dateToISO(day));setFilter(dateToISO(day));setMode('day');}} onEvent={openEvent} />}
      {mode === 'list' && <div className="calendar-list-view">{filter && <div className="agenda-toolbar"><h3>{formatDate(filter)}</h3><button className="clear-filter" onClick={()=>setFilter('')}>Limpar data</button></div>}{shown.length ? <div className="event-list">{shown.map((event)=><EventCard key={event.id} event={event} location={placeFull(event.locationId)} conflicts={conflicts.get(event.id)} onEdit={onEdit} onDelete={onDelete} onFeedback={onFeedback} onEventFeedback={onEventFeedback} />)}</div> : <EmptyState title={filter?'Nenhum compromisso nessa data':'Sua agenda está vazia'} text={filter?'Escolha outra data ou limpe o filtro.':'Adicione um compromisso para começar.'} action={<button className="btn btn-outline-dark" onClick={()=>onNew()}>＋ Novo compromisso</button>} />}</div>}
    </section></>;
}

const dateFromISO = (iso) => { const [year, month, day] = iso.split('-').map(Number); return new Date(year, month - 1, day); };
const dateToISO = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
function weekDays(date) { const start=startOfDay(date); start.setDate(start.getDate()-((start.getDay()+6)%7)); return Array.from({length:7},(_,index)=>{const day=new Date(start);day.setDate(start.getDate()+index);return day;}); }

function WeekCalendar({ days, events, onEvent, onNew, single=false }) {
  const startHour = 7, endHour = 22, hourHeight = 46;
  const today = todayISO();
  const hasEvents = events.some((event) => days.some((day) => dateToISO(day) === event.date));
  if (!hasEvents) return <div className="calendar-empty"><span aria-hidden="true">◷</span><strong>Nenhum compromisso neste período</strong><button className="btn btn-outline-dark" onClick={onNew}>＋ Adicionar compromisso</button></div>;
  return <div className={`week-calendar${single?' single-day':''}`}><div className="week-calendar-head"><div className="week-time-gutter" />{days.map((day)=><div className={`week-day-head${dateToISO(day)===today?' is-today':''}`} key={dateToISO(day)}><span>{day.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')}</span><strong>{day.getDate()}</strong></div>)}</div><div className="week-calendar-scroll"><div className="week-calendar-body"><div className="week-time-gutter">{Array.from({length:endHour-startHour},(_,i)=><span key={i} style={{top:i*hourHeight-7}}>{String(startHour+i).padStart(2,'0')}:00</span>)}</div>{days.map((day)=><div className={`week-day-column${dateToISO(day)===today?' is-today':''}`} key={dateToISO(day)}>{Array.from({length:endHour-startHour},(_,i)=><div className="week-hour-line" style={{top:i*hourHeight}} key={i} />)}{events.filter((event)=>event.date===dateToISO(day)).map((event)=>{const [hour,minute]=event.time.split(':').map(Number);const top=((hour-startHour)+(minute/60))*hourHeight;const height=hourHeight;return <button className="week-event" key={event.id} style={{top:`${Math.max(0,top)}px`,height:`${height-4}px`}} onClick={()=>onEvent(event)} title={`${event.title}, ${event.time}`}><strong>{event.time}</strong><span>{event.title}</span></button>;})}</div>)}</div></div></div>;
}

function MonthCalendar({ date, events, onSelect, onEvent }) {
  const first=new Date(date.getFullYear(),date.getMonth(),1);const offset=(first.getDay()+6)%7;const start=new Date(first);start.setDate(first.getDate()-offset);const days=Array.from({length:42},(_,i)=>{const day=new Date(start);day.setDate(start.getDate()+i);return day;});
  return <div className="month-calendar"><div className="month-weekdays">{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map((day)=><span key={day}>{day}</span>)}</div><div className="month-grid">{days.map((day)=>{const iso=dateToISO(day);const dayEvents=events.filter((event)=>event.date===iso).sort((a,b)=>a.time.localeCompare(b.time));return <div className={`month-cell${day.getMonth()!==date.getMonth()?' outside':''}${iso===todayISO()?' is-today':''}`} key={iso}><button className="month-date" onClick={()=>onSelect(day)} aria-label={`Ver ${formatDate(iso)} em detalhe`}>{day.getDate()}</button><div className="month-event-list">{dayEvents.slice(0,3).map((event)=><button className="month-event" key={event.id} onClick={()=>onEvent(event)}><time>{event.time}</time><span>{event.title}</span></button>)}{dayEvents.length>3&&<button className="month-more" onClick={()=>onSelect(day)}>+{dayEvents.length-3} mais</button>}</div></div>;})}</div></div>;
}
