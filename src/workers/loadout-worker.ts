// Web Worker for Wuthering Waves echo loadout optimizer

const CN_TO_STAT: Record<string, string> = {
  FLAT_ATK: '攻击',
  ATK_PCT: '攻击%',
  FLAT_HP: '生命',
  HP_PCT: '生命%',
  FLAT_DEF: '防御',
  DEF_PCT: '防御%',
  CRIT_RATE: '暴击',
  CRIT_DMG: '暴击伤害',
  ENERGY_REGEN: '共鸣效率',
  ELEM_DMG: '属性伤害加成',
  HEAL_BONUS: '治疗效果加成',
  NORMAL_ATK_DMG: '普攻伤害加成',
  HEAVY_ATK_DMG: '重击伤害加成',
  RESONANCE_SKILL_DMG: '共鸣技能伤害加成',
  RESONANCE_LIBERATION_DMG: '共鸣解放伤害加成',
};

interface Echo {
  id: string;
  cost: 1 | 3 | 4;
  sonata: string;
  mainStat: { type: string; value: number };
  secondaryStat: { type: string; value: number } | null;
  substats: { type: string; value: number }[];
}

interface CalcJson {
  name: string;
  main_props: Record<string, Record<string, number>>;
  sub_props: Record<string, number>;
  skill_weight: [number, number, number, number];
  score_max: [number, number, number];
}

interface Config {
  sonatas: string[];
  costFilter?: string;
}

interface Loadout {
  echoes: string[];
  score: number;
}

/** 副词条权重（从 sub_props 直接查找） */
function getSubWeight(statType: string, calc: CalcJson): number {
  const cnKey = CN_TO_STAT[statType];
  if (!cnKey) return 0;
  return calc.sub_props[cnKey] ?? 0;
}

/** 主词条权重（从 main_props[cost] 查找） */
function getMainWeight(statType: string, cost: number, calc: CalcJson): number {
  const cnKey = CN_TO_STAT[statType];
  if (!cnKey) return 0;
  const costKey = String(cost);
  const mainProps = calc.main_props[costKey];
  if (!mainProps) return 0;
  return mainProps[cnKey] ?? 0;
}

// 满级(Lv25)各Cost主词条固定数值
const MAIN_STAT_VALUES: Record<number, Record<string, number>> = {
  1: { HP_PCT: 22.8, ATK_PCT: 18.0, DEF_PCT: 18.0, FLAT_HP: 2280 },
  3: { ATK_PCT: 30.0, HP_PCT: 30.0, DEF_PCT: 38.0, ELEM_DMG: 30.0, ENERGY_REGEN: 32.0, FLAT_ATK: 100 },
  4: { ATK_PCT: 33.0, HP_PCT: 33.0, DEF_PCT: 41.5, CRIT_RATE: 22.0, CRIT_DMG: 44.0, HEAL_BONUS: 26.4, FLAT_ATK: 150 },
};

// 中文key版本（用于score_max计算）
const MAIN_STAT_CN: Record<number, Record<string, number>> = {
  1: { '攻击%': 18.0, '生命%': 22.8, '防御%': 18.0, '生命': 2280 },
  3: { '攻击%': 30.0, '生命%': 30.0, '防御%': 38.0, '属性伤害加成': 30.0, '共鸣效率': 32.0, '攻击': 100 },
  4: { '攻击%': 33.0, '生命%': 33.0, '防御%': 41.5, '暴击': 22.0, '暴击伤害': 44.0, '治疗效果加成': 26.4, '攻击': 150 },
};
const SEC_STAT_CN: Record<number, Record<string, number>> = {
  1: { '生命': 2280 }, 3: { '攻击': 100 }, 4: { '攻击': 150 },
};
const MAX_SUB: Record<string, number> = {
  '暴击': 10.5, '暴击伤害': 21.0, '攻击%': 11.6, '生命%': 11.6, '防御%': 14.7,
  '攻击': 60, '生命': 580, '防御': 70, '共鸣效率': 12.4,
  '普攻伤害加成': 11.6, '重击伤害加成': 11.6, '共鸣技能伤害加成': 11.6, '共鸣解放伤害加成': 11.6,
};
const SKILL_IDX: Record<string, number> = {
  '普攻伤害加成': 0, '重击伤害加成': 1, '共鸣技能伤害加成': 2, '共鸣解放伤害加成': 3,
};

