import { Fragment, useCallback, useMemo, useRef } from 'react';
import { useViewportFrame } from '../../hooks/useViewportFrame';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { clamp01 } from '../../lib/motion';

/** 아직 읽지 않은 단어의 짙기. 0 이면 글이 통째로 사라져 무엇을 읽을지 모른다. */
const DIM = 0.18;

/**
 * 읽는 만큼 밝아지는 글.
 *
 * 단어가 처음에는 옅게 깔려 있다가, 스크롤해서 글이 화면 위로 올라올수록
 * 앞에서부터 차례로 밝아진다. 등불을 들고 한 줄씩 비추며 읽는 모양새다.
 * 막마다 첫 문장(lead)과 인용처럼 "한 번에 읽히는 짧은 문장"에만 쓴다 —
 * 본문 단락 전부에 걸면 읽기 전에 기다려야 하는 글이 된다.
 *
 * 시간이 아니라 스크롤에 물려 있다. 되감으면 다시 어두워진다 — 이 사이트의
 * 다른 연출(넘김·소멸)과 같은 규칙이다.
 *
 * 단어 단위로 쪼갠다. 글자 단위로 쪼개면 스크린 리더가 글자를 하나씩 읽는데,
 * 단어는 띄어쓰기를 그대로 두므로 원래 문장으로 읽힌다.
 *
 * 밝기는 단어마다 --lit(0~1)로 쓴다. 한 단어 안에서도 연속으로 차오르므로
 * 느리게 스크롤해도 툭툭 끊기지 않는다.
 *
 * @param {object} p
 * @param {string} p.text        줄바꿈(\n)은 그대로 줄을 바꾼다
 * @param {number} [p.from=0.92] 글의 윗변이 화면 높이의 이 지점에 닿으면 밝아지기 시작한다
 * @param {number} [p.to=0.62]   글의 아랫변이 이 지점에 닿으면 다 밝아진다.
 *                               화면 한가운데(0.5)로 두었더니 막 첫 화면에 멈춰 선 채로는
 *                               문장 뒤쪽이 어두운 채 남아 읽기를 재촉했다.
 */
export function ScrubText({ text, as: Tag = 'p', className = '', from = 0.92, to = 0.62 }) {
  const ref = useRef(null);
  const litCache = useRef([]);
  const reduced = usePrefersReducedMotion();

  const lines = useMemo(
    () =>
      String(text ?? '')
        .split('\n')
        .map((line) => line.split(/\s+/).filter(Boolean)),
    [text],
  );

  const onFrame = useCallback(
    (rect, vh) => {
      const el = ref.current;
      if (!el) return;
      const words = el.querySelectorAll('[data-w]');
      const n = words.length;
      if (n === 0) return;

      // 윗변이 from 에 닿을 때 0, 아랫변이 to 에 닿을 때 1.
      // 글 높이를 셈에 넣어야 여러 줄짜리 문장도 마지막 단어까지 제때 밝아진다.
      const span = Math.max(vh * (from - to) + rect.height, 1);
      const p = reduced ? 1 : clamp01((vh * from - rect.top) / span);
      const head = p * n;

      const cache = litCache.current;
      for (let i = 0; i < n; i += 1) {
        // 한 단어가 다 차오르기 전에 다음 단어가 조금씩 따라붙는다
        const lit = clamp01((head - i) / 1.6 + 0.2);
        const v = lit.toFixed(2);
        if (cache[i] === v) continue;
        cache[i] = v;
        words[i].style.setProperty('--lit', v);
      }
    },
    [from, to, reduced],
  );

  useViewportFrame(ref, onFrame);

  return (
    <Tag ref={ref} className={`scrub-text ${className}`} style={{ '--dim': DIM }}>
      {lines.map((words, li) => (
        <Fragment key={li}>
          {li > 0 ? <br /> : null}
          {words.map((w, wi) => (
            <Fragment key={wi}>
              {wi > 0 ? ' ' : null}
              <span data-w="" className="scrub-word">
                {w}
              </span>
            </Fragment>
          ))}
        </Fragment>
      ))}
    </Tag>
  );
}

export default ScrubText;
