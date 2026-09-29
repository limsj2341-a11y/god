import { Section, ActNumeral } from '../layout/Section';
import { Reveal } from '../layout/Reveal';
import { Prose } from '../ui/Prose';
import { CardGrid } from '../ui/CardGrid';
import { Quote } from '../ui/Quote';
import { SplitText } from '../ui/SplitText';
import { ScrubText } from '../ui/ScrubText';
import { useBookOpened } from '../../hooks/useBookOpened';
import { act1, site } from '../../data/content';

export function Act1Leaving() {
  // 첫머리는 처음부터 화면 안에 있지만 표지에 덮여 있다. 표지가 열릴 때 등장한다.
  const opened = useBookOpened();

  return (
    <Section id="act1" index={0} innerClassName="max-w-3xl">
      <Reveal play={opened}>
        <p className="text-faint mb-4 text-xs tracking-[0.08em] sm:text-sm">
          {act1.eyebrow} · {site.subtitle}
        </p>
      </Reveal>

      {/* 제목만 글자 단위로 든다. Reveal 로 함께 감싸면 덩어리 페이드와 글자 등장이
          겹쳐 둘 다 흐려지므로, 제목을 밖으로 빼고 아래 줄을 뒤따르게 했다. */}
      <SplitText
        as="h1"
        text={site.title}
        variant="flip"
        play={opened}
        delay={120}
        className="serif text-ink block text-5xl font-bold sm:text-7xl"
      />

      <Reveal delay={620} play={opened}>
        <p className="text-soft mt-4 text-sm tracking-wide sm:text-base">
          {site.author} · {site.originalTitle}
        </p>
        <p className="text-faint kr mt-2 text-sm">{site.tagline}</p>
      </Reveal>

      <div className="relative mt-16 sm:mt-24">
        <ActNumeral n={1} />
        <SplitText
          as="h2"
          text={act1.title}
          variant="flip"
          trigger="view"
          className="serif text-ink relative mb-6 block text-3xl font-bold sm:text-4xl"
        />
        <Reveal delay={170}>
          <ScrubText
            text={act1.lead}
            className="text-soft kr text-base leading-loose sm:text-lg"
          />
        </Reveal>
      </div>

      <Reveal delay={230} className="mt-8">
        <ScrubText
          text={`“${act1.pull}”`}
          className="serif kr text-2xl leading-relaxed text-clay sm:text-3xl"
        />
      </Reveal>

      <Prose sections={act1.sections} />

      {/* 누가복음 15장의 청중 구조 */}
      <Reveal className="mt-20">
        <h3 className="serif text-ink text-xl sm:text-2xl">{act1.audience.title}</h3>
        <p className="text-soft kr mt-4 text-base leading-loose sm:text-lg">
          {act1.audience.desc}
        </p>
        <CardGrid items={act1.audience.items} columns={3} className="mt-7" />
      </Reveal>

      <Reveal className="mt-16">
        <Quote quote={act1.quote} />
      </Reveal>

      <Reveal className="mt-16 flex items-center gap-3">
        <span className="text-faint text-xs tracking-wide">{act1.scrollHint}</span>
        <span className="h-px w-10 bg-accent/50" />
      </Reveal>
    </Section>
  );
}

export default Act1Leaving;
