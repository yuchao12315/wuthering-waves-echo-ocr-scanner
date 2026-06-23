/**
 * 梦魇声骸固定加成映射表
 * 条件: 在首位装配该声骸技能时生效
 *
 * elemDmg: 属性伤害加成 (对应元素类型)
 * elemType: 属性类型 (热熔/导电/气动/冷凝/湮灭/衍射)
 * secondType: 第二加成的技能类型键
 *   - resonanceSkillDmg: 共鸣技能伤害加成
 *   - resonanceLiberationDmg: 共鸣解放伤害加成
 *   - normalAtkDmg: 普攻伤害加成
 *   - heavyAtkDmg: 重击伤害加成
 *   - phantomDmg: 声骸技能伤害加成
 *   - coordinatedDmg: 协同攻击伤害加成
 *   - aeroDmg: 气动伤害加成
 *   - energyRegen: 共鸣效率
 *   - critRate: 暴击率
 * secondValue: 第二加成数值 (小数)
 * requiredCharacters: 角色限制 (仅指定角色装备时生效, 不填=所有角色)
 */

export type NightmareSecondType =
  | 'resonanceSkillDmg'
  | 'resonanceLiberationDmg'
  | 'normalAtkDmg'
  | 'heavyAtkDmg'
  | 'phantomDmg'
  | 'coordinatedDmg'
  | 'aeroDmg'
  | 'energyRegen'
  | 'critRate'

export interface NightmareBonus {
  elemDmg?: number
  elemType?: string
  secondType: NightmareSecondType
  secondValue: number
  requiredCharacters?: string[]
}

export const NIGHTMARE_BONUS_MAP: Record<string, NightmareBonus> = {
  // === Cost 4 ===

  // 湮灭 - 声骸技能伤害+20%
  '梦魇·赫卡忒': {
    elemDmg: 0.12, elemType: '湮灭',
    secondType: 'phantomDmg', secondValue: 0.20,
  },

  // 湮灭 - 共鸣解放+12%
  '共鸣回响·鸣式·利维亚坦': {
    elemDmg: 0.12, elemType: '湮灭',
    secondType: 'resonanceLiberationDmg', secondValue: 0.12,
  },

  // 冷凝 - 气动伤害+12%
  '梦魇·凯尔匹': {
    elemDmg: 0.12, elemType: '冷凝',
    secondType: 'aeroDmg', secondValue: 0.12,
  },

  // 冷凝 - 协同攻击伤害+30%
  '梦魇·辉萤军势': {
    elemDmg: 0.12, elemType: '冷凝',
    secondType: 'coordinatedDmg', secondValue: 0.30,
  },

  // 冷凝 - 共鸣解放+12%
  '共鸣回响·鸣式·虚造神型': {
    elemDmg: 0.12, elemType: '冷凝',
    secondType: 'resonanceLiberationDmg', secondValue: 0.12,
  },

  // 衍射 - 暴击率+15% (角色限制: 露西/丽贝卡)
  '共鸣回响·梦魇亚当·重锤': {
    elemDmg: 0.12, elemType: '衍射',
    secondType: 'critRate', secondValue: 0.15,
    requiredCharacters: ['露西', '丽贝卡'],
  },

  // 衍射 - 仅属性伤害(无第二加成)
  '梦魇·哀声鸷': {
    elemDmg: 0.12, elemType: '衍射',
    secondType: 'phantomDmg', secondValue: 0,
  },

  // 热熔 - 共鸣技能伤害+12%
  '梦魇·燎照之骑': {
    elemDmg: 0.12, elemType: '热熔',
    secondType: 'resonanceSkillDmg', secondValue: 0.12,
  },

  // 湮灭 - 普攻伤害+12%
  '梦魇·无冠者': {
    elemDmg: 0.12, elemType: '湮灭',
    secondType: 'normalAtkDmg', secondValue: 0.12,
  },

  // 导电 - 共鸣技能伤害+12%
  '梦魇·朔雷之鳞': {
    elemDmg: 0.12, elemType: '导电',
    secondType: 'resonanceSkillDmg', secondValue: 0.12,
  },

  // 导电 - 共鸣解放伤害+12%
  '梦魇·云闪之鳞': {
    elemDmg: 0.12, elemType: '导电',
    secondType: 'resonanceLiberationDmg', secondValue: 0.12,
  },

  // 湮灭 - 重击伤害+12%
  '梦魇·无常凶鹭': {
    elemDmg: 0.12, elemType: '湮灭',
    secondType: 'heavyAtkDmg', secondValue: 0.12,
  },

  // 气动 - 重击伤害+12%
  '梦魇·飞廉之猩': {
    elemDmg: 0.12, elemType: '气动',
    secondType: 'heavyAtkDmg', secondValue: 0.12,
  },

  // 气动 - 重击伤害+12%
  '共鸣回响·芬莱克': {
    elemDmg: 0.12, elemType: '气动',
    secondType: 'heavyAtkDmg', secondValue: 0.12,
  },

  // 气动 - 声骸技能+20%
  '无铭探索者': {
    elemDmg: 0.12, elemType: '气动',
    secondType: 'phantomDmg', secondValue: 0.20,
  },

  // 共鸣效率+10% (无角色限制)
  '炉芯机骸': {
    secondType: 'energyRegen', secondValue: 0.10,
  },

  // 共鸣解放+25% (角色限制: 爱弥斯)
  '辛吉勒姆': {
    elemDmg: 0.12, elemType: '热熔',
    secondType: 'resonanceLiberationDmg', secondValue: 0.25,
    requiredCharacters: ['爱弥斯'],
  },

  // 共鸣回响·达妮娅 - 衍射
  '共鸣回响·达妮娅': {
    elemDmg: 0.12, elemType: '衍射',
    secondType: 'phantomDmg', secondValue: 0.20,
  },
}

/** 通用梦魇加成: 无 (不在映射表中的梦魇声骸不给予加成) */

/** 根据声骸名称查找梦魇加成, 不在映射表中返回 null */
export function getNightmareBonus(name: string, characterName?: string): NightmareBonus | null {
  const bonus = NIGHTMARE_BONUS_MAP[name]
  if (!bonus) return null
  // 有角色限制时检查是否匹配
  if (bonus.requiredCharacters && bonus.requiredCharacters.length > 0) {
    if (!characterName || !bonus.requiredCharacters.includes(characterName)) {
      return null
    }
  }
  return bonus
}
