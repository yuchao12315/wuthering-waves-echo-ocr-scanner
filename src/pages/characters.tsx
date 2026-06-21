import { useState } from 'react'
import { useAppStore } from '@/store/app-store'
import type { Character } from '@/types/character'

const STAT_CN: Record<string, string> = {
  '攻击': '小攻击', '攻击%': '大攻击', '生命': '小生命', '生命%': '大生命',
  '防御': '小防御', '防御%': '大防御', '暴击': '暴击率', '暴击伤害': '暴击伤害',
  '共鸣效率': '共鸣效率', '属性伤害加成': '属性伤害', '治疗效果加成': '治疗加成',
  '普攻伤害加成': '普攻伤害', '重击伤害加成': '重击伤害',
  '共鸣技能伤害加成': '共鸣技能伤害', '共鸣解放伤害加成': '共鸣解放伤害',
}

function WeightBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const color = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-yellow-500' : pct >= 20 ? 'bg-blue-500' : 'bg-zinc-600'
  return (
    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function CharacterDetail({ char }: { char: Character }) {
  const calc = char.calc
  const subProps = Object.entries(calc.sub_props).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a)
  const maxWeight = subProps.length > 0 ? subProps[0][1] : 1

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{char.name}</h3>
        <span className="text-xs text-zinc-500">{calc.name}</span>
      </div>

      {/* 副词条权重 */}
      <div>
        <p className="text-xs text-zinc-400 mb-2">副词条权重</p>
        <div className="space-y-1.5">
          {subProps.map(([name, weight]) => (
            <div key={name} className="flex items-center gap-2">
              <span className="text-xs text-zinc-300 w-20 shrink-0">{STAT_CN[name] ?? name}</span>
              <WeightBar value={weight} max={maxWeight} />
              <span className="text-xs text-zinc-500 w-8 text-right">{weight.toFixed(4)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 推荐主词条 */}
      {calc.max_main_props && (
        <div>
          <p className="text-xs text-zinc-400 mb-1">推荐主词条</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(calc.max_main_props).map(([slot, stats]) => (
              <span key={slot} className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded">
                C{slot.split('.')[0]}: {stats.map(s => STAT_CN[s] ?? s).join('/')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 词条分级 */}
      <div>
        <p className="text-xs text-zinc-400 mb-1">词条分级</p>
        <div className="flex flex-wrap gap-1">
          {calc.grade.valid_s.map(s => (
            <span key={s} className="text-xs bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded">S {STAT_CN[s] ?? s}</span>
          ))}
          {calc.grade.valid_a.map(s => (
            <span key={s} className="text-xs bg-yellow-900/50 text-yellow-300 px-1.5 py-0.5 rounded">A {STAT_CN[s] ?? s}</span>
          ))}
          {calc.grade.valid_b.map(s => (
            <span key={s} className="text-xs bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">B {STAT_CN[s] ?? s}</span>
          ))}
        </div>
      </div>

      {/* 评分上限 */}
      <div className="flex gap-3 text-xs text-zinc-500">
        <span>满分: C1={calc.score_max[0].toFixed(4)} C3={calc.score_max[1].toFixed(4)} C4={calc.score_max[2].toFixed(4)}</span>
      </div>
    </div>
  )
}

export function CharactersPage() {
  const { characters, selectedCharacter, setSelectedCharacter } = useAppStore()
  const [search, setSearch] = useState('')

  const filtered = search
    ? characters.filter(c => c.name.includes(search) || c.calc.name.includes(search))
    : characters

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-lg font-medium">角色列表</h2>
        <span className="text-xs text-zinc-500">{characters.length} 个角色</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索角色..."
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1 text-sm ml-auto"
        />
      </div>

      {characters.length === 0 && (
        <p className="text-zinc-500 text-sm">加载中或无角色数据...</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(char => {
          const isSelected = selectedCharacter?.name === char.name
          const topSubs = Object.entries(char.calc.sub_props)
            .filter(([, v]) => v > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)

          return (
            <div key={char.name}>
              <button
                onClick={() => setSelectedCharacter(char)}
                className={`w-full bg-zinc-900 border rounded-lg p-3 text-left transition-colors ${
                  isSelected ? 'border-purple-500 bg-zinc-800' : 'border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium text-sm">{char.name}</span>
                  {isSelected && <span className="text-xs text-purple-400">已选中</span>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {topSubs.map(([name, weight]) => (
                    <span key={name} className="text-xs bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-300">
                      {STAT_CN[name] ?? name} {weight.toFixed(4)}
                    </span>
                  ))}
                </div>
              </button>
              {isSelected && <CharacterDetail char={char} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
