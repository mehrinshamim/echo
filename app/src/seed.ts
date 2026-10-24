// Demo history so a fresh install has themes, a timeline and something to ask about.
// Copy comes from the design file (Wikimedia hackathon / imposter syndrome thread).
import type { Draft, Log, MergeSuggestion, Piece, Style, Theme } from './types';

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

const log = (id: string, days: number, title: string, transcript: string, keyPoints: string[], themeIds: string[]): Log => ({
  id,
  createdAt: daysAgo(days),
  title,
  transcript,
  summary: transcript.split(/(?<=[.!?])\s+/).slice(0, 2).join(' '),
  keyPoints,
  themeIds,
  source: 'voice',
  saved: true,
});

export function seed(): {
  logs: Log[];
  themes: Theme[];
  drafts: Draft[];
  pieces: Piece[];
  styles: Style[];
  mergeSuggestion: MergeSuggestion;
} {
  const themes: Theme[] = [
    { id: 'th-imposter', name: 'Imposter syndrome', createdAt: daysAgo(160) },
    { id: 'th-oss', name: 'Open source', createdAt: daysAgo(120) },
    { id: 'th-speaking', name: 'Public speaking', createdAt: daysAgo(40) },
  ];
  const logs: Log[] = [
    log(
      'lg-1',
      1,
      'Small bugs are the real on-ramp',
      "So the Wikimedia hackathon was honestly great. I went in thinking I'd just watch, but a mentor pointed me to a tiny bug in the citation tool and I fixed it in like two hours. Nobody cared that I didn't know the whole codebase. I think small bugs are the real on-ramp, not big projects.",
      ['A mentor pointed me to a small, well-scoped bug', 'Fixed it in two hours', 'Nobody expected me to know the whole codebase'],
      ['th-oss', 'th-imposter'],
    ),
    log(
      'lg-2',
      3,
      'Asking which issue to start with',
      "Notes from the mentor table: the people who got furthest weren't the best coders, they were the ones who asked which issue to start with. Asking felt scary but it saved everyone time.",
      ['The furthest people asked where to start', 'Asking is a skill, not a weakness'],
      ['th-oss', 'th-imposter'],
    ),
    log(
      'lg-3',
      5,
      'Lightning talk nerves',
      'Signed up for a lightning talk at the community meetup. My hands were shaking for the first minute and then it was fine. People asked questions after, which means they were listening.',
      ['The first minute is the hardest', 'Questions afterwards mean people listened'],
      ['th-speaking', 'th-imposter'],
    ),
    log(
      'lg-4',
      62,
      'Nobody expects you to know everything on day one',
      "First week contributing to the docs. I kept apologising in every comment. A maintainer told me nobody expects you to know everything on day one. I don't fully believe it yet.",
      ['I over-apologise in reviews', 'Maintainers expect beginners to learn as they go'],
      ['th-imposter', 'th-oss'],
    ),
    log(
      'lg-5',
      150,
      'Real contributors feel like a different kind of person',
      'Went to my first open source meetup. Everyone seemed to already know each other and talk about things I have never heard of. Real contributors feel like a different kind of person than me.',
      ['Felt like an outsider at the first meetup', 'Assumed contributors are a different kind of person'],
      ['th-imposter'],
    ),
  ];
  const drafts: Draft[] = [
    {
      id: 'dr-1',
      createdAt: daysAgo(1),
      category: 'LinkedIn',
      title: 'Small bugs are the real on-ramp',
      text: "I went to the Wikimedia hackathon planning to just watch.\n\nTwo hours later I'd fixed a bug in the citation tool. Not a big one. A small, well-scoped one a mentor pointed me to.\n\nNobody cared that I didn't know the whole codebase. Back in August I wrote that nobody expects you to know everything on day one. I didn't fully believe it then. I do now.\n\nIf you're waiting to feel ready for open source: start with a small bug.",
      logIds: ['lg-1', 'lg-4'],
      status: 'draft',
      version: 3,
      styleId: 'st-refl',
    },
    {
      id: 'dr-2',
      createdAt: daysAgo(2),
      category: 'Blog',
      title: 'What a first hackathon actually tests',
      text: "What a first hackathon actually tests\n\nI've logged seven thoughts this year about not belonging in rooms full of contributors. Reading them back, the shift is obvious. Nobody tested what I knew. They tested whether I'd ask.",
      logIds: ['lg-1', 'lg-4'],
      status: 'draft',
      version: 1,
      styleId: 'st-tech',
    },
    {
      id: 'dr-3',
      createdAt: daysAgo(3),
      category: 'LinkedIn',
      title: "Asking for help isn't failing",
      text: "Asking for help used to feel like admitting I didn't belong.\n\nThen a mentor answered in two minutes what I'd been stuck on for two hours.\n\nAsk sooner.",
      logIds: ['lg-4'],
      status: 'saved',
      version: 1,
      styleId: 'st-refl',
    },
    {
      id: 'dr-4',
      createdAt: daysAgo(7),
      category: 'Story',
      title: 'The mentor table',
      text: 'The mentor didn\'t ask what I knew. She just turned her laptop toward me and said, "This one\'s small."\n\nTwo hours later it was merged.',
      logIds: ['lg-1'],
      status: 'saved',
      version: 1,
      styleId: 'st-story',
    },
    ...(
      [
        ['dr-5', 10, 'LinkedIn', 'I stopped waiting to feel ready', 'st-refl'],
        ['dr-6', 53, 'Blog', 'Fixing flaky tests in Wikidata', 'st-tech'],
        ['dr-7', 126, 'LinkedIn', 'My first merged PR', 'st-refl'],
      ] as const
    ).map(
      ([id, days, category, title, styleId]): Draft => ({
        id,
        createdAt: daysAgo(days),
        category,
        title,
        text: title,
        logIds: [],
        status: 'published',
        version: 1,
        styleId,
        platform: category === 'Blog' ? 'Blog' : 'LinkedIn',
        publishedAt: daysAgo(days),
      }),
    ),
  ];
  return { logs, themes, drafts, ...seedWriting() };
}

