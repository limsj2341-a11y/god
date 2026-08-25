import { createLocalAdapter } from './localAdapter';
import { createHttpAdapter } from './httpAdapter';

/**
 * 담벼락 저장소 어댑터.
 *
 * 인터페이스 (모두 Promise 반환 — localStorage 도 async 로 감싼다.
 * 그래야 나중에 서버로 바꿔도 호출부를 고칠 일이 없다):
 *
 *   list()            -> Promise<Entry[]>   최신순
 *   add(text)         -> Promise<Entry>
 *   subscribe(fn)     -> unsubscribe()      목록이 바뀔 때 Entry[] 로 호출
 *   clear()           -> Promise<void>
 *
 *   Entry = { id: string, text: string, createdAt: ISO8601 string }
 *
 * 교체 방법: .env 파일에 VITE_WALL_API 를 넣으면 자동으로 http 어댑터를 쓴다.
 *   VITE_WALL_API=https://example.com/api
 */
const apiBase = import.meta.env?.VITE_WALL_API;

export const wallStorage = apiBase
  ? createHttpAdapter({ baseUrl: apiBase })
  : createLocalAdapter();

export const MAX_LENGTH = 80;

/** 한 문장으로 다듬기 — 줄바꿈 제거, 연속 공백 정리, 길이 제한 */
export function normalizeEntryText(raw) {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LENGTH);
}

export default wallStorage;
