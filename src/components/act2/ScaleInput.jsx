import { scaleLabels } from '../../data/questions';

// 가운데가 작고 양끝이 큰 전형적인 리커트 배치 — 방향이 눈에 먼저 들어온다
const SIZES = ['h-8 w-8', 'h-7 w-7', 'h-6 w-6', 'h-7 w-7', 'h-8 w-8'];

/**
 * 5점 척도. 네이티브 라디오 그룹이라 좌우 방향키 이동이 그대로 동작한다.
 */
export function ScaleInput({ name, value, onChange, labelledBy }) {
  return (
    <div className="mt-5">
      <div
        role="radiogroup"
        aria-labelledby={labelledBy}
        className="flex items-center justify-between gap-1"
      >
        {[1, 2, 3, 4, 5].map((v, i) => {
          const checked = value === v;
          return (
            <label
              key={v}
              className="flex min-h-11 flex-1 cursor-pointer items-center justify-center"
            >
              <input
                type="radio"
                name={name}
                value={v}
                checked={checked}
                onChange={() => onChange(v)}
                aria-label={scaleLabels.points[i]}
                className="peer sr-only"
              />
              <span
                className={`${SIZES[i]} rounded-full border border-hair transition-[background-color,border-color,transform] duration-300 peer-checked:scale-110 peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-accent`}
              />
            </label>
          );
        })}
      </div>

      <div className="text-faint mt-2 flex justify-between text-[11px] tracking-wide">
        <span>{scaleLabels.min}</span>
        <span>{scaleLabels.max}</span>
      </div>
    </div>
  );
}

export default ScaleInput;
