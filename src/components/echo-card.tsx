import type { Echo } from '@/types/echo'
import { SONATA_NAMES } from '@/lib/constants'
import { scoreEcho, getEchoGrade, scoreEchoDetailed } from '@/lib/scoring'
import type { CalcJson } from '@/types/character'

const STAT_DISPLAY: Record<string, string> = {
  FLAT_ATK: '攻击', ATK_PCT: '攻击%', FLAT_HP: '生命', HP_PCT: '生命%',
  FLAT_DEF: '防御', DEF_PCT: '防御%', CRIT_RATE: '暴击率', CRIT_DMG: '暴击伤害',
  ENERGY_REGEN: '共鸣效率', ELEM_DMG: '属性伤害', HEAL_BONUS: '治疗加成',
  NORMAL_ATK_DMG: '普攻伤害', HEAVY_ATK_DMG: '重击伤害',
  RESONANCE_SKILL_DMG: '共鸣技能伤害', RESONANCE_LIBERATION_DMG: '共鸣解放伤害',
}

const GRADE_COLORS: Record<string, string> = {
  SSS: 'text-red-400',
  SS: 'text-orange-400',
  S: 'text-yellow-400',
  A: 'text-purple-400',
  B: 'text-blue-400',
  C: 'text-zinc-400',
}

interface Props {
  echo: Echo
  calc?: CalcJson | null
  onRemove?: (id: string) => void
}

export function EchoCard({ echo, calc, onRemove }: Props) {
  const score = calc ? scoreEcho(echo, calc) : null
  const grade = score !== null ? getEchoGrade(score) : null
  const showScore = score !== null
  const detailed = calc ? scoreEchoDetailed(echo, calc) : null

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{echo.monsterName}</span>
        <div className="flex items-center gap-2">
          <span className="bg-zinc-700 px-2 py-0.5 rounded text-xs">Cost {echo.cost}</span>
          {showScore && (
            <span className={`font-bold ${GRADE_COLORS[grade ?? 'C'] ?? 'text-zinc-400'}`}>
              {grade ?? 'C'} ({score!.toFixed(2)})
            </span>
          )}
        </div>
      </div>
      <div className="text-xs text-zinc-400 mb-1">{SONATA_NAMES[echo.sonata] ?? echo.sonata ?? '未知套装'}</div>

      {detailed && detailed.details.length > 0 ? (
        <div className="space-y-1 mt-2">
          {detailed.details.map((d, i) => {
            const pct = d.maxScore > 0 ? Math.min(100, (d.score / d.maxScore) * 100) : 0
            const barColor = pct >= 80 ? 'bg-red-500' : pct >= 60 ? 'bg-orange-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-zinc-600'
            return (
              <div key={i}>
                <div className="flex items-center justify-between text-xs">
                  <span className={d.field === '主词条' ? 'text-zinc-200' : d.field === '副属性' ? 'text-zinc-300' : 'text-zinc-400'}>
                    <span className="text-zinc-600 mr-1">{d.field}</span>
                    {d.label} {d.value}
                  </span>
                  <span className="text-zinc-400 tabular-nums">
                    <span className={pct >= 80 ? 'text-red-400' : pct >= 60 ? 'text-orange-400' : 'text-zinc-300'}>{d.score.toFixed(2)}</span>
                    <span className="text-zinc-600">/{d.maxScore.toFixed(2)}</span>
                  </span>
                </div>
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-0.5">
                  <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
          <div className="flex justify-between text-xs pt-1 border-t border-zinc-800">
            <span className="text-zinc-400">
              合计
              <span className="text-zinc-600 ml-2">score_max={detailed.scoreMax.toFixed(2)}</span>
            </span>
            <span className="tabular-nums">
              <span className="text-zinc-200 font-medium">{detailed.total.toFixed(2)}</span>
              <span className="text-zinc-600">/50.00</span>
            </span>
          </div>
        </div>
      ) : (
        <>
          {echo.mainStat ? (
            <div className="text-zinc-200 mb-1">
              {STAT_DISPLAY[echo.mainStat.type] ?? echo.mainStat.type}: {echo.mainStat.value}
            </div>
          ) : (
            <div className="text-zinc-500 mb-1 text-xs">主词条: 未识别</div>
          )}
          {echo.secondaryStat && (
            <div className="text-zinc-300 text-xs mb-1">
              {STAT_DISPLAY[echo.secondaryStat.type] ?? echo.secondaryStat.type}: {echo.secondaryStat.value}
            </div>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-400 mt-1">
            {echo.substats.map((s, i) => (
              <span key={i}>{STAT_DISPLAY[s.type] ?? s.type} {s.value}</span>
            ))}
          </div>
        </>
      )}

      {onRemove && (
        <button
          onClick={() => onRemove(echo.id)}
          className="mt-2 text-xs text-red-400 hover:text-red-300"
        >
          删除
        </button>
      )}
    </div>
  )
}
