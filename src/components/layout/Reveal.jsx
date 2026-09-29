import { motion, useReducedMotion } from 'motion/react';
import { EASE_RISE, RISE_PX, RISE_SEC, VIEWPORT } from '../../lib/anim';

/*
 * y 가 아니라 transform 문자열로 움직인다.
 *
 * motion 은 y·x 같은 개별 값은 자바스크립트로 매 프레임 인라인 스타일을 고쳐
 * 쓰지만, opacity 와 transform 문자열은 브라우저의 하드웨어 가속 애니메이션
 * (Web Animations)에 맡긴다. 블록이 스무 곳 넘게 떠오르는 사이트라, 매 프레임
 * 스타일을 다시 계산하던 것이 스크롤 렉에 보탬이 됐다.
 */
const HIDDEN = { opacity: 0, transform: `translateY(${RISE_PX}px)` };
const SHOWN = { opacity: 1, transform: 'translateY(0px)' };

/**
 * 뷰포트에 들어오면 opacity/transform 으로 떠오른다.
 *
 * 전에는 IntersectionObserver 훅과 CSS(.reveal)가 나눠 맡았는데 이제 motion 이
 * 둘 다 한다. delay 는 예전처럼 ms 로 받는다 — 부르는 자리가 서른 곳 가까이 되는데
 * 단위까지 바꾸면 그 전부가 조용히 1000배 느려진다.
 *
 * 모션 축소일 때 MotionConfig 에 맡기지 않고 여기서 통째로 빠지는 이유:
 * MotionConfig 의 reducedMotion="user" 는 transform 만 끄고 opacity 는 그대로
 * 애니메이션한다. 그런데 원래 CSS 는 .reveal 의 opacity 도 1 로 못박아
 * 페이드조차 남기지 않았다. 그 뜻을 지킨다.
 */
export function Reveal({ as = 'div', delay = 0, className = '', play, children, ...rest }) {
  const reduced = useReducedMotion();

  if (reduced) {
    const Plain = as;
    return (
      <Plain className={className} {...rest}>
        {children}
      </Plain>
    );
  }

  const Tag = motion[as] ?? motion.div;

  // play 를 주면 화면 진입이 아니라 그 값으로 시작한다(표지 아래 1막 첫머리처럼
  // 처음부터 화면 안에 있지만 가려져 있는 자리).
  const trigger =
    play === undefined
      ? { whileInView: SHOWN, viewport: VIEWPORT }
      : { animate: play ? SHOWN : HIDDEN };

  return (
    <Tag
      className={className}
      initial={HIDDEN}
      {...trigger}
      transition={{ duration: RISE_SEC, ease: EASE_RISE, delay: delay / 1000 }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default Reveal;