function calcEchoScoreMax(echo: Echo, calc: CalcJson): number {
  const cost = echo.cost;
  const mp = calc.main_props[String(cost)] ?? {};
  const sp = calc.sub_props;

  let bestMain = 0;
  if (echo.mainStat) {
    const mainCn = CN_TO_STAT[echo.mainStat.type];
    bestMain = mainCn ? ((MAIN_STAT_CN[cost] ?? {})[mainCn] ?? 0) * (mp[mainCn] ?? 0) : 0;
  }

  let bestSec = 0;
  if (echo.secondaryStat) {
    const secCn = CN_TO_STAT[echo.secondaryStat.type];
    if (secCn) {
      bestSec = ((SEC_STAT_CN[cost] ?? {})[secCn] ?? 0) * (mp[secCn] ?? 0);
    }
  }

  const usedCns = new Set<string>();
  const validSubScores: number[] = [];
  for (const sub of echo.substats) {
    const cn = CN_TO_STAT[sub.type];
    if (cn) {
      usedCns.add(cn);
      const w = sp[cn] ?? 0;
      if (w > 0) {
        const si = SKILL_IDX[cn];
        const ratio = si != null ? (calc.skill_weight?.[si] ?? 1) : 1;
        validSubScores.push((MAX_SUB[cn] ?? 0) * w * ratio);
      }
    }
  }

  if (validSubScores.length < 5) {
    const candidates: number[] = [];
    for (const [cn, maxVal] of Object.entries(MAX_SUB)) {
      if (!usedCns.has(cn)) {
        const w = sp[cn] ?? 0;
        if (w > 0) {
          const si = SKILL_IDX[cn];
          const ratio = si != null ? (calc.skill_weight?.[si] ?? 1) : 1;
          candidates.push(maxVal * w * ratio);
        }
      }
    }
    candidates.sort((a, b) => b - a);
    for (const c of candidates) {
      if (validSubScores.length >= 5) break;
      validSubScores.push(c);
    }
  }

  const subSum = validSubScores.reduce((s, v) => s + v, 0);

  return bestMain + bestSec + subSum;
}

function scoreEcho(echo: Echo, calc: CalcJson): number {
  const scoreMax = calcEchoScoreMax(echo, calc);
  if (scoreMax <= 0) return 0;
  let rawScore = 0;

  if (echo.mainStat) {
    const fixedValue = MAIN_STAT_VALUES[echo.cost]?.[echo.mainStat.type] ?? echo.mainStat.value;
    rawScore += fixedValue * getMainWeight(echo.mainStat.type, echo.cost, calc);
  }

  if (echo.secondaryStat) {
    rawScore += echo.secondaryStat.value * getMainWeight(echo.secondaryStat.type, echo.cost, calc);
  }

  for (const sub of echo.substats) {
    rawScore += sub.value * getSubWeight(sub.type, calc);
  }

  return scoreMax > 0 ? (rawScore / scoreMax) * 50 : 0;
}

function getCostDistributions(totalCost: number): number[][] {
  // Each echo has cost 1, 3, or 4. We need 5 echoes summing to totalCost.
  // Returns arrays of [count1, count3, count4] where count1+count3+count4=5
  const results: number[][] = [];
  for (let c4 = 0; c4 <= 5; c4++) {
    for (let c3 = 0; c3 <= 5 - c4; c3++) {
      const c1 = 5 - c4 - c3;
      if (c1 * 1 + c3 * 3 + c4 * 4 === totalCost) {
        results.push([c1, c3, c4]);
      }
    }
  }
  return results;
}

