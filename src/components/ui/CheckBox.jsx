import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { animate, cubicBezier, svg } from 'animejs';
import { EASE_RISE, softSpring } from '../../lib/anim';

/**
 * 실천 목록의 체크 칸.
 *
 * 칸은 motion 이 눌리듯 부풀었다 가라앉고, 체크 표시는 anime 가 선을 그어 그린다.
 * 표시가 그려지는 데 걸리는 시간이 있으므로 "표시가 켜졌다"가 아니라
 * "표시를 했다"로 읽힌다 — 하루치를 살아냈다고 손으로 긋는 목록이라 그 편이 맞다.
 *
 * 색은 peer-checked CSS 가 그대로 맡는다(input 은 형제 자리에 있다).
 * 획이 그려지지 않는 상황에서도 체크는 보여야 하므로, 실패하면 선을 온전히 남긴다.
 */
export function CheckBox({ on }) {
  const pathRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return undefined;

    if (reduced) {
      path.style.strokeDasharray = '';
      path.style.strokeDashoffset = '';
      return undefined;
    }

    let a;
    try {
      const [drawable] = svg.createDrawable(path);
      a = animate(drawable, {
        // 켜면 긋고, 끄면 왔던 길로 되감는다.
        draw: on ? ['0 0', '0 1'] : ['0 1', '0 0'],
        duration: on ? 420 : 260,
        ease: cubicBezier(...EASE_RISE),
      });
    } catch {
      // 그리지 못하면 자르지도 않는다 — 켜져 있으면 온전한 체크가 남는다.
      path.style.strokeDasharray = '';
      path.style.strokeDashoffset = '';
      return undefined;
    }

    return () => a.revert();
  }, [on, reduced]);

  return (
    <motion.span
      aria-hidden="true"
      animate={{ scale: on ? 1.08 : 1 }}
      transition={softSpring}
      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-hair transition-[background-color,border-color] duration-300 peer-checked:border-accent peer-checked:bg-accent"
    >
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path
          ref={pathRef}
          d="M2.5 7.5l3 3 6-7"
          stroke={on ? '#16171A' : 'transparent'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.span>
  );
}

export default CheckBox;
