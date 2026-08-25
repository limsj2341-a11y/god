/**
 * 담벼락 백엔드(Supabase) 접속 정보.
 *
 * 이 키를 저장소에 두는 것은 실수가 아니다.
 * `sb_publishable_...` 키는 브라우저에 실려 나가라고 만들어진 키다 —
 * 어차피 배포된 사이트의 JS 번들 안에 그대로 들어 있고, 개발자 도구를 열면
 * 누구나 볼 수 있다. 실제 보호는 키가 아니라 데이터베이스의 RLS 정책이 한다.
 *
 * 지금 걸려 있는 정책 (wall_entries):
 *   - SELECT  : 누구나 (담벼락이므로)
 *   - INSERT  : 누구나, 단 1~80자
 *   - UPDATE  : 정책 없음 → 아무도 못 고침
 *   - DELETE  : 정책 없음 → 아무도 못 지움
 *
 * 절대 여기에 service_role 키(`sb_secret_...`)를 넣지 말 것. 그 키는 RLS 를
 * 통째로 우회한다.
 *
 * 로컬에서 다른 프로젝트를 붙이고 싶으면 .env 에 아래를 넣으면 덮어쓴다:
 *   VITE_SUPABASE_URL=...
 *   VITE_SUPABASE_KEY=...
 */
const env = import.meta.env ?? {};

export const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://uvveffiuekvjmbqhlqnt.supabase.co';

export const SUPABASE_KEY =
  env.VITE_SUPABASE_KEY || 'sb_publishable_RxP3nop-STT88ri9W7OoLg_P2AC6Amf';

export const WALL_TABLE = env.VITE_SUPABASE_WALL_TABLE || 'wall_entries';
