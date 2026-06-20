import type { Cost } from '@/types/echo'

// All valid 5-echo cost distributions where sum <= 12
// Each entry is [cost1, cost2, cost3, cost4, cost5] sorted desc
export const COST_DISTRIBUTIONS: Cost[][] = [
  [4, 3, 3, 1, 1],  // sum=12, most common
  [4, 4, 1, 1, 1],  // sum=11
  [4, 3, 1, 1, 1],  // sum=10
  [3, 3, 3, 1, 1],  // sum=11
  [4, 1, 1, 1, 1],  // sum=8
  [3, 3, 1, 1, 1],  // sum=9
  [3, 1, 1, 1, 1],  // sum=7
  [1, 1, 1, 1, 1],  // sum=5
]

// costToIndex: Cost1→0, Cost3→1, Cost4→2
export function costToIndex(cost: Cost): number {
  if (cost === 1) return 0
  if (cost === 3) return 1
  return 2
}

// Stat name mapping: calc.json Chinese keys → internal StatType
export const CN_TO_STAT: Record<string, string> = {
  '攻击': 'FLAT_ATK',
  '攻击%': 'ATK_PCT',
  '生命': 'FLAT_HP',
  '生命%': 'HP_PCT',
  '防御': 'FLAT_DEF',
  '防御%': 'DEF_PCT',
  '暴击': 'CRIT_RATE',
  '暴击伤害': 'CRIT_DMG',
  '共鸣效率': 'ENERGY_REGEN',
  '属性伤害加成': 'ELEM_DMG',
  '治疗效果加成': 'HEAL_BONUS',
  // 技能伤害类型（每个技能类型独立权重）
  '普攻伤害加成': 'NORMAL_ATK_DMG',
  '重击伤害加成': 'HEAVY_ATK_DMG',
  '共鸣技能伤害加成': 'RESONANCE_SKILL_DMG',
  '共鸣解放伤害加成': 'RESONANCE_LIBERATION_DMG',
}

// Reverse mapping
export const STAT_TO_CN: Record<string, string> = Object.fromEntries(
  Object.entries(CN_TO_STAT).map(([k, v]) => [v, k])
)

// Sonata display names (31 sets total: 25 standard + 3 special-3pc + 1 special-1pc + 2 unused legacy)
export const SONATA_NAMES: Record<string, string> = {
  // --- Standard 2-piece / 5-piece sets ---
  freezing_frost: '凝夜白霜',
  molten_rift: '熔山裂谷',
  void_thunder: '彻空冥雷',
  sierra_gale: '啸谷长风',
  celestial_light: '浮星祛暗',
  havoc_eclipse: '沉日劫明',
  rejuvenating_glow: '隐世回光',
  moonlit_clouds: '轻云出月',
  lingering_tunes: '不绝余音',
  frosty_resolve: '凌冽决断',
  eternal_radiance: '此间永驻之光',
  midnight_veil: '幽夜隐匿',
  empyrean_anthem: '高天共奏之曲',
  tidebreaking_courage: '破浪无惧',
  gusts_of_welkin: '流云逝尽之空',
  windward_pilgrimage: '愿戴荣光之旅',
  flaming_clawprint: '奔狼燎原之焰',
  pact_of_neonlight_leap: '逆光跃彩之约',
  halo_of_starry_radiance: '星构寻辉之环',
  rite_of_gilded_revelation: '流金溯真之式',
  trailblazing_star: '长路启航之星',
  chromatic_foam: '斑驳粉饰之沫',
  sound_of_true_name: '听唤语义之愿',
  wishes_of_quiet_snowfall: '雪落无声之愿',
  reel_of_spliced_memories: '剪心辑梦之影',
  // --- 3-piece special sets ---
  dream_of_the_lost: '失序彼岸之梦',
  law_of_harmony: '息界同调之律',
  crown_of_valor: '荣斗铸锋之冠',
  flamewings_shadow: '焚羽猎魔之影',
  thread_of_severed_fate: '命理崩毁之弦',
  // --- 1-piece special set ---
  shadow_of_shattered_dreams: '碎梦亡鬼之魇',
}

// Valid main stats per cost
export const VALID_MAIN_STATS: Record<number, string[]> = {
  4: ['ATK_PCT', 'CRIT_RATE', 'CRIT_DMG', 'HEAL_BONUS', 'DEF_PCT', 'HP_PCT'],
  3: ['ATK_PCT', 'ELEM_DMG', 'ENERGY_REGEN', 'DEF_PCT', 'HP_PCT'],
  1: ['ATK_PCT', 'HP_PCT', 'DEF_PCT', 'FLAT_HP'],
}
