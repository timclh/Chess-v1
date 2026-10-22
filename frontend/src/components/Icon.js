/**
 * Icon: one place to pick icons for the whole app (replaces emoji used as icons).
 *
 * Lucide (ISC licence) stroke icons that follow the surrounding text colour and
 * scale with `size`. Add a name here, not an import at the call site, so the
 * icon set can be swapped or restyled in one file.
 *
 *   <Icon name="home" />
 *   <Icon name="flame" size={16} className="streak-icon" />
 */

import React from 'react';
import {
  House,
  ChessKnight,
  BookOpen,
  Globe,
  Trophy,
  User,
  Users,
  Puzzle,
  MonitorPlay,
  Bot,
  Swords,
  Flame,
  CircleCheck,
  Lightbulb,
  Settings,
  Volume2,
  VolumeX,
  Undo2,
  RefreshCw,
  Lock,
  FileText,
  Trash2,
  Mail,
  Target,
  Star,
  Crown,
  Send,
  X,
  Gamepad2,
  Clock,
  Layers,
  TriangleAlert,
  Calendar,
  ChartColumn,
  ClipboardList,
  TrendingUp,
  Save,
  Search,
  Brain,
  Zap,
  Handshake,
  Flag,
  Bell,
  Link2,
  Hand,
  GraduationCap,
  Maximize2,
  Sparkles,
  MessageCircle,
  Gem,
  Eye,
  Smartphone,
  CircleX,
} from 'lucide-react';

const ICONS = {
  home: House,
  play: ChessKnight,
  learn: BookOpen,
  online: Globe,
  rankings: Trophy,
  profile: User,
  friends: Users,
  puzzles: Puzzle,
  videos: MonitorPlay,
  coach: Bot,
  challenge: Swords,
  streak: Flame,
  done: CircleCheck,
  hint: Lightbulb,
  settings: Settings,
  sound: Volume2,
  muted: VolumeX,
  undo: Undo2,
  reset: RefreshCw,
  privacy: Lock,
  terms: FileText,
  delete: Trash2,
  email: Mail,
  target: Target,
  star: Star,
  crown: Crown,
  send: Send,
  close: X,
  games: Gamepad2,
  clock: Clock,
  layers: Layers,
  warning: TriangleAlert,
  calendar: Calendar,
  chart: ChartColumn,
  plan: ClipboardList,
  trend: TrendingUp,
  save: Save,
  search: Search,
  brain: Brain,
  zap: Zap,
  handshake: Handshake,
  flag: Flag,
  bell: Bell,
  link: Link2,
  hand: Hand,
  graduate: GraduationCap,
  expand: Maximize2,
  sparkles: Sparkles,
  message: MessageCircle,
  gem: Gem,
  eye: Eye,
  phone: Smartphone,
  wrong: CircleX,
};

export const ICON_NAMES = Object.keys(ICONS);

export function Icon({ name, size = 20, strokeWidth = 1.75, className, ...rest }) {
  const Glyph = ICONS[name];
  if (!Glyph) return null;
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    />
  );
}

/** A gomoku stone as a small CSS disc (replaces the black/white circle emoji). */
export function StoneDot({ color = 'black', className = '' }) {
  return <span className={`stone-dot ${color} ${className}`.trim()} aria-hidden="true" />;
}

/** Difficulty as filled stars (replaces repeated star emoji). */
export function Stars({ count = 0, size = 12 }) {
  return (
    <span className="stars" role="img" aria-label={`${count} star${count === 1 ? '' : 's'}`}>
      {Array.from({ length: count }, (_, i) => (
        <Star key={i} size={size} fill="currentColor" strokeWidth={0} aria-hidden="true" focusable="false" />
      ))}
    </span>
  );
}

export default Icon;
