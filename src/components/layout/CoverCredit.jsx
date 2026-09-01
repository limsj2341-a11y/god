import { useCallback, useState } from 'react';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { COVER_SPAN } from './BookStage';

/**
 * 책장 구간(책을 꺼내 펼치기 전)에만 뜨는 작은 서명.
 *
 * ActNav 의 atCover 판단을 그대로 가져다 쓴다 — "아직 책을 안 폈다"의 기준이
 * 두 곳에서 다르면 한쪽은 책장인데 다른 쪽은 이미 펼쳐진 것으로 보인다.
 *
 * 클릭을 받지 않는다. 화면 구석에 얹히는 표시일 뿐, 책장이나 목차를
 * 가로챌 이유가 없다.
 */
export function CoverCredit() {
  const [atCover, setAtCover] = useState(true);

  const onScroll = useCallback(({ scrollY, viewportH }) => {
    setAtCover(scrollY < viewportH * COVER_SPAN);
  }, []);

  useScrollProgress(onScroll);

  return (
    <p
      className={`text-faint pointer-events-none fixed bottom-4 left-4 z-20 text-[11px] tracking-wide transition-opacity duration-700 ${
        atCover ? 'opacity-60' : 'opacity-0'
      }`}
    >
      made by 20626임승주
    </p>
  );
}

export default CoverCredit;
