/**
 * 角色词条权重表 — 数据源: WutheringWavesUID (CM-Edelweiss)
 *
 * calc.json 包含每个角色的评分参数，用于声骸评分：
 *   sub_props    — 副词条权重（暴击=2.0 for DPS, 0 for healers）
 *   main_props   — 主词条权重（按 cost 分层）
 *   score_max    — 每 cost 满分值 [cost1, cost3, cost4]
 *   grade        — 词条分级（S/A/B 有效词条列表）
 *   max_main_props — 推荐主词条（按 cost.slot 索引）
 *   max_sub_props  — 推荐副词条优先级排序
 */
import type { CalcJson } from '@/types/character'
import rawWeights from '@/data/character-weights.json'

/** 全部角色权重表（中文角色名 → CalcJson） */
export const CHARACTER_WEIGHTS: Record<string, CalcJson> = rawWeights as unknown as Record<string, CalcJson>

/** 获取角色权重，未找到返回 undefined */
export function getCharacterWeight(name: string): CalcJson | undefined {
  return CHARACTER_WEIGHTS[name]
}

/** 所有可用角色名列表 */
export const CHARACTER_NAMES = Object.keys(CHARACTER_WEIGHTS)

/** 角色别名/简称映射 → calc.json 中的 key */
export const CHARACTER_ALIASES: Record<string, string> = {
  // 漂泊者系列
  '风主': '漂泊者·气动',
  '暗主': '漂泊者·湮灭',
  '光主': '漂泊者·衍射',
  '气动主角': '漂泊者·气动',
  '湮灭主角': '漂泊者·湮灭',
  '衍射主角': '漂泊者·衍射',
  '主角': '漂泊者·气动',
  'rover': '漂泊者·气动',
  // 3.0+ 角色注意：琳奈/莫宁/西格莉卡/绯雪/达妮娅/爱弥斯/洛瑟菈/露西
  // 的权重为近似值（基于同属性同定位角色模板生成），尚无官方 calc.json
}

/** 通过角色名或别名查找权重 */
export function resolveCharacterWeight(nameOrAlias: string): CalcJson | undefined {
  // 先直接匹配
  const direct = getCharacterWeight(nameOrAlias)
  if (direct) return direct

  // 再查别名
  const resolved = CHARACTER_ALIASES[nameOrAlias]
  if (resolved) return getCharacterWeight(resolved)

  return undefined
}
