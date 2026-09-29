import { useMemo } from 'react';

/** 식탁 조명 속을 떠다니는 빛 알갱이 수 */
const MOTE_COUNT = 14;

/**
 * 소멸 3단계에서 흘러내린 빛이 그대로 4막의 식탁 조명이 된다.
 *
 * 화면에 고정된 레이어 하나로, 위치와 밝기는 Page(3막)가 루트에 써 주는
 * --flow-y / --flow-o 를 그대로 읽는다. 자바스크립트에서 이 요소를 직접
 * 만지지 않으므로 소멸 계산과 조명 표현이 서로 얽히지 않는다.
 *
 * 조명 속에는 빛 알갱이가 천천히 떠오른다 — 잔칫상 위의 따뜻한 공기다.
 * 3막 끝에서 떠오르던 불씨(Dawn)가 식어 내려앉은 것이라, 같은 빛깔을 쓰되
 * 훨씬 느리고 옅다. 읽는 글 뒤에 깔리므로 눈을 끌면 안 된다.
 *
 * main 안에서 새벽(Dawn) 바로 위, 4막 본문 아래에 놓인다(App.jsx 순서).
 * 새벽이 4막의 바탕이 되므로, 그보다 아래 깔리면 조명이 가려진다.
 */
export function TableLight() {
  const motes = useMemo(
    () =>
      Array.from({ length: MOTE_COUNT }, (_, i) => ({
        id: i,
        left: `${(8 + ((i * 53) % 84)).toFixed(0)}%`,
        size: 2 + (i % 3),
        dur: `${16 + (i % 5) * 3.5}s`,
        delay: `${-((i * 3.7) % 16).toFixed(1)}s`,
        drift: `${(i % 2 ? 1 : -1) * (14 + (i % 4) * 9)}px`,
      })),
    [],
  );

  return (
    <>
      <div aria-hidden="true" className="table-light" />
      <div aria-hidden="true" className="table-motes">
        {motes.map((m) => (
          <span
            key={m.id}
            className="table-mote"
            style={{
              left: m.left,
              width: m.size,
              height: m.size,
              '--drift': m.drift,
              animationDuration: m.dur,
              animationDelay: m.delay,
            }}
          />
        ))}
      </div>
    </>
  );
}

export default TableLight;
