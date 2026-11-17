import React, { useState } from 'react';
import { parseICS, normalizeImportedJSON, toICS, toPythonJSON } from '../utils/calendar';
import { Modal } from './Primitives';

function download(name, content, type) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function ImportExportPanel({ data, onImport, onDeleteData, onNavigate }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function readFile(file) {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const text = await file.text();
      const payload = file.name.toLowerCase().endsWith('.ics')
        ? { events: parseICS(text), locations: [] }
        : normalizeImportedJSON(JSON.parse(text));
      await onImport(payload);
    } catch (reason) { setError(reason.message || 'Não foi possível ler o arquivo.'); }
    finally { setBusy(false); }
  }

  const json = () => download('viatempo-dados.json', JSON.stringify(toPythonJSON(data), null, 2), 'application/json');
  const backup = () => download('viatempo-backup.json', JSON.stringify({ ...data, exportedAt: new Date().toISOString(), format: 'viatempo-backup-v1' }, null, 2), 'application/json');
  const ics = () => download('viatempo-agenda.ics', toICS(data.events, data.locations), 'text/calendar;charset=utf-8');

  return <div className="data-page">
    <header className="page-intro data-page-heading"><div><span className="eyebrow">PORTABILIDADE</span><h2>Importar e exportar</h2></div><button className="btn data-back-button" onClick={() => onNavigate('home')}><span aria-hidden="true">←</span> Início</button></header>
    <div className="data-board"><section className="data-choice-card"><span className="data-choice-art" aria-hidden="true"><svg viewBox="0 0 120 100"><path d="M23 23h46l19 19v43H23z"/><path d="M69 23v20h19M37 57h36M37 68h24"/><path d="M91 48v34m-12-12 12 12 12-12"/></svg></span><span className="eyebrow">IMPORTAR</span><h3>Trazer arquivos</h3><label className="btn btn-dark data-file-choice"><input type="file" accept=".ics,.json,text/calendar,application/json" onChange={(event) => { readFile(event.target.files?.[0]); event.target.value = ''; }} />{busy ? 'Lendo arquivo…' : 'Selecionar arquivo'}</label><CalendarImportHelp />{error && <p className="form-alert" role="alert">{error}</p>}<small>.ics · JSON · calendário</small></section>
      <section className="data-choice-card"><span className="data-choice-art" aria-hidden="true"><svg viewBox="0 0 120 100"><rect x="25" y="20" width="70" height="62" rx="12"/><path d="M42 40h36M42 51h22M42 62h29"/><path d="M77 72v19m-8-8 8 8 8-8"/></svg></span><span className="eyebrow">EXPORTAR</span><h3>Levar minha agenda</h3><div className="data-export-actions"><button className="btn btn-dark" onClick={backup}>Backup completo</button><button className="btn btn-outline-dark" onClick={json}>JSON para Python</button><button className="btn btn-outline-dark" onClick={ics}>Calendário .ics</button></div><small>{data.events.length} compromissos · {data.locations.length} locais</small></section></div>
  </div>;
}

export function CalendarImportHelp() {
  return <details className="calendar-import-help"><summary>Como exporto meu calendário?</summary><div className="calendar-help-content"><p><strong>Google Calendar</strong>Configurações → Importar e exportar → Exportar. Extraia o ZIP e escolha o arquivo .ics.</p><p><strong>Apple Calendar</strong>Arquivo → Exportar → Exportar… e salve como .ics.</p><p><strong>Outlook</strong>Abra o calendário, escolha Compartilhar/Exportar e salve como .ics.</p><p><strong>JSON</strong>Selecione o arquivo gerado pelo ViaTempo ou pela análise Python.</p></div></details>;
}

export function LocationsPanel({ locations, onSave, onDelete }) {
  const [form, setForm] = useState({ name: '', address: '' });
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.address.trim()) return setError('Preencha o nome e o endereço.');
    await onSave({ name: form.name.trim(), address: form.address.trim() });
    setForm({ name: '', address: '' }); setError('');
  }

  return <div className="locations-page">
    <header className="page-intro"><div><span className="eyebrow">DESTINOS</span><h2>Locais</h2></div></header>
    <form className="location-form" onSubmit={submit}>
      <div><label className="form-label" htmlFor="place-name">Nome</label><input id="place-name" className="form-control" maxLength="60" placeholder="Ex.: Trabalho" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
      <div><label className="form-label" htmlFor="place-address">Endereço ou bairro</label><input id="place-address" className="form-control" maxLength="140" placeholder="Ex.: Centro, Porto Alegre" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></div>
      <button className="btn btn-dark" type="submit">＋ Adicionar local</button>
      {error && <p className="form-alert" role="alert">{error}</p>}
    </form>
    <section className="saved-places"><h3>Salvos <span>{locations.length}</span></h3>{locations.length ? locations.map((place) => <article className="place-card" key={place.id}><div><strong>{place.name}</strong><span>{place.address}</span></div><button className="icon-button" onClick={() => onDelete(place)} aria-label={`Excluir ${place.name}`}>Excluir</button></article>) : <p className="muted-copy">Seus locais aparecerão aqui.</p>}</section>
  </div>;
}

export function AccountModal({ usuario, preferences, onClose, onSave, onDeleteData, onExport, eventCount, locationCount }) {
  const [name, setName] = useState(usuario || '');
  const [threshold, setThreshold] = useState(preferences.alertThreshold ?? 5);
  const [prep, setPrep] = useState(preferences.defaultPrepMinutes ?? 30);
  const [buffer, setBuffer] = useState(preferences.defaultBufferMinutes ?? 15);
  const [darkMode, setDarkMode] = useState(Boolean(preferences.darkMode));
  const save = () => onSave({ usuario: name.trim(), preferences: { ...preferences, alertThreshold: Number(threshold), defaultPrepMinutes: Number(prep), defaultBufferMinutes: Number(buffer), darkMode } });

  return <Modal title="Minha conta" onClose={onClose} footer={<><button className="btn btn-light" onClick={onClose}>Cancelar</button><button className="btn btn-dark" onClick={save}>Salvar alterações</button></>}>
    <div className="preference-fields"><div><label className="form-label" htmlFor="account-name">Como quer ser chamado?</label><input id="account-name" className="form-control" maxLength="60" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Seu nome" /></div>
    <div className="account-summary"><span><strong>{eventCount}</strong> compromissos</span><span><strong>{locationCount}</strong> locais salvos</span><button className="btn btn-sm btn-outline-dark" onClick={onExport}>Baixar backup</button></div>
    <p className="muted-copy">Padrões da sua rotina</p>
    {[["default-prep", "Preparação padrão", prep, setPrep], ["default-buffer", "Margem padrão", buffer, setBuffer], ["threshold", "Aviso de atraso", threshold, setThreshold]].map(([id, label, value, setter]) => <div key={id}><label className="form-label" htmlFor={id}>{label} (min)</label><input id={id} className="form-control" type="number" min="0" value={value} onChange={(event) => setter(event.target.value)} /></div>)}</div>
    <label className="dark-mode-setting"><span><strong>Modo noturno</strong><small>Usar cores escuras no ViaTempo</small></span><input type="checkbox" checked={darkMode} onChange={(event)=>setDarkMode(event.target.checked)} /><i aria-hidden="true" /></label>
    <p className="form-hint">Os dados ficam neste navegador. Esta versão não usa login.</p><button className="btn account-delete-button mt-3" onClick={onDeleteData}><span aria-hidden="true">⌫</span> Apagar meus dados</button>
  </Modal>;
}
