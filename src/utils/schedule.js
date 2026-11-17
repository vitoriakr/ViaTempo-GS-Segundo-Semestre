export const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export function calculateSchedule(event) {
  const [hour, minute] = (event.time || '00:00').split(':').map(Number);
  const appointment = new Date(`${event.date}T00:00:00`);
  appointment.setHours(hour, minute, 0, 0);
  const travel = Number(event.travelMinutes) || 0;
  const prep = Number(event.prepMinutes) || 0;
  const buffer = Number(event.bufferMinutes) || 0;
  const departure = new Date(appointment.getTime() - (travel + buffer) * 60000);
  const prepare = new Date(departure.getTime() - prep * 60000);
  return { appointment, departure, prepare };
}

export const formatTime = (value) => new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const formatDate = (value, options = { weekday: 'long', day: 'numeric', month: 'long' }) => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', options);
export const minutesBetween = (a, b) => Math.round((new Date(a) - new Date(b)) / 60000);

export function buildRecommendation(event) {
  const schedule = calculateSchedule(event);
  const delay = Math.max(0, Number(event.trafficDelay) || 0);
  const recommendedDeparture = new Date(schedule.departure.getTime() - delay * 60000);
  const recommendedPrepare = new Date(recommendedDeparture.getTime() - (Number(event.prepMinutes) || 0) * 60000);
  const change = delay >= (Number(event.alertThreshold) || 5);
  return {
    ...schedule,
    recommendedDeparture: change ? recommendedDeparture : schedule.departure,
    recommendedPrepare: change ? recommendedPrepare : schedule.prepare,
    delay,
    change,
  };
}

export function findScheduleConflicts(events) {
  const conflicts = new Map();
  const byDate = events.reduce((groups, event) => {
    groups[event.date] ||= [];
    groups[event.date].push(event);
    return groups;
  }, {});

  Object.values(byDate).forEach((dayEvents) => {
    const scheduled = dayEvents.map((event) => {
      const schedule = calculateSchedule(event);
      return { event, start: schedule.prepare.getTime(), end: schedule.appointment.getTime() };
    }).sort((a, b) => a.start - b.start);

    scheduled.forEach((current, index) => {
      scheduled.slice(index + 1).forEach((next) => {
        if (next.start >= current.end) return;
        conflicts.set(current.event.id, [...(conflicts.get(current.event.id) || []), next.event.title]);
        conflicts.set(next.event.id, [...(conflicts.get(next.event.id) || []), current.event.title]);
      });
    });
  });

  return conflicts;
}
