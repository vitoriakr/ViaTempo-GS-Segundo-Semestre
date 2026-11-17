import React, { useEffect, useRef, useState } from 'react';
import { buildRecommendation, formatDate, formatTime } from '../utils/schedule';

const prompts = ['Planejar meu dia', 'E amanhã?', 'O que vem agora?', 'Como ganho XP?'];

function makeSummary({ todayEvents, nextEvent, conflicts, recommendations }) {
  const collisions = [...conflicts.values()].flat();
  const conflictLine = collisions.length ? `Encontrei sobreposição na agenda: ${[...new Set(collisions)].slice(0, 2).join(' e ')}.` : '';
  if (!nextEvent) return `${todayEvents.length ? `Você tem ${todayEvents.length} compromisso${todayEvents.length === 1 ? '' : 's'} hoje. ` : 'Sua agenda está livre por enquanto. '}Adicione seus compromissos e eu te ajudo a organizar os horários. ${conflictLine}`.trim();
  const plan = buildRecommendation(nextEvent);
  const now = new Date();
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const day = nextEvent.date === localToday ? 'Hoje' : formatDate(nextEvent.date, { weekday: 'long', day: 'numeric', month: 'long' });
  const recommendation = recommendations[0];
  const suggestion = recommendation?.type === 'delay'
    ? ` Sugestão: saia às ${formatTime(recommendation.plan.recommendedDeparture)} para compensar o trânsito.`
    : recommendation?.type === 'margin' ? ' Sugestão: adicione 5 minutos de margem antes de sair.' : '';
  return `${day}, seu próximo compromisso é ${nextEvent.title}, às ${nextEvent.time}. Comece a se preparar às ${formatTime(plan.recommendedPrepare)} e saia às ${formatTime(plan.recommendedDeparture)}.${suggestion} ${conflictLine}`.trim();
}

function answer(question, context) {
  const text = question.toLocaleLowerCase('pt-BR');
  const conflicts = [...context.conflicts.values()].flat();
  if (/conflit|choque|sobrepos/.test(text)) return conflicts.length ? `Há sobreposição com ${[...new Set(conflicts)].join(' e ')}. Abra a agenda para conferir os horários e ajustar os compromissos.` : 'Conferi os horários: não encontrei conflitos na sua agenda.';
  if (/vazi|livre/.test(text) && !context.todayEvents.length) return 'Seu dia está livre por enquanto. Você pode adicionar um compromisso ou importar sua agenda para eu ajudar a organizar.';
  if (/amanh/.test(text)) {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const iso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    const events = context.events.filter((event) => event.date === iso);
    return events.length ? `Amanhã você tem ${events.map((event) => `${event.title}, às ${event.time}`).join('; ')}.` : 'Amanhã sua agenda está livre.';
  }
  if (/xp|nível|nivel|conquist|ganho/.test(text)) {
    const xp = context.events.filter((event) => event.userFeedback).reduce((sum, event) => sum + (event.userFeedback === 'on-time' ? 30 : 10), 0);
    return `Você já juntou ${xp} XP. Registre como foi a chegada depois de cada compromisso: pontual vale 30 XP, com atraso vale 10 XP. Planejamento constante é o que faz a Teca avançar pelas ilhas!`;
  }
  if (/semana|próxim|proxim/.test(text)) {
    const next = context.events.filter((event) => new Date(`${event.date}T${event.time}`) >= new Date()).slice(0, 3);
    return next.length ? `Os próximos compromissos são: ${next.map((event) => `${event.title}, ${formatDate(event.date, { weekday: 'short', day: 'numeric', month: 'short' })} às ${event.time}`).join('; ')}.` : 'Não encontrei próximos compromissos na agenda.';
  }
  if (/tempo|quanto|desloc|trajeto/.test(text) && context.nextEvent) return `Para ${context.nextEvent.title}, você reservou ${context.nextEvent.travelMinutes} min de deslocamento e ${context.nextEvent.bufferMinutes} min de margem. A saída planejada é ${formatTime(buildRecommendation(context.nextEvent).recommendedDeparture)}.`;
  if (/organ|hoje|rotina|agenda|prepar|acord|sair|hor.rio|planej|otimiz|melhor/.test(text)) return makeSummary(context);
  return 'Posso resumir seu dia, conferir conflitos ou ajudar com a preparação para o próximo compromisso.';
}

