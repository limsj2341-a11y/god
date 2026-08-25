import { nav } from '../../data/content';
import { JUMP_EVENT } from '../../hooks/useViewportFrame';

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
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'instant', block: 'start' });
    // 도착한 페이지가 제 상태를 되찾기까지 IntersectionObserver 를 기다리면
    // 몇 프레임 동안 빈 화면이 스친다. 옮겼다는 사실을 바로 알린다.
    window.dispatchEvent(new Event(JUMP_EVENT));
  };

  return (
    <nav
      aria-label={nav.label}
      className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 sm:block"
    >
      <ul className="flex flex-col items-end gap-5">
        {nav.items.map((item, i) => {
          const isActive = i === active;
          return (
            <li key={item.id}>
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
                <span
                  className={`block rounded-full transition-all duration-500 ${
                    isActive
                      ? 'h-2.5 w-2.5 bg-accent'
                      : 'h-1.5 w-1.5 bg-current opacity-30 group-hover:opacity-60'
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default ActNav;
