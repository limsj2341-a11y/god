import { useState } from 'react';
import { BackgroundStage } from './components/layout/BackgroundStage';
import { ActNav } from './components/layout/ActNav';
import { Page } from './components/layout/Page';
import { TableLight } from './components/layout/TableLight';
import { Act1Leaving } from './components/act1/Act1Leaving';
import { Act2TwoSons } from './components/act2/Act2TwoSons';
import { Act3ElderBrother } from './components/act3/Act3ElderBrother';
import { Act4Feast } from './components/act4/Act4Feast';

export default function App() {
  // 현재 막이 바뀔 때만 갱신된다 — 스크롤 프레임마다 리렌더되지 않는다
  const [activeAct, setActiveAct] = useState(0);

  return (
    <>
      <a
        href="#act2"
        className="sr-only-focusable absolute left-4 top-4 z-50 rounded-full bg-accent px-4 py-2 text-sm text-[#16171A]"
      >
        본문으로 건너뛰기
      </a>

      <BackgroundStage onActChange={setActiveAct} />
      <ActNav active={activeAct} />

      {/* 3막에서 흘러내린 빛이 여기 남아 4막의 식탁 조명이 된다 (본문 뒤) */}
      <TableLight />

      <main className="relative z-10">
        {/* 1~3막은 넘겨 읽는 페이지, 4막은 그 빛이 도착하는 자리라 페이지로 감싸지 않는다 */}
        <Page index={0}>
          <Act1Leaving />
        </Page>

        <Page index={1}>
          <Act2TwoSons />
        </Page>

        <Page index={2} dissolve>
          <Act3ElderBrother />
        </Page>

        <Act4Feast />
      </main>
    </>
  );
}
