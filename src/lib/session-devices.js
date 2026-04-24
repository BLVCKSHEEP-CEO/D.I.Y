const STORAGE_PREFIX = 'diy.account.devices';

function key(userId) {
  return `${STORAGE_PREFIX}.${userId || 'anon'}`;
}

function load(userId) {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(key(userId)) || '[]');
  } catch {
    return [];
  }
}

function save(userId, devices) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key(userId), JSON.stringify(devices));
}

function fingerprint() {
  if (typeof window === 'undefined') return 'server';
  const source = [navigator.userAgent, navigator.language, screen.width, screen.height].join('|');
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }
  return `dev-${Math.abs(hash)}`;
}

export function touchCurrentDevice(userId) {
  const id = fingerprint();
  const now = new Date().toISOString();
  const devices = load(userId);
  const existing = devices.find((device) => device.id === id);

  if (existing) {
    existing.lastSeenAt = now;
    save(userId, devices);
    return devices;
  }

  const next = [
    {
      id,
      label: navigator.platform || 'Unknown device',
      userAgent: navigator.userAgent,
      firstSeenAt: now,
      lastSeenAt: now,
      current: true
    },
    ...devices.map((device) => ({ ...device, current: false }))
  ];
  save(userId, next);
  return next;
}

export function listDevices(userId) {
  const currentId = fingerprint();
  return load(userId).map((device) => ({ ...device, current: device.id === currentId }));
}

export function revokeDevice(userId, deviceId) {
  const next = load(userId).filter((device) => device.id !== deviceId);
  save(userId, next);
  return next;
}

export function revokeAllOtherDevices(userId) {
  const currentId = fingerprint();
  const next = load(userId).filter((device) => device.id === currentId);
  save(userId, next);
  return next;
}







