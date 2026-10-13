"use client";

// Icons from Phosphor (https://github.com/phosphor-icons/react, MIT license), in the
// friendly "duotone" style. Decorative only: always aria-hidden, the text next to
// them carries the meaning.

import {
  Bell,
  CalendarCheck,
  Camera,
  ChartBar,
  ChatCircleDots,
  Check,
  Clock,
  FileText,
  Hammer,
  House,
  Key,
  Package,
  Robot,
  Scales,
  ShieldCheck,
  Sparkle,
  Tag,
  UsersThree,
  Warning,
  Wrench,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

type P = { size?: number };

function wrap(Component: PhosphorIcon) {
  function Wrapped({ size = 24 }: P) {
    return <Component size={size} weight="duotone" aria-hidden="true" className="shrink-0" />;
  }
  return Wrapped;
}

export const WrenchIcon = wrap(Wrench);
export const CameraIcon = wrap(Camera);
export const TagIcon = wrap(Tag);
export const ScaleIcon = wrap(Scales);
export const ChartIcon = wrap(ChartBar);
export const DocIcon = wrap(FileText);
export const HomeIcon = wrap(House);
export const KeyIcon = wrap(Key);
export const AlertIcon = wrap(Warning);
export const CheckIcon = wrap(Check);
export const ShieldIcon = wrap(ShieldCheck);
export const ChatIcon = wrap(ChatCircleDots);
export const SparkIcon = wrap(Sparkle);
export const PeopleIcon = wrap(UsersThree);
export const BellIcon = wrap(Bell);
export const ClockIcon = wrap(Clock);
export const CalendarIcon = wrap(CalendarCheck);
export const BoxIcon = wrap(Package);
export const RobotIcon = wrap(Robot);
export const HammerIcon = wrap(Hammer);
