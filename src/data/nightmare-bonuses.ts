/**
 * 梦魇声骸固定加成映射表
 * key: 声骸名称 (含"梦魇·"前缀)
 * value: { elemDmg: 属性伤害加成(小数), skillDmg: 技能伤害加成(小数) }
 *
 * 所有梦魇声骸统一: 12%属性伤害 + 12%对应技能类型伤害
 * skillDmg 在 damage.ts 中会同时加到全部4个技能类型池
 */

export interface NightmareBonus {
  elemDmg: number
  skillDmg: number
}

export const NIGHTMARE_BONUS_MAP: Record<string, NightmareBonus> = {
  // === 热熔 ===
  '梦魇·燎照之骑': { elemDmg: 0.12, skillDmg: 0.12 },

  // === 导电 ===
  '梦魇·朔雷之鳞': { elemDmg: 0.12, skillDmg: 0.12 },
  '梦魇·云闪之鳞': { elemDmg: 0.12, skillDmg: 0.12 },
  '梦魇·阿嗞嗞': { elemDmg: 0.12, skillDmg: 0.12 },

  // === 气动 ===
  '梦魇·飞廉之猩': { elemDmg: 0.12, skillDmg: 0.12 },
  '梦魇·无常凶鹭': { elemDmg: 0.12, skillDmg: 0.12 },

  // === 冷凝 ===
  '梦魇·辉萤军势': { elemDmg: 0.12, skillDmg: 0.12 },
  '梦魇·巡徊猎手': { elemDmg: 0.12, skillDmg: 0.12 },

  // === 湮灭 ===
  '梦魇·无冠者': { elemDmg: 0.12, skillDmg: 0.12 },
  '梦魇·刺玫菇': { elemDmg: 0.12, skillDmg: 0.12 },

  // === 衍射 ===
  '梦魇·哀声鸷': { elemDmg: 0.12, skillDmg: 0.12 },
  '梦魇·游弋蝶': { elemDmg: 0.12, skillDmg: 0.12 },
}

/** 通用梦魇加成: 无 (不在映射表中的梦魇声骸不给予加成) */

/** 根据声骸名称查找梦魇加成, 不在映射表中或非梦魇返回 null */
export function getNightmareBonus(name: string): NightmareBonus | null {
  if (!name.includes('梦魇')) return null
  return NIGHTMARE_BONUS_MAP[name] ?? null
}
