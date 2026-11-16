import React, { useState } from 'react';
import { parseICS, normalizeImportedJSON, toICS } from '../utils/calendar';
import { Modal } from './Primitives';

function download(name, content, type) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function ImportExportPanel({ data, onImport, onDeleteData }) {
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

  const json = () => download('viatempo-dados.json', JSON.stringify({ schemaVersion: '1.0.0', exportedAt: new Date().toISOString(), source: 'viatempo-web', ...data }, null, 2), 'application/json');
  const ics = () => download('viatempo-agenda.ics', toICS(data.events, data.locations), 'text/calendar;charset=utf-8');

  return <div className="data-page">
    <header className="page-intro"><div><span className="eyebrow">PORTABILIDADE</span><h2>Seus dados</h2></div></header>
    <section className="content-panel"><h3>Importar agenda</h3><p>Selecione um arquivo .ics ou JSON. Ele será lido neste dispositivo.</p><label className="file-button"><input type="file" accept=".ics,.json,text/calendar,application/json" onChange={(event) => { readFile(event.target.files?.[0]); event.target.value = ''; }} />{busy ? 'Lendo arquivo…' : 'Escolher arquivo'}</label>{error && <p className="form-alert" role="alert">{error}</p>}</section>
    <section className="content-panel"><h3>Exportar</h3><p>JSON para análise em Python ou calendário .ics.</p><div className="data-actions"><button className="btn btn-dark" onClick={json}>Baixar JSON</button><button className="btn btn-outline-dark" onClick={ics}>Baixar .ics</button></div></section>
    <p className="data-note">Os tempos de deslocamento são informados; o atraso é simulado. Não há consulta de trânsito em tempo real.</p>
    <details className="delete-data"><summary>Apagar meus dados</summary><p>Remove compromissos e locais deste navegador.</p><button className="btn btn-outline-dark" onClick={onDeleteData}>Continuar para apagar</button></details>
  </div>;
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

export function PreferencesModal({ preferences, onClose, onSave }) {
  const [threshold, setThreshold] = useState(preferences.alertThreshold ?? 5);
  const [prep, setPrep] = useState(preferences.defaultPrepMinutes ?? 30);
  const [buffer, setBuffer] = useState(preferences.defaultBufferMinutes ?? 15);
  const save = () => onSave({ ...preferences, alertThreshold: Number(threshold), defaultPrepMinutes: Number(prep), defaultBufferMinutes: Number(buffer) });

  return <Modal title="Preferências" onClose={onClose} footer={<><button className="btn btn-light" onClick={onClose}>Cancelar</button><button className="btn btn-dark" onClick={save}>Salvar</button></>}>
    <p className="muted-copy">Defina os tempos que serão usados em novos compromissos.</p>
    <div className="preference-fields">{[['default-prep', 'Preparação padrão', prep, setPrep], ['default-buffer', 'Margem padrão', buffer, setBuffer], ['threshold', 'Aviso de atraso', threshold, setThreshold]].map(([id, label, value, setter]) => <div key={id}><label className="form-label" htmlFor={id}>{label} (min)</label><input id={id} className="form-control" type="number" min="0" value={value} onChange={(event) => setter(event.target.value)} /></div>)}</div>
    <p className="form-hint">O ViaTempo sugere horários, mas não altera alarmes nem compromissos.</p>
  </Modal>;
}
