import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { useEchoStore } from '@/store/echo-store'
import { useAppStore } from '@/store/app-store'
import { useLoadoutStore } from '@/store/loadout-store'
import { CharacterPicker } from '@/components/character-picker'
import { EchoCard } from '@/components/echo-card'
import { SONATA_NAMES } from '@/lib/constants'
import { getGrade } from '@/lib/scoring'
import type { SonataType } from '@/types/echo'

let globalWorker: Worker | null = null

function formatTime(ms: number): string {
  const sec = Math.ceil(ms / 1000)
  if (sec >= 60) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}分${s}秒`
  }
  return `${sec}秒`
}

const GRADE_COLORS: Record<string, string> = {
  SSS: 'text-red-400', SS: 'text-orange-400', S: 'text-yellow-400',
  A: 'text-purple-400', B: 'text-blue-400', C: 'text-zinc-400',
}

const STAT_DISPLAY: Record<string, string> = {
  FLAT_ATK: '攻击', ATK_PCT: '攻击%', FLAT_HP: '生命', HP_PCT: '生命%',
  FLAT_DEF: '防御', DEF_PCT: '防御%', CRIT_RATE: '暴击率', CRIT_DMG: '暴击伤害',
  ENERGY_REGEN: '共鸣效率', ELEM_DMG: '属性伤害', HEAL_BONUS: '治疗加成',
  NORMAL_ATK_DMG: '普攻伤害', HEAVY_ATK_DMG: '重击伤害',
  RESONANCE_SKILL_DMG: '共鸣技能伤害', RESONANCE_LIBERATION_DMG: '共鸣解放伤害',
}

export function CalculatorPage() {
  const { echoes } = useEchoStore()
  const { selectedCharacter, computing, computeProgress, computeResults,
          setComputing, setComputeProgress, setComputeResults } = useAppStore()
  const { loadouts, add: addLoadout, remove: removeLoadout } = useLoadoutStore()
  const [sonatas, setSonatas] = useState<SonataType[]>([])
  const [costFilter, setCostFilter] = useState<string>('all')
  const [countdown, setCountdown] = useState('')
  const [excludeLoadoutIds, setExcludeLoadoutIds] = useState<Set<string>>(new Set())
  const [filterChar, setFilterChar] = useState<string>('all')
  const [expandedLoadout, setExpandedLoadout] = useState<string | null>(null)
  const progressTimerRef = useRef<number | null>(null)

  const allSonatas = useMemo(() => {
    const known = { ...SONATA_NAMES }
    for (const echo of echoes) {
      if (echo.sonata && !(echo.sonata in known)) {
        known[echo.sonata] = echo.sonata
      }
    }
    return known
  }, [echoes])

  const savedCharNames = useMemo(() => {
    const names = new Set(loadouts.map(l => l.characterName))
    return Array.from(names).sort()
  }, [loadouts])

  const filteredLoadouts = useMemo(() => {
    if (filterChar === 'all') return loadouts
    return loadouts.filter(l => l.characterName === filterChar)
  }, [loadouts, filterChar])

  const toggleSonata = (s: SonataType) => {
    if (sonatas.includes(s)) {
      setSonatas(sonatas.filter(x => x !== s))
    } else if (sonatas.length < 2) {
      setSonatas([...sonatas, s])
    }
  }

  const toggleExclude = (id: string) => {
    setExcludeLoadoutIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const stopProgressTimer = useCallback(() => {
    if (progressTimerRef.current !== null) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => stopProgressTimer()
  }, [stopProgressTimer])

  const calculate = () => {
    if (!selectedCharacter) return
    setComputing(true)
    setComputeProgress(0)
    setComputeResults([])

    if (globalWorker) {
      globalWorker.terminate()
      globalWorker = null
    }

    const worker = new Worker(
      new URL('@/workers/loadout-worker.ts', import.meta.url),
      { type: 'module' }
    )
    globalWorker = worker

    const baseMs = sonatas.length === 0 ? 3000 : sonatas.length === 1 ? 800 : 1500
    const estimatedMs = Math.max(500, baseMs * (echoes.length / 50))
    const startTime = Date.now()

    setCountdown(formatTime(estimatedMs))

    progressTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min(95, (elapsed / estimatedMs) * 100)
      const remaining = Math.max(0, estimatedMs - elapsed)
      setComputeProgress(pct)
      setCountdown(remaining > 0 ? formatTime(remaining) : '即将完成...')
    }, 200)

    worker.onmessage = (e) => {
      const msg = e.data
      if (msg.type === 'PROGRESS' && typeof msg.percent === 'number') {
        setComputeProgress(msg.percent)
      } else {
        stopProgressTimer()
        setComputeProgress(100)
        setCountdown('完成!')
        setComputeResults(msg.results || [])
        setTimeout(() => setComputing(false), 500)
        worker.terminate()
        globalWorker = null
      }
    }

    worker.onerror = () => {
      stopProgressTimer()
      setComputing(false)
      setComputeProgress(0)
      worker.terminate()
      globalWorker = null
    }

    const excludeEchoIds: string[] = []
    for (const id of excludeLoadoutIds) {
      const l = loadouts.find(x => x.id === id)
      if (l) excludeEchoIds.push(...l.echoes.map(e => e.id))
    }

    worker.postMessage({
      echoes,
      calc: selectedCharacter.calc,
      sonatas,
      costFilter,
      excludeEchoIds,
    })
  }

  const saveLoadout = (result: { echoes: typeof echoes; score: number }) => {
    if (!selectedCharacter) return
    const defaultName = `套装${loadouts.length + 1}`
    const name = prompt('套装名称', defaultName)
    if (name === null) return
    addLoadout({
      id: crypto.randomUUID(),
      name: name || defaultName,
      characterName: selectedCharacter.name,
      echoes: result.echoes,
      score: result.score,
      savedAt: Date.now(),
    })
  }

  const calc = selectedCharacter?.calc ?? null
  const results = computeResults

  return (
    <div className="flex gap-6">
      {/* 左侧：计算区域 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-4 mb-4">
          <CharacterPicker />
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-xs text-zinc-400">选择声骸套装 (最多2个，不选=散件模式):</p>
            {sonatas.length > 0 && (
              <button
                type="button"
                onClick={() => setSonatas([])}
                className="text-xs text-red-400 hover:text-red-300"
              >
                清除选择
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-1.5">
            {Object.entries(allSonatas).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => toggleSonata(k as SonataType)}
                className={`px-2 py-1.5 text-xs rounded truncate ${
                  sonatas.includes(k as SonataType)
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
                title={v}
              >
                {v}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-1.5">
            {sonatas.length === 0 ? '散件模式：全库存参与，纯评分最大化'
             : sonatas.length === 1 ? `5件套模式：${allSonatas[sonatas[0]]} 全套`
             : `双合鸣模式：${allSonatas[sonatas[0]]} + ${allSonatas[sonatas[1]]}`}
          </p>
        </div>

        <div className="mb-4">
          <p className="text-xs text-zinc-400 mb-2">Cost分配:</p>
          <div className="flex gap-1.5">
            {[
              { key: 'all', label: '全部' },
              { key: '4+3+3+1+1', label: '4+3+3+1+1' },
              { key: '4+4+1+1+1', label: '4+4+1+1+1' },
            ].map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setCostFilter(opt.key)}
                className={`px-3 py-1.5 text-xs rounded ${
                  costFilter === opt.key
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 排除已存套装 */}
        {loadouts.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-zinc-400 mb-2">排除已存套装中的声骸:</p>
            <div className="flex flex-wrap gap-1.5">
              {loadouts.map(l => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleExclude(l.id)}
                  className={`px-2 py-1 text-xs rounded ${
                    excludeLoadoutIds.has(l.id)
                      ? 'bg-red-600/80 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {l.name}
                  <span className="text-zinc-500 ml-1">({l.characterName})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={calculate}
          disabled={!selectedCharacter || computing}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-6 py-2 rounded text-sm mb-4"
        >
          {computing ? '计算中...' : '开始计算'}
        </button>

        {computing && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs text-zinc-400">正在计算最优搭配...</span>
              <span className="text-xs text-purple-400 font-mono">{countdown}</span>
              <span className="text-xs text-zinc-500">{Math.round(computeProgress)}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-200"
                style={{ width: `${computeProgress}%` }}
              />
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-zinc-300">
              Top {results.length} 搭配
              {selectedCharacter && <span className="text-zinc-500 ml-2">— {selectedCharacter.name}</span>}
            </h3>
            {results.map((r, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-medium">#{i + 1}</span>
                  <span className="text-sm">总分: {r.score.toFixed(2)}</span>
                  <span className={`text-sm font-bold ${
                    r.score >= 210 ? 'text-red-400' :
                    r.score >= 195 ? 'text-orange-400' :
                    r.score >= 175 ? 'text-yellow-400' :
                    r.score >= 150 ? 'text-purple-400' : 'text-blue-400'
                  }`}>
                    {getGrade(r.score)}
                  </span>
                  <button
                    type="button"
                    onClick={() => saveLoadout(r)}
                    className="ml-auto text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-1 rounded"
                  >
                    保存套装
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {r.echoes.map(echo => (
                    <EchoCard key={echo.id} echo={echo} calc={calc} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 右侧：已保存套装面板 */}
      <div className="w-72 shrink-0 hidden lg:block">
        <div className="sticky top-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-zinc-300">已保存套装</h3>
            {savedCharNames.length > 1 && (
              <select
                value={filterChar}
                onChange={e => setFilterChar(e.target.value)}
                className="text-xs bg-zinc-800 text-zinc-300 rounded px-2 py-1 border border-zinc-700"
              >
                <option value="all">全部角色</option>
                {savedCharNames.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            )}
          </div>

          {filteredLoadouts.length === 0 ? (
            <p className="text-xs text-zinc-500">暂无保存的套装</p>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
              {filteredLoadouts.map(l => {
                const grade = getGrade(l.score)
                const expanded = expandedLoadout === l.id
                return (
                  <div key={l.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-zinc-200 truncate flex-1">{l.name}</span>
                      <span className={`text-xs font-bold ${GRADE_COLORS[grade] ?? 'text-zinc-400'}`}>{grade}</span>
                      <button
                        type="button"
                        onClick={() => removeLoadout(l.id)}
                        className="text-zinc-600 hover:text-red-400 text-xs"
                        title="删除"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>{l.characterName}</span>
                      <span>{l.score.toFixed(1)}分</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedLoadout(expanded ? null : l.id)}
                      className="text-xs text-zinc-500 hover:text-zinc-300 mt-1"
                    >
                      {expanded ? '收起' : '展开详情'}
                    </button>
                    {expanded && (
                      <div className="mt-2 space-y-1">
                        {l.echoes.map(echo => (
                          <div key={echo.id} className="text-xs bg-zinc-800 rounded px-2 py-1">
                            <span className="text-zinc-400">C{echo.cost}</span>
                            <span className="text-zinc-300 ml-2">{echo.monsterName}</span>
                            <span className="text-zinc-500 ml-1">
                              {STAT_DISPLAY[echo.mainStat.type] ?? echo.mainStat.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
