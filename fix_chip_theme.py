with open("src/utils/chipTheme.ts", "r") as f:
    content = f.read()

import re

# We will just replace the `return {` blocks with pre-defined constants.

new_content = """export interface ChipTheme {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  colorName: 'emerald' | 'blue' | 'purple' | 'amber' | 'gray';
  cardBorderLeft: string;
  cardBg: string;
  cardBgHover: string;
  cardBgSelected: string;
  cardRingSelected: string;
  avatarBg: string;
  avatarBorder: string;
  avatarText: string;
  avatarShadow: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  phoneText: string;
  checkboxAccent: string;
  dotColor: string;
}

const THEME_BUSINESS: ChipTheme = {
  id: 'chip_1',
  name: 'Business',
  shortName: 'Business',
  icon: '💼',
  colorName: 'emerald',
  cardBorderLeft: 'border-l-4 border-l-emerald-500',
  cardBg: 'bg-emerald-950/20',
  cardBgHover: 'hover:bg-emerald-950/35',
  cardBgSelected: 'bg-emerald-950/45',
  cardRingSelected: 'ring-1 ring-emerald-500/60',
  avatarBg: 'bg-emerald-950/80',
  avatarBorder: 'border-emerald-500/50',
  avatarText: 'text-emerald-300 font-bold',
  avatarShadow: 'shadow-emerald-950/60',
  badgeBg: 'bg-emerald-500/15',
  badgeBorder: 'border-emerald-500/40',
  badgeText: 'text-emerald-300',
  phoneText: 'text-emerald-400 font-mono',
  checkboxAccent: 'accent-emerald-500 text-emerald-500',
  dotColor: 'bg-emerald-400',
};

const THEME_SUPPORT: ChipTheme = {
  id: 'chip_2',
  name: 'Suporte',
  shortName: 'Suporte',
  icon: '🎧',
  colorName: 'blue',
  cardBorderLeft: 'border-l-4 border-l-blue-500',
  cardBg: 'bg-blue-950/20',
  cardBgHover: 'hover:bg-blue-950/35',
  cardBgSelected: 'bg-blue-950/45',
  cardRingSelected: 'ring-1 ring-blue-500/60',
  avatarBg: 'bg-blue-950/80',
  avatarBorder: 'border-blue-500/50',
  avatarText: 'text-blue-300 font-bold',
  avatarShadow: 'shadow-blue-950/60',
  badgeBg: 'bg-blue-500/15',
  badgeBorder: 'border-blue-500/40',
  badgeText: 'text-blue-300',
  phoneText: 'text-blue-400 font-mono',
  checkboxAccent: 'accent-blue-500 text-blue-500',
  dotColor: 'bg-blue-400',
};

const THEME_CHIP3: ChipTheme = {
  id: 'chip_3',
  name: 'Chip 3',
  shortName: 'Chip 3',
  icon: '📱',
  colorName: 'purple',
  cardBorderLeft: 'border-l-4 border-l-purple-500',
  cardBg: 'bg-purple-950/20',
  cardBgHover: 'hover:bg-purple-950/35',
  cardBgSelected: 'bg-purple-950/45',
  cardRingSelected: 'ring-1 ring-purple-500/60',
  avatarBg: 'bg-purple-950/80',
  avatarBorder: 'border-purple-500/50',
  avatarText: 'text-purple-300 font-bold',
  avatarShadow: 'shadow-purple-950/60',
  badgeBg: 'bg-purple-500/15',
  badgeBorder: 'border-purple-500/40',
  badgeText: 'text-purple-300',
  phoneText: 'text-purple-400 font-mono',
  checkboxAccent: 'accent-purple-500 text-purple-500',
  dotColor: 'bg-purple-400',
};

const THEME_UNASSIGNED: ChipTheme = {
  id: 'unassigned',
  name: 'Sem Chip Definido',
  shortName: 'Sem Chip',
  icon: '⚠️',
  colorName: 'gray',
  cardBorderLeft: 'border-l-4 border-l-gray-600',
  cardBg: 'bg-[#141417]',
  cardBgHover: 'hover:bg-[#18181C]',
  cardBgSelected: 'bg-[#A88B4B]/15',
  cardRingSelected: 'ring-1 ring-[#A88B4B]/40',
  avatarBg: 'bg-[#161619]',
  avatarBorder: 'border-[#262629]',
  avatarText: 'text-gray-400 font-bold',
  avatarShadow: '',
  badgeBg: 'bg-gray-800/50',
  badgeBorder: 'border-gray-700/50',
  badgeText: 'text-gray-400',
  phoneText: 'text-gray-300 font-mono',
  checkboxAccent: 'accent-[#A88B4B] text-[#A88B4B]',
  dotColor: 'bg-gray-500',
};

export function getChipTheme(chipId?: string, chipName?: string): ChipTheme {
  const cId = chipId || '';
  const cName = (chipName || '').toLowerCase();

  // 1. Business (Chip 1 / Emerald Green)
  if (cId === 'chip_1' || cName.includes('business') || cName.includes('vendas') || cName.includes('comercial')) {
    return THEME_BUSINESS;
  }

  // 2. Suporte (Chip 2 / Blue)
  if (cId === 'chip_2' || cName.includes('suporte') || cName.includes('support') || cName.includes('atendimento')) {
    return THEME_SUPPORT;
  }

  // 3. Chip 3 (Purple)
  if (cId === 'chip_3' || cName.includes('chip 3') || cName.includes('vip')) {
    return THEME_CHIP3;
  }

  // 4. Unassigned / Sem Chip
  return THEME_UNASSIGNED;
}
"""

with open("src/utils/chipTheme.ts", "w") as f:
    f.write(new_content)
print("Patched chipTheme.ts successfully")
