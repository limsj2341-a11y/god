import { useCallback, useState } from 'react';
import { useScrollProgress } from './useScrollProgress';
import { OPEN_SPAN, PULL_SPAN } from '../components/layout/BookStage';

/**
 * 표지가 이만큼 젖혀졌는지(0~1). 한 번 넘으면 true 로 남는다.
 *
 * 1막 첫머리는 처음부터 화면 안에 있다 — 다만 표지와 막(.book-veil)에 덮여
 * 있을 뿐이다. 그래서 "화면에 들어오면" 을 기준으로 등장시키면 표지 아래에서
 * 아무도 못 보는 사이에 끝나 버린다. 표지가 열리는 순간에 맞춰야 한다.
 *
 * 되감아 표지를 다시 덮어도 false 로 돌아가지 않는다. 한 번 읽은 제목이
 * 다시 사라졌다 나타나면 등장이 아니라 깜빡임이다.
 */
export function useBookOpened(fraction = 0.75) {
  const [opened, setOpened] = useState(false);

  const onScroll = useCallback(
    ({ scrollY, viewportH }) => {
      if (scrollY >= viewportH * (PULL_SPAN + OPEN_SPAN * fraction)) setOpened(true);
    },
    [fraction],
  );

  useScrollProgress(onScroll);
  return opened;
}

export default useBookOpened;
