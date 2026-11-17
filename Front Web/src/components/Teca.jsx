import React from 'react';

export function TecaAvatar({ level = 1, className = '', label = 'Teca' }) {
  const shell = level >= 6 ? 'shell-gold' : level >= 4 ? 'shell-purple' : level >= 2 ? 'shell-teal' : 'shell-starter';
  return <svg className={`teca-avatar ${shell} ${className}`} viewBox="0 0 64 64" role="img" aria-label={label}>
    <path className="teca-body" d="M25 14c-4-3-8-1-9 3l-3 5c-4 2-5 7-2 10l-2 6c-1 4 2 7 6 6l7-4h20l7 4c4 1 7-2 6-6l-2-6c3-3 2-8-2-10l-3-5c-1-4-5-6-9-3"/>
    <ellipse className="teca-shell" cx="32" cy="34" rx="17" ry="14"/><path className="teca-shell-mark" d="M32 20v28M16 31h32M21 24l11 7 11-7M21 42l11-7 11 7"/>
    <circle className="teca-head" cx="32" cy="13" r="9"/><circle className="teca-eye" cx="28.5" cy="12" r="1.4"/><circle className="teca-eye" cx="35.5" cy="12" r="1.4"/><path className="teca-smile" d="M29 16q3 3 6 0"/><circle className="teca-cheek" cx="25" cy="15" r="1.5"/><circle className="teca-cheek" cx="39" cy="15" r="1.5"/>
  </svg>;
}

export function TecaTip({ children, level = 1, className = '' }) {
  return <div className={`teca-tip ${className}`}><TecaAvatar level={level} className="teca-tip-avatar" /><div className="teca-tip-copy"><span>A Teca sugere</span><p>{children}</p></div></div>;
}
