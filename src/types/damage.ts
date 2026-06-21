export interface Skill {
  name: string
  multiplier: number
  tag: 'E' | 'Q' | '变奏'
  bonusDmg: number
}

export interface InherentBuff {
  type: 'elemDmg' | 'atkPct' | 'critRate' | 'critDmg'
  value: number
}

export interface CharacterBase {
  baseAtk: number
  weaponType: string
  element: string
  ascensionStat: { type: string; value: number }
  inherentBuffs: InherentBuff[]
  weaponPassiveMultiplier: Record<string, number>
  skills: Skill[]
}

export interface Weapon {
  name: string
  type: string
  rarity: number
  baseAtk: number
  atkPct: number
  critRate: number
  critDmg: number
  passive: { type: string; values: number[] } | null
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
  multiplier: number
  expected: number
  crit: number
}
