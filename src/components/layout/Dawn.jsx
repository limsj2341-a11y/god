import { useMemo } from 'react';

/** 빛에서 떨어져 나와 떠오르는 불씨 수 */
const EMBER_COUNT = 26;

/**
 * 3막에서 4막으로 — 등불 하나가 새벽이 되어 화면을 덮는다.
 *
 * 화면에 고정된 레이어 하나. 크기와 불씨의 위치는 Page(3막, dissolve)가 루트에
 * 써 주는 값을 CSS 가 그대로 읽는다. 여기서는 자바스크립트로 아무것도 움직이지
 * 않는다 — 소멸 계산과 빛의 그림이 서로 얽히지 않게 TableLight 와 같은 방식을 쓴다.
 *
 *   --dawn-s    빛의 원 크기(0~1). 1 이면 화면을 넉넉히 덮는다.
 *   --dawn      원이 켜지는 정도(0~1). 크기가 0 에서 툭 튀어나오지 않게 한다.
 *   --dissolve  소멸 진행도(0~1). 불씨가 이 값에 물려 떠오른다 — 되감으면 내려온다.
 *
 * 다 번진 뒤에는 이 원이 곧 4막의 바탕이다. 그래서 main 안, 3막 페이지와 4막
 * 사이에 둔다. 문서 순서상 3막 위, 4막 아래에 그려진다.
 *
 * 원은 커다란 판 하나를 transform: scale 로 키운다. 그라데이션의 크기를 바꾸면
 * 매 프레임 화면 전체를 다시 칠하는데, 판을 키우면 합성만 다시 한다.
 */
export function Dawn() {
  const embers = useMemo(
    () =>
      Array.from({ length: EMBER_COUNT }, (_, i) => {
        // 황금각으로 흩어 규칙이 보이지 않게 한다
        const a = i * 2.399963;
        const r = 2 + ((i * 29) % 13);
        return {
          id: i,
          x: `${(Math.cos(a) * r * 1.6).toFixed(2)}vmin`,
          y: `${(Math.sin(a) * r * 0.6).toFixed(2)}vmin`,
          // 떠오르는 높이 — 제각각이어야 한 장의 판으로 안 보인다
          rise: `${(28 + ((i * 17) % 34)).toFixed(0)}vh`,
          sway: `${((i % 2 ? 1 : -1) * (6 + (i % 5) * 5)).toFixed(0)}px`,
          // 켜지는 시점 — 빛이 커지는 동안 차례로 떨어져 나온다
          start: (0.04 + ((i * 7) % 26) / 100).toFixed(2),
          size: 2 + (i % 3),
        };
      }),
    [],
  );

  return (
    <div aria-hidden="true" className="dawn">
      {/* 후광이 원 뒤에 깔린다 — 앞에 두면 원 안쪽까지 앰버로 물든다 */}
      <div className="dawn-rim" />
      <div className="dawn-disc" />
      <div className="dawn-embers">
        {embers.map((e) => (
          <span
            key={e.id}
            className="dawn-ember"
            style={{
              '--ex': e.x,
              '--ey': e.y,
              '--rise': e.rise,
              '--sway': e.sway,
              '--start': e.start,
              width: e.size,
              height: e.size,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default Dawn;
