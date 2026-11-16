import React, { useEffect, useMemo, useState } from 'react';
import { api, makeId } from '../services/api';
import { todayISO, buildRecommendation, formatDate, formatTime } from '../utils/schedule';
import { Sidebar, Topbar, Toast, Modal, Brand } from './Primitives';
import { EmptyState, EventCard, EventModal } from './EventComponents';
import { ImportExportPanel, LocationsPanel, PreferencesModal } from './DataComponents';
import Onboarding from './Onboarding';

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
  const todayEvents = sortedEvents.filter((event) => event.date === today);
  const upcoming = sortedEvents.filter((event) => new Date(`${event.date}T${event.time}`) >= new Date());
  const nextEvent = upcoming[0];
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
      : { ...event, trafficDelay: 0, recommendationStatus: 'rejected' };
    const feedback = [...(data.feedback || []), { eventId: event.id, type: `recommendation-${decision}`, createdAt: new Date().toISOString() }];
    try {
      const next = await api.upsertEvent(chosen, data);
      next.feedback = feedback; setData(next);
      if (api.mode === 'local') await api.save(next);
      setToast({ message: decision === 'accepted' ? 'Sugestão aceita. O novo horário já está na agenda.' : 'Tudo certo. Mantivemos seu horário original.', type: 'success' });
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
        {view === 'home' && <Dashboard todayEvents={todayEvents} nextEvent={nextEvent} date={formattedToday} placeFull={placeFull} onNew={() => setEventModal({ mode: 'new' })} onEdit={setEventModal} onDelete={setPendingDelete} onFeedback={changeRecommendation} onEventFeedback={recordOutcome} onNavigate={setView} />}
        {view === 'agenda' && <AgendaPage events={sortedEvents} placeFull={placeFull} filter={agendaDate} setFilter={setAgendaDate} onNew={() => setEventModal({ mode: 'new' })} onEdit={setEventModal} onDelete={setPendingDelete} onFeedback={changeRecommendation} onEventFeedback={recordOutcome} />}
        {view === 'places' && <LocationsPanel locations={data.locations} onSave={addPlace} onDelete={removePlace} />}
        {view === 'data' && <ImportExportPanel data={data} onImport={importData} onDeleteData={deleteAllData} />}
      </div>
      <footer className="app-footer"><span>ViaTempo <span className="footer-separator">·</span> Planeje com calma.</span><span>{api.mode === 'local' ? 'Dados salvos neste navegador' : 'API conectada'}</span></footer>
    </main>
    <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    {eventModal && <EventModal event={eventModal.mode === 'new' ? null : eventModal} initialDate={agendaDate || today} locations={data.locations} preferences={data.preferences} onClose={() => setEventModal(null)} onSave={saveEvent} />}
    {preferencesOpen && <PreferencesModal preferences={data.preferences} onClose={() => setPreferencesOpen(false)} onSave={savePreferences} />}
    {pendingDelete && <Modal title={pendingDelete.all ? 'Apagar seus dados?' : 'Excluir compromisso?'} eyebrow="CONFIRMAR AÇÃO" onClose={() => setPendingDelete(null)} footer={<><button className="btn btn-light" onClick={() => setPendingDelete(null)}>Cancelar</button><button className="btn btn-danger" onClick={pendingDelete.all ? confirmDeleteAll : deleteEvent}>{pendingDelete.all ? 'Apagar dados' : 'Excluir compromisso'}</button></>}><p>Confirme que deseja {pendingDelete.all ? pendingDelete.title : `remover “${pendingDelete.title}” da sua agenda`}. Essa ação não pode ser desfeita.</p></Modal>}
  </div>;
}

function Dashboard({ todayEvents, nextEvent, date, placeFull, onNew, onEdit, onDelete, onFeedback, onEventFeedback, onNavigate }) {
  const plan = nextEvent && buildRecommendation(nextEvent);
  return <>
    <header className="page-intro"><div><span className="eyebrow">{date}</span><h2>Meu dia</h2></div><button className="btn btn-dark" onClick={onNew}>＋ Novo compromisso</button></header>
    {nextEvent && <section className="next-plan"><div><span className="eyebrow">PRÓXIMO COMPROMISSO</span><h3>{nextEvent.title}</h3><p>{formatDate(nextEvent.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {nextEvent.time}{placeFull(nextEvent.locationId) || nextEvent.importedLocation ? ` · ${placeFull(nextEvent.locationId) || nextEvent.importedLocation}` : ''}</p>{nextEvent.message && <p className="event-message">{nextEvent.message}</p>}</div><div className="next-plan-times"><span>Preparar <strong>{formatTime(plan.recommendedPrepare)}</strong></span><span>Sair <strong>{formatTime(plan.recommendedDeparture)}</strong></span></div>{plan.change && !nextEvent.recommendationStatus && <div className="next-plan-alert"><span>A estimativa adiciona {plan.delay} min.</span><button className="btn btn-dark btn-sm" onClick={() => onFeedback(nextEvent, 'accepted')}>Aceitar sugestão</button><button className="btn btn-light btn-sm" onClick={() => onFeedback(nextEvent, 'rejected')}>Manter horário</button></div>}</section>}
    <section className="today-section"><div className="section-heading"><h2>Compromissos de hoje <span>{todayEvents.length}</span></h2><button className="text-button" onClick={() => onNavigate('agenda')}>Ver agenda →</button></div>
      {todayEvents.length ? <div className="event-list">{todayEvents.map((event) => <EventCard key={event.id} event={event} location={placeFull(event.locationId)} onEdit={onEdit} onDelete={onDelete} onFeedback={onFeedback} onEventFeedback={onEventFeedback} />)}</div> : <EmptyState title="Nada planejado para hoje" text="Adicione um compromisso para criar seu primeiro plano." action={<button className="btn btn-outline-dark" onClick={onNew}>＋ Adicionar compromisso</button>} />}
    </section>
  </>;
}

function AgendaPage({ events, placeFull, filter, setFilter, onNew, onEdit, onDelete, onFeedback, onEventFeedback }) {
  const shown = filter ? events.filter((event) => event.date === filter) : events;
  return <><header className="page-intro"><div><span className="eyebrow">SEUS COMPROMISSOS</span><h2>Agenda</h2></div><button className="btn btn-dark" onClick={onNew}>＋ Novo compromisso</button></header><section className="agenda-panel"><div className="agenda-toolbar"><h3>{filter ? formatDate(filter) : `${events.length} compromissos`}</h3><div className="filter-control"><label htmlFor="agenda-date">Filtrar por data</label><input id="agenda-date" type="date" className="form-control" value={filter} onChange={(event) => setFilter(event.target.value)} />{filter && <button className="clear-filter" onClick={() => setFilter('')}>Limpar filtro</button>}</div></div>
    {shown.length ? <div className="event-list">{shown.map((event) => <EventCard key={event.id} event={event} location={placeFull(event.locationId)} onEdit={onEdit} onDelete={onDelete} onFeedback={onFeedback} onEventFeedback={onEventFeedback} />)}</div> : <EmptyState title={filter ? 'Nenhum compromisso nessa data' : 'Sua agenda está vazia'} text={filter ? 'Escolha outra data ou limpe o filtro.' : 'Adicione um compromisso para começar.'} action={<button className="btn btn-outline-dark" onClick={onNew}>＋ Novo compromisso</button>} />}
  </section></>;
}