function getCostDistributionsLeq(maxCost: number): number[][] {
  const results: number[][] = [];
  for (let c4 = 0; c4 <= 5; c4++) {
    for (let c3 = 0; c3 <= 5 - c4; c3++) {
      const c1 = 5 - c4 - c3;
      const total = c1 * 1 + c3 * 3 + c4 * 4;
      if (total <= maxCost) {
        results.push([c1, c3, c4]);
      }
    }
  }
  return results;
}

type ScoredEcho = { id: string; score: number; cost: 1 | 3 | 4; sonata: string; monsterName: string };

function topK(echoes: ScoredEcho[], k: number): ScoredEcho[] {
  return echoes.sort((a, b) => b.score - a.score).slice(0, k);
}

function findBestCombinations(
  bucket1: ScoredEcho[],
  bucket3: ScoredEcho[],
  bucket4: ScoredEcho[],
  distributions: number[][],
  sonataConstraint: { type: 'none' } | { type: 'single'; sonata: string } | { type: 'dual'; sonatas: [string, string] },
): Loadout[] {
  const top10: Loadout[] = [];
  let minTopScore = -Infinity;
  let totalCombinations = 0;
  let processedCombinations = 0;

  // Pre-count for progress
  for (const [c1, c3, c4] of distributions) {
    const n1 = Math.min(bucket1.length, c1 ? bucket1.length : 0);
    const n3 = Math.min(bucket3.length, c3 ? bucket3.length : 0);
    const n4 = Math.min(bucket4.length, c4 ? bucket4.length : 0);
    if (c1 > n1 || c3 > n3 || c4 > n4) continue;
    totalCombinations += comb(n1, c1) * comb(n3, c3) * comb(n4, c4);
  }

  console.log(`[Worker] 总组合数: ${totalCombinations}`)
  const progressInterval = Math.max(1, Math.floor(totalCombinations / 100));

  for (const [c1, c3, c4] of distributions) {
    if (c1 > bucket1.length || c3 > bucket3.length || c4 > bucket4.length) continue;

    const picks1 = enumerateCombinations(bucket1, c1);
    const picks3 = enumerateCombinations(bucket3, c3);
    const picks4 = enumerateCombinations(bucket4, c4);

    for (const p1 of picks1) {
      for (const p3 of picks3) {
        for (const p4 of picks4) {
          const combined = [...p1, ...p3, ...p4];

          // 相同Cost的声骸名不能相同（同名声骸不叠加套装效果）
          let hasDupName = false;
          if (p4.length >= 2) {
            const names4 = p4.map(e => e.monsterName);
            if (new Set(names4).size < names4.length) hasDupName = true;
          }
          if (!hasDupName && p3.length >= 2) {
            const names3 = p3.map(e => e.monsterName);
            if (new Set(names3).size < names3.length) hasDupName = true;
          }
          if (!hasDupName && p1.length >= 2) {
            const names1 = p1.map(e => e.monsterName);
            if (new Set(names1).size < names1.length) hasDupName = true;
          }
          if (hasDupName) {
            processedCombinations++;
            if (processedCombinations % progressInterval === 0) {
              postMessage({ type: 'PROGRESS', percent: Math.floor((processedCombinations / totalCombinations) * 100) });
            }
            continue;
          }

          const totalScore = combined.reduce((s, e) => s + e.score, 0);

          // Check sonata constraint
          if (sonataConstraint.type === 'dual') {
            const [s1, s2] = sonataConstraint.sonatas;
            const countS1 = combined.filter(e => e.sonata === s1).length;
            const countS2 = combined.filter(e => e.sonata === s2).length;
            if (countS1 < 2 || countS2 < 2) {
              processedCombinations++;
              if (processedCombinations % progressInterval === 0) {
                postMessage({ type: 'PROGRESS', percent: Math.floor((processedCombinations / totalCombinations) * 100) });
              }
              continue;
            }
          }

          if (top10.length < 10 || totalScore > minTopScore) {
            const loadout: Loadout = { echoes: combined.map(e => e.id), score: totalScore };
            top10.push(loadout);
            top10.sort((a, b) => b.score - a.score);
            if (top10.length > 10) top10.length = 10;
            minTopScore = top10[top10.length - 1].score;
          }

          processedCombinations++;
          if (processedCombinations % progressInterval === 0) {
            const pct = Math.floor((processedCombinations / totalCombinations) * 100);
            const remaining = totalCombinations - processedCombinations;
            const bestScore = top10.length > 0 ? top10[0].score.toFixed(1) : '-';
            console.log(`[Worker] 进度${pct}% | 已计算${processedCombinations}/${totalCombinations} | 剩余${remaining} | 当前最高分${bestScore}`);
            postMessage({ type: 'PROGRESS', percent: pct });
          }
        }
      }
    }
  }

  return top10;
}

