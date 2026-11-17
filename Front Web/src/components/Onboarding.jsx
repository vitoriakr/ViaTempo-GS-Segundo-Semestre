import React, { useState } from 'react';
import { Brand } from './Primitives';
import { makeId } from '../services/api';
import { parseICS, normalizeImportedJSON } from '../utils/calendar';
import { CalendarImportHelp } from './DataComponents';

const emptyPreferences = { alertThreshold: 5, defaultPrepMinutes: 30, defaultBufferMinutes: 15, notifications: true };

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState('choose');
  const [fileError, setFileError] = useState('');
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState({ title: '', date: '', time: '', destination: '', travelMinutes: '', prepMinutes: '', bufferMinutes: '' });
  const [staged, setStaged] = useState([]);
  const [manualError, setManualError] = useState('');
  const [preview, setPreview] = useState(null);

  async function readCalendarFile(file) {
    if (!file) return;
    setBusy(true); setFileError('');
    try {
      const format = file.name.toLowerCase().endsWith('.ics') ? 'ics' : 'json';
      const text = await file.text();
      const payload = format === 'ics' ? { events: parseICS(text), locations: [], preferences: {} } : normalizeImportedJSON(JSON.parse(text));
      setPreview({ ...payload, fileName: file.name, fileFormat: format });
    } catch (error) { setFileError(error.message || 'Não consegui ler esse arquivo.'); }
    finally { setBusy(false); }
  }

  function addManualEvent(event) {
    event.preventDefault();
    if (!manual.title.trim() || !manual.date || !manual.time) return setManualError('Preencha o nome, a data e o horário.');
    if ([manual.travelMinutes, manual.prepMinutes, manual.bufferMinutes].some((time) => time === '' || !Number.isFinite(Number(time)) || Number(time) < 0)) return setManualError('Informe os tempos de deslocamento, preparação e margem. Use 0 quando não se aplicar.');
    const placeId = manual.destination.trim() ? makeId('place') : '';
    const eventItem = {
      id: makeId('event'), title: manual.title.trim(), date: manual.date, time: manual.time,
      locationId: placeId, travelMinutes: Number(manual.travelMinutes), prepMinutes: Number(manual.prepMinutes),
      bufferMinutes: Number(manual.bufferMinutes), trafficDelay: 0, alertThreshold: 5,
      recommendationStatus: '', source: 'manual',
      ...(placeId ? { _setupPlace: { id: placeId, name: manual.destination.trim().split(',')[0], address: manual.destination.trim() } } : {}),
    };
    setStaged((current) => [...current, eventItem]); setManualError('');
    setManual((current) => ({ ...current, title: '', time: '09:00' }));
  }

  async function finishManual(event) {
    event?.preventDefault();
    let events = staged;
    if (manual.title.trim()) {
      if (!manual.date || !manual.time) return setManualError('Preencha a data e o horário do último compromisso.');
      if ([manual.travelMinutes, manual.prepMinutes, manual.bufferMinutes].some((time) => time === '' || !Number.isFinite(Number(time)) || Number(time) < 0)) return setManualError('Informe os tempos de deslocamento, preparação e margem. Use 0 quando não se aplicar.');
      const placeId = manual.destination.trim() ? makeId('place') : '';
      events = [...events, { id: makeId('event'), title: manual.title.trim(), date: manual.date, time: manual.time, locationId: placeId, travelMinutes: Number(manual.travelMinutes), prepMinutes: Number(manual.prepMinutes), bufferMinutes: Number(manual.bufferMinutes), trafficDelay: 0, alertThreshold: 5, recommendationStatus: '', source: 'manual', ...(placeId ? { _setupPlace: { id: placeId, name: manual.destination.trim().split(',')[0], address: manual.destination.trim() } } : {}) }];
    }
    if (!events.length) return setManualError('Adicione pelo menos um compromisso ou escolha “Planejar depois”.');
    const places = new Map();
    events = events.map(({ _setupPlace, ...item }) => {
      if (!_setupPlace) return item;
      const key = _setupPlace.address.trim().toLocaleLowerCase('pt-BR');
      let place = places.get(key);
      if (!place) { place = _setupPlace; places.set(key, place); }
      return { ...item, locationId: place.id };
    });
    await onComplete({ events, locations: [...places.values()], preferences: { ...emptyPreferences, defaultPrepMinutes: Number(manual.prepMinutes), defaultBufferMinutes: Number(manual.bufferMinutes) }, feedback: [] });
  }

  async function finishImport() {
    if (!preview) return;
    const importedLocations = preview.locations || [];
    const locations = importedLocations.map((location) => ({ ...location, id: location.id || makeId('place') }));
    const ids = new Map(importedLocations.map((item, index) => [item.id, locations[index]?.id]));
    const events = preview.events.map((event) => ({ ...event, id: makeId('event'), locationId: ids.get(event.locationId) || event.locationId || '', source: event.source || preview.fileFormat }));
    await onComplete({ events, locations, usuario: preview.usuario || '', preferences: { ...emptyPreferences, ...(preview.preferences || {}) }, feedback: preview.feedback || [] });
  }

  const back = () => { setStep('choose'); setPreview(null); setFileError(''); setManualError(''); };

  return <main className="onboarding-shell">
    <header className={`onboarding-nav ${step === 'choose' ? 'centered' : ''}`}><Brand />{step === 'choose' && <span>Rotina inteligente</span>}</header>
    <section className="onboarding-main" aria-live="polite">
      {step === 'choose' && <div className="onboarding-choose">
        <div className="onboarding-board"><div className="onboarding-options" aria-label="Escolha como começar">
          <button className="entry-option" onClick={() => setStep('manual')}>
            <span className="entry-illustration" aria-hidden="true"><svg viewBox="0 0 144 112"><rect x="23" y="20" width="82" height="72" rx="13" /><path d="M23 41h82M43 13v15M85 13v15M43 55h14M71 55h14M43 70h14" /><circle cx="103" cy="78" r="25" /><path d="M103 64v15l10 6" /></svg></span>
            <span className="entry-title">Preencher rotina</span><span className="entry-description">Adicione compromissos, horários e destinos.</span>
            <span className="entry-action">Começar manualmente <span aria-hidden="true">→</span></span>
          </button>
          <button className="entry-option" onClick={() => setStep('import')}>
            <span className="entry-illustration" aria-hidden="true"><svg viewBox="0 0 144 112"><path d="M39 16h47l21 21v61H39a10 10 0 0 1-10-10V26a10 10 0 0 1 10-10Z" /><path d="M86 16v22h21M51 57h43M51 70h24" /><path d="M90 79v23m-11-11 11 11 11-11" /></svg></span>
            <span className="entry-title">Importar rotina</span><span className="entry-description">Selecione um arquivo ICS ou JSON.</span>
            <span className="entry-action">Escolher arquivo <span aria-hidden="true">→</span></span>
          </button>
        </div><button className="quiet-link" onClick={() => onComplete({ events: [], locations: [], preferences: emptyPreferences, feedback: [] })}>Explorar primeiro <span aria-hidden="true">→</span></button></div>
      </div>}

      {step === 'manual' && <div className="setup-card"><button className="back-link" onClick={back}>← <span>Voltar</span></button><div className="setup-progress"><span>COMPROMISSO</span><div><i /></div></div><h1>O que faz parte<br />do seu dia?</h1><p className="setup-description">Inclua o compromisso e os tempos da sua rotina.</p>
        {staged.length > 0 && <div className="staged-list"><span className="field-caption">ADICIONADOS ({staged.length})</span>{staged.map((item) => <div className="staged-row" key={item.id}><span className="staged-time">{item.time}</span><strong>{item.title}</strong><span>{item.date}</span><button type="button" aria-label={`Remover ${item.title}`} onClick={() => setStaged((current) => current.filter((row) => row.id !== item.id))}>×</button></div>)}</div>}
        <form onSubmit={addManualEvent} className="manual-form">
          {manualError && <div role="alert" className="form-alert">{manualError}</div>}
          <div><label className="form-label" htmlFor="setup-title">Compromisso</label><input id="setup-title" className="form-control" maxLength="120" placeholder="Ex.: Aula, trabalho, consulta" value={manual.title} onChange={(e) => setManual({ ...manual, title: e.target.value })} /></div>
          <div className="row g-3"><div className="col-6"><label className="form-label" htmlFor="setup-date">Data</label><input id="setup-date" type="date" className="form-control" value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} /></div><div className="col-6"><label className="form-label" htmlFor="setup-time">Horário</label><input id="setup-time" type="time" className="form-control" value={manual.time} onChange={(e) => setManual({ ...manual, time: e.target.value })} /></div></div>
          <div><label className="form-label" htmlFor="setup-destination">Destino <span className="optional">opcional</span></label><input id="setup-destination" className="form-control" placeholder="Local ou endereço" value={manual.destination} onChange={(e) => setManual({ ...manual, destination: e.target.value })} /></div>
          <div className="row g-3"><div className="col-4"><label className="form-label" htmlFor="setup-travel">Deslocamento</label><div className="input-group"><input id="setup-travel" type="number" min="0" placeholder="0" className="form-control" value={manual.travelMinutes} onChange={(e) => setManual({ ...manual, travelMinutes: e.target.value })} /><span className="input-group-text">min</span></div></div><div className="col-4"><label className="form-label" htmlFor="setup-prep">Preparação</label><div className="input-group"><input id="setup-prep" type="number" min="0" placeholder="0" className="form-control" value={manual.prepMinutes} onChange={(e) => setManual({ ...manual, prepMinutes: e.target.value })} /><span className="input-group-text">min</span></div></div><div className="col-4"><label className="form-label" htmlFor="setup-buffer">Margem</label><div className="input-group"><input id="setup-buffer" type="number" min="0" placeholder="0" className="form-control" value={manual.bufferMinutes} onChange={(e) => setManual({ ...manual, bufferMinutes: e.target.value })} /><span className="input-group-text">min</span></div></div></div>
          <div className="manual-actions"><button className="btn btn-quiet" type="submit">＋ Adicionar mais um</button><button className="btn btn-dark" type="button" onClick={finishManual}>{staged.length ? 'Salvar e entrar' : 'Adicionar e entrar'} <span>↗</span></button></div>
        </form><button className="skip-setup" onClick={() => onComplete({ events: [], locations: [], preferences: emptyPreferences, feedback: [] })}>Planejar depois</button>
      </div>}

      {step === 'import' && <div className="setup-card import-setup"><button className="back-link" onClick={back}>← <span>Voltar</span></button><div className="setup-progress"><span>IMPORTAR ARQUIVO</span><div><i /></div></div><h1>Traga sua<br />agenda.</h1><p className="setup-description">Escolha um arquivo. O ViaTempo identifica o formato.</p>
        {!preview ? <><label className="file-drop"><input type="file" accept=".ics,.json,text/calendar,application/json" onChange={(e) => { readCalendarFile(e.target.files?.[0]); e.target.value = ''; }} /><span className="file-drop-icon">↥</span><strong>{busy ? 'Lendo arquivo…' : 'Selecionar arquivo'}</strong><small>.ics ou JSON</small></label><CalendarImportHelp /></> : <ImportPreview preview={preview} onCancel={() => setPreview(null)} onConfirm={finishImport} />}
        {fileError && <p className="form-alert" role="alert">{fileError}</p>}<button className="skip-setup" onClick={() => onComplete({ events: [], locations: [], preferences: emptyPreferences, feedback: [] })}>Planejar depois</button>
      </div>}
    </section>
  </main>;
}

function ImportPreview({ preview, onCancel, onConfirm }) {
  return <div className="import-preview"><div className="preview-check">✓</div><div><strong>Arquivo pronto para importar</strong><small>{preview.fileName}</small></div><div className="preview-counts"><span><b>{preview.events.length}</b> compromissos</span><span><b>{(preview.locations || []).length}</b> locais</span></div><div className="preview-actions"><button className="btn btn-outline-dark" onClick={onCancel}>Escolher outro</button><button className="btn btn-dark" onClick={onConfirm}>Importar e entrar <span>↗</span></button></div></div>;
}
