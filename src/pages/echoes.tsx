import { useState, useMemo } from 'react'
import type { Echo, StatType, SonataType, Cost } from '@/types/echo'
import { useEchoStore } from '@/store/echo-store'
import { useAppStore } from '@/store/app-store'
import { SONATA_NAMES, VALID_MAIN_STATS } from '@/lib/constants'
import { getNightmareBonus } from '@/data/nightmare-bonuses'
import { CharacterPicker } from '@/components/character-picker'
import { EchoCard } from '@/components/echo-card'
import { scoreEcho } from '@/lib/scoring'

const STAT_DISPLAY: Record<string, string> = {
  FLAT_ATK: '攻击', ATK_PCT: '攻击%', FLAT_HP: '生命', HP_PCT: '生命%',
  FLAT_DEF: '防御', DEF_PCT: '防御%', CRIT_RATE: '暴击率', CRIT_DMG: '暴击伤害',
  ENERGY_REGEN: '共鸣效率', ELEM_DMG: '属性伤害', HEAL_BONUS: '治疗加成',
  NORMAL_ATK_DMG: '普攻伤害', HEAVY_ATK_DMG: '重击伤害',
  RESONANCE_SKILL_DMG: '共鸣技能伤害', RESONANCE_LIBERATION_DMG: '共鸣解放伤害',
}

const ALL_SUBSTATS: StatType[] = [
  'FLAT_ATK', 'ATK_PCT', 'FLAT_HP', 'HP_PCT', 'FLAT_DEF', 'DEF_PCT',
  'CRIT_RATE', 'CRIT_DMG', 'ENERGY_REGEN',
  'NORMAL_ATK_DMG', 'HEAVY_ATK_DMG', 'RESONANCE_SKILL_DMG', 'RESONANCE_LIBERATION_DMG',
]

