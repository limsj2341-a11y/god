import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { animate, cubicBezier, stagger } from 'animejs';
import { EASE_RISE, RISE_PX } from '../../lib/anim';
import { useInView } from '../../hooks/useInView';

// Reveal(anim.js RISE_SEC)을 줄인 것과 같은 비율(0.9→0.55, 약 61%)로 맞춘다 —
// 제목만 유독 느리게 뜨면 뒤따르는 문단과 속도가 어긋나 보인다.
const CHAR_STEP = 26; // 글자 사이 간격(ms)
const CHAR_DUR = 460;

/*
 * 일어서기(flip). 글자가 뒤로 누운 채 깊은 곳에 있다가, 아랫변을 축으로
 * 한 자씩 일어서며 앞으로 나온다. 막 제목처럼 "장이 바뀌었다"를 알리는
 * 자리에만 쓴다.
 *
 * 떠오르기(rise)보다 길다. 한 자가 90도를 돌아야 하는데 460ms 에 몰아넣으면
 * 돌아가는 것이 보이지 않고 깜빡이는 것처럼 보인다.
 */
const FLIP_STEP = 55;
const FLIP_DUR = 900;
const FLIP_EASE = cubicBezier(0.16, 1, 0.3, 1);

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
 *
 * 언제 시작하는가:
 *   play 를 주면 그 값이 true 가 되는 순간.
 *   안 주면 화면에 들어오는 순간(trigger='view') 또는 마운트 즉시(trigger='mount').
 *
 * @param {'rise'|'flip'} [variant='rise']
 * @param {'mount'|'view'} [trigger='mount']
 * @param {boolean} [play]  바깥에서 시작 시점을 쥘 때
 */
export function SplitText({
  text,
  as: Tag = 'span',
  className = '',
  delay = 0,
  variant = 'rise',
  trigger = 'mount',
  play,
}) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const [viewRef, inView] = useInView({ threshold: 0, rootMargin: '0px 0px -15% 0px' });

  const go = play ?? (trigger === 'view' ? inView : true);
  const flip = variant === 'flip';

  // 관찰용 ref 와 연출용 ref 가 같은 요소를 본다
  const setRefs = (el) => {
    ref.current = el;
    viewRef.current = el;
  };

  useEffect(() => {
    if (reduced || !go) return undefined;

    const el = ref.current;
    if (!el) return undefined;

    const chars = el.querySelectorAll('[data-char]');
    if (chars.length === 0) return undefined;

    let anim;
    try {
      anim = flip
        ? animate(chars, {
            opacity: [0, 1],
            rotateX: [-92, 0],
            translateY: ['0.35em', 0],
            translateZ: [-60, 0],
            duration: FLIP_DUR,
            delay: stagger(FLIP_STEP, { start: delay }),
            ease: FLIP_EASE,
            // 다 선 뒤에는 3D 변환을 걷는다. 각도가 0 이라도 3D 변환이 남아 있으면
            // 글자가 따로 합성되어 배율 1 화면에서 흐려진다(책 제목에서 겪은 일).
            onComplete: () => {
              chars.forEach((c) => {
                c.style.transform = '';
              });
            },
          })
        : animate(chars, {
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
  }, [text, delay, reduced, go, flip]);

  // 모션 축소이거나 연출이 죽었으면 평범한 글자로 그린다.
  const still = reduced || failed;

  return (
    <Tag
      ref={setRefs}
      className={`${flip && !still ? 'split-flip' : ''} ${className}`}
      aria-label={text}
    >
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
