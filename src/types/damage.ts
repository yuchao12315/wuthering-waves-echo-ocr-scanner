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
  type: BuffType | 'defIgnore' | 'resReduce' | 'dmgDeepen'
  value: number
  condition?: string
  targetSkill?: string   // regex pattern matching skill name; omit = applies to all
  enabled?: boolean      // default true; set false to mark as conditional/off by default
}

export interface ChainStat {
  type: BuffType
  value: number
}

export interface ChainEffect {
  /** Which sequence node unlocks this (1-6) */
  sequence: number
  /** Effect type */
  type: BuffType | 'defIgnore' | 'resReduce' | 'dmgDeepen' | 'guaranteedCrit' | 'multiplierBoost'
  /** Effect value (percentage as decimal, e.g. 0.30 = 30%) */
  value: number
  /** Description of the effect */
  condition?: string
  /** Regex pattern matching skill name; omit = applies to all skills */
  targetSkill?: string
  /** Whether this effect is active (default true if omitted). Set false for conditional effects. */
  enabled?: boolean
}

export interface CharacterBase {
  baseAtk: number
  weaponType: string
  element: string
  ascensionStat: { type: string; value: number }
  inherentBuffs: InherentBuff[]
  chainStats: ChainStat[]
  chainEffects?: ChainEffect[]
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

export interface StatSource {
  label: string
  value: number
}

export interface PanelBreakdown {
  atk: { total: number; baseAtk: number; sources: StatSource[] }
  critRate: { total: number; sources: StatSource[] }
  critDmg: { total: number; sources: StatSource[] }
  elemDmg: { total: number; sources: StatSource[] }
  normalAtkDmg: { total: number; sources: StatSource[] }
  heavyAtkDmg: { total: number; sources: StatSource[] }
  resonanceSkillDmg: { total: number; sources: StatSource[] }
  resonanceLiberationDmg: { total: number; sources: StatSource[] }
}

export interface DamageResult {
  panel: {
    atk: number
    critRate: number
    critDmg: number
    elemDmg: number
    resonanceSkillDmg: number
    resonanceLiberationDmg: number
    normalAtkDmg: number
    heavyAtkDmg: number
  }
  breakdown: PanelBreakdown
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
