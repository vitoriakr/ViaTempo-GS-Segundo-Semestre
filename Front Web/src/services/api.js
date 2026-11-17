import { createInitialData } from '../data/initialData';

const STORAGE_KEY = 'viatempo.v1';
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
const seed = () => {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    const data = JSON.parse(existing);
    const onlyOldDemoEvents = data.events?.length && data.events.every((event) => event.source === 'demo');
    if (onlyOldDemoEvents) {
      const fresh = createInitialData();
      const legacyIds = new Set(['loc-home', 'loc-campus', 'loc-work']);
      fresh.locations = (data.locations || []).filter((location) => !legacyIds.has(location.id));
      saveLocal(fresh);
      return fresh;
    }
    if (typeof data.onboardingCompleted !== 'boolean') {
      data.onboardingCompleted = Boolean(data.events?.length || data.locations?.length);
      saveLocal(data);
    }
    return data;
  }
  const initial = createInitialData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
};

function saveLocal(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) throw new Error(`A API respondeu com status ${response.status}.`);
  return response.status === 204 ? null : response.json();
}

export const api = {
  mode: API_BASE ? 'api' : 'local',
  async load() {
    if (API_BASE) return request('/viatempo');
    return seed();
  },
  async save(data) {
    if (API_BASE) return request('/viatempo', { method: 'PUT', body: JSON.stringify(data) });
    saveLocal(data);
    return data;
  },
  async upsertEvent(event, data) {
    const { _isNew, ...cleanEvent } = event;
    const updated = { ...data, events: data.events.some((item) => item.id === cleanEvent.id)
      ? data.events.map((item) => item.id === cleanEvent.id ? cleanEvent : item)
      : [...data.events, cleanEvent] };
    if (API_BASE) await request(`/events${cleanEvent.id ? `/${encodeURIComponent(cleanEvent.id)}` : ''}`, { method: _isNew ? 'POST' : 'PUT', body: JSON.stringify(cleanEvent) });
    if (!API_BASE) saveLocal(updated);
    return updated;
  },
  async removeEvent(id, data) {
    const updated = { ...data, events: data.events.filter((item) => item.id !== id) };
    if (API_BASE) await request(`/events/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!API_BASE) saveLocal(updated);
    return updated;
  },
  async saveLocation(location, data) {
    const updated = { ...data, locations: [...data.locations, location] };
    if (API_BASE) await request('/locations', { method: 'POST', body: JSON.stringify(location) });
    if (!API_BASE) saveLocal(updated);
    return updated;
  },
  async removeLocation(id, data) {
    const updated = { ...data, locations: data.locations.filter((item) => item.id !== id) };
    if (API_BASE) await request(`/locations/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!API_BASE) saveLocal(updated);
    return updated;
  },
};

export function makeId(prefix = 'id') {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}
