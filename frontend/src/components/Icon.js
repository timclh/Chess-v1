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

export default Icon;
