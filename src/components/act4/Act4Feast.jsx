import { Section, ActHeading } from '../layout/Section';
import { Reveal } from '../layout/Reveal';
import { Prose } from '../ui/Prose';
import { Quote } from '../ui/Quote';
import { QuestionList } from '../ui/QuestionList';
import { PracticeCard } from './PracticeCard';
import { act4, site } from '../../data/content';

export function Act4Feast() {
  return (
    <Section id="act4" index={3} innerClassName="act4-arrive">
      <Reveal>
        <ActHeading eyebrow={act4.eyebrow} title={act4.title} />
      </Reveal>

      <Reveal delay={120}>
        <p className="serif text-ink kr text-2xl leading-relaxed sm:text-3xl">{act4.lead}</p>
      </Reveal>

      <Prose sections={act4.sections} />

      <Reveal className="mt-16">
        <Quote quote={act4.quote} />
      </Reveal>

      <Reveal className="mt-24">
        <h3 className="serif text-ink text-2xl font-bold sm:text-3xl">{act4.practice.title}</h3>
        <PracticeCard />
      </Reveal>

      {/* 나눔 질문 */}
      <Reveal className="mt-24">
        <h3 className="serif text-ink text-xl sm:text-2xl">{act4.discussion.title}</h3>
        <p className="text-soft kr mt-3 text-sm sm:text-base">{act4.discussion.desc}</p>
        <QuestionList items={act4.discussion.questions} className="mt-7" />
      </Reveal>

      <footer className="mt-24 border-t border-hair pt-8">
        <p className="text-faint kr text-xs leading-relaxed">{act4.footer}</p>
        <p className="text-faint mt-2 text-xs">
          {site.title} · {site.author} · {site.originalTitle}
        </p>
      </footer>
    </Section>
  );
}

export default Act4Feast;
