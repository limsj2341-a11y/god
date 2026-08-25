const KEY = 'tangbu.wall.v1';
const MAX_ITEMS = 500;

function read() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* 용량 초과 등은 무시 — 화면 상태는 이미 갱신되어 있다 */
  }
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * localStorage 기반 담벼락 어댑터.
 * 인터페이스는 storage/index.js 의 주석 참고 — 전부 Promise 를 돌려준다.
 */
export function createLocalAdapter() {
  const listeners = new Set();

  const emit = (items) => {
    for (const fn of listeners) fn(items);
  };

  // 다른 탭에서 글이 등록되면 이쪽 화면도 따라 켜진다
  const onStorage = (e) => {
    if (e.key === KEY) emit(read());
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }

  return {
    name: 'local',

    async list() {
      return read();
    },

    async add(text) {
      const entry = {
        id: makeId(),
        text,
        createdAt: new Date().toISOString(),
      };
      const next = [entry, ...read()];
      write(next);
      emit(next);
      return entry;
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    async clear() {
      try {
        window.localStorage.removeItem(KEY);
      } catch {
        /* noop */
      }
      emit([]);
    },
  };
}

export default createLocalAdapter;
