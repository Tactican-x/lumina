import React from 'react';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type IconProps = {
  size?: number;
  color?: string;
  [key: string]: any;
};

// Feather
export const Eye = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="eye" size={size} color={color} />;
export const EyeOff = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="eye-off" size={size} color={color} />;

export const X = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="x" size={size} color={color} />;
export const Check = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="check" size={size} color={color} />;

export const Plus = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="plus" size={size} color={color} />;
export const Search = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="search" size={size} color={color} />;

export const Settings = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="settings" size={size} color={color} />;
export const Home = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="home" size={size} color={color} />;
export const BookOpen = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="book-open" size={size} color={color} />;

export const ExternalLink = ({ size = 20, color = '#fff' }: IconProps) => (
  <Feather name="external-link" size={size} color={color} />
);

export const Clock = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="clock" size={size} color={color} />;
export const Calendar = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="calendar" size={size} color={color} />;

export const ChevronDown = ({ size = 20, color = '#fff' }: IconProps) => (
  <Feather name="chevron-down" size={size} color={color} />
);
export const ChevronUp = ({ size = 20, color = '#fff' }: IconProps) => (
  <Feather name="chevron-up" size={size} color={color} />
);
export const ChevronRight = ({ size = 20, color = '#fff' }: IconProps) => (
  <Feather name="chevron-right" size={size} color={color} />
);

export const TrendingUp = ({ size = 20, color = '#fff' }: IconProps) => (
  <Feather name="trending-up" size={size} color={color} />
);
export const TrendingDown = ({ size = 20, color = '#fff' }: IconProps) => (
  <Feather name="trending-down" size={size} color={color} />
);
export const Minus = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="minus" size={size} color={color} />;

export const AlertTriangle = ({ size = 20, color = '#fff' }: IconProps) => (
  <Feather name="alert-triangle" size={size} color={color} />
);

export const Target = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="target" size={size} color={color} />;
export const CheckCircle2 = ({ size = 20, color = '#fff' }: IconProps) => (
  <Feather name="check-circle" size={size} color={color} />
);

export const GitBranch = ({ size = 20, color = '#fff' }: IconProps) => (
  <Feather name="git-branch" size={size} color={color} />
);
export const Trophy = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="award" size={size} color={color} />;

export const Users = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="users" size={size} color={color} />;
export const Moon = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="moon" size={size} color={color} />;
export const Sun = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="sun" size={size} color={color} />;
export const Battery = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="battery" size={size} color={color} />;

export const Circle = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="circle" size={size} color={color} />;

export const Zap = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="zap" size={size} color={color} />;
export const Flame = ({ size = 20, color = '#fff' }: IconProps) => <Feather name="zap" size={size} color={color} />;

// Ionicons / MaterialCommunityIcons
export const Sparkles = ({ size = 20, color = '#fff' }: IconProps) => (
  <Ionicons name="sparkles" size={size} color={color} />
);

export const Brain = ({ size = 20, color = '#fff' }: IconProps) => (
  <MaterialCommunityIcons name="brain" size={size} color={color} />
);

export const Calculator = ({ size = 20, color = '#fff' }: IconProps) => (
  <MaterialCommunityIcons name="calculator" size={size} color={color} />
);

// Proper pin icon
export const Pin = ({ size = 20, color = '#fff' }: IconProps) => (
  <MaterialCommunityIcons name="pin" size={size} color={color} />
);