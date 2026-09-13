import {
  Bike,
  BookOpen,
  Brain,
  Coffee,
  Droplets,
  Dumbbell,
  Footprints,
  GraduationCap,
  Heart,
  Languages,
  MoonStar,
  Music,
  PenLine,
  Pill,
  School,
  Soup,
  Sprout,
  Sun,
  Target,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  school: School,
  "graduation-cap": GraduationCap,
  coffee: Coffee,
  "utensils-crossed": UtensilsCrossed,
  soup: Soup,
  "moon-star": MoonStar,
  dumbbell: Dumbbell,
  droplets: Droplets,
  footprints: Footprints,
  brain: Brain,
  "pen-line": PenLine,
  music: Music,
  sprout: Sprout,
  heart: Heart,
  sun: Sun,
  target: Target,
  languages: Languages,
  wallet: Wallet,
  pill: Pill,
  bike: Bike,
};

export const ICON_KEYS = Object.keys(ICONS);

export interface ColorToken {
  key: string;
  hex: string;
  tile: string; // icon tile
  tileActive: string;
  check: string; // completed check button
  chip: string;
  dot: string;
  bar: string;
}

// All class strings are static so Tailwind can JIT them.
export const COLORS: Record<string, ColorToken> = {
  lime: {
    key: "lime",
    hex: "#a3e635",
    tile: "bg-lime-400/10 text-lime-300",
    tileActive: "bg-lime-400/20 text-lime-200",
    check: "bg-lime-400 text-lime-950 shadow-[0_0_24px_rgba(163,230,53,0.35)]",
    chip: "bg-lime-400/10 text-lime-300",
    dot: "bg-lime-400",
    bar: "bg-lime-400",
  },
  emerald: {
    key: "emerald",
    hex: "#34d399",
    tile: "bg-emerald-400/10 text-emerald-300",
    tileActive: "bg-emerald-400/20 text-emerald-200",
    check: "bg-emerald-400 text-emerald-950 shadow-[0_0_24px_rgba(52,211,153,0.35)]",
    chip: "bg-emerald-400/10 text-emerald-300",
    dot: "bg-emerald-400",
    bar: "bg-emerald-400",
  },
  sky: {
    key: "sky",
    hex: "#38bdf8",
    tile: "bg-sky-400/10 text-sky-300",
    tileActive: "bg-sky-400/20 text-sky-200",
    check: "bg-sky-400 text-sky-950 shadow-[0_0_24px_rgba(56,189,248,0.35)]",
    chip: "bg-sky-400/10 text-sky-300",
    dot: "bg-sky-400",
    bar: "bg-sky-400",
  },
  violet: {
    key: "violet",
    hex: "#a78bfa",
    tile: "bg-violet-400/10 text-violet-300",
    tileActive: "bg-violet-400/20 text-violet-200",
    check: "bg-violet-400 text-violet-950 shadow-[0_0_24px_rgba(167,139,250,0.35)]",
    chip: "bg-violet-400/10 text-violet-300",
    dot: "bg-violet-400",
    bar: "bg-violet-400",
  },
  amber: {
    key: "amber",
    hex: "#fbbf24",
    tile: "bg-amber-400/10 text-amber-300",
    tileActive: "bg-amber-400/20 text-amber-200",
    check: "bg-amber-400 text-amber-950 shadow-[0_0_24px_rgba(251,191,36,0.35)]",
    chip: "bg-amber-400/10 text-amber-300",
    dot: "bg-amber-400",
    bar: "bg-amber-400",
  },
  orange: {
    key: "orange",
    hex: "#fb923c",
    tile: "bg-orange-400/10 text-orange-300",
    tileActive: "bg-orange-400/20 text-orange-200",
    check: "bg-orange-400 text-orange-950 shadow-[0_0_24px_rgba(251,146,60,0.35)]",
    chip: "bg-orange-400/10 text-orange-300",
    dot: "bg-orange-400",
    bar: "bg-orange-400",
  },
  rose: {
    key: "rose",
    hex: "#fb7185",
    tile: "bg-rose-400/10 text-rose-300",
    tileActive: "bg-rose-400/20 text-rose-200",
    check: "bg-rose-400 text-rose-950 shadow-[0_0_24px_rgba(251,113,133,0.35)]",
    chip: "bg-rose-400/10 text-rose-300",
    dot: "bg-rose-400",
    bar: "bg-rose-400",
  },
  indigo: {
    key: "indigo",
    hex: "#818cf8",
    tile: "bg-indigo-400/10 text-indigo-300",
    tileActive: "bg-indigo-400/20 text-indigo-200",
    check: "bg-indigo-400 text-indigo-950 shadow-[0_0_24px_rgba(129,140,248,0.35)]",
    chip: "bg-indigo-400/10 text-indigo-300",
    dot: "bg-indigo-400",
    bar: "bg-indigo-400",
  },
};

export const COLOR_KEYS = Object.keys(COLORS);

export function colorOf(key: string): ColorToken {
  return COLORS[key] ?? COLORS.lime;
}

export function iconOf(key: string): LucideIcon {
  return ICONS[key] ?? Target;
}

export const DEFAULT_HABITS: { name: string; icon: string; color: string }[] = [
  { name: "Study today", icon: "book-open", color: "violet" },
  { name: "Go to school", icon: "school", color: "sky" },
  { name: "Go to coaching", icon: "graduation-cap", color: "amber" },
  { name: "Eat breakfast", icon: "coffee", color: "orange" },
  { name: "Eat lunch", icon: "utensils-crossed", color: "emerald" },
  { name: "Eat dinner", icon: "soup", color: "rose" },
  { name: "Sleep before 3:00 AM", icon: "moon-star", color: "indigo" },
];
