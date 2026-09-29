import { useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useInView } from '../../hooks/useInView';

// Reveal(anim.js RISE_SEC)을 줄인 것과 같은 비율(0.9→0.55, 약 61%)로 맞춘다 —
// 제목만 유독 느리게 뜨면 뒤따르는 문단과 속도가 어긋나 보인다.
const CHAR_STEP = 26; // 글자 사이 간격(ms)

/*
 * 일어서기(flip). 글자가 뒤로 누운 채 깊은 곳에 있다가, 아랫변을 축으로
 * 한 자씩 일어서며 앞으로 나온다. 막 제목처럼 "장이 바뀌었다"를 알리는
 * 자리에만 쓴다. 떠오르기(rise)보다 길다 — 한 자가 90도를 돌아야 하는데
 * 짧게 몰아넣으면 돌아가는 것이 보이지 않고 깜빡이는 것처럼 보인다.
 */
const FLIP_STEP = 55;

/**
 * 글자를 하나씩 들어 올리는 등장. 제목처럼 한 번만 읽히는 짧은 문장에 쓴다.
 *
 * 움직임은 CSS 애니메이션이 맡는다(index.css .split-text). 전에는 anime.js 가
 * 매 프레임 글자마다 인라인 스타일을 고쳐 썼는데, 그때마다 브라우저가 스타일을
 * 다시 계산해야 했다. 표지가 넘어가는 동안 1막 제목이 일어서면서 두 연출이
 * 겹쳤고, 성능 기록에서 표지 열기 구간의 스타일 재계산 1위가 제목 글자였다
 * (2초 동안 587번). CSS 애니메이션은 브라우저가 스스로 돌리므로 자바스크립트가
 * 끼어들지 않는다. 글자마다 다른 것은 시작 지연(animation-delay) 하나뿐이다.
 *
 * 쪼개기는 직접 span 으로 그린다. 부모에 aria-label 로 원문을 주고 조각은 전부
 * aria-hidden 으로 덮어, 스크린 리더가 글자를 하나씩 따로 읽지 않게 한다.
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
  const reduced = useReducedMotion();
  const [viewRef, inView] = useInView({ threshold: 0, rootMargin: '0px 0px -15% 0px' });

  // 한 번 시작하면 끝까지 간다. play 가 다시 false 가 되어도 되감지 않는다.
  const [started, setStarted] = useState(false);
  const go = play ?? (trigger === 'view' ? inView : true);
  if (go && !started) setStarted(true);

  const flip = variant === 'flip';
  const step = flip ? FLIP_STEP : CHAR_STEP;

  let n = 0;
  return (
    <Tag
      ref={viewRef}
      className={`split-text ${flip ? 'split-flip' : 'split-rise'} ${
        reduced ? 'is-still' : started ? 'is-playing' : ''
      } ${className}`}
      aria-label={text}
    >
      {Array.from(text).map((ch, i) => {
        // 공백은 쪼개지 않는다. inline-block 을 씌우면 줄바꿈 자리가 사라진다.
        if (ch === ' ') return <span key={i}> </span>;
        const order = n;
        n += 1;
        return (
          <span
            key={i}
            data-char=""
            aria-hidden="true"
            className="inline-block"
            style={{ animationDelay: `${delay + order * step}ms` }}
          >
            {ch}
          </span>
        );
      })}
    </Tag>
  );
}

export default SplitText;
