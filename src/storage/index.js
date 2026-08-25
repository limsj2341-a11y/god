import { createLocalAdapter } from './localAdapter';
import { createHttpAdapter } from './httpAdapter';
import { createSupabaseAdapter } from './supabaseAdapter';
import { SUPABASE_KEY, SUPABASE_URL, WALL_TABLE } from './supabaseConfig';

/**
 * 담벼락 저장소 어댑터.
 *
 * 인터페이스 (모두 Promise 반환 — localStorage 도 async 로 감싼다.
 * 그래야 저장 위치를 바꿔도 호출부를 고칠 일이 없다):
 *
 *   list()            -> Promise<Entry[]>   최신순
 *   add(text)         -> Promise<Entry>
 *   subscribe(fn)     -> unsubscribe()      목록이 바뀔 때 Entry[] 로 호출
 *   clear()           -> Promise<void>
 *
 *   Entry = { id: string, text: string, createdAt: ISO8601 string }
 *
 * 고르는 순서:
 *   1. Supabase   — 기본값. 모든 방문자가 같은 담벼락을 본다.
 *   2. 직접 만든 API — .env 에 VITE_WALL_API 를 넣으면 그쪽을 쓴다.
 *   3. localStorage — 위 둘이 없을 때. 글이 이 브라우저 안에만 남는다.
 */
const env = import.meta.env ?? {};

function pickAdapter() {
  // 저장소 없이 브라우저에만 쌓고 싶을 때 (VITE_WALL_LOCAL=1)
  if (env.VITE_WALL_LOCAL === '1') return createLocalAdapter();

  if (env.VITE_WALL_API) return createHttpAdapter({ baseUrl: env.VITE_WALL_API });

  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      return createSupabaseAdapter({
        url: SUPABASE_URL,
        key: SUPABASE_KEY,
        table: WALL_TABLE,
      });
    } catch {
      /* 설정이 잘못됐으면 최소한 화면은 살려 둔다 */
    }
  }

  return createLocalAdapter();
}

export const wallStorage = pickAdapter();

export const MAX_LENGTH = 80;

/** 한 문장으로 다듬기 — 줄바꿈 제거, 연속 공백 정리, 길이 제한 */
export function normalizeEntryText(raw) {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LENGTH);
}

export default wallStorage;
