import { useCallback, useEffect, useRef } from 'react';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { clamp01, easeSoft, easeTurn, stage } from '../../lib/motion';
import { TURN_PHASE, TURN_RUNWAY } from '../../lib/anim';
import { site } from '../../data/content';
import { documentTop } from '../../lib/dom';

/**
 * 화면에 고정된 책 그 자체.
 *
 * 본문(main)은 이 위를 지나간다. 책은 움직이지 않고 글만 흐르므로,
 * 읽는 사람 눈에는 "펼쳐 둔 책의 지면을 따라 글이 넘어가는" 것으로 보인다.
 * 스크롤을 가로채지 않는 이유가 여기 있다 — 책 안쪽에 따로 스크롤 상자를 만들면
 * 모바일에서 관성 스크롤과 주소창 접힘이 전부 깨지고, 키보드 이동도 잃는다.
 *
 * 세 구간으로 산다.
 *   1. 덮인 책  — 활주로(BookRunway) 구간. 표지가 닫혀 있다.
 *   2. 펼침     — 활주로를 내려오는 동안 표지가 왼쪽으로 젖혀진다.
 *   3. 소멸     — 3막이 흩어질 때 책도 함께 빛으로 사라진다(--act4-in 을 그대로 읽는다).
 *
 * 스크롤마다 state 를 갱신하지 않는다. BackgroundStage 와 같은 이유로
 * 루트의 CSS 변수에만 쓴다.
 */

/**
 * 책을 책장에서 꺼내는 데 쓰는 스크롤 거리 (뷰포트 높이 대비).
 * 책등만 보이던 책이 앞으로 나오면서 표지를 이쪽으로 돌린다.
 */
export const PULL_SPAN = 0.9;

/** 표지가 다 젖혀지는 데 쓰는 스크롤 거리 (뷰포트 높이 대비) */
export const OPEN_SPAN = 0.82;

/**
 * 책을 꺼내고 펼치는 데 드는 전체 거리.
 * 목차(ActNav)가 이 값으로 "아직 책을 다 펴지 않았는지"를 판단하고,
 * BookRunway 가 이만큼 빈 자리를 만든다.
 */
export const COVER_SPAN = PULL_SPAN + OPEN_SPAN;


/**
 * 책장에 꽂힌 것들.
 *
 * 한 칸은 낱개가 아니라 "뭉치"로 채운다. 고르게 흩어 놓으면 울타리 말뚝처럼
 * 보인다 — 실제 책장은 책끼리 붙어 서고 뭉치 사이가 빈다.
 *
 * b = 책 { h: 칸 높이 대비, w: px, tone: 색상각, lean: 기울기(도) }
 * o = 소품, g = 빈 자리(px)
 */
/**
 * 책 한 권.
 *   h     칸 높이 대비
 *   w     폭(px) — 두께가 제각각이어야 한 벌로 안 보인다
 *   tone  색상각
 *   pat   겉면 무늬 (bands | label | stripes | line | twin | plain)
 *   title 책등에 세로로 적히는 제목
 *   lean  기울기(도)
 *   lift  밝기 보정
 *
 * 폭은 제목이 들어갈 만큼은 돼야 한다 — 16px 아래로 내려가면 세로 글줄이
 * 책등을 넘어간다.
 */
const B = (h, w, tone, pat, title, lean, lift) => ({ t: 'b', h, w, tone, pat, title, lean, lift });
const O = (kind) => ({ t: 'o', kind });
const G = (w) => ({ t: 'g', w });

/*
 * 칸 하나의 안폭은 칸 높이의 2.3 배다(--case-row-h 기준). 사진의 책장이
 * 그 비율이었고, 책 한 권의 키를 기준으로 잡으면 화면이 바뀌어도 같은 책장이다.
 * 한 칸에 든 책은 안폭의 85~90% 를 차지한다 — 그보다 적으면 텅 비어 보이고,
 * 꽉 채우면 책장이 아니라 벽돌담이 된다.
 */
