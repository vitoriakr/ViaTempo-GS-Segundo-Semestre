const unescapeICS = (text = '') => text.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
const escapeICS = (text = '') => String(text).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

function parseICSDate(value) {
  const dateOnly = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) return { date: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`, time: '09:00' };
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!match) throw new Error('O calendário contém uma data em formato não reconhecido.');
  let [year, month, day, hour, minute] = match.slice(1, 6).map(Number);
  if (match[7]) {
    const local = new Date(Date.UTC(year, month - 1, day, hour, minute));
    year = local.getFullYear(); month = local.getMonth() + 1; day = local.getDate(); hour = local.getHours(); minute = local.getMinutes();
  }
  return { date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
}

export function parseICS(text) {
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const blocks = unfolded.split('BEGIN:VEVENT').slice(1).map((block) => block.split('END:VEVENT')[0]);
  if (!blocks.length) throw new Error('Não encontrei compromissos no arquivo .ics.');
  return blocks.map((block, index) => {
    const fields = {};
    block.split(/\r?\n/).forEach((line) => {
      const colon = line.indexOf(':');
      if (colon < 0) return;
      const key = line.slice(0, colon).split(';')[0].toUpperCase();
      if (['SUMMARY', 'LOCATION', 'DTSTART', 'UID'].includes(key)) fields[key] = unescapeICS(line.slice(colon + 1).trim());
    });
    if (!fields.DTSTART) return null;
    const { date, time } = parseICSDate(fields.DTSTART);
    return { id: fields.UID || `ics-${Date.now()}-${index}`, title: fields.SUMMARY || 'Compromisso importado', date, time, importedLocation: fields.LOCATION || '', travelMinutes: 30, prepMinutes: 30, bufferMinutes: 15, trafficDelay: 0, alertThreshold: 5, status: 'pending', source: 'ics' };
  }).filter(Boolean);
}

export function toICS(events, locations = []) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ViaTempo//Agenda 1.0//PT-BR', 'CALSCALE:GREGORIAN'];
  events.forEach((event) => {
    const location = locations.find((item) => item.id === event.locationId)?.address || event.importedLocation || '';
    const stamp = `${event.date.replaceAll('-', '')}T${(event.time || '09:00').replace(':', '')}00`;
    lines.push('BEGIN:VEVENT', `UID:${escapeICS(event.id)}@viatempo.local`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`, `DTSTART:${stamp}`, `SUMMARY:${escapeICS(event.title)}`);
    if (location) lines.push(`LOCATION:${escapeICS(location)}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function normalizeImportedJSON(value) {
  const payload = Array.isArray(value) ? { events: value } : value;
  if (!payload || !Array.isArray(payload.events)) throw new Error('JSON inválido: era esperado um objeto com a lista "events".');
  const events = payload.events.map((event, index) => {
    if (!event || typeof event !== 'object' || !event.title || !/^\d{4}-\d{2}-\d{2}$/.test(event.date) || !/^\d{2}:\d{2}$/.test(event.time)) {
      throw new Error(`Compromisso ${index + 1}: informe title, date (AAAA-MM-DD) e time (HH:MM).`);
    }
    return { id: event.id || `json-${Date.now()}-${index}`, title: String(event.title).slice(0, 120), date: event.date, time: event.time, locationId: event.locationId || '', importedLocation: event.location || event.importedLocation || '', travelMinutes: Number(event.travelMinutes ?? event.travelTime ?? 30), prepMinutes: Number(event.prepMinutes ?? 30), bufferMinutes: Number(event.bufferMinutes ?? 15), trafficDelay: Number(event.trafficDelay ?? 0), alertThreshold: Number(event.alertThreshold ?? 5), status: 'pending', source: 'json' };
  });
  return { events, locations: Array.isArray(payload.locations) ? payload.locations : [], preferences: payload.preferences || {}, feedback: Array.isArray(payload.feedback) ? payload.feedback : [] };
}
