/**
 * Supabase(PostgREST) 담벼락 어댑터.
 *
 * @supabase/supabase-js 를 쓰지 않고 fetch 로 직접 붙는다. 필요한 것이
 * 목록 읽기와 한 줄 넣기뿐이라 클라이언트 라이브러리를 통째로 번들에
 * 싣는 값을 하지 않는다.
 *
 * storage/index.js 의 인터페이스를 그대로 따른다:
 *   list() / add(text) / subscribe(fn) / clear()
 */

const MAX_ROWS = 200;

/** DB 컬럼(created_at)을 화면이 쓰는 이름(createdAt)으로 옮긴다 */
function toEntry(row) {
  return {
    id: row.id,
    text: row.text,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
  };
}

/** PostgREST 오류를 사람이 읽을 수 있는 문장으로 */
async function describeError(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* 본문이 없을 수도 있다 */
  }

  // RLS 정책이나 길이 제약에 걸린 경우
  if (body?.code === '42501' || res.status === 401 || res.status === 403) {
    return '한 문장(80자 이내)으로 남겨 주세요.';
  }
  if (body?.code === '23514') {
    return '한 문장(80자 이내)으로 남겨 주세요.';
  }
  if (res.status === 429) {
    return '잠시 후 다시 시도해 주세요.';
  }
  if (res.status >= 500) {
    return '담벼락 서버가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.';
  }
  return body?.message || `등록하지 못했습니다 (${res.status})`;
}

export function createSupabaseAdapter({ url, key, table = 'wall_entries', pollMs = 20000 } = {}) {
  if (!url || !key) throw new Error('createSupabaseAdapter: url 과 key 가 필요합니다.');

  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/${table}`;
  const headers = { apikey: key };

  const listeners = new Set();
  let timer = null;
  let lastSignature = '';

  const emit = (items) => {
    for (const fn of listeners) fn(items);
  };

  async function fetchEntries() {
    const res = await fetch(
      `${endpoint}?select=id,text,created_at&order=created_at.desc&limit=${MAX_ROWS}`,
      { headers },
    );
    if (!res.ok) throw new Error(await describeError(res));
    const rows = await res.json();
    return Array.isArray(rows) ? rows.map(toEntry) : [];
  }

  async function poll() {
    // 탭이 뒤에 있으면 굳이 물어보지 않는다 — 무료 플랜에서 요청을 아낀다
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const items = await fetchEntries();
      const signature = items.map((i) => i.id).join(',');
      if (signature !== lastSignature) {
        lastSignature = signature;
        emit(items);
      }
    } catch {
      /* 네트워크가 잠깐 끊긴 것일 수 있다. 다음 주기에 다시 시도한다. */
    }
  }

  const onVisible = () => {
    if (!document.hidden) poll();
  };

  function startPolling() {
    if (timer || listeners.size === 0) return;
    timer = setInterval(poll, pollMs);
    document.addEventListener('visibilitychange', onVisible);
  }

  function stopPolling() {
    if (listeners.size > 0) return;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    document.removeEventListener('visibilitychange', onVisible);
  }

  return {
    name: 'supabase',

    async list() {
      const items = await fetchEntries();
      lastSignature = items.map((i) => i.id).join(',');
      return items;
    },

    async add(text) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(await describeError(res));

      const rows = await res.json();
      const entry = toEntry(Array.isArray(rows) ? rows[0] : rows);

      // 내가 쓴 글이 바로 보이도록 목록을 다시 받아 알린다
      try {
        const items = await fetchEntries();
        lastSignature = items.map((i) => i.id).join(',');
        emit(items);
      } catch {
        /* 목록 갱신에 실패해도 등록 자체는 성공했다 */
      }

      return entry;
    },

    subscribe(fn) {
      listeners.add(fn);
      startPolling();
      return () => {
        listeners.delete(fn);
        stopPolling();
      };
    },

    async clear() {
      // DELETE 정책을 두지 않았으므로 클라이언트에서는 지울 수 없다.
      throw new Error('담벼락은 브라우저에서 비울 수 없습니다. Supabase 대시보드를 사용하세요.');
    },
  };
}

export default createSupabaseAdapter;