const ROWS = [
  {
    items: [
      B(0.64, 26, 205, 'bands', '잃은 양'),
      B(0.72, 34, 28, 'label', '은혜', -8),
      B(0.66, 22, 152, 'line', '먼 나라'),
      G(34),
      B(0.7, 30, 188, 'twin', '아버지'),
      B(0.6, 38, 42, 'label', '돌아옴', 0, -5),
      B(0.68, 24, 96, 'stripes', '기다림'),
    ],
  },
  {
    items: [
      B(0.7, 30, 38, 'line', '두 아들'),
      B(0.62, 22, 172, 'bands', '잔치', 0, 5),
      B(0.74, 36, 208, 'label', '맏아들'),
      G(40),
      B(0.6, 26, 12, 'stripes', '품'),
      B(0.72, 34, 190, 'label', '용서', -6),
      B(0.64, 20, 60, 'twin', '길'),
    ],
  },
  // 우리 책이 서는 칸. 가운데가 아니라 왼쪽으로 조금 치우쳐 꽂혀 있다.
  {
    ours: true,
    left: [
      B(0.66, 22, 210, 'label', '첫째'),
      B(0.74, 26, 26, 'stripes', '언약', 0, 5),
      B(0.6, 20, 150, 'bands', '밤'),
    ],
    right: [
      B(0.7, 28, 10, 'bands', '광야'),
      B(0.62, 22, 188, 'line', '빛', 0, 4),
      B(0.75, 34, 40, 'label', '노래'),
      B(0.6, 24, 130, 'twin', '새벽'),
    ],
  },
  {
    items: [
      B(0.68, 24, 12, 'stripes', '사랑'),
      B(0.74, 32, 190, 'label', '탕자'),
      B(0.6, 20, 206, 'plain', '이름', -6),
      G(30),
      O('tallvase'),
      B(0.7, 28, 44, 'bands', '노을', 0, -4),
      B(0.62, 22, 168, 'line', '새옷'),
    ],
  },
  {
    items: [
      B(0.72, 28, 24, 'label', '형제'),
      B(0.6, 20, 150, 'bands', '유산', 0, -4),
      B(0.76, 42, 208, 'stripes', '집으로'),
      G(32),
      B(0.66, 24, 190, 'line', '반지'),
      B(0.7, 30, 40, 'twin', '신발'),
      B(0.6, 22, 100, 'label', '송아지'),
    ],
  },
];

/** 책·소품·빈자리를 하나씩 그린다 */
function ShelfItem({ it }) {
  if (it.t === 'g') return <span className="shelf-gap" style={{ '--g': it.w }} />;
  if (it.t === 'o') return <span className={`shelf-object shelf-${it.kind}`} />;
  return (
    <span
      className={`shelf-book pat-${it.pat ?? 'plain'}`}
      style={{
        '--h': it.h,
        '--w': it.w,
        '--tone': it.tone,
        '--lean': it.lean ?? 0,
        '--lift': it.lift ?? 0,
      }}
    >
      {it.title ? <i className="shelf-title">{it.title}</i> : null}
    </span>
  );
}

