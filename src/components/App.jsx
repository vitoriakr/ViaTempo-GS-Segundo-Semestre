import React, { useEffect, useMemo, useState } from 'react';
import { api, makeId } from '../services/api';
import { todayISO, buildRecommendation, findScheduleConflicts, formatDate, formatTime } from '../utils/schedule';
import { Sidebar, Topbar, Toast, Modal, Brand } from './Primitives';
import { EmptyState, EventCard, EventModal, RecommendationMessage } from './EventComponents';
import { ImportExportPanel, LocationsPanel, PreferencesModal } from './DataComponents';
import Onboarding from './Onboarding';
import AssistantWidget from './Assistant';

const viewTitles = { home: 'Meu dia', agenda: 'Minha agenda', places: 'Meus locais', data: 'Seus dados' };

export default function App() {
  const [data, setData] = useState({ events: [], locations: [], preferences: {}, feedback: [] });
  const [view, setView] = useState('home');
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [eventModal, setEventModal] = useState(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
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

  const sortedEvents = useMemo(() => [...data.events].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)), [data.events]);
  const eventConflicts = useMemo(() => findScheduleConflicts(sortedEvents), [sortedEvents]);
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

  async function savePreferences(preferences) {
    const next = { ...data, preferences };
    try { await api.save(next); setData(next); setPreferencesOpen(false); setToast({ message: 'Preferências atualizadas.', type: 'success' }); }
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

  return <div className="app-frame">
    <Sidebar active={view} onNavigate={(next) => { setView(next); setMenuOpen(false); }} open={menuOpen} onClose={() => setMenuOpen(false)} />
    <main className="main-area"><Topbar title={viewTitles[view]} date={formattedToday} onMenu={() => setMenuOpen(true)} onPreferences={() => setPreferencesOpen(true)} />
      <div className="page-body">
        {view === 'home' && <Dashboard todayEvents={todayEvents} nextEvent={nextEvent} recommendations={recommendations} conflicts={eventConflicts} today={today} placeFull={placeFull} onNew={() => setEventModal({ mode: 'new' })} onEdit={setEventModal} onDelete={setPendingDelete} onFeedback={changeRecommendation} onEventFeedback={recordOutcome} onNavigate={setView} />}
        {view === 'agenda' && <AgendaPage events={sortedEvents} conflicts={eventConflicts} placeFull={placeFull} filter={agendaDate} setFilter={setAgendaDate} onNew={() => setEventModal({ mode: 'new' })} onEdit={setEventModal} onDelete={setPendingDelete} onFeedback={changeRecommendation} onEventFeedback={recordOutcome} />}
        {view === 'places' && <LocationsPanel locations={data.locations} onSave={addPlace} onDelete={removePlace} />}
        {view === 'data' && <ImportExportPanel data={data} onImport={importData} onDeleteData={deleteAllData} />}
      </div>
    </main>
    <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    {eventModal && <EventModal event={eventModal.mode === 'new' ? null : eventModal} initialDate={agendaDate || today} locations={data.locations} preferences={data.preferences} onClose={() => setEventModal(null)} onSave={saveEvent} />}
    <AssistantWidget todayEvents={todayEvents} events={sortedEvents} nextEvent={nextEvent} conflicts={eventConflicts} recommendations={recommendations} onFeedback={changeRecommendation} />
    {preferencesOpen && <PreferencesModal preferences={data.preferences} onClose={() => setPreferencesOpen(false)} onSave={savePreferences} />}
    {pendingDelete && <Modal title={pendingDelete.all ? 'Apagar seus dados?' : 'Excluir compromisso?'} eyebrow="CONFIRMAR AÇÃO" onClose={() => setPendingDelete(null)} footer={<><button className="btn btn-light" onClick={() => setPendingDelete(null)}>Cancelar</button><button className="btn btn-danger" onClick={pendingDelete.all ? confirmDeleteAll : deleteEvent}>{pendingDelete.all ? 'Apagar dados' : 'Excluir compromisso'}</button></>}><p>Confirme que deseja {pendingDelete.all ? pendingDelete.title : `remover “${pendingDelete.title}” da sua agenda`}. Essa ação não pode ser desfeita.</p></Modal>}
  </div>;
}

