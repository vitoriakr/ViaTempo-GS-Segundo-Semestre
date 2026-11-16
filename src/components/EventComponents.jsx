import React, { useState } from 'react';
import { calculateSchedule, buildRecommendation, formatDate, formatTime } from '../utils/schedule';
import { Modal } from './Primitives';

export function EventCard({ event, location, onEdit, onDelete, onFeedback, onEventFeedback }) {
  const plan = calculateSchedule(event);
  const suggestion = buildRecommendation(event);
  const decided = Boolean(event.recommendationStatus);
  const isPast = new Date(`${event.date}T${event.time}`) < new Date();

  return <article className="event-card">
    <time className="event-time" dateTime={`${event.date}T${event.time}`}>
      <strong>{event.time}</strong><span>{formatDate(event.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
    </time>
    <div className="event-summary"><h3>{event.title}</h3><p>{location || event.importedLocation || 'Sem destino'}</p></div>
    <div className="event-actions"><button className="icon-button" onClick={() => onEdit(event)} aria-label={`Editar ${event.title}`}>Editar</button><button className="icon-button" onClick={() => onDelete(event)} aria-label={`Excluir ${event.title}`}>Excluir</button></div>
    <details className="event-details"><summary>Ver planejamento <span>Preparar {formatTime(plan.prepare)} · sair {formatTime(plan.departure)}</span></summary>
      <div className="event-details-body"><div className="plan-facts"><span>Preparação <strong>{event.prepMinutes} min</strong></span><span>Deslocamento <strong>{event.travelMinutes} min</strong></span><span>Margem <strong>{event.bufferMinutes} min</strong></span></div>
        {suggestion.change && !decided && <div className="suggestion"><p>A estimativa cadastrada adiciona {suggestion.delay} min. Sair às <strong>{formatTime(suggestion.recommendedDeparture)}</strong>?</p><button className="btn btn-dark btn-sm" onClick={() => onFeedback(event, 'accepted')}>Aceitar</button><button className="btn btn-light btn-sm" onClick={() => onFeedback(event, 'rejected')}>Manter horário</button></div>}
        {decided && <p className="inline-status">{event.recommendationStatus === 'accepted' ? 'Sugestão aceita' : 'Horário original mantido'}</p>}
        {isPast && !event.userFeedback && <div className="event-outcome"><span>Você chegou no horário?</span><button onClick={() => onEventFeedback(event, 'on-time')}>Sim</button><button onClick={() => onEventFeedback(event, 'late')}>Não</button></div>}
        {event.userFeedback && <p className="inline-status">Retorno registrado: {event.userFeedback === 'on-time' ? 'no horário' : 'com atraso'}</p>}
      </div>
    </details>
  </article>;
}

const blankEvent = (preferences, date) => ({ title: '', date, time: '', locationId: '', travelMinutes: 30, prepMinutes: preferences.defaultPrepMinutes ?? 30, bufferMinutes: preferences.defaultBufferMinutes ?? 15, trafficDelay: 0, alertThreshold: preferences.alertThreshold ?? 5 });

export function EventModal({ event, locations, preferences, initialDate, onClose, onSave }) {
  const [form, setForm] = useState(event ? { ...event } : blankEvent(preferences, initialDate));
  const [error, setError] = useState('');
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.date || !form.time) return setError('Preencha o compromisso, a data e o horário.');
    const fields = ['travelMinutes', 'prepMinutes', 'bufferMinutes', 'trafficDelay'];
    if (fields.some((key) => Number(form[key]) < 0 || !Number.isFinite(Number(form[key])))) return setError('Os tempos devem ser iguais ou maiores que zero.');
    await onSave({ ...form, id: event?.id, title: form.title.trim(), ...Object.fromEntries(fields.map((key) => [key, Number(form[key])])) });
  }

  return <Modal title={event ? 'Editar compromisso' : 'Novo compromisso'} onClose={onClose} footer={<><button className="btn btn-light" onClick={onClose}>Cancelar</button><button className="btn btn-dark" form="event-form">Salvar</button></>}>
    <form id="event-form" onSubmit={submit} noValidate>
      {error && <p className="form-alert" role="alert">{error}</p>}
      <label className="form-label" htmlFor="event-title">Compromisso</label><input id="event-title" className="form-control mb-3" autoFocus maxLength="120" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Ex.: Aula ou reunião" />
      <div className="row g-3"><div className="col-6"><label className="form-label" htmlFor="event-date">Data</label><input id="event-date" type="date" className="form-control" value={form.date} onChange={(e) => update('date', e.target.value)} /></div><div className="col-6"><label className="form-label" htmlFor="event-time">Horário</label><input id="event-time" type="time" className="form-control" value={form.time} onChange={(e) => update('time', e.target.value)} /></div></div>
      <label className="form-label mt-3" htmlFor="event-location">Destino</label><select id="event-location" className="form-select" value={form.locationId || ''} onChange={(e) => update('locationId', e.target.value)}><option value="">Sem destino ou remoto</option>{locations.map((place) => <option key={place.id} value={place.id}>{place.name} · {place.address}</option>)}</select>
      <details className="advanced-fields" open={Boolean(event)}><summary>Ajustar tempos e recomendação</summary><div className="row g-3 mt-1">{[['travelMinutes', 'Deslocamento'], ['prepMinutes', 'Preparação'], ['bufferMinutes', 'Margem']].map(([key, label]) => <div className="col-4" key={key}><label className="form-label" htmlFor={key}>{label} (min)</label><input id={key} className="form-control" type="number" min="0" value={form[key]} onChange={(e) => update(key, e.target.value)} disabled={key === 'travelMinutes' && !form.locationId && !form.importedLocation} /></div>)}<div className="col-6"><label className="form-label" htmlFor="traffic-delay">Atraso simulado (min)</label><input id="traffic-delay" className="form-control" type="number" min="0" value={form.trafficDelay} onChange={(e) => update('trafficDelay', e.target.value)} /></div><div className="col-6"><label className="form-label" htmlFor="alert-threshold">Avisar a partir de (min)</label><input id="alert-threshold" className="form-control" type="number" min="1" value={form.alertThreshold} onChange={(e) => update('alertThreshold', e.target.value)} /></div></div><p className="form-hint">O atraso é simulado neste protótipo.</p></details>
    </form>
  </Modal>;
}

export function EmptyState({ title, text, action }) {
  return <div className="empty-state"><h3>{title}</h3><p>{text}</p>{action}</div>;
}
