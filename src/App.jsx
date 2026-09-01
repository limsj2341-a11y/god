import { useState } from 'react';
import { MotionConfig } from 'motion/react';
import { BackgroundStage } from './components/layout/BackgroundStage';
import { BookStage, BookRunway } from './components/layout/BookStage';
import { ActNav } from './components/layout/ActNav';
import { Page } from './components/layout/Page';
import { TableLight } from './components/layout/TableLight';
import { ScrollIntro } from './components/layout/ScrollIntro';
import { CoverCredit } from './components/layout/CoverCredit';
import { Act1Leaving } from './components/act1/Act1Leaving';
import { Act2TwoSons } from './components/act2/Act2TwoSons';
import { Act3ElderBrother } from './components/act3/Act3ElderBrother';
import { Act4Feast } from './components/act4/Act4Feast';

export default function App() {
  // 현재 막이 바뀔 때만 갱신된다 — 스크롤 프레임마다 리렌더되지 않는다
  const [activeAct, setActiveAct] = useState(0);

  return (
    // 모션 축소 대응을 한 곳에서 끝낸다. reducedMotion="user" 면 motion 이
    // transform·layout 애니메이션을 스스로 끄므로, 컴포넌트마다 확인하지 않아도 된다.
    // 페이드까지 지워야 하는 자리(Reveal)만 따로 판단한다.
    <MotionConfig reducedMotion="user">
      <a
        href="#act2"
        className="sr-only-focusable absolute left-4 top-4 z-50 rounded-full bg-accent px-4 py-2 text-sm text-[#16171A]"
      >
        본문으로 건너뛰기
      </a>

      <BackgroundStage onActChange={setActiveAct} />
      <ActNav active={activeAct} />

      {/* 첫 화면에만 잠깐 얹히는 시작 안내 */}
      <ScrollIntro />

      {/* 책을 꺼내 펼치기 전, 책장 구석에 작게 남는 서명 */}
      <CoverCredit />

      {/* 3막에서 흘러내린 빛이 여기 남아 4막의 식탁 조명이 된다 (본문 뒤) */}
      <TableLight />

      {/* 덮인 책 → 펼쳐짐 → 3막이 흩어질 때 함께 사라짐 */}
      <BookStage />
      {/* 표지가 젖혀지는 동안 뒤의 본문을 눌러 두는 막 */}
      <div className="book-veil" aria-hidden="true" />

      <main className="relative z-10">
        {/* 표지가 열리는 데 쓰는 스크롤 거리. 여기에는 읽을 것이 없다. */}
        <BookRunway />

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
    </MotionConfig>
  );
}
