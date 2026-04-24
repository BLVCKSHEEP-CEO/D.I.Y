import { isSupabaseConfigured, supabase } from './supabase';

const STORAGE_KEY = 'diy.telemetry.events';

function loadEvents() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveEvents(events) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-300)));
}

export async function trackEvent(type, payload = {}) {
  const event = {
    id: crypto.randomUUID(),
    type,
    payload,
    createdAt: new Date().toISOString()
  };

  const next = [...loadEvents(), event];
  saveEvents(next);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('telemetry_events').insert({
        event_type: type,
        payload,
        created_at: event.createdAt
      });
    } catch {
      // Keep telemetry fire-and-forget.
    }
  }
}

export function getLocalTelemetryEvents() {
  return loadEvents();
}