function TurtleFace({ skin = 'shell-starter' }) {
  return <svg className={`turtle-face ${skin}`} viewBox="0 0 64 64" aria-hidden="true"><path className="turtle-body" d="M25 14c-4-3-8-1-9 3l-3 5c-4 2-5 7-2 10l-2 6c-1 4 2 7 6 6l7-4h20l7 4c4 1 7-2 6-6l-2-6c3-3 2-8-2-10l-3-5c-1-4-5-6-9-3"/><ellipse className="turtle-shell" cx="32" cy="34" rx="17" ry="14"/><path className="shell-mark" d="M32 20v28M16 31h32M21 24l11 7 11-7M21 42l11-7 11 7"/><circle className="turtle-head" cx="32" cy="13" r="9"/><circle className="turtle-eye" cx="28.5" cy="12" r="1.4"/><circle className="turtle-eye" cx="35.5" cy="12" r="1.4"/><path className="turtle-smile" d="M29 16q3 3 6 0"/><circle className="turtle-cheek" cx="25" cy="15" r="1.5"/><circle className="turtle-cheek" cx="39" cy="15" r="1.5"/></svg>;
}

export default function AssistantWidget({ todayEvents, events, nextEvent, conflicts, recommendations, onFeedback }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const xp = events.filter((event) => event.userFeedback).reduce((sum, event) => sum + (event.userFeedback === 'on-time' ? 30 : 10), 0);
  const level = Math.floor(xp / 100) + 1;
  const shell = level >= 6 ? 'shell-gold' : level >= 4 ? 'shell-purple' : level >= 2 ? 'shell-teal' : 'shell-starter';
  const bottomRef = useRef(null);
  const context = { todayEvents, events, nextEvent, conflicts, recommendations };
  useEffect(() => { if (open) bottomRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [messages, open]);
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) { if (event.key === 'Escape') setOpen(false); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);
  function ask(value = question) {
    const text = value.trim(); if (!text) return;
    setMessages((items) => [...items, { role: 'user', text }, { role: 'assistant', text: answer(text, context) }]);
    setQuestion('');
  }
  return <div className="assistant-widget">
    {open && <section id="assistant-panel" className="assistant-panel" role="dialog" aria-modal="false" aria-labelledby="assistant-title">
      <header className="assistant-widget-header"><span className={`assistant-avatar ${shell}`}><TurtleFace skin={shell} /></span><div><h2 id="assistant-title">Teca</h2><p>Sua tartaruga do tempo · nível {level}</p></div><span className="teca-xp">{xp} XP</span><button className="assistant-close" onClick={() => setOpen(false)} aria-label="Fechar assistente">×</button></header>
      <div className="assistant-widget-content">
        <div className="assistant-overview"><span className="eyebrow">PASSO A PASSO, NO TEMPO CERTO</span><p>{makeSummary(context)}</p><small className="teca-motto">— Teca, sua parceira de jornada</small></div>
        {recommendations.length > 0 && <section className="assistant-widget-recs" aria-label="Sugestões para sua agenda"><h3>Sugestões para hoje</h3>{recommendations.slice(0, 3).map(({ event, plan, type }) => <article className="assistant-recommendation" key={event.id}><p><strong>{event.title}</strong>{type === 'delay' ? ` · saída ${formatTime(plan.departure)} → ${formatTime(plan.recommendedDeparture)}` : type === 'margin' ? ' · adicionar 5 min de margem' : ' · confira esta recomendação'}</p>{type === 'delay' && <button className="btn btn-sm btn-dark" onClick={() => onFeedback(event, 'accepted')}>Mudar horário</button>}{type === 'margin' && <button className="btn btn-sm btn-dark" onClick={() => onFeedback(event, 'margin')}>Adicionar 5 min</button>}</article>)}</section>}
        <div className="assistant-messages" aria-live="polite" aria-label="Conversa com o assistente">{messages.map((message, index) => <p className={`assistant-message ${message.role}`} key={index}>{message.text}</p>)}<div ref={bottomRef} /></div>
        <div className="assistant-prompts">{prompts.map((prompt) => <button className="btn btn-sm btn-outline-secondary" key={prompt} onClick={() => ask(prompt)}>{prompt}</button>)}</div>
        <form className="assistant-form" onSubmit={(event) => { event.preventDefault(); ask(); }}><input className="form-control" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pergunte sobre sua rotina" aria-label="Pergunte sobre sua rotina" /><button className="btn btn-dark" type="submit">Enviar</button></form>
      </div>
    </section>}
    <button className={`assistant-launcher teca-launcher ${open ? ' is-open' : ''}`} onClick={() => setOpen((value) => !value)} aria-label={open ? 'Fechar conversa com Teca' : 'Conversar com Teca, sua tartaruga do tempo'} aria-expanded={open} aria-controls="assistant-panel"><TurtleFace skin={shell} />{!open && <span className="teca-name-tag">Teca</span>}{!open && recommendations.length > 0 && <span className="assistant-badge">{recommendations.length}</span>}</button>
  </div>;
}