const piece = (id: string, title: string, source: string, words: number): Piece => ({
  id,
  title,
  source,
  words,
  analyzed: true,
});

/** Demo writing styles (from the design file) so Write mode has something to show. */
export function seedWriting(): { pieces: Piece[]; styles: Style[]; mergeSuggestion: MergeSuggestion } {
  const pieces: Piece[] = [
    piece('pc-1', 'I stopped waiting to feel ready', 'LinkedIn · published 14 Oct', 220),
    piece('pc-2', 'Why I stopped waiting to feel ready', 'Pasted · 220 words', 220),
    piece('pc-3', 'My first merged PR', 'LinkedIn · published 20 Jun', 180),
    piece('pc-4', 'Day one is not the test', 'LinkedIn · pasted', 160),
    piece('pc-5', 'Ask sooner', 'LinkedIn · pasted', 120),
    piece('pc-6', 'The quiet person at the table', 'LinkedIn · pasted', 200),
    piece('pc-7', 'Fixing flaky tests in Wikidata', 'Medium link · 1,400 words', 1400),
    piece('pc-8', 'first-hackathon.docx', 'File · 900 words', 900),
    piece('pc-9', 'Debugging in public', 'Medium link · 1,100 words', 1100),
    piece('pc-10', 'Why I write tests first', 'Blog link · 800 words', 800),
    piece('pc-11', 'Thread: 5 things mentors did right', 'Pasted · X thread', 260),
    piece('pc-12', 'Thread: the hallway track', 'Pasted · X thread', 240),
    piece('pc-13', 'Thread: day two at the sprint', 'Pasted · X thread', 220),
    piece('pc-14', 'FOSSASIA in 5 lines', 'LinkedIn · pasted', 90),
    piece('pc-15', 'What IndiaFOSS taught me', 'LinkedIn · pasted', 110),
  ];
  const ids = (from: number, to: number) => pieces.slice(from, to).map((p) => p.id);
  const styles: Style[] = [
    {
      id: 'st-refl',
      name: 'Reflective LinkedIn',
      where: 'mostly LinkedIn',
      traits: ['Opens with something you admit', 'Short lines, one idea each', 'Ends with one piece of advice'],
      sample: "I almost didn't write any code at the hackathon.",
      category: 'LinkedIn',
      pieceIds: ids(0, 6),
    },
    {
      id: 'st-tech',
      name: 'Technical blog',
      where: 'Medium and your blog',
      traits: ['Starts with the problem, not you', 'Headers and code blocks', 'Dry, low-key humour'],
      sample: 'The test failed one run in nine. Here is why.',
      category: 'Blog',
      pieceIds: ids(6, 10),
    },
    {
      id: 'st-story',
      name: 'Story thread',
      where: 'X and Threads',
      traits: ['Drops you into a scene', 'Dialogue first, lesson last', 'Present tense'],
      sample: "The mentor didn't ask what I knew.",
      category: 'Story',
      pieceIds: ids(10, 13),
    },
    {
      id: 'st-recap',
      name: 'Event recaps',
      where: 'LinkedIn',
      traits: ['Opens with something you admit', 'Short lines', 'Ends with advice'],
      sample: 'Three days, two bugs, one lesson.',
      category: 'LinkedIn',
      pieceIds: ids(13, 15),
    },
  ];
  return {
    pieces,
    styles,
    mergeSuggestion: {
      keepId: 'st-refl',
      mergeId: 'st-recap',
      reason: 'Both open with something you admit, keep lines short, and end with advice.',
      status: 'open',
    },
  };
}
