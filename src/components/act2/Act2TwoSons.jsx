import { Section, ActHeading } from '../layout/Section';
import { Reveal } from '../layout/Reveal';
import { Prose } from '../ui/Prose';
import { ScrubText } from '../ui/ScrubText';
import { CardGrid } from '../ui/CardGrid';
import { Quiz } from './Quiz';
import { act2 } from '../../data/content';

export function Act2TwoSons() {
  return (
    <Section id="act2" index={1}>
      <ActHeading eyebrow={act2.eyebrow} title={act2.title} index={1} />

      <Reveal delay={75}>
        <ScrubText
          text={act2.lead}
          className="serif text-ink kr text-2xl leading-relaxed sm:text-3xl"
        />
      </Reveal>

      <Prose sections={act2.sections} />

      {/* 두 갈래 길 대비 */}
      <Reveal className="mt-20">
        <h3 className="serif text-ink text-xl sm:text-2xl">{act2.contrast.title}</h3>
        <p className="text-soft kr mt-3 text-sm sm:text-base">{act2.contrast.desc}</p>
        <CardGrid items={act2.contrast.items} columns={2} className="mt-7" />
      </Reveal>

      <Reveal className="mt-20">
        <h3 className="serif text-ink text-2xl font-bold sm:text-3xl">{act2.quizIntro.title}</h3>
        <div className="mt-4 h-px w-12 bg-clay/60" />
      </Reveal>

      <Quiz />
    </Section>
  );
}

export default Act2TwoSons;
