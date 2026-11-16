export function createInitialData() {
  return {
    locations: [],
    events: [],
    preferences: { alertThreshold: 5, defaultPrepMinutes: 30, defaultBufferMinutes: 15, notifications: true },
    feedback: [],
    onboardingCompleted: false,
  };
}
