export interface Skill {
  name: string
  multipliers: string[]   // 19-level multiplier strings, e.g. ["24.50%", ..., "88.89%"]
  tag: 'E' | 'Q' | '变奏'
  bonusDmg: number
  treeId: string          // skillTree key ("1"-"17")
  skillType: string       // e.g. "常态攻击", "共鸣技能", "共鸣解放", "变奏技能", "共鸣回路"
}

export interface InherentBuff {
  type: 'elemDmg' | 'atkPct' | 'critRate' | 'critDmg'
  value: number
}

export interface ChainStat {
  type: 'atkPct' | 'critRate' | 'critDmg' | 'elemDmg' | 'hpPct' | 'defPct'
  value: number
}

export interface CharacterBase {
  baseAtk: number
  weaponType: string
  element: string
  ascensionStat: { type: string; value: number }
  inherentBuffs: InherentBuff[]
  chainStats: ChainStat[]   // 8 resonance chain stat nodes (tree 9-16), always active at Lv90
  weaponPassiveMultiplier: Record<string, number>
  skills: Skill[]
}

export interface WeaponPassive {
  effectName: string       // passive ability name
  effect: string           // description template with {0}, {1}... placeholders
  param: string[][]        // param[i][j]: i = placeholder index, j = refinement rank 0-4 (R1-R5)
}

export interface Weapon {
  name: string
  type: string
  rarity: number
  baseAtk: number
  atkPct: number
  critRate: number
  critDmg: number
  passive: WeaponPassive
}

export interface DamageResult {
  panel: {
    atk: number
    critRate: number
    critDmg: number
    elemDmg: number
  }
  skills: SkillDamage[]
  totalExpected: number
}

export interface SkillDamage {
  name: string
  tag: string
  multiplierStr: string   // raw multiplier string for display, e.g. "48.71%" or "21.58%*4"
  multiplier: number      // parsed total multiplier as decimal, e.g. 0.4871 or 0.8632
  expected: number
  crit: number
}