function comb(n: number, k: number): number {
  if (k > n || k < 0) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
}

function enumerateCombinations(arr: ScoredEcho[], k: number): ScoredEcho[][] {
  if (k === 0) return [[]];
  if (k === 1) return arr.map(e => [e]);
  const results: ScoredEcho[][] = [];
  const n = arr.length;
  if (k === 2) {
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        results.push([arr[i], arr[j]]);
      }
    }
    return results;
  }
  if (k === 3) {
    for (let i = 0; i < n - 2; i++) {
      for (let j = i + 1; j < n - 1; j++) {
        for (let l = j + 1; l < n; l++) {
          results.push([arr[i], arr[j], arr[l]]);
        }
      }
    }
    return results;
  }
  if (k === 4) {
    for (let i = 0; i < n - 3; i++) {
      for (let j = i + 1; j < n - 2; j++) {
        for (let l = j + 1; l < n - 1; l++) {
          for (let m = l + 1; m < n; m++) {
            results.push([arr[i], arr[j], arr[l], arr[m]]);
          }
        }
      }
    }
    return results;
  }
  if (k === 5) {
    for (let i = 0; i < n - 4; i++) {
      for (let j = i + 1; j < n - 3; j++) {
        for (let l = j + 1; l < n - 2; l++) {
          for (let m = l + 1; m < n - 1; m++) {
            for (let p = m + 1; p < n; p++) {
              results.push([arr[i], arr[j], arr[l], arr[m], arr[p]]);
            }
          }
        }
      }
    }
    return results;
  }
  return results;
}

