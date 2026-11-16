import React, { useEffect, useRef, useState } from 'react';
import { buildRecommendation, formatTime } from '../utils/schedule';
import { Modal } from './Primitives';

const prompts = ['Como está meu dia?', 'Quando devo sair?', 'Há algum conflito?'];

function replyTo(question, { todayEvents, events, nextEvent, conflicts }) {
  const text = question.toLocaleLowerCase('pt-BR');
  const collision = [...conflicts.entries()].filter(([, titles]) => titles.length);

  if (/conflit|choque|sobrepos/.test(text)) {
    if (!collision.length) return 'Sua agenda não tem conflitos de horário.';
    const names = [...new Set(collision.flatMap(([id, titles]) => [events.find((event) => event.id === id)?.title, ...titles]).filter(Boolean))];
    return `Há horários sobrepostos em ${[...new Set(names)].join(', ')}. Confira a agenda para ajustar.`;
  }

  if (!todayEvents.length && !nextEvent) return 'Sua agenda está vazia. Adicione um compromisso para calcular os horários.';
  if (!nextEvent) return `Você tem ${todayEvents.length} compromisso${todayEvents.length === 1 ? '' : 's'} hoje. Confira os horários na agenda.`;

  const plan = buildRecommendation(nextEvent);
  const daySummary = todayEvents.length
    ? `Hoje há ${todayEvents.length} compromisso${todayEvents.length === 1 ? '' : 's'}. `
    : 'Sua agenda de hoje está livre. ';
  const nextSummary = todayEvents.some((event) => event.id === nextEvent.id)
    ? ''
    : `Seu próximo compromisso é ${nextEvent.title}, às ${nextEvent.time}. `;
  const schedule = `Para ${nextEvent.title}, comece a se preparar às ${formatTime(plan.recommendedPrepare)} e saia às ${formatTime(plan.recommendedDeparture)}.`;

  if (/organ|hoje|rotina|agenda|prepar|acord|sair|hor.rio|planej/.test(text)) {
    return `${daySummary}${nextSummary}${schedule}${nextEvent.message ? ` ${nextEvent.message}` : ''}`;
  }

  return 'Posso consultar os horários do próximo compromisso ou procurar conflitos. Qual prefere?';
}

export default function AssistantModal({ todayEvents, events, nextEvent, conflicts, onClose }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'O que você quer planejar?' }]);
  const bottomRef = useRef(null);

  useEffect(() => bottomRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), [messages]);

  function ask(value = question) {
    const prompt = value.trim();
    if (!prompt) return;
    const answer = replyTo(prompt, { todayEvents, events, nextEvent, conflicts });
    setMessages((current) => [...current, { role: 'user', text: prompt }, { role: 'assistant', text: answer }]);
    setQuestion('');
  }

  return <Modal title="Planejar rotina" onClose={onClose}>
    <p className="assistant-note">Sugestões com base nos seus compromissos.</p>
    <div className="assistant-messages" aria-live="polite" aria-label="Conversa com o assistente">
      {messages.map((message, index) => <p className={`assistant-message ${message.role}`} key={index}>{message.text}</p>)}
      <div ref={bottomRef} />
    </div>
    {messages.length === 1 && <div className="assistant-prompts" aria-label="Sugestões de pergunta">{prompts.map((prompt) => <button key={prompt} className="btn btn-outline-dark btn-sm" onClick={() => ask(prompt)}>{prompt}</button>)}</div>}
    <form className="assistant-form" onSubmit={(event) => { event.preventDefault(); ask(); }}>
      <label className="visually-hidden" htmlFor="assistant-question">Sua pergunta</label>
      <input id="assistant-question" className="form-control" maxLength="240" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pergunte sobre sua agenda" />
      <button className="btn btn-dark" type="submit" disabled={!question.trim()} aria-label="Enviar pergunta">Enviar</button>
    </form>
  </Modal>;
}
