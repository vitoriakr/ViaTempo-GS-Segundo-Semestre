import React from 'react';

export function Icon({ children, className = '' }) {
  return <span className={`vt-icon ${className}`} aria-hidden="true">{children}</span>;
}

export function Brand() {
  return <div className="brand-lockup"><span className="brand-mark">↗</span><strong>ViaTempo</strong></div>;
}

const links = [
  { id: 'home', label: 'Meu dia', icon: '⌂' },
  { id: 'agenda', label: 'Agenda', icon: '▦' },
  { id: 'places', label: 'Locais', icon: '⌖' },
  { id: 'data', label: 'Importar e exportar', icon: '⇅' },
];

export function Sidebar({ active, onNavigate, open, onClose }) {
  return <>
    {open && <button className="sidebar-scrim d-lg-none" aria-label="Fechar menu" onClick={onClose} />}
    <aside className={`app-sidebar ${open ? 'is-open' : ''}`}>
      <div className="sidebar-head"><Brand /><button className="btn-close d-lg-none" aria-label="Fechar menu" onClick={onClose} /></div>
      <nav aria-label="Navegação principal">{links.map(({ id, label, icon }) => <button key={id} className={`side-link ${active === id ? 'active' : ''}`} aria-current={active === id ? 'page' : undefined} onClick={() => onNavigate(id)}><Icon>{icon}</Icon>{label}</button>)}</nav>
      <div className="sidebar-note">Seus dados ficam neste navegador.</div>
    </aside>
  </>;
}

export function Topbar({ title, date, onMenu, onPreferences }) {
  return <header className="topbar"><button className="mobile-menu d-lg-none" onClick={onMenu} aria-label="Abrir menu">☰</button><div className="topbar-title"><span>{date}</span><h1>{title}</h1></div><button className="preferences-button" onClick={onPreferences}>Preferências</button></header>;
}

export function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;
  return <div className={`toast-message ${type}`} role={type === 'error' ? 'alert' : 'status'}><span aria-hidden="true">{type === 'error' ? '!' : '✓'}</span>{message}<button onClick={onClose} aria-label="Fechar mensagem">×</button></div>;
}

export function Modal({ title, onClose, children, footer }) {
  return <div className="modal-backdrop-custom" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-dialog-custom" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header className="modal-heading"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Fechar">×</button></header><div className="modal-body-custom">{children}</div>{footer && <footer className="modal-footer-custom">{footer}</footer>}</section></div>;
}
