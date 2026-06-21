import { useState, useMemo } from 'react'
import { useLoadoutStore } from '@/store/loadout-store'
import { useEchoStore } from '@/store/echo-store'
import { useAppStore } from '@/store/app-store'
import { EchoCard } from '@/components/echo-card'
import { getGrade } from '@/lib/scoring'
import { scoreEcho } from '@/lib/scoring'
import { SONATA_NAMES } from '@/lib/constants'
import type { Echo, SavedLoadout } from '@/types/echo'
import type { CalcJson } from '@/types/character'

const STAT_DISPLAY: Record<string, string> = {
  FLAT_ATK: '攻击', ATK_PCT: '攻击%', FLAT_HP: '生命', HP_PCT: '生命%',
  FLAT_DEF: '防御', DEF_PCT: '防御%', CRIT_RATE: '暴击率', CRIT_DMG: '暴击伤害',
  ENERGY_REGEN: '共鸣效率', ELEM_DMG: '属性伤害', HEAL_BONUS: '治疗加成',
  NORMAL_ATK_DMG: '普攻伤害', HEAVY_ATK_DMG: '重击伤害',
  RESONANCE_SKILL_DMG: '共鸣技能伤害', RESONANCE_LIBERATION_DMG: '共鸣解放伤害',
}

const GRADE_COLORS: Record<string, string> = {
  SSS: 'text-red-400', SS: 'text-orange-400', S: 'text-yellow-400',
  A: 'text-purple-400', B: 'text-blue-400', C: 'text-zinc-400',
}

function EchoPickerModal({ cost, calc, onPick, onClose }: {
  cost: number
  calc: CalcJson | null
  onPick: (echo: Echo) => void
  onClose: () => void
}) {
  const { echoes } = useEchoStore()
  const [filterSonata, setFilterSonata] = useState('')

  const allSonatas = useMemo(() => {
    const known = { ...SONATA_NAMES }
    for (const echo of echoes) {
      if (echo.sonata && !(echo.sonata in known)) {
        known[echo.sonata] = echo.sonata
      }
    }
    return known
  }, [echoes])

  const filtered = useMemo(() => {
    let list = echoes.filter(e => e.cost === cost)
    if (filterSonata) {
      list = list.filter(e => e.sonata === filterSonata)
    }
    if (calc) {
      list.sort((a, b) => scoreEcho(b, calc) - scoreEcho(a, calc))
    }
    return list
  }, [echoes, cost, filterSonata, calc])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 w-full max-w-3xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-zinc-200">选择 C{cost} 声骸替换</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">✕</button>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <select
            value={filterSonata}
            onChange={e => setFilterSonata(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs"
          >
            <option value="">全部套装</option>
            {Object.entries(allSonatas).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <span className="text-xs text-zinc-500">{filtered.length} 个声骸</span>
        </div>
        {filtered.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-4">无匹配声骸</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(echo => (
              <div
                key={echo.id}
                className="cursor-pointer hover:ring-2 hover:ring-purple-500 rounded-lg transition-all"
                onClick={() => { onPick(echo); onClose() }}
              >
                <EchoCard echo={echo} calc={calc} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LoadoutCard({ loadout, onUpdate }: {
  loadout: SavedLoadout
  onUpdate: () => void
}) {
  const { remove, rename, update } = useLoadoutStore()
  const { characters } = useAppStore()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(loadout.name)
  const [replaceSlot, setReplaceSlot] = useState<number | null>(null)

  const char = characters.find(c => c.name === loadout.characterName)
  const calc = char?.calc ?? null
  const grade = getGrade(loadout.score)

  const handleRename = () => {
    if (editName.trim() && editName !== loadout.name) {
      rename(loadout.id, editName.trim())
    }
    setEditing(false)
  }

  const handleReplace = (slotIndex: number, newEcho: Echo) => {
    const newEchoes = [...loadout.echoes]
    newEchoes[slotIndex] = newEcho
    let newScore = 0
    if (calc) {
      for (const e of newEchoes) {
        newScore += scoreEcho(e, calc)
      }
    }
    update(loadout.id, { echoes: newEchoes, score: newScore })
    onUpdate()
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        {editing ? (
          <input
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => e.key === 'Enter' && handleRename()}
            className="bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-sm w-40"
            autoFocus
          />
        ) : (
          <span
            className="text-sm font-medium text-zinc-200 cursor-pointer hover:text-purple-400"
            onClick={() => { setEditName(loadout.name); setEditing(true) }}
            title="点击重命名"
          >
            {loadout.name}
          </span>
        )}
        <span className="text-xs text-zinc-500">{loadout.characterName}</span>
        <span className="text-sm">总分: {loadout.score.toFixed(2)}</span>
        <span className={`text-sm font-bold ${GRADE_COLORS[grade] ?? 'text-zinc-400'}`}>{grade}</span>
        <button
          type="button"
          onClick={() => { if (confirm('确定删除该套装？')) remove(loadout.id) }}
          className="ml-auto text-xs text-zinc-500 hover:text-red-400"
        >
          删除
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {loadout.echoes.map((echo, i) => (
          <div key={echo.id} className="relative group">
            <EchoCard echo={echo} calc={calc} />
            <button
              type="button"
              onClick={() => setReplaceSlot(i)}
              className="absolute top-1 right-1 bg-zinc-700/80 hover:bg-purple-600 text-zinc-300 text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              替换
            </button>
          </div>
        ))}
      </div>

      {replaceSlot !== null && (
        <EchoPickerModal
          cost={loadout.echoes[replaceSlot].cost}
          calc={calc}
          onPick={(echo) => handleReplace(replaceSlot, echo)}
          onClose={() => setReplaceSlot(null)}
        />
      )}
    </div>
  )
}

export function LoadoutsPage() {
  const { loadouts } = useLoadoutStore()
  const [filterChar, setFilterChar] = useState<string>('all')
  const [, forceUpdate] = useState(0)

  const savedCharNames = useMemo(() => {
    const names = new Set(loadouts.map(l => l.characterName))
    return Array.from(names).sort()
  }, [loadouts])

  const filtered = useMemo(() => {
    if (filterChar === 'all') return loadouts
    return loadouts.filter(l => l.characterName === filterChar)
  }, [loadouts, filterChar])

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <h3 className="text-sm font-medium text-zinc-300">已保存套装</h3>
        {savedCharNames.length > 1 && (
          <select
            value={filterChar}
            onChange={e => setFilterChar(e.target.value)}
            className="text-xs bg-zinc-800 text-zinc-300 rounded px-2 py-1 border border-zinc-700"
          >
            <option value="all">全部角色 ({loadouts.length})</option>
            {savedCharNames.map(n => (
              <option key={n} value={n}>
                {n} ({loadouts.filter(l => l.characterName === n).length})
              </option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-zinc-500 text-sm text-center py-8">暂无保存的套装，请在搭配计算页保存</p>
      ) : (
        <div className="space-y-4">
          {filtered.map(l => (
            <LoadoutCard key={l.id} loadout={l} onUpdate={() => forceUpdate(n => n + 1)} />
          ))}
        </div>
      )}
    </div>
  )
}
