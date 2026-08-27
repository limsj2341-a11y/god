import { useEffect, useState } from 'react';
import { intro } from '../../data/content';

/**
 * 첫 화면 위에 얹히는 시작 안내.
 *
 * 스크롤이 조금이라도 움직이면 걷히고, 다시 돌아오지 않는다 — 되돌아왔을 때
 * 또 나타나면 안내가 아니라 방해가 된다.
 *
 * pointer-events 를 받지 않는다. 화면 전체를 덮는 층이라 클릭을 가로채면
 * 그 사이 목차 점도 본문 링크도 눌리지 않는다.
 *
 * 새로고침하면 다시 나온다 — 사이트를 다시 시작한 것이기 때문이다.
 * 브라우저의 스크롤 위치 복원은 main.jsx 에서 꺼 두었다.
 *
 * 앵커(#act2)로 들어온 경우에만 띄우지 않는다. 그건 특정 자리를 보러 온
 * 것이지 처음부터 읽으려는 것이 아니다.
 */

/** 이 정도 움직임은 스크롤로 치지 않는다 (주소창 접힘 등으로 몇 px 은 저절로 움직인다) */
const THRESHOLD = 4;

/** 걷히는 전환이 끝난 뒤 DOM 에서 빼기까지 */
const LEAVE_MS = 900;

export function ScrollIntro() {
  const [show, setShow] = useState(
    () => typeof window === 'undefined' || (!window.location.hash && window.scrollY <= THRESHOLD),
  );
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!show || leaving) return undefined;

    const onScroll = () => {
      if (window.scrollY <= THRESHOLD) return;
      setLeaving(true);
    };

    // 붙는 시점에 이미 내려가 있을 수도 있다
    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [show, leaving]);

  useEffect(() => {
    if (!leaving) return undefined;
    const t = setTimeout(() => setShow(false), LEAVE_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  if (!show) return null;

  return (
    <div
      aria-hidden={leaving ? 'true' : undefined}
      data-leaving={leaving ? 'true' : 'false'}
      // 책 아래에 붙인다. 가운데에 두면 표지 제목과 정확히 겹친다(실제로 겹쳤다).
      className="scroll-intro fixed inset-0 z-30 flex flex-col items-center justify-end gap-5 px-8 pb-10 text-center"
    >
      <p className="serif kr text-ink text-lg leading-relaxed sm:text-xl">{intro.line}</p>
      <span aria-hidden="true" className="scroll-intro-cue" />
    </div>
  );
}

export default ScrollIntro;
