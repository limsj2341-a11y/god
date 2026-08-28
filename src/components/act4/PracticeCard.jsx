import { useState } from 'react';
import { practiceDays } from '../../data/practice';
import { usePersistentState } from '../../hooks/usePersistentState';
import { downloadPracticeCard } from '../../lib/cardImage';
import { Button } from '../ui/Button';
import { CheckBox } from '../ui/CheckBox';
import { ProgressLine } from '../ui/ProgressLine';
import { FeastMoment } from './FeastMoment';
import { act4 } from '../../data/content';

const STORAGE_KEY = 'tangbu.practice.v1';
const EMPTY = practiceDays.map(() => false);

/** 저장된 값과 현재 항목 수가 다를 수 있다(항목을 늘리거나 줄인 경우) */
function normalize(saved) {
  return practiceDays.map((_, i) => Boolean(saved?.[i]));
}

export function PracticeCard() {
  const [raw, setRaw, reset] = usePersistentState(STORAGE_KEY, EMPTY);
  const checked = normalize(raw);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const doneCount = checked.filter(Boolean).length;
  const allDone = doneCount === practiceDays.length;

  const toggle = (index) => {
    setRaw((prev) => {
      const next = normalize(prev);
      next[index] = !next[index];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await downloadPracticeCard({ days: practiceDays, checked });
    } catch (err) {
      setSaveError(err?.message ?? '이미지를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-10">
      {/* 진행 */}
      <ProgressLine
        value={doneCount}
        max={practiceDays.length}
        label={act4.practice.progress(doneCount, practiceDays.length)}
      />

      <ul className="mt-6">
        {practiceDays.map((day, i) => {
          const isOn = checked[i];
          return (
            <li key={day.id} className="border-b border-hair first:border-t">
              <label className="flex cursor-pointer items-start gap-4 py-5">
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(i)}
                  className="peer sr-only"
                />
                <CheckBox on={isOn} />

                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span
                      className={`text-xs tracking-wide transition-colors duration-300 ${
                        isOn ? 'text-accent' : 'text-faint'
                      }`}
                    >
                      {day.day}
                    </span>
                    <span
                      className={`serif text-lg transition-opacity duration-300 sm:text-xl ${
                        isOn ? 'text-ink opacity-60' : 'text-ink'
                      }`}
                    >
                      {day.title}
                    </span>
                  </span>
                  <span
                    className={`text-soft kr mt-1 block text-sm leading-relaxed transition-opacity duration-300 sm:text-base ${
                      isOn ? 'opacity-55' : ''
                    }`}
                  >
                    {day.text}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <FeastMoment active={allDone} />

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? '만드는 중…' : act4.practice.saveButton}
        </Button>
        {doneCount > 0 ? (
          <Button variant="quiet" onClick={reset}>
            {act4.practice.resetButton}
          </Button>
        ) : null}
        <span className="text-faint ml-auto text-xs">{act4.practice.desc}</span>
      </div>

      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-xs text-clay">
        {saveError}
      </p>
    </div>
  );
}

export default PracticeCard;
