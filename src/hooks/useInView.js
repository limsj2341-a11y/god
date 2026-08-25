import { useEffect, useRef, useState } from 'react';

/**
 * 요소가 뷰포트에 들어왔는지. 기본은 한 번 보이면 계속 true (once).
 * 스크롤할 때마다 다시 애니메이션되는 산만함을 막는다.
 */
export function useInView({ threshold = 0.15, rootMargin = '0px 0px -12% 0px', once = true } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, inView];
}

export default useInView;
