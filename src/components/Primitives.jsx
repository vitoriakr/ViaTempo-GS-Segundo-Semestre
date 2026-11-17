import React from 'react';

const iconShapes = {
  home: <><path d="m3.5 10 8.5-6.5 8.5 6.5" /><path d="M5.5 9v11h13V9M9.5 20v-6h5v6" /></>,
  calendar: <><rect x="3.5" y="5.5" width="17" height="16" rx="2.5" /><path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" /></>,
  places: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" /></>,
  files: <><path d="M9 3.5h5l4 4V15M14 3.5v4h4M9 3.5v17h9" /><path d="M3 10h5m-2-2 2 2-2 2M21 16h-5m2-2-2 2 2 2" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
};

export function Icon({ name, className = '' }) {
  return <span className={`vt-icon ${className}`} aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">{iconShapes[name]}</svg></span>;
}

export function Brand() {
  return <div className="brand-lockup"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 4h12M6 20h12M7 5c0 3 5 4 5 7s-5 4-5 7m10-14c0 3-5 4-5 7s5 4 5 7" /></svg></span><strong>ViaTempo</strong></div>;
}

const links = [
  { id: 'home', label: 'Meu dia', icon: 'home' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar' },
  { id: 'places', label: 'Locais', icon: 'places' },
  { id: 'data', label: 'Importar e exportar', icon: 'files' },
];

export function Sidebar({ active, onNavigate, open, onClose }) {
  return <>
    {open && <button className="sidebar-scrim d-lg-none" aria-label="Fechar menu" onClick={onClose} />}
    <aside className={`app-sidebar ${open ? 'is-open' : ''}`}>
      <div className="sidebar-head"><Brand /><button className="btn-close d-lg-none" aria-label="Fechar menu" onClick={onClose} /></div>
      <nav aria-label="Navegação principal">{links.map(({ id, label, icon }) => <button key={id} className={`side-link ${active === id ? 'active' : ''}`} aria-current={active === id ? 'page' : undefined} onClick={() => onNavigate(id)}><Icon name={icon} />{label}</button>)}</nav>
    </aside>
  </>;
}

export function Topbar({ title, date, onMenu, onPreferences }) {
  return <header className="topbar"><button className="mobile-menu d-lg-none" onClick={onMenu} aria-label="Abrir menu"><Icon name="menu" /></button><div className="topbar-title"><span>{date}</span><h1>{title}</h1></div><button className="preferences-button" onClick={onPreferences}>Preferências</button></header>;
}

export function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;
  return <div className={`toast-message ${type}`} role={type === 'error' ? 'alert' : 'status'}><span aria-hidden="true">{type === 'error' ? '!' : '✓'}</span>{message}<button onClick={onClose} aria-label="Fechar mensagem">×</button></div>;
}

export function Modal({ title, onClose, children, footer }) {
  return <div className="modal-backdrop-custom" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-dialog-custom" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header className="modal-heading"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Fechar">×</button></header><div className="modal-body-custom">{children}</div>{footer && <footer className="modal-footer-custom">{footer}</footer>}</section></div>;
}