export function BookStage() {
  // 막과 막이 맞닿는 자리(문서 좌표). 여기서 낱장이 넘어간다.
  const seamsRef = useRef([]);

  useEffect(() => {
    const measure = () => {
      const pages = Array.from(document.querySelectorAll('[data-page]'));
      // 첫 페이지의 윗변은 경계가 아니다 — 그건 책을 펼치는 자리다.
      seamsRef.current = pages.slice(1).map(documentTop);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener('resize', measure);
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const onScroll = useCallback(({ scrollY, viewportH }) => {
    const root = document.documentElement;

    /* ── 책장에서 꺼내기 → 표지 펼치기 ──
     *
     * 두 동작을 한 구간에 겹쳐 넣으면 책이 아직 돌아서는 중에 표지가 열려
     * 무엇을 보고 있는지 알 수 없게 된다. 앞뒤로 잇는다.
     */
    const pull = easeSoft(clamp01(scrollY / Math.max(viewportH * PULL_SPAN, 1)));
    root.style.setProperty('--book-out', pull.toFixed(4));

    const openRaw = clamp01(
      (scrollY - viewportH * PULL_SPAN) / Math.max(viewportH * OPEN_SPAN, 1),
    );
    const open = easeSoft(openRaw);

    root.style.setProperty('--book-open', open.toFixed(4));

    // 책장은 책이 다 나오면 물러난다. 뒤에 남아 있으면 지면 위로 나뭇결이 비친다.
    root.style.setProperty('--shelf-out', (1 - pull).toFixed(4));

    // 표지가 젖혀지는 동안에는 뒤에 있는 본문을 눌러 둔다.
    // 표지가 반쯤 열린 상태에서 글이 이미 또렷하면, 책을 여는 것이 아니라
    // 글 위에 표지가 얹혀 있다가 치워지는 것으로 보인다.
    root.style.setProperty('--book-veil', (1 - open).toFixed(4));

    /* ── 낱장 넘김 ──
     *
     * 넘김은 막이 정해 둔 "넘김 구간"에서만 돈다.
     *
     * 전에는 경계를 화면 한가운데 두고 임의의 폭으로 걸었다. 그러면 종이가
     * 글 위를 지나가고, 넘김과 뒷 막의 등장이 한꺼번에 일어난다.
     * 지금은 각 막이 자기 글이 끝난 자리에 한 화면짜리 넘김 구간을 두고,
     * 그 구간에서는 글이 아예 멈춘다. 종이는 거기서만 넘어간다.
     *
     * 구간의 시작은 다음 막의 윗변과 같다(다음 막이 그만큼 위로 당겨져 있다).
     */
    const span = Math.max(viewportH * TURN_RUNWAY, 1);
    let turn = 0;

    for (const seam of seamsRef.current) {
      const p = clamp01((scrollY - seam) / span);
      // 진행 중인 넘김이 하나뿐이도록 — 0 도 1 도 아닌 값이 있으면 그것이 이긴다.
      if (p > 0 && p < 1) {
        // 구간 전체가 아니라 가운데 토막에서만 넘긴다.
        // 앞쪽은 앞 막의 글이 걷히는 시간, 뒤쪽은 뒷 막이 떠오르는 시간이다.
        turn = stage(p, ...TURN_PHASE.paper);
        break;
      }
    }

    root.style.setProperty('--turn', easeTurn(turn).toFixed(4));

    // 종이의 짙기 — 넘기는 내내 불투명하다.
    //
    // 한때 sin 곡선으로 한가운데만 짙게 했다. 종이가 글을 가리지 않게 하려던
    // 것인데, 하필 한가운데가 종이가 모로 서서 폭이 없는 지점이라 결과가
    // 거꾸로였다. 넓게 펼쳐졌을 때 가장 투명해서 넘김이 보이지 않았다.
    //
    // 지금은 넘김 구간에 아예 글이 없다(TURN_PHASE 가 먼저 걷어 낸다).
    // 가릴 것이 없으니 종이는 종이답게 불투명해도 된다.
    // 양 끝에서만 짧게 여닫아 툭 나타나고 툭 사라지는 것을 막는다.
    const EDGE = 0.12;
    const veil = clamp01(Math.min(1, turn / EDGE, (1 - turn) / EDGE));
    root.style.setProperty('--turn-veil', veil.toFixed(4));

    root.style.setProperty('--turn-on', turn > 0 && turn < 1 ? '1' : '0');
  }, []);

  useScrollProgress(onScroll);

  return (
    <>
      {/* 책장. 책이 다 나오면 물러난다. */}
      <div className="shelf" aria-hidden="true">
        <div className="bookcase">
          {ROWS.map((row, ri) => (
            <div className="case-row" key={ri}>
              {row.ours ? (
                <>
                  {/* 좌우 두 무리로 갈라 가운데를 정확히 비운다.
                      한 줄로 두고 가운데 책에 여백을 주면, 줄 전체 폭이 바뀌면서
                      빈자리가 화면 한가운데에서 밀려난다(실측: 39px 빗나갔다). */}
                  <span className="case-side case-side-left">
                    {row.left.map((it, i) => (
                      <ShelfItem it={it} key={i} />
                    ))}
                  </span>
                  <span className="case-side case-side-right">
                    {row.right.map((it, i) => (
                      <ShelfItem it={it} key={i} />
                    ))}
                  </span>
                </>
              ) : (
                <span className="case-run">
                  {row.items.map((it, i) => (
                    <ShelfItem it={it} key={i} />
                  ))}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 뒤 레이어 — 글보다 아래. 지면과 제본. */}
      <div className="book-stage book-stage-back" aria-hidden="true">
        <div className="book">
          <div className="book-page" />
          <div className="book-spine" />
          <div className="book-fore-edge" />
        </div>
      </div>

      {/* 앞 레이어 — 글보다 위.
          쌓임 맥락 때문에 한 레이어 안에서는 이걸 만들 수 없다. z-index 를 아무리
          올려도 부모(.book-stage)가 본문보다 아래면 자식도 그 안에 갇힌다.
          그래서 지면은 뒤에, 지면의 끝과 덮개는 앞에 따로 둔다. */}
      <div className="book-stage book-stage-front" aria-hidden="true">
        {/* 책 바깥 위아래를 덮는다. 지면 안쪽 페이드만으로는 책 밖으로 나간 글이
            바탕 위에 그대로 떠다닌다 — 책을 벗어난 글은 있어서는 안 된다. */}
        <div className="book-mask book-mask-top" />
        <div className="book-mask book-mask-bottom" />
        <div className="book-mask-side book-mask-left" />
        <div className="book-mask-side book-mask-right" />

        <div className="book">
          {/* 지면 위아래 끝. 글이 여기서 종이 색으로 스며들어 사라진다 —
              이 두 장이 "글이 책장 안에 있다"는 인상을 만드는 핵심이다. */}
          <div className="book-fade book-fade-top" />
          <div className="book-fade book-fade-bottom" />

          {/* 넘어가는 낱장. 막과 막 사이에서만 잠깐 나타난다.
              앞뒤 두 면이 있어야 젖혀지는 도중에 뒷면이 비치지 않는다.

              세 마디로 나눠 휘게 해 봤는데 곡선이 아니라 각도가 다른 평면
              세 장으로 보였다. 이음매를 지워도 마찬가지였다 — CSS 3D 로는
              면을 잘게 나눌수록 다각형 티가 난다. 한 장으로 되돌렸다. */}
          {/* 앞면은 두지 않는다. 넘어가는 낱장의 앞면은 읽던 지면(.page-sheet)이
              맡는다 — 여기에 빈 종이를 한 장 더 세우면 그 글을 덮어 버린다.
              90도를 넘어 지면이 backface 로 사라진 뒤 드러나는 뒷면만 남긴다. */}
          <div className="book-leaf">
            <div className="book-leaf-face book-leaf-back" />
          </div>

          {/* 책의 두께.
              판 하나로 두면 모로 섰을 때 폭이 11px 인 종이가 된다(실측).
              네 면을 세워 상자로 만든다 — 앞표지는 아래 .book-cover 가 맡고,
              여기서는 책등·뒤표지·책배를 세운다. */}

          {/* 책등 — 왼쪽 모서리에서 뒤로 꺾여 선다 */}
          <div className="book-spine-face">
            <span className="serif book-spine-title">{site.title}</span>
          </div>

          {/* 책배 — 오른쪽 모서리. 종이가 쌓인 결이 보인다 */}
          <div className="book-fore-block" />

          {/* 뒤표지 — 두께만큼 뒤에 선다 */}
          <div className="book-back" />

          {/* 덮개. 왼쪽 모서리를 축으로 젖혀진다. */}
          <div className="book-cover">
            <div className="book-cover-front">
              <span className="book-cover-rule" />
              <span className="serif book-cover-title">{site.title}</span>
              <span className="book-cover-author">
                {site.author} · {site.originalTitle}
              </span>
            </div>
            <div className="book-cover-back" />
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * 표지가 젖혀지는 동안 쓸 스크롤 거리.
 *
 * 이게 없으면 표지가 열리는 동안 1막 본문도 같이 올라가 버려서, 책을 다 열었을
 * 때는 첫 문단이 이미 화면 위로 지나간 뒤다. 읽을 것이 없는 빈 구간을 앞에
 * 한 화면 두어, 여는 동작에 제 몫의 스크롤을 준다.
 */
export function BookRunway() {
  // 꺼내기 + 펼치기에 드는 거리를 그대로 비워 둔다.
  return <div className="book-runway" aria-hidden="true" style={{ height: `${COVER_SPAN * 100}dvh` }} />;
}

export default BookStage;