function EchoForm() {
  const { add } = useEchoStore()
  const [cost, setCost] = useState<Cost>(4)
  const [sonata, setSonata] = useState<SonataType>('freezing_frost')
  const [mainStatType, setMainStatType] = useState<StatType>('ATK_PCT')
  const [mainStatValue, setMainStatValue] = useState('')
  const [monsterName, setMonsterName] = useState('')
  const [secondaryType, setSecondaryType] = useState<StatType>('FLAT_ATK')
  const [secondaryValue, setSecondaryValue] = useState('')
  const [substats, setSubstats] = useState<{ type: StatType; value: string }[]>([])

  const validMains = VALID_MAIN_STATS[cost] ?? []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const echo: Echo = {
      id: crypto.randomUUID(),
      monsterId: 0,
      monsterName: monsterName || '未命名',
      cost,
      rarity: 5,
      level: 25,
      tuneLevel: 0,
      sonata,
      mainStat: { type: mainStatType, value: Number(mainStatValue) || 0 },
      secondaryStat: cost >= 3 ? { type: secondaryType, value: Number(secondaryValue) || 0 } : null,
      substats: substats.map(s => ({ type: s.type, value: Number(s.value) || 0 })),
      ...(getNightmareBonus(monsterName) ? { nightmareBonus: getNightmareBonus(monsterName)! } : {}),
    }
    add(echo)
    setSubstats([])
    setMainStatValue('')
    setSecondaryValue('')
    setMonsterName('')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6 space-y-3">
      <h3 className="font-medium text-sm mb-2">添加声骸</h3>
      <div className="flex flex-wrap gap-3">
        <input
          value={monsterName}
          onChange={e => setMonsterName(e.target.value)}
          placeholder="声骸名称"
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm w-32"
        />
        <div className="flex gap-1">
          {([1, 3, 4] as Cost[]).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => { setCost(c); setMainStatType(VALID_MAIN_STATS[c]?.[0] as StatType ?? 'ATK_PCT') }}
              className={`px-3 py-1.5 text-sm rounded ${cost === c ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}
            >
              {c}
            </button>
          ))}
        </div>
        <select
          value={sonata}
          onChange={e => setSonata(e.target.value as SonataType)}
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm"
        >
          {Object.entries(SONATA_NAMES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 items-center">
        <select
          value={mainStatType}
          onChange={e => setMainStatType(e.target.value as StatType)}
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm"
        >
          {validMains.map(s => (
            <option key={s} value={s}>{STAT_DISPLAY[s] ?? s}</option>
          ))}
        </select>
        <input
          type="number"
          step="any"
          value={mainStatValue}
          onChange={e => setMainStatValue(e.target.value)}
          placeholder="主属性值"
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm w-24"
        />
      </div>

      {cost >= 3 && (
        <div className="flex gap-3 items-center">
          <span className="text-xs text-zinc-400">副属性:</span>
          <select
            value={secondaryType}
            onChange={e => setSecondaryType(e.target.value as StatType)}
            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm"
          >
            {ALL_SUBSTATS.map(s => (
              <option key={s} value={s}>{STAT_DISPLAY[s] ?? s}</option>
            ))}
          </select>
          <input
            type="number"
            step="any"
            value={secondaryValue}
            onChange={e => setSecondaryValue(e.target.value)}
            placeholder="值"
            className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm w-24"
          />
        </div>
      )}

      <div className="space-y-2">
        <span className="text-xs text-zinc-400">词条:</span>
        {substats.map((sub, i) => (
          <div key={i} className="flex gap-2 items-center">
            <select
              value={sub.type}
              onChange={e => {
                const next = [...substats]
                next[i] = { ...next[i], type: e.target.value as StatType }
                setSubstats(next)
              }}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm"
            >
              {ALL_SUBSTATS.map(s => (
                <option key={s} value={s}>{STAT_DISPLAY[s] ?? s}</option>
              ))}
            </select>
            <input
              type="number"
              step="any"
              value={sub.value}
              onChange={e => {
                const next = [...substats]
                next[i] = { ...next[i], value: e.target.value }
                setSubstats(next)
              }}
              placeholder="值"
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm w-20"
            />
            <button
              type="button"
              onClick={() => setSubstats(substats.filter((_, j) => j !== i))}
              className="text-red-400 text-xs"
            >
              x
            </button>
          </div>
        ))}
        {substats.length < 5 && (
          <button
            type="button"
            onClick={() => setSubstats([...substats, { type: 'FLAT_ATK', value: '' }])}
            className="text-xs text-purple-400 hover:text-purple-300"
          >
            + 添加词条
          </button>
        )}
      </div>

      {getNightmareBonus(monsterName) && (
        <div className="flex items-center gap-2 text-xs text-purple-300 bg-purple-900/20 border border-purple-700/40 rounded px-3 py-1.5">
          <span>🔮 梦魇声骸: {getNightmareBonus(monsterName)!.elemType}伤害+{(getNightmareBonus(monsterName)!.elemDmg * 100).toFixed(0)}% {
            getNightmareBonus(monsterName)!.secondValue > 0
              ? `${({ resonanceSkillDmg: '共鸣技能', resonanceLiberationDmg: '共鸣解放', normalAtkDmg: '普攻', heavyAtkDmg: '重击', phantomDmg: '声骸技能', coordinatedDmg: '协同攻击', aeroDmg: '气动' } as Record<string, string>)[getNightmareBonus(monsterName)!.secondType] ?? ''}伤害+${(getNightmareBonus(monsterName)!.secondValue * 100).toFixed(0)}%`
              : ''
          }</span>
        </div>
      )}

      <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded text-sm">
        添加
      </button>
    </form>
  )
}

export function EchoesPage() {
  const { echoes, remove, importAll, clear } = useEchoStore()
  const { selectedCharacter } = useAppStore()
  const calc = selectedCharacter?.calc ?? null

  const [importMsg, setImportMsg] = useState('')
  const [filterSonata, setFilterSonata] = useState<string>('')
  const [filterCost, setFilterCost] = useState<number>(0)
  const [filterHasMain, setFilterHasMain] = useState(false)
  const [sortBy, setSortBy] = useState<'default' | 'score'>('default')

  // 动态套装列表
  const allSonatas = useMemo(() => {
    const known = { ...SONATA_NAMES }
    for (const echo of echoes) {
      if (echo.sonata && !(echo.sonata in known)) {
        known[echo.sonata] = echo.sonata
      }
    }
    return known
  }, [echoes])

  // 筛选 + 排序
  const filteredEchoes = useMemo(() => {
    let list = [...echoes]
    if (filterSonata === '__empty__') {
      list = list.filter(e => !e.sonata)
    } else if (filterSonata) {
      list = list.filter(e => e.sonata === filterSonata)
    }
    if (filterCost > 0) {
      list = list.filter(e => e.cost === filterCost)
    }
    if (filterHasMain) {
      list = list.filter(e => e.mainStat != null)
    }
    if (sortBy === 'score' && calc) {
      list.sort((a, b) => scoreEcho(b, calc) - scoreEcho(a, calc))
    }
    return list
  }, [echoes, filterSonata, filterCost, filterHasMain, sortBy, calc])

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        // 兼容多种JSON格式:
        // 1. echoes_live.json / echoes_xxx.json: { "echoes": [...] }
        // 2. scan_progress.json: { "scanned_echoes": [...] }
        // 3. 直接数组: [...]
        let echoList: Echo[] = []
        if (Array.isArray(data)) {
          echoList = data
        } else if (Array.isArray(data.echoes)) {
          echoList = data.echoes
        } else if (Array.isArray(data.scanned_echoes)) {
          echoList = data.scanned_echoes
        }

        if (echoList.length === 0) {
          setImportMsg(`⚠ 文件中未找到声骸数据 (支持格式: echoes/scanned_echoes数组)`)
          return
        }

        // 过滤掉无效数据（至少要有mainStat或substats）
        const valid = echoList.filter(e => e.mainStat || (e.substats && e.substats.length > 0) || e.monsterName)
        importAll(valid)
        setImportMsg(`✓ 成功导入 ${valid.length} 个声骸${valid.length < echoList.length ? ` (跳过${echoList.length - valid.length}个无效)` : ''}`)
      } catch (err) {
        setImportMsg(`✗ 导入失败: ${err instanceof Error ? err.message : '文件格式错误'}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(echoes, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'echoes.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <CharacterPicker />
        <label className="text-sm text-purple-400 hover:text-purple-300 cursor-pointer">
          导入JSON
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
        <button onClick={handleExport} className="text-sm text-purple-400 hover:text-purple-300">
          导出JSON
        </button>
        {echoes.length > 0 && (
          <button
            onClick={() => { if (confirm(`确定删除全部 ${echoes.length} 个声骸？此操作不可撤销。`)) clear() }}
            className="text-sm text-red-400 hover:text-red-300"
          >
            清空全部
          </button>
        )}
        {importMsg && (
          <span className={`text-sm ${importMsg.startsWith('✓') ? 'text-green-400' : importMsg.startsWith('⚠') ? 'text-yellow-400' : 'text-red-400'}`}>
            {importMsg}
          </span>
        )}
      </div>

      <EchoForm />

      {/* 筛选面板 */}
      {echoes.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-zinc-400">筛选:</span>

            {/* 套装筛选 */}
            <select
              value={filterSonata}
              onChange={e => setFilterSonata(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs"
            >
              <option value="">全部套装</option>
              <option value="__empty__">未识别套装</option>
              {Object.entries(allSonatas).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            {/* Cost筛选 */}
            <div className="flex gap-1">
              {[0, 1, 3, 4].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilterCost(c)}
                  className={`px-2 py-1 text-xs rounded ${filterCost === c ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                >
                  {c === 0 ? '全部' : `C${c}`}
                </button>
              ))}
            </div>

            {/* 仅显示有主词条的 */}
            <label className="flex items-center gap-1 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={filterHasMain}
                onChange={e => setFilterHasMain(e.target.checked)}
                className="accent-purple-500"
              />
              有主词条
            </label>

            {/* 排序 */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'default' | 'score')}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs"
            >
              <option value="default">默认排序</option>
              <option value="score">按评分排序</option>
            </select>

            <span className="text-xs text-zinc-500 ml-auto">
              {filteredEchoes.length}/{echoes.length} 个声骸
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEchoes.map(echo => (
          <EchoCard key={echo.id} echo={echo} calc={calc} onRemove={remove} />
        ))}
      </div>
      {echoes.length === 0 && (
        <p className="text-zinc-500 text-sm text-center py-8">暂无声骸，请添加或导入</p>
      )}
      {echoes.length > 0 && filteredEchoes.length === 0 && (
        <p className="text-zinc-500 text-sm text-center py-8">当前筛选条件下无声骸</p>
      )}
    </div>
  )
}
