import {
  Award,
  CreditCard,
  Eye,
  Flame,
  Headphones,
  MessageCircle,
  Mic,
  MonitorPlay,
  PartyPopper,
  PenLine,
  Users,
  CircleDollarSign,
  Skull,
  Spade,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type GameCategory = "Casino" | "Party" | "Social" | "Debate";

export type Game = {
  slug: string;
  name: string;
  description: string;
  category: GameCategory;
  icon: LucideIcon;
  status: "live" | "wip";
  wipLabel?: string;
};

export const games: Game[] = [
  {
    slug: "hot-potato",
    name: "Hot Potato",
    description: "Fast passes, faster reactions. Don't get stuck holding it.",
    category: "Party",
    icon: Flame,
    status: "wip",
    wipLabel: "Coming Soon",
  },
  {
    slug: "blackjack",
    name: "Blackjack",
    description: "Hit the sweet spot between skill and luck.",
    category: "Casino",
    icon: CreditCard,
    status: "live",
  },
  {
    slug: "roulette",
    name: "Roulette",
    description: "Drop a bet and watch the neon wheel spin.",
    category: "Casino",
    icon: CircleDollarSign,
    status: "wip",
    wipLabel: "Coming Soon",
  },
  {
    slug: "i-spy",
    name: "I Spy",
    description: "Clues, quick eyes, and instant callouts.",
    category: "Party",
    icon: Eye,
    status: "wip",
    wipLabel: "Coming Soon",
  },
  {
    slug: "poker",
    name: "Poker",
    description: "High stakes hands with a premium table feel.",
    category: "Casino",
    icon: Spade,
    status: "wip",
    wipLabel: "Coming Soon",
  },
  {
    slug: "hot-mic",
    name: "Hot Mic",
    description: "Unfiltered, fast, and hilarious. Stay on your toes.",
    category: "Party",
    icon: Mic,
    status: "wip",
    wipLabel: "Coming Soon",
  },
  {
    slug: "charades-blitz",
    name: "Charades Blitz",
    description: "Act it out fast with quick team callouts.",
    category: "Party",
    icon: Users,
    status: "wip",
    wipLabel: "Coming Soon",
  },
  {
    slug: "sus-meter",
    name: "Sus Meter",
    description: "Call out the chaos and rate the vibes.",
    category: "Party",
    icon: Skull,
    status: "wip",
    wipLabel: "Coming Soon",
  },
  {
    slug: "two-truths-one-lie",
    name: "Two Truths, One Lie",
    description: "Spot the bluff and defend your story.",
    category: "Debate",
    icon: MessageCircle,
    status: "wip",
    wipLabel: "Coming Soon",
  },
  {
    slug: "dealers-choice",
    name: "Dealer's Choice",
    description: "Let the host set the tone for the night.",
    category: "Casino",
    icon: Award,
    status: "wip",
    wipLabel: "Coming Soon",
  },
  {
    slug: "would-you-rather",
    name: "Would You Rather",
    description: "Pick a side and defend it with style.",
    category: "Debate",
    icon: PartyPopper,
    status: "wip",
    wipLabel: "Coming Soon",
  },
  {
    slug: "guess-the-ranking",
    name: "Guess the Ranking",
    description: "Rank the answers and reveal the surprise.",
    category: "Debate",
    icon: MonitorPlay,
    status: "wip",
    wipLabel: "Coming Soon",
  },
  {
    slug: "pictionary",
    name: "Pictionary",
    description: "Sketch fast, guess faster, and rack up points.",
    category: "Party",
    icon: PenLine,
    status: "wip",
    wipLabel: "Coming Soon",
  },
  {
    slug: "music-guess",
    name: "Music Guess",
    description: "Name the track, call the artist, own the round.",
    category: "Party",
    icon: Headphones,
    status: "wip",
    wipLabel: "Coming Soon",
  },
  {
    slug: "rapid-trivia",
    name: "Rapid Trivia",
    description: "Quick-fire trivia rounds for teams or solo flex.",
    category: "Social",
    icon: MessageCircle,
    status: "wip",
    wipLabel: "Coming Soon",
  },
];
