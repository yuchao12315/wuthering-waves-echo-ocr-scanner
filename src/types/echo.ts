export type Cost = 1 | 3 | 4

export type SonataType =
  // Standard 2pc/5pc sets
  | 'freezing_frost' | 'molten_rift' | 'void_thunder'
  | 'sierra_gale' | 'celestial_light' | 'havoc_eclipse'
  | 'rejuvenating_glow' | 'moonlit_clouds' | 'lingering_tunes'
  | 'frosty_resolve' | 'eternal_radiance' | 'midnight_veil'
  | 'empyrean_anthem' | 'tidebreaking_courage'
  | 'gusts_of_welkin' | 'windward_pilgrimage' | 'flaming_clawprint'
  | 'pact_of_neonlight_leap' | 'halo_of_starry_radiance'
  | 'rite_of_gilded_revelation' | 'trailblazing_star'
  | 'chromatic_foam' | 'sound_of_true_name'
  | 'wishes_of_quiet_snowfall' | 'reel_of_spliced_memories'
  // 3pc special sets
  | 'dream_of_the_lost' | 'law_of_harmony' | 'crown_of_valor'
  | 'flamewings_shadow' | 'thread_of_severed_fate'
  // 1pc special set
  | 'shadow_of_shattered_dreams'
  | (string & {})

export type StatType =
  | 'FLAT_ATK' | 'ATK_PCT' | 'FLAT_HP' | 'HP_PCT'
  | 'FLAT_DEF' | 'DEF_PCT' | 'CRIT_RATE' | 'CRIT_DMG'
  | 'ENERGY_REGEN' | 'ELEM_DMG' | 'HEAL_BONUS'
  | 'NORMAL_ATK_DMG' | 'HEAVY_ATK_DMG'
  | 'RESONANCE_SKILL_DMG' | 'RESONANCE_LIBERATION_DMG'

export interface StatEntry {
  type: StatType
  value: number
}

export interface Echo {
  id: string
  monsterId: number
  monsterName: string
  cost: Cost
  rarity: number
  level: number
  tuneLevel: number
  sonata: SonataType
  mainStat: StatEntry
  secondaryStat: StatEntry | null
  substats: StatEntry[]
}
