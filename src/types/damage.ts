export interface Skill {
  name: string
  multipliers: string[]
  tag: 'E' | 'Q' | '变奏'
  bonusDmg: number
  treeId: string
  skillType: string
  isHeavy?: boolean
}

export type BuffType =
  | 'atkPct' | 'critRate' | 'critDmg' | 'elemDmg'
  | 'normalAtkDmg' | 'heavyAtkDmg' | 'resonanceSkillDmg' | 'resonanceLiberationDmg'
  | 'hpPct' | 'defPct'

export interface InherentBuff {
  type: BuffType
  value: number
  condition?: string
}

export interface ChainStat {
  type: BuffType
  value: number
}

export interface CharacterBase {
  baseAtk: number
  weaponType: string
  element: string
  ascensionStat: { type: string; value: number }
  inherentBuffs: InherentBuff[]
  chainStats: ChainStat[]
  weaponPassiveMultiplier: Record<string, number>
  skills: Skill[]
}

export interface WeaponPassiveEffect {
  type: BuffType
  paramIdx: number
  condition: string
  stacks?: number
  stackParamIdx?: number
}

export interface WeaponPassive {
  effectName: string
  effect: string
  param: string[][]
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
  passiveEffects?: WeaponPassiveEffect[]
}

export interface SonataSetEffect {
  type: BuffType
  value: number
  condition?: string
  stacks?: number
}

export interface SonataEffect {
  name: string
  set2: SonataSetEffect | null
  set5: SonataSetEffect | null
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
  skillType: string
  multiplierStr: string
  multiplier: number
  expected: number
  crit: number
}
