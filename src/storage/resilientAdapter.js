/**
 * 원격 저장소가 죽어도 담벼락이 계속 동작하게 감싸는 층.
 *
 * Supabase 무료 프로젝트는 일주일쯤 요청이 없으면 자동으로 멈춘다. 그때
 * 담벼락은 빈 채로 보이고 글을 남기면 실패했다. 이 층은 그 순간 로컬 저장으로
 * 내려앉아 사이트가 계속 굴러가게 하고, 원격이 돌아오면 그동안 이 기기에 쌓인
 * 글을 담벼락에 올려보낸다.
 *
 * 두 가지를 구별해야 한다.
 *   - 원격이 죽음   → 내려앉는다
 *   - 사용자 입력 문제(길이 초과 등) → 그대로 알린다. 내려앉으면 안 된다.
 * 어댑터가 돌려주는 오류 메시지만으로는 가를 수 없어서, 실패했을 때 목록을 한 번
 * 더 읽어 본다. 그것도 실패하면 죽은 것이고, 성공하면 입력 문제였다.
 */

const PENDING_KEY = 'tangbu.wall.pending.v1';

function readPending() {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePending(list) {
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(list));
  } catch {
    /* 용량 초과 등은 무시 — 글은 이미 로컬 목록에 들어가 있다 */
  }
}

/**
 * @param {object} o
 * @param {object} o.remote  기본 저장소 (Supabase 등)
 * @param {object} o.local   내려앉을 곳 (localStorage)
 * @param {number} o.recheckMs  내려앉은 뒤 원격을 다시 두드려 보는 간격
 */
export function createResilientAdapter({ remote, local, recheckMs = 60000 }) {
  let mode = 'remote';
  let lastProbe = 0;

  const listeners = new Set();
  const modeListeners = new Set();
  let unsubActive = null;

  const emit = (items) => {
    for (const fn of listeners) fn(items);
  };

  const activeStore = () => (mode === 'remote' ? remote : local);

  /** 구독을 지금 살아 있는 쪽으로 옮겨 붙인다 */
  function rewire() {
    if (unsubActive) {
      unsubActive();
      unsubActive = null;
    }
    if (listeners.size > 0) unsubActive = activeStore().subscribe(emit);
  }

  function setMode(next) {
    if (mode === next) return;
    mode = next;
    rewire();
    for (const fn of modeListeners) fn(mode);
  }

  /** 원격이 정말 죽었는지 확인 — 목록 읽기가 되면 살아 있는 것이다 */
  async function remoteIsDown() {
    try {
      await remote.list();
      return false;
    } catch {
      return true;
    }
  }

  /**
   * 내려앉아 있는 동안 쌓인 글을 담벼락에 올린다.
   *
   * 한 번에 하나만 돌아야 한다. list() 가 겹쳐 불리면(개발 모드의 이중 마운트,
   * 탭 두 개 등) 양쪽이 같은 대기열을 읽고 각자 올려보내 같은 글이 두 번
   * 들어간다 — 실제로 그렇게 됐다.
   */
  let flushing = null;

  function flushPending() {
    if (flushing) return flushing;

    flushing = (async () => {
      const pending = readPending();
      if (pending.length === 0) return;

      const left = [];
      for (const text of pending) {
        try {
          await remote.add(text);
        } catch {
          // 하나가 실패하면 그것만 남겨 두고 다음에 다시 시도한다
          left.push(text);
        }
      }
      writePending(left);
    })().finally(() => {
      flushing = null;
    });

    return flushing;
  }

  return {
    name: 'resilient',

    /** 'remote' | 'local' — 화면이 안내 문구를 띄울지 판단하는 데 쓴다 */
    getMode: () => mode,

    onModeChange(fn) {
      modeListeners.add(fn);
      return () => modeListeners.delete(fn);
    },

    async list() {
      // 내려앉아 있다면 이따금 원격을 다시 두드려 본다
      if (mode === 'local' && Date.now() - lastProbe > recheckMs) {
        lastProbe = Date.now();
        if (!(await remoteIsDown())) setMode('remote');
      }

      if (mode === 'remote') {
        try {
          let items = await remote.list();

          // 원격에 닿은 김에 밀린 글을 올려보낸다.
          // 전환 시점(local→remote)에만 하면 안 된다 — 새로고침하면 mode 가
          // remote 로 시작하므로 그 경로를 아예 지나지 않아 대기열이 영영 남는다.
          if (readPending().length > 0) {
            await flushPending();
            try {
              items = await remote.list();
            } catch {
              /* 방금 받아 둔 목록으로 충분하다 */
            }
          }

          return items;
        } catch {
          setMode('local');
        }
      }

      return local.list();
    },

    async add(text) {
      if (mode === 'remote') {
        try {
          return await remote.add(text);
        } catch (err) {
          if (!(await remoteIsDown())) throw err; // 입력 문제였다
          setMode('local');
        }
      }

      const entry = await local.add(text);
      writePending([...readPending(), text]);
      return entry;
    },

    subscribe(fn) {
      listeners.add(fn);
      if (!unsubActive) unsubActive = activeStore().subscribe(emit);
      return () => {
        listeners.delete(fn);
        if (listeners.size === 0 && unsubActive) {
          unsubActive();
          unsubActive = null;
        }
      };
    },

    async clear() {
      await activeStore().clear();
    },
  };
}

export default createResilientAdapter;
