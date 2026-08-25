import { useCallback, useEffect, useRef, useState } from 'react';
import { Section, ActHeading } from '../layout/Section';
import { Reveal } from '../layout/Reveal';
import { Prose } from '../ui/Prose';
import { NoteBlock } from '../ui/NoteBlock';
import { Quote } from '../ui/Quote';
import { LanternRow } from './LanternRow';
import { WallForm } from './WallForm';
import { WallList } from './WallList';
import { wallStorage } from '../../storage';
import { act3 } from '../../data/content';

/** 등불이 쌓일수록 올라가는 밝기. 12개에서 상한. */
const LIFT_CAP = 12;
const LIFT_MAX = 0.07;

export function Act3ElderBrother() {
  const [entries, setEntries] = useState([]);
  const [busy, setBusy] = useState(false);
  const [justAdded, setJustAdded] = useState(0);
  // 원격 담벼락에 닿지 못해 이 기기에만 쌓고 있는 상태인지
  const [offline, setOffline] = useState(false);
  const freshTimer = useRef(null);

  useEffect(() => {
    let alive = true;

    wallStorage
      .list()
      .then((items) => {
        if (alive) setEntries(items);
      })
      .catch(() => {
        /* 처음 방문이거나 저장소를 못 쓰는 환경 — 빈 담벼락으로 시작한다 */
      });

    const unsubscribe = wallStorage.subscribe((items) => {
      if (alive) setEntries(items);
    });

    // 저장소가 로컬로 내려앉으면 그 사실을 알린다.
    // 감싸지 않은 어댑터(로컬 전용 등)에는 이 함수가 없다.
    setOffline(wallStorage.getMode?.() === 'local');
    const unwatchMode = wallStorage.onModeChange?.((mode) => {
      if (alive) setOffline(mode === 'local');
    });

    return () => {
      alive = false;
      unsubscribe();
      unwatchMode?.();
      if (freshTimer.current) clearTimeout(freshTimer.current);
    };
  }, []);

  const handleSubmit = useCallback(async (text) => {
    setBusy(true);
    try {
      await wallStorage.add(text);
      // 방금 켜진 등불에만 등장 애니메이션을 주기 위한 표시
      setJustAdded(1);
      if (freshTimer.current) clearTimeout(freshTimer.current);
      freshTimer.current = setTimeout(() => setJustAdded(0), 1200);
    } finally {
      setBusy(false);
    }
  }, []);

  const lift = Math.min(entries.length, LIFT_CAP) / LIFT_CAP;

  return (
    <Section id="act3" index={2}>
      {/* 등불이 켜질수록 섹션이 미세하게 밝아진다.
          색을 덧입히지 않고 밝기만 올리도록 중성 밝은 톤을 아주 낮은 투명도로 얹는다. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-[1600ms] ease-out"
        style={{ backgroundColor: '#F6F3EE', opacity: lift * LIFT_MAX }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 transition-opacity duration-[1600ms] ease-out"
        style={{
          // 등불빛도 앰버를 덧칠하면 갈색으로 가라앉는다. 따뜻한 흰빛으로 올린다.
          background:
            'radial-gradient(75% 120% at 50% 100%, rgba(249,242,229,0.13) 0%, rgba(246,235,214,0.09) 26%, rgba(243,221,187,0.05) 50%, rgba(243,221,187,0.02) 74%, transparent 100%)',
          opacity: lift * 0.55,
        }}
      />

      <div className="relative">
        <Reveal>
          <ActHeading eyebrow={act3.eyebrow} title={act3.title} />
        </Reveal>

        <Reveal delay={120}>
          <p className="serif text-ink kr text-2xl leading-relaxed sm:text-3xl">{act3.lead}</p>
        </Reveal>

        <Prose sections={act3.sections} />

        <Reveal className="mt-20">
          <NoteBlock note={act3.note} />
        </Reveal>

        <Reveal className="mt-16">
          <Quote quote={act3.quote} />
        </Reveal>

        <Reveal className="mt-24">
          <h3 className="serif text-ink text-2xl font-bold sm:text-3xl">{act3.wall.title}</h3>
          <p className="text-soft kr mt-3 text-sm leading-relaxed sm:text-base">
            {act3.wall.desc}
          </p>

          <LanternRow count={entries.length} justAdded={justAdded} />

          {offline ? (
            <p
              role="status"
              className="text-faint kr mt-6 border-l-2 border-clay/50 pl-4 text-sm leading-relaxed"
            >
              {act3.wall.offline}
            </p>
          ) : null}

          <WallForm onSubmit={handleSubmit} busy={busy} />
          {/* 내가 방금 남긴 글은 첫 쪽 맨 위에 있으므로 그때만 첫 쪽으로 돌아온다 */}
          <WallList entries={entries} jumpToFirst={justAdded > 0} />
        </Reveal>
      </div>
    </Section>
  );
}

export default Act3ElderBrother;
