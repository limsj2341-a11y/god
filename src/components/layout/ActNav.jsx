import { useCallback, useState } from 'react';
import { motion } from 'motion/react';
import { nav } from '../../data/content';
import { JUMP_EVENT } from '../../hooks/useViewportFrame';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { documentTop } from '../../lib/dom';
import { COVER_SPAN } from './BookStage';
import { TURN_READ_START, TURN_RUNWAY, softSpring } from '../../lib/anim';

/**
 * 우측 고정 인디케이터. 현재 막을 표시하고, 누르면 그 막으로 이동한다.
 *
 * 레일은 뷰포트 오른쪽에 붙는데 본문 칼럼은 폭이 고정이라, 좁은 화면일수록
 * 레일이 본문 위로 파고든다. 실제로 태블릿 세로(744~900px)에서 레이블이
 * 본문 글줄과 46px 겹쳤다. 레이블이 들어갈 자리가 생기는 지점이 lg(1024px)라
 * 그 아래에서는 sr-only 로 점만 남긴다 — 화면에서 지우지 않는 이유는
 * 버튼의 유일한 이름이라 지우면 스크린 리더가 읽을 것이 없어지기 때문.
 */
export function ActNav({ active }) {
  /*
   * 표지에 머무는 동안은 아직 어느 막도 아니다.
   *
   * 배경(BackgroundStage)이 알려 주는 막 번호는 표지 구간에서도 0(1막)이라,
   * 그것만으로는 "책을 아직 안 폈다"를 구분할 수 없다. 표지가 젖혀지는 거리를
   * 넘었는지로 따로 판단한다 — 그 거리는 BookStage 가 정한다.
   *
   * 값이 바뀔 때만 state 를 건드리므로 스크롤마다 리렌더되지 않는다.
   */
  const [atCover, setAtCover] = useState(true);

  const onScroll = useCallback(({ scrollY, viewportH }) => {
    setAtCover(scrollY < viewportH * COVER_SPAN);
  }, []);

  useScrollProgress(onScroll);

  // 목차 이동은 즉시 건너뛴다.
  //
  // 부드럽게 이동하면 1.5초 동안 그 거리를 주파하는데, 책장 넘김은 시간이
  // 아니라 스크롤 위치에 물려 있다. 그래서 넘김 연출이 설계된 적 없는 속도로
  // 압축 재생되고, 그 사이 두 막의 페이지가 반투명하게 겹쳐 세로 이음매와
  // 잘린 글자가 그대로 드러났다(1→2, 1→3, 2→3 에서 재현). 3→4 만 멀쩡했던
  // 것은 3막이 소멸 페이지라 퇴장 슬라이드를 걸지 않기 때문이다.
  //
  // 'instant' 는 CSS 의 scroll-behavior: smooth 를 무시한다 — 'auto' 로 두면
  // 다시 부드럽게 움직인다.
  const go = (id) => {
    // 표지는 문서 맨 위다 — 가리킬 요소가 따로 없다.
    if (!id) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      window.dispatchEvent(new Event(JUMP_EVENT));
      return;
    }

    const el = document.getElementById(id);
    if (!el) return;
    // scrollIntoView 를 쓰지 않는다. 그것은 조상 스크롤 컨테이너를 전부 움직이는데,
    // body 가 가로 스크롤 컨테이너였던 탓에 이동할 때마다 본문이 왼쪽으로 45px
    // 밀려 글자가 잘리고 오른쪽에 빈 띠가 남았다(태블릿에서 재현). body 쪽은
    // index.css 에서 따로 막았지만, 세로만 움직이면 될 일에 가로를 맡길 이유가 없다.

    /*
     * 막이 시작되는 스크롤 위치를 잰다.
     *
     * 전에는 getBoundingClientRect().top + scrollY 로 구했다. 막이 흐름을 따라
     * 흐르던 시절에는 맞았지만, 지금 막은 화면에 붙어 있고 글은 transform 으로
     * 밀린다. rect 는 그 transform 을 반영하므로 "지금 얼마나 읽었는지"가
     * 목적지에 섞여 들어갔다 — 같은 점을 눌러도 누른 자리에 따라 세 곳으로
     * 흩어졌다(실측: 2막 점이 2353 / 2861 / 3586).
     *
     * 그래서 레이아웃 좌표로 페이지의 윗변을 구하고, 거기에 "글이 다시 움직이기
     * 시작하는 지점"을 더한다. 넘김이 끝나고 첫 문단이 놓이는 자리다.
     */
    const page = el.closest('[data-page]');
    let top;

    if (page) {
      // 첫 막 앞에는 넘길 앞 장이 없다 — Page 의 runIn 과 같은 규칙이다.
      const runIn = Number(page.dataset.page) === 0 ? 0 : window.innerHeight * TURN_RUNWAY;
      top = documentTop(page) + runIn * TURN_READ_START;
    } else {
      // 4막은 페이지로 감싸지 않는다. 자기 자리가 곧 시작점이다.
      top = documentTop(el);
    }
    window.scrollTo({ top, left: 0, behavior: 'instant' });
    // 도착한 페이지가 제 상태를 되찾기까지 IntersectionObserver 를 기다리면
    // 몇 프레임 동안 빈 화면이 스친다. 옮겼다는 사실을 바로 알린다.
    window.dispatchEvent(new Event(JUMP_EVENT));
  };

  return (
    <nav
      aria-label={nav.label}
      className="act-rail fixed top-1/2 z-40 hidden -translate-y-1/2 sm:block"
    >
      <ul className="flex flex-col items-end gap-5">
        {[{ id: null, label: nav.cover.label }, ...nav.items].map((item, i) => {
          // 0 번은 표지, 1 번부터가 막이다.
          const isActive = atCover ? i === 0 : i === active + 1;
          return (
            <li key={item.id ?? 'cover'}>
              <button
                type="button"
                onClick={() => go(item.id)}
                aria-current={isActive ? 'true' : undefined}
                className="group flex items-center gap-2.5 py-1 pl-3 pr-1"
              >
                <span
                  className={`text-[11px] tracking-wide transition-opacity duration-500 sr-only lg:not-sr-only ${
                    isActive ? 'text-soft opacity-100' : 'text-faint opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {item.label}
                </span>
                {/* 점 자체가 커지는 것과, 지금 막을 감싸는 무리(halo)가 옮겨 다니는 것.
                    무리는 layoutId 하나로 묶여 있어서 사라졌다 나타나는 대신
                    이전 막에서 지금 막으로 미끄러진다 — 어디서 어디로 왔는지가 보인다. */}
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  {isActive ? (
                    <motion.span
                      layoutId="actnav-halo"
                      aria-hidden="true"
                      transition={softSpring}
                      className="absolute h-5 w-5 rounded-full"
                      style={{
                        background: 'color-mix(in srgb, var(--color-accent) 16%, transparent)',
                      }}
                    />
                  ) : null}

                  <motion.span
                    animate={{
                      width: isActive ? 10 : 6,
                      height: isActive ? 10 : 6,
                      opacity: isActive ? 1 : 0.3,
                    }}
                    transition={softSpring}
                    // group-hover:opacity-60 을 두지 않는다. motion 이 opacity 를 인라인으로
                    // 쓰기 때문에 클래스가 이기지 못해, 있으나 마나 한 채로 남는다.
                    // 호버 신호는 왼쪽 레이블이 떠오르는 것으로 이미 전달된다.
                    className={`relative block rounded-full ${isActive ? 'bg-accent' : 'bg-current'}`}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default ActNav;
