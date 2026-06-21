import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { useEchoStore } from '@/store/echo-store'
import { useAppStore } from '@/store/app-store'
import { useLoadoutStore } from '@/store/loadout-store'
import { CharacterPicker } from '@/components/character-picker'
import { EchoCard } from '@/components/echo-card'
import { SONATA_NAMES } from '@/lib/constants'
import { getGrade } from '@/lib/scoring'
import { calcDamage } from '@/lib/damage'
import CHARACTERS_BASE from '@/data/characters-base.json'
import WEAPONS from '@/data/weapons.json'
import type { SonataType, Echo } from '@/types/echo'
import type { CharacterBase, Weapon } from '@/types/damage'

const charsBase = CHARACTERS_BASE as Record<string, CharacterBase>
const weaponList = WEAPONS as Weapon[]

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

const SKILL_TYPE_LABELS: Record<string, string> = {
  '常态攻击': '普攻', '共鸣技能': '技能', '共鸣解放': '解放',
  '变奏技能': '变奏', '共鸣回路': '回路',
}

type RankMode = 'score' | 'damage'

export function CalculatorPage() {
  const { echoes } = useEchoStore()
  const { selectedCharacter, computing, computeProgress, computeResults,
          setComputing, setComputeProgress, setComputeResults } = useAppStore()
  const { loadouts, add: addLoadout } = useLoadoutStore()
  const [sonatas, setSonatas] = useState<SonataType[]>([])
  const [costFilter, setCostFilter] = useState<string>('all')
  const [countdown, setCountdown] = useState('')
  const [excludeLoadoutIds, setExcludeLoadoutIds] = useState<Set<string>>(new Set())
  const [rankMode, setRankMode] = useState<RankMode>('score')
  const [weaponName, setWeaponName] = useState('')
  const [weaponRefine, setWeaponRefine] = useState(1)
  const [activeSkillTypes, setActiveSkillTypes] = useState<Set<string>>(new Set())
  const [chainLevel, setChainLevel] = useState(0)
  const progressTimerRef = useRef<number | null>(null)

  const charBase = selectedCharacter ? charsBase[selectedCharacter.name] : null
  const hasChainEffects = (charBase?.chainEffects?.length ?? 0) > 0
  const availableWeapons = useMemo(() =>
    charBase ? weaponList.filter(w => w.type === charBase.weaponType) : []
  , [charBase])

  useEffect(() => {
    if (availableWeapons.length > 0 && !availableWeapons.find(w => w.name === weaponName)) {
      setWeaponName(availableWeapons[0].name)
    }
  }, [availableWeapons, weaponName])

  const allSkillTypes = useMemo(() => {
    if (!charBase) return []
    const seen = new Set<string>()
    const ordered: string[] = []
    for (const s of charBase.skills) {
      if (s.skillType && !seen.has(s.skillType)) {
        seen.add(s.skillType)
        ordered.push(s.skillType)
      }
    }
    return ordered
  }, [charBase])

  const allSonatas = useMemo(() => {
    const known = { ...SONATA_NAMES }
    for (const echo of echoes) {
      if (echo.sonata && !(echo.sonata in known)) {
        known[echo.sonata] = echo.sonata
      }
    }
    return known
  }, [echoes])

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

  const toggleSkillType = (t: string) => {
    setActiveSkillTypes(prev => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
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

  const calcLoadoutDamage = useCallback((loadoutEchoes: Echo[]): number => {
    if (!charBase) return 0
    const weapon = weaponList.find(w => w.name === weaponName)
    if (!weapon) return 0
    const result = calcDamage(charBase, weapon, weaponRefine, loadoutEchoes, -1, 10, 90, 89, 0.1, chainLevel)
    if (activeSkillTypes.size === 0) return result.totalExpected
    return result.skills
      .filter(sk => activeSkillTypes.has(sk.skillType))
      .reduce((s, sk) => s + sk.expected, 0)
  }, [charBase, weaponName, weaponRefine, activeSkillTypes, chainLevel])

  const sortedResults = useMemo(() => {
    if (rankMode !== 'damage' || !charBase) return computeResults
    return [...computeResults].sort((a, b) => calcLoadoutDamage(b.echoes) - calcLoadoutDamage(a.echoes))
  }, [computeResults, rankMode, charBase, calcLoadoutDamage])

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
  const results = sortedResults

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <CharacterPicker />
      </div>

      {/* 排序模式 + 共鸣链筛选 */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <p className="text-xs text-zinc-400">排序方式:</p>
          <button
            type="button"
            onClick={() => setRankMode('score')}
            className={`px-3 py-1 text-xs rounded ${rankMode === 'score' ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
          >
            评分最高
          </button>
          <button
            type="button"
            onClick={() => setRankMode('damage')}
            className={`px-3 py-1 text-xs rounded ${rankMode === 'damage' ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
            disabled={!charBase}
            title={!charBase ? '当前角色无伤害数据' : ''}
          >
            伤害最高
          </button>
        </div>

        {rankMode === 'damage' && charBase && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <select
                value={weaponName}
                onChange={e => setWeaponName(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs"
              >
                {availableWeapons.map(w => (
                  <option key={w.name} value={w.name}>{w.name}</option>
                ))}
              </select>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setWeaponRefine(r)}
                    className={`w-6 h-6 text-xs rounded ${weaponRefine === r ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>



            {hasChainEffects && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs text-zinc-500">命座:</span>
                {[0, 1, 2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setChainLevel(n)}
                    className={`w-6 h-6 text-xs rounded ${chainLevel === n ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}

            {allSkillTypes.length > 1 && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs text-zinc-500">技能筛选:</span>
                {allSkillTypes.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleSkillType(t)}
                    className={`px-2 py-0.5 text-xs rounded ${
                      activeSkillTypes.has(t)
                        ? 'bg-purple-600 text-white'
                        : activeSkillTypes.size === 0
                          ? 'bg-zinc-800 text-zinc-300'
                          : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {SKILL_TYPE_LABELS[t] ?? t}
                  </button>
                ))}
                {activeSkillTypes.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveSkillTypes(new Set())}
                    className="text-xs text-red-400 hover:text-red-300 ml-1"
                  >
                    清除
                  </button>
                )}
              </div>
            )}
          </>
        )}
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
            {rankMode === 'damage' && <span className="text-purple-400 ml-2 text-xs">(按伤害排序)</span>}
          </h3>
          {results.map((r, i) => {
            const dmg = rankMode === 'damage' ? calcLoadoutDamage(r.echoes) : 0
            return (
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
                  {rankMode === 'damage' && dmg > 0 && (
                    <span className="text-xs text-orange-400 font-mono">
                      {activeSkillTypes.size > 0 ? '筛选' : '总'}伤害: {dmg.toLocaleString()}
                    </span>
                  )}
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
            )
          })}
        </div>
      )}
    </div>
  )
}