function Dashboard({ todayEvents, nextEvent, recommendations, conflicts, today, placeFull, onNew, onEdit, onDelete, onFeedback, onEventFeedback, onNavigate }) {
  const plan = nextEvent && buildRecommendation(nextEvent);
  return <>
    <header className="page-intro"><div><h2>Meu dia</h2></div><div className="page-intro-actions"><button className="btn btn-dark" onClick={onNew}>＋ Novo compromisso</button></div></header>
    {nextEvent && <section className="next-plan"><div><span className="eyebrow">PRÓXIMO COMPROMISSO</span><h3>{nextEvent.title}</h3><p>{formatDate(nextEvent.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {nextEvent.time}{placeFull(nextEvent.locationId) || nextEvent.importedLocation ? ` · ${placeFull(nextEvent.locationId) || nextEvent.importedLocation}` : ''}</p>{nextEvent.date !== today && (conflicts.get(nextEvent.id) || []).map((title, index) => <p className="conflict-warning" role="note" key={`${title}-${index}`}>Conflita com “{title}”</p>)}</div><div className="next-plan-times"><span>Preparar <strong>{formatTime(plan.recommendedPrepare)}</strong></span><span>Sair <strong>{formatTime(plan.recommendedDeparture)}</strong></span></div></section>}
    {recommendations.length > 0 && <section className="recommendation-section" aria-labelledby="recommendation-title"><div className="section-heading"><h2 id="recommendation-title">Recomendações <span>{recommendations.length}</span></h2></div><div className="recommendation-list">{recommendations.map(({ event, plan: suggestion, type }) => {
      return <article className="recommendation-card" key={event.id}><div className="recommendation-copy"><span>{formatDate(event.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {event.title}</span>{type === 'delay' && <p>O trajeto pode levar {suggestion.delay} min a mais. Mude a saída de <strong>{formatTime(suggestion.departure)}</strong> para <strong>{formatTime(suggestion.recommendedDeparture)}</strong>.</p>}{type === 'message' && <RecommendationMessage event={event} />}{type === 'margin' && <p>Sua margem é de {event.bufferMinutes} min. Adicione 5 min para ter mais tempo em caso de imprevisto.</p>}</div>{type === 'delay' && <><button className="btn btn-dark" onClick={() => onFeedback(event, 'accepted')}>Mudar horário</button><button className="recommendation-dismiss" onClick={() => onFeedback(event, 'rejected')}>Manter atual</button></>}{type === 'margin' && <button className="btn btn-dark" onClick={() => onFeedback(event, 'margin')}>Adicionar 5 min</button>}</article>;
    })}</div></section>}
    <section className="today-section"><div className="section-heading"><h2>Compromissos de hoje <span>{todayEvents.length}</span></h2><button className="text-button" onClick={() => onNavigate('agenda')}>Ver agenda →</button></div>
      {todayEvents.length ? <div className="event-list">{todayEvents.map((event) => <EventCard key={event.id} event={event} location={placeFull(event.locationId)} conflicts={conflicts.get(event.id)} onEdit={onEdit} onDelete={onDelete} onFeedback={onFeedback} onEventFeedback={onEventFeedback} />)}</div> : <EmptyState title="Nada planejado para hoje" text="Adicione um compromisso para criar seu primeiro plano." action={<button className="btn btn-outline-dark" onClick={onNew}>＋ Adicionar compromisso</button>} />}
    </section>
  </>;
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
      <div className="calendar-toolbar"><div className="calendar-navigation"><button className="calendar-arrow" aria-label="Período anterior" onClick={() => shiftPeriod(-1)}>‹</button><button className="calendar-arrow" aria-label="Próximo período" onClick={() => shiftPeriod(1)}>›</button><button className="btn btn-outline-dark calendar-today" onClick={() => { setAnchor(todayISO()); setFilter(''); }}>Hoje</button><h3>{periodTitle}</h3></div><div className="calendar-controls"><div className="calendar-modes" role="tablist" aria-label="Visualização da agenda">{[['day','Dia'],['week','Semana'],['month','Mês'],['list','Lista']].map(([value,label])=><button key={value} role="tab" aria-selected={mode===value} className={mode===value?'active':''} onClick={()=>setMode(value)}>{label}</button>)}</div><label className="visually-hidden" htmlFor="agenda-date">Ir para uma data</label><input id="agenda-date" type="date" className="form-control calendar-date-input" value={filter || anchor} onChange={(e)=>jumpToDate(e.target.value)} /></div></div>
      {mode === 'week' && <WeekCalendar days={days} events={events} onEvent={openEvent} />}
      {mode === 'day' && <WeekCalendar days={days} events={events} onEvent={openEvent} single />}
      {mode === 'month' && <MonthCalendar date={selectedDate} events={events} onSelect={(day)=>{setAnchor(dateToISO(day));setFilter(dateToISO(day));setMode('day');}} onEvent={openEvent} />}
      {mode === 'list' && <div className="calendar-list-view">{filter && <div className="agenda-toolbar"><h3>{formatDate(filter)}</h3><button className="clear-filter" onClick={()=>setFilter('')}>Limpar data</button></div>}{shown.length ? <div className="event-list">{shown.map((event)=><EventCard key={event.id} event={event} location={placeFull(event.locationId)} conflicts={conflicts.get(event.id)} onEdit={onEdit} onDelete={onDelete} onFeedback={onFeedback} onEventFeedback={onEventFeedback} />)}</div> : <EmptyState title={filter?'Nenhum compromisso nessa data':'Sua agenda está vazia'} text={filter?'Escolha outra data ou limpe o filtro.':'Adicione um compromisso para começar.'} action={<button className="btn btn-outline-dark" onClick={()=>onNew()}>＋ Novo compromisso</button>} />}</div>}
    </section></>;
}

const dateFromISO = (iso) => { const [year, month, day] = iso.split('-').map(Number); return new Date(year, month - 1, day); };
const dateToISO = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
function weekDays(date) { const start=startOfDay(date); start.setDate(start.getDate()-((start.getDay()+6)%7)); return Array.from({length:7},(_,index)=>{const day=new Date(start);day.setDate(start.getDate()+index);return day;}); }

function WeekCalendar({ days, events, onEvent, single=false }) {
  const startHour = 6, endHour = 23, hourHeight = 58;
  const today = todayISO();
  return <div className={`week-calendar${single?' single-day':''}`}><div className="week-calendar-head"><div className="week-time-gutter" />{days.map((day)=><div className={`week-day-head${dateToISO(day)===today?' is-today':''}`} key={dateToISO(day)}><span>{day.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')}</span><strong>{day.getDate()}</strong></div>)}</div><div className="week-calendar-scroll"><div className="week-calendar-body"><div className="week-time-gutter">{Array.from({length:endHour-startHour},(_,i)=><span key={i} style={{top:i*hourHeight-7}}>{String(startHour+i).padStart(2,'0')}:00</span>)}</div>{days.map((day)=><div className={`week-day-column${dateToISO(day)===today?' is-today':''}`} key={dateToISO(day)}>{Array.from({length:endHour-startHour},(_,i)=><div className="week-hour-line" style={{top:i*hourHeight}} key={i} />)}{events.filter((event)=>event.date===dateToISO(day)).map((event)=>{const [hour,minute]=event.time.split(':').map(Number);const top=((hour-startHour)+(minute/60))*hourHeight;const height=hourHeight;return <button className="week-event" key={event.id} style={{top:`${Math.max(0,top)}px`,height:`${height-4}px`}} onClick={()=>onEvent(event)} title={`${event.title}, ${event.time}`}><strong>{event.time}</strong><span>{event.title}</span></button>;})}</div>)}</div></div></div>;
}

function MonthCalendar({ date, events, onSelect, onEvent }) {
  const first=new Date(date.getFullYear(),date.getMonth(),1);const offset=(first.getDay()+6)%7;const start=new Date(first);start.setDate(first.getDate()-offset);const days=Array.from({length:42},(_,i)=>{const day=new Date(start);day.setDate(start.getDate()+i);return day;});
  return <div className="month-calendar"><div className="month-weekdays">{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map((day)=><span key={day}>{day}</span>)}</div><div className="month-grid">{days.map((day)=>{const iso=dateToISO(day);const dayEvents=events.filter((event)=>event.date===iso).sort((a,b)=>a.time.localeCompare(b.time));return <div className={`month-cell${day.getMonth()!==date.getMonth()?' outside':''}${iso===todayISO()?' is-today':''}`} key={iso}><button className="month-date" onClick={()=>onSelect(day)} aria-label={`Ver ${formatDate(iso)} em detalhe`}>{day.getDate()}</button><div className="month-event-list">{dayEvents.slice(0,3).map((event)=><button className="month-event" key={event.id} onClick={()=>onEvent(event)}><time>{event.time}</time><span>{event.title}</span></button>)}{dayEvents.length>3&&<button className="month-more" onClick={()=>onSelect(day)}>+{dayEvents.length-3} mais</button>}</div></div>;})}</div></div>;
}
