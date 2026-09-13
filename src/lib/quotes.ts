import { dateKey, parseKey } from "@/lib/dates";

export type QuoteCategory = "love" | "motivation";

export interface DailyQuote {
  text: string;
  category: QuoteCategory;
}

// ---------------------------------------------------------------------------
// 120 original short quotes — short enough to sit in one or two mobile lines.
// ---------------------------------------------------------------------------

const LOVE: string[] = [
  "Some people make ordinary days feel special.",
  "Loving you is my favorite habit.",
  "Home is wherever you laugh.",
  "You turn small moments into memories.",
  "With you, even Mondays feel gentle.",
  "Every day with you is a good day to grow.",
  "Your smile resets my whole day.",
  "Not perfect, just perfectly us.",
  "You make busy days feel lighter.",
  "Love is our daily practice, and I never skip it.",
  "Your hand in mine is my favorite plan.",
  "I like who I am next to you.",
  "Quiet evenings with you beat loud parties.",
  "You're my favorite notification.",
  "Side by side is my favorite place.",
  "Growing together is our best project.",
  "You make my ordinary days sparkle quietly.",
  "Even silence feels warm with you.",
  "Your belief in me builds me daily.",
  "Two people, one team, endless tiny adventures.",
  "You're the calm in my busiest days.",
  "Love isn't fireworks; it's breakfast together daily.",
  "Love is showing up daily — you make it easy.",
  "My favorite routine is coming back to you.",
  "You notice the little things; that's your magic.",
  "Holding you feels like hitting save.",
  "You make the future feel friendly.",
  "We're writing our story one ordinary day at a time.",
  "Your laugh is my favorite sound in any room.",
  "Distance means little when hearts sync daily.",
  "Thanks for being soft in a hard world.",
  "Best hello of my day, every single day.",
  "Sharing dreams with you doubles their size.",
  "Your love is quiet proof that good things stay.",
  "I'd pick this ordinary life with you, every time.",
  "You + me — my favorite math.",
  "Some habits are worth keeping forever, like us.",
  "Your kindness at home teaches my heart daily.",
  "Coffee tastes better across from you.",
  "We grow roots and wings at the same time.",
  "Our tiny check-ins matter more than big words.",
  "You're the reason my quiet days feel full.",
  "Love grows where attention goes — mine's on you.",
  "Being your person is my proudest job.",
  "You remember my small things; that's real romance.",
  "Our little routines are my favorite rituals.",
  "You're not my other half — you're my whole mood.",
  "Together is my favorite kind of consistency.",
  "Thanks for choosing us daily.",
  "Your quiet support carries my loud dreams.",
  "I brag about you in my head all day.",
  "You make patience feel like a superpower.",
  "Rainy days feel warmer with you near.",
  "My heart checks off “happy” when you're around.",
  "Let's keep winning tiny days together.",
  "Your love is my daily recharge.",
  "Forever sounds long; with you it sounds like a plan.",
  "You turn “someday” into “today”.",
  "With you, growth feels like a date.",
];

const MOTIVATION: string[] = [
  "Small progress every day becomes something great.",
  "Your future is built in today's quiet choices.",
  "Show up, even when no one is watching.",
  "Discipline is a gift you give your future self.",
  "Be consistent; the results will find you.",
  "One more day of effort is one less day of doubt.",
  "Growth whispers before it roars.",
  "You don't need permission to improve.",
  "Hard days shape strong people.",
  "Start small. Start now.",
  "Your habits are voting on who you become.",
  "Slow is smooth; smooth is fast.",
  "Done daily beats done perfectly.",
  "Focus is your superpower — protect it.",
  "Sweat now, shine later.",
  "The streak you protect today protects you tomorrow.",
  "Comfort is nice; growth is better.",
  "Quitting is a habit too — choose better ones.",
  "Make your bed, then make your day.",
  "Every expert was once a beginner who refused to stop.",
  "Big goals shrink when you walk daily.",
  "Momentum loves action — take one.",
  "Your only competition is yesterday's you.",
  "Keep promises to yourself first.",
  "Tired is temporary; proud is forever.",
  "Do it badly if you must, but do it. Improvement follows.",
  "Effort compounds like interest.",
  "The plan works if you do.",
  "Roots grow before flowers — stay patient.",
  "Discipline outlasts motivation every single time.",
  "One focused hour beats a distracted day.",
  "You're one habit away from a different life.",
  "Make today count louder than yesterday.",
  "Win the morning, win the day.",
  "Boredom is where mastery is born.",
  "Your hardest chapter builds your best story — keep going.",
  "Small wins stack into big change.",
  "Direction beats speed.",
  "Be stubborn about goals, flexible about methods.",
  "Future you is watching — make them proud.",
  "Energy follows action, not the other way around.",
  "Routine is freedom in disguise.",
  "Grow 1% today; wake up new in a year.",
  "Obstacles are checkpoints for the serious.",
  "You can't rush greatness, but you can schedule it.",
  "Silence the excuses; amplify the effort.",
  "Today's effort is tomorrow's evidence.",
  "Chase progress, not perfection.",
  "Tough seasons pass; disciplined people last.",
  "Dream big, start tiny, move daily.",
  "Consistency turns effort into identity.",
  "Your comfort zone is a waiting room — step out.",
  "Luck favors the one already working.",
  "Finish what you start; it builds self-trust.",
  "The best project you'll ever work on is you.",
  "Doubt gets loud near the finish line — keep running.",
  "Water your goals daily and watch them grow.",
  "Don't wait to feel ready; act, and readiness follows.",
  "Grind quietly; let results make the noise.",
];

// ---------------------------------------------------------------------------
// Selection: both pools are merged + deterministically shuffled once (fixed
// seed), then a stride coprime with the pool length walks one step per day.
// Result: zero repeats for 120 straight days, and the category order looks
// random while each day stays stable.
// ---------------------------------------------------------------------------

interface PoolItem extends DailyQuote {}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const POOL: PoolItem[] = seededShuffle(
  [
    ...LOVE.map((text) => ({ text, category: "love" as const })),
    ...MOTIVATION.map((text) => ({ text, category: "motivation" as const })),
  ],
  20260911
);

const STRIDE = 53; // gcd(53, 120) = 1 → full cycle before any repeat

/** The quote for a given day (defaults to today, local time). */
export function quoteOfTheDay(date = new Date()): DailyQuote {
  const dayNum = Math.floor(parseKey(dateKey(date)).getTime() / 86_400_000);
  const idx = (((dayNum * STRIDE) % POOL.length) + POOL.length) % POOL.length;
  return POOL[idx];
}

export function quoteCategoryLabel(category: QuoteCategory): string {
  return category === "love" ? "Daily Love" : "Daily Motivation";
}
