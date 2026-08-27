import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { animate, cubicBezier, stagger } from 'animejs';
import { EASE_RISE, RISE_PX } from '../../lib/anim';

const CHAR_STEP = 42; // 글자 사이 간격(ms)
const CHAR_DUR = 760;

/**
 * 글자를 하나씩 들어 올리는 등장. 제목처럼 한 번만 읽히는 짧은 문장에 쓴다.
 *
 * 쪼개기를 anime 의 텍스트 플러그인에 맡기지 않고 직접 span 으로 그린다.
 * 플러그인은 마운트된 뒤에 DOM 을 갈아끼우는데, 그러면 React 가 관리하는 자식과
 * 어긋나고 무엇보다 스크린 리더가 글자를 하나씩 따로 읽는다("탕... 부... 하...").
 * 여기서는 부모에 aria-label 로 원문을 주고 조각은 전부 aria-hidden 으로 덮는다.
 *
 * 시작 상태(opacity:0)를 인라인으로 박아 두되, anime 가 실패하면 즉시 되돌린다.
 * 제목이 보이지 않는 것은 연출이 없는 것보다 훨씬 나쁜 실패라, 라이브러리가
 * 어떻든 글자는 남아야 한다.
 */
export function SplitText({ text, as: Tag = 'span', className = '', delay = 0 }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (reduced) return undefined;

    const el = ref.current;
    if (!el) return undefined;

    const chars = el.querySelectorAll('[data-char]');
    if (chars.length === 0) return undefined;

    let anim;
    try {
      anim = animate(chars, {
        opacity: [0, 1],
        translateY: [RISE_PX, 0],
        duration: CHAR_DUR,
        delay: stagger(CHAR_STEP, { start: delay }),
        ease: cubicBezier(...EASE_RISE),
      });
    } catch {
      // 글자를 숨겨 놓고 살리지 못하는 상황 — 연출을 버리고 글을 살린다.
      setFailed(true);
      return undefined;
    }

    return () => anim.revert();
  }, [text, delay, reduced]);

  // 모션 축소이거나 연출이 죽었으면 평범한 글자로 그린다.
  const still = reduced || failed;

  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {Array.from(text).map((ch, i) =>
        ch === ' ' ? (
          // 공백은 쪼개지 않는다. inline-block 을 씌우면 줄바꿈 자리가 사라진다.
          <span key={i}> </span>
        ) : (
          <span
            key={i}
            data-char=""
            aria-hidden="true"
            className="inline-block"
            style={still ? undefined : { opacity: 0 }}
          >
            {ch}
          </span>
        ),
      )}
    </Tag>
  );
}

export default SplitText;
