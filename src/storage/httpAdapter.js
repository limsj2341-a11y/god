/**
 * 백엔드로 옮길 때 쓰는 어댑터 (스텁).
 *
 * 서버가 준비되면 .env 에 VITE_WALL_API=https://... 를 넣기만 하면
 * storage/index.js 가 이쪽을 고르고, 컴포넌트 코드는 한 줄도 바뀌지 않는다.
 *
 * 서버가 맞춰야 할 계약:
 *   GET  {baseUrl}/entries        -> [{ id, text, createdAt }, ...]  (최신순)
 *   POST {baseUrl}/entries        <- { text }   ->  { id, text, createdAt }
 */
export function createHttpAdapter({ baseUrl, pollMs = 15000 } = {}) {
  if (!baseUrl) throw new Error('createHttpAdapter: baseUrl 이 필요합니다.');

  const root = baseUrl.replace(/\/$/, '');
  const listeners = new Set();
  let timer = null;
  let lastSerialized = '';

  const emit = (items) => {
    for (const fn of listeners) fn(items);
  };

  async function fetchEntries() {
    const res = await fetch(`${root}/entries`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`담벼락을 불러오지 못했습니다 (${res.status})`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  async function poll() {
    try {
      const items = await fetchEntries();
      const serialized = JSON.stringify(items.map((i) => i.id));
      if (serialized !== lastSerialized) {
        lastSerialized = serialized;
        emit(items);
      }
    } catch {
      /* 네트워크 실패는 조용히 넘기고 다음 주기에 다시 시도 */
    }
  }

  function ensurePolling() {
    if (timer || listeners.size === 0) return;
    timer = setInterval(poll, pollMs);
  }

  function stopPolling() {
    if (timer && listeners.size === 0) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    name: 'http',

    async list() {
      const items = await fetchEntries();
      lastSerialized = JSON.stringify(items.map((i) => i.id));
      return items;
    },

    async add(text) {
      const res = await fetch(`${root}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`등록에 실패했습니다 (${res.status})`);
      const entry = await res.json();
      emit(await fetchEntries());
      return entry;
    },

    subscribe(fn) {
      listeners.add(fn);
      ensurePolling();
      return () => {
        listeners.delete(fn);
        stopPolling();
      };
    },

    async clear() {
      throw new Error('http 어댑터에서는 전체 삭제를 지원하지 않습니다.');
    },
  };
}

export default createHttpAdapter;
