"use client";

// Icons from Phosphor (https://github.com/phosphor-icons/react, MIT license), in the
// friendly "duotone" style. Decorative only: always aria-hidden, the text next to
// them carries the meaning.

import {
  ArrowCounterClockwise,
  Bell,
  CalendarCheck,
  Calculator,
  Camera,
  ChartBar,
  ChatCircleDots,
  Check,
  Clock,
  FileText,
  DeviceMobile,
  Hammer,
  HandTap,
  House,
  Key,
  Lightning,
  Moon,
  Package,
  Pause,
  Gear,
  PhoneCall,
  Play,
  Robot,
  Scales,
  ShieldCheck,
  SkipBack,
  SkipForward,
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
export const CalculatorIcon = wrap(Calculator);
export const BoltIcon = wrap(Lightning);
export const TapIcon = wrap(HandTap);
export const MoonIcon = wrap(Moon);
export const PhoneCallIcon = wrap(PhoneCall);
export const MobileIcon = wrap(DeviceMobile);
export const PlayIcon = wrap(Play);
export const PauseIcon = wrap(Pause);
export const GearIcon = wrap(Gear);
export const BackIcon = wrap(SkipBack);
export const ForwardIcon = wrap(SkipForward);
export const RestartIcon = wrap(ArrowCounterClockwise);
