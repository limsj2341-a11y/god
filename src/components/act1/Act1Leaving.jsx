import { Section } from '../layout/Section';
import { Reveal } from '../layout/Reveal';
import { Prose } from '../ui/Prose';
import { CardGrid } from '../ui/CardGrid';
import { Quote } from '../ui/Quote';
import { act1, site } from '../../data/content';

export function Act1Leaving() {
  return (
    <Section id="act1" index={0} innerClassName="max-w-3xl">
      <Reveal>
        <p className="text-faint mb-4 text-xs tracking-[0.08em] sm:text-sm">
          {act1.eyebrow} · {site.subtitle}
        </p>
      </Reveal>

      <Reveal delay={120}>
        <h1 className="serif text-ink text-5xl font-bold sm:text-7xl">{site.title}</h1>
        <p className="text-soft mt-4 text-sm tracking-wide sm:text-base">
          {site.author} · {site.originalTitle}
        </p>
        <p className="text-faint kr mt-2 text-sm">{site.tagline}</p>
      </Reveal>

      <Reveal delay={280} className="mt-16 sm:mt-24">
        <h2 className="serif text-ink mb-6 text-3xl font-bold sm:text-4xl">{act1.title}</h2>
        <p className="text-soft kr whitespace-pre-line text-base leading-loose sm:text-lg">
          {act1.lead}
        </p>
      </Reveal>

      <Reveal delay={380} className="mt-8">
        <p className="serif kr text-2xl leading-relaxed text-clay sm:text-3xl">“{act1.pull}”</p>
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