function calculate(echoes: Echo[], calc: CalcJson, config: Config, allEchoes: Echo[]): void {
  const sonatas = config.sonatas;
  console.log(`[Worker] 开始计算: ${echoes.length}个声骸, 模式=${sonatas.length === 0 ? '散件' : sonatas.length === 1 ? '单套装' : '双合鸣'}`)

  // Filter echoes by sonata
  let filtered: Echo[];
  let sonataConstraint: { type: 'none' } | { type: 'single'; sonata: string } | { type: 'dual'; sonatas: [string, string] };

  if (sonatas.length === 1) {
    // Path A-1: all 5 from one sonata
    filtered = echoes.filter(e => e.sonata === sonatas[0]);
    console.log(`[Worker] 单套装模式: ${sonatas[0]}, 匹配${filtered.length}个声骸`);
    if (filtered.length < 5) {
      console.log(`[Worker] ⚠ 该套装声骸不足5个(${filtered.length}个)，回退到散件模式`);
      filtered = echoes;
      sonataConstraint = { type: 'none' };
    } else {
      sonataConstraint = { type: 'single', sonata: sonatas[0] };
    }
  } else if (sonatas.length === 2) {
    // Path A-2: ≥2 from each + 1 wildcard, cost=12
    const count1 = echoes.filter(e => e.sonata === sonatas[0]).length;
    const count2 = echoes.filter(e => e.sonata === sonatas[1]).length;
    console.log(`[Worker] 双合鸣模式: ${sonatas[0]}(${count1}个) + ${sonatas[1]}(${count2}个)`);
    if (count1 < 2 || count2 < 2) {
      console.log(`[Worker] ⚠ 套装声骸不足(需各≥2)，回退到散件模式`);
      filtered = echoes;
      sonataConstraint = { type: 'none' };
    } else {
      filtered = echoes;
      sonataConstraint = { type: 'dual', sonatas: [sonatas[0], sonatas[1]] };
    }
  } else {
    // Path B: no sonata constraint, cost≤12
    filtered = echoes;
    sonataConstraint = { type: 'none' };
  }

  //只保留副词条同时有暴击和爆伤的
 filtered = filtered.filter(e => {
    const types = e.substats.map(s => s.type);
    return types.includes('CRIT_RATE') && types.includes('CRIT_DMG');
 });
 console.log(`[Worker] 双爆筛选后：{filtered.length}个声骸`);

  // Score all filtered echoes
  const scored: ScoredEcho[] = filtered.map(e => ({
    id: e.id,
    score: scoreEcho(e, calc),
    cost: e.cost,
    sonata: e.sonata,
    monsterName: (e as any).monsterName ?? '',
  }));

  // Group by cost
  const bucket1 = topK(scored.filter(e => e.cost === 1), 15);
  const bucket3 = topK(scored.filter(e => e.cost === 3), 15);
  const bucket4 = topK(scored.filter(e => e.cost === 4), 15);

  // Get valid cost distributions
  let distributions: number[][];
  const costFilter: string = config.costFilter ?? 'all';
  if (costFilter === '4+3+3+1+1') {
    // 指定分配: 1个Cost4 + 2个Cost3 + 2个Cost1 → [c1=2, c3=2, c4=1]
    distributions = [[2, 2, 1]];
    console.log(`[Worker] Cost分配筛选: 4+3+3+1+1`);
  } else if (costFilter === '4+4+1+1+1') {
    // 指定分配: 2个Cost4 + 0个Cost3 + 3个Cost1 → [c1=3, c3=0, c4=2]
    distributions = [[3, 0, 2]];
    console.log(`[Worker] Cost分配筛选: 4+4+1+1+1`);
  } else if (sonatas.length === 1 || sonatas.length === 2) {
    distributions = getCostDistributions(12);
  } else {
    distributions = getCostDistributionsLeq(12);
  }

  console.log(`[Worker] 分桶: Cost1=${bucket1.length}, Cost3=${bucket3.length}, Cost4=${bucket4.length}, 分配模式=${distributions.length}种`)

  const top10 = findBestCombinations(bucket1, bucket3, bucket4, distributions, sonataConstraint);

  console.log(`[Worker] 计算完成: Top${top10.length}个结果, 最高分=${top10[0]?.score.toFixed(1) ?? 'N/A'}`)

  // 将ID映射回完整Echo对象
  const echoMap = new Map<string, Echo>();
  for (const e of allEchoes) echoMap.set(e.id, e);

  const results = top10.map(l => ({
    echoes: l.echoes.map(id => echoMap.get(id)!).filter(Boolean),
    score: l.score,
  }));

  postMessage({ results });
}

self.onmessage = (event: MessageEvent) => {
  const data = event.data;
  // 兼容两种消息格式
  const echoes: Echo[] = data.echoes ?? [];
  const calc: CalcJson = data.calc;
  const sonatas: string[] = data.sonatas ?? data.config?.sonatas ?? [];
  const costFilter: string = data.costFilter ?? 'all';

  console.log(`[Worker] 收到计算请求: ${echoes.length}个声骸, costFilter=${costFilter}`)

  calculate(echoes, calc, { sonatas, costFilter }, echoes);
};
