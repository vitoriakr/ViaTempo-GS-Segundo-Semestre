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
      <section className="data-choice-card"><span className="data-choice-art" aria-hidden="true"><svg viewBox="0 0 120 100"><rect x="25" y="20" width="70" height="62" rx="12"/><path d="M42 40h36M42 51h22M42 62h29"/><path d="M77 72v19m-8-8 8 8 8-8"/></svg></span><span className="eyebrow">EXPORTAR</span><h3>Levar minha agenda</h3><div className="data-export-actions"><button className="btn btn-dark" onClick={backup}>Backup completo</button><button className="btn btn-outline-dark" onClick={json}>JSON para Python</button><button className="btn btn-outline-dark" onClick={ics}>Calendário .ics</button></div><CalendarExportHelp /><small>{data.events.length} compromissos · {data.locations.length} locais</small></section></div>
  </div>;
}

export function CalendarImportHelp() {
  return <div className="calendar-import-help">
    <p className="calendar-help-intro"><strong>O que é .ics?</strong> É um arquivo de agenda: reúne compromissos que outro calendário consegue ler. Ele não conecta sua conta nem sincroniza mudanças futuras.</p>
    <details><summary>Como trazer meu calendário?</summary><div className="calendar-help-content">
      <ol><li>Abra o calendário onde seus compromissos estão e procure a opção <strong>Exportar</strong> ou <strong>Baixar calendário</strong>.</li><li>Escolha o formato <strong>.ics</strong>. Se vier um arquivo .zip, extraia-o primeiro e procure o arquivo .ics dentro da pasta.</li><li>No ViaTempo, toque em <strong>Selecionar arquivo</strong> e escolha esse arquivo .ics no dispositivo.</li><li>Os compromissos serão adicionados à sua agenda atual. Confira os horários e destinos depois da importação.</li></ol>
      <p><strong>Google Calendar</strong>No computador, abra as configurações e procure “Importar e exportar” → “Exportar”. O Google costuma baixar um .zip com os arquivos .ics.</p>
      <p><strong>Apple Calendar</strong>No Mac, selecione o calendário e use Arquivo → Exportar. Escolha onde salvar o arquivo .ics.</p>
      <p><strong>Outlook</strong>Na agenda, procure a opção de compartilhar, salvar ou exportar calendário e escolha .ics. Os nomes podem variar conforme a versão.</p>
      <p><strong>Seus dados</strong>A importação é feita pelo arquivo que você selecionou. Não é necessário informar senha nem conectar sua conta.</p>
    </div></details>
    <details><summary>Meu arquivo não aparece ou não abre</summary><div className="calendar-help-content"><p>Confira se o arquivo termina em <strong>.ics</strong> ou <strong>.json</strong>. Arquivos .zip precisam ser extraídos antes. Se exportou vários calendários, selecione o .ics que corresponde à agenda desejada.</p></div></details>
  </div>;
}

export function CalendarExportHelp() {
  return <div className="calendar-export-help">
    <p className="calendar-help-intro"><strong>O arquivo .ics é uma cópia.</strong> Ele pode ser importado em outro aplicativo de calendário; alterações feitas depois no ViaTempo não atualizam essa cópia automaticamente.</p>
    <details><summary>Como usar o arquivo que baixei?</summary><div className="calendar-help-content">
      <ol><li>Toque em <strong>Calendário .ics</strong>. O arquivo <strong>viatempo-agenda.ics</strong> será baixado no seu dispositivo.</li><li>Abra o calendário para onde quer levar os compromissos e procure <strong>Importar</strong> ou <strong>Adicionar calendário por arquivo</strong>.</li><li>Selecione o arquivo baixado e confirme. O aplicativo de destino pode perguntar em qual calendário salvar.</li></ol>
      <p><strong>Google Calendar</strong>Nas configurações, use “Importar e exportar” → “Importar” e escolha o .ics.</p>
      <p><strong>Apple Calendar</strong>No Mac, use Arquivo → Importar e escolha o arquivo .ics.</p>
      <p><strong>Outlook</strong>Na área de calendários, escolha adicionar/importar calendário a partir de arquivo .ics.</p>
      <p><strong>Backup completo e JSON para Python</strong>São arquivos diferentes do .ics: o backup guarda os dados ViaTempo e o JSON é destinado à análise e integração com Python.</p>
    </div></details>
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
