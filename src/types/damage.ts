export type DamageStat = 'atk' | 'hp' | 'def'
export type DamageCategory = 'normalAtk' | 'heavyAtk' | 'resonanceSkill' | 'resonanceLiberation' | 'phantom' | 'coordinated' | 'effect'

export interface Skill {
  name: string
  multipliers: string[]
  tag: 'E' | 'Q' | '变奏'
  bonusDmg: number
  treeId: string
  skillType: string
  source?: 'kuro-official'
  isHeavy?: boolean
  /** Damage bonus category. Overrides the skill-tree category and isHeavy heuristic. */
  damageType?: DamageCategory
  /** Base stat used by the multiplier. Defaults to attack for existing data. */
  damageStat?: DamageStat
}

export type BuffType =
  | 'atkPct' | 'critRate' | 'critDmg' | 'elemDmg'
  | 'normalAtkDmg' | 'heavyAtkDmg' | 'resonanceSkillDmg' | 'resonanceLiberationDmg'
  | 'hpPct' | 'defPct'

export type EffectType = BuffType | 'defIgnore' | 'resReduce' | 'dmgDeepen' | 'guaranteedCrit' | 'multiplierBoost'

export interface InherentBuff {
  type: BuffType | 'defIgnore' | 'resReduce' | 'dmgDeepen'
  value: number
  condition?: string
  targetSkill?: string   // regex pattern matching skill name; omit = applies to all
  targetTreeId?: string
  damageType?: DamageCategory
  targetElement?: string
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
  type: EffectType
  /** Effect value (percentage as decimal, e.g. 0.30 = 30%) */
  value: number
  /** Description of the effect */
  condition?: string
  /** Regex pattern matching skill name; omit = applies to all skills */
  targetSkill?: string
  targetTreeId?: string
  damageType?: DamageCategory
  targetElement?: string
  /** Whether this effect is active (default true if omitted). Set false for conditional effects. */
  enabled?: boolean
}

export interface BranchEnhancement {
  skillType: string
  skillTitle: string
  name: string
  valueText: string
  valuePercent: number
}

export interface CharacterBase {
  baseAtk: number
  baseHp?: number
  baseDef?: number
  weaponType: string
  element: string
  ascensionStat: { type: string; value: number }
  inherentBuffs: InherentBuff[]
  chainStats: ChainStat[]
  chainEffects?: ChainEffect[]
  /** Official skill-tree stat nodes. Stored as source data; not applied twice to damage. */
  branchEnhancements?: BranchEnhancement[]
  weaponPassiveMultiplier: Record<string, number>
  skills: Skill[]
}

export interface WeaponPassiveEffect {
  type: EffectType
  paramIdx: number
  condition: string
  stacks?: number
  stackParamIdx?: number
  targetSkill?: string
  targetTreeId?: string
  damageType?: DamageCategory
  targetElement?: string
  enabled?: boolean
  valueScale?: number
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
  hpPct?: number
  critRate: number
  critDmg: number
  passive: WeaponPassive
  passiveEffects?: WeaponPassiveEffect[]
}

export interface SonataSetEffect {
  type: BuffType | 'critRate' | 'critDmg'
  value: number
  condition?: string
  stacks?: number
}

export interface SonataEffect {
  name: string
  set2: SonataSetEffect | SonataSetEffect[] | null
  set3: SonataSetEffect | SonataSetEffect[] | null
  set5: SonataSetEffect | SonataSetEffect[] | null
}

export interface StatSource {
  label: string
  value: number
}

export interface PanelBreakdown {
  atk: { total: number; baseAtk: number; sources: StatSource[] }
  hp: { total: number; baseHp: number; sources: StatSource[] }
  def: { total: number; baseDef: number; sources: StatSource[] }
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
    hp: number
    def: number
    critRate: number
    critDmg: number
    elemDmg: number
    energyRegen: number
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
  damageStat?: DamageStat
  expected: number
  crit: number
}
