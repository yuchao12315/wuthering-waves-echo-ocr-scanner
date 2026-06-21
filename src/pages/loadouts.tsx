import { useState, useMemo } from 'react'
import { useLoadoutStore } from '@/store/loadout-store'
import { useEchoStore } from '@/store/echo-store'
import { useAppStore } from '@/store/app-store'
import { EchoCard } from '@/components/echo-card'
import { getGrade, scoreEcho } from '@/lib/scoring'
import { calcDamage } from '@/lib/damage'
import { SONATA_NAMES } from '@/lib/constants'
import CHARACTERS_BASE from '@/data/characters-base.json'
import WEAPONS from '@/data/weapons.json'
import type { Echo, SavedLoadout } from '@/types/echo'
import type { CalcJson } from '@/types/character'
import type { CharacterBase, Weapon } from '@/types/damage'

const GRADE_COLORS: Record<string, string> = {
  SSS: 'text-red-400', SS: 'text-orange-400', S: 'text-yellow-400',
  A: 'text-purple-400', B: 'text-blue-400', C: 'text-zinc-400',
}

const TAG_COLORS: Record<string, string> = {
  E: 'bg-blue-900/50 text-blue-300',
  Q: 'bg-orange-900/50 text-orange-300',
  '变奏': 'bg-green-900/50 text-green-300',
}

const charsBase = CHARACTERS_BASE as Record<string, CharacterBase>
const weapons = WEAPONS as Weapon[]

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

function DamagePanel({ loadout }: { loadout: SavedLoadout }) {
  const charBase = charsBase[loadout.characterName]
  const availableWeapons = charBase ? weapons.filter(w => w.type === charBase.weaponType) : []
  const [weaponName, setWeaponName] = useState(availableWeapons[0]?.name ?? '')
  const [refine, setRefine] = useState(1)

  if (!charBase) {
    return <p className="text-xs text-zinc-500 mt-2">暂无该角色的伤害数据</p>
  }

  const weapon = weapons.find(w => w.name === weaponName)
  if (!weapon) return null

  const result = calcDamage(charBase, weapon, refine, loadout.echoes)

  return (
    <div className="mt-3 border-t border-zinc-800 pt-3">
      <div className="flex items-center gap-3 mb-3">
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
              onClick={() => setRefine(r)}
              className={`w-6 h-6 text-xs rounded ${refine === r ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="bg-zinc-800 rounded p-2 text-center">
          <div className="text-xs text-zinc-500">攻击力</div>
          <div className="text-sm font-medium">{result.panel.atk}</div>
        </div>
        <div className="bg-zinc-800 rounded p-2 text-center">
          <div className="text-xs text-zinc-500">暴击率</div>
          <div className="text-sm font-medium">{(result.panel.critRate * 100).toFixed(1)}%</div>
        </div>
        <div className="bg-zinc-800 rounded p-2 text-center">
          <div className="text-xs text-zinc-500">暴击伤害</div>
          <div className="text-sm font-medium">{(result.panel.critDmg * 100).toFixed(1)}%</div>
        </div>
        <div className="bg-zinc-800 rounded p-2 text-center">
          <div className="text-xs text-zinc-500">属性增伤</div>
          <div className="text-sm font-medium">{(result.panel.elemDmg * 100).toFixed(1)}%</div>
        </div>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-zinc-500 border-b border-zinc-800">
            <th className="text-left py-1 font-normal">技能</th>
            <th className="text-left py-1 font-normal">类型</th>
            <th className="text-right py-1 font-normal">倍率</th>
            <th className="text-right py-1 font-normal">期望伤害</th>
            <th className="text-right py-1 font-normal">暴击伤害</th>
          </tr>
        </thead>
        <tbody>
          {result.skills.map(sk => (
            <tr key={sk.name} className="border-b border-zinc-800/50">
              <td className="py-1 text-zinc-300">{sk.name}</td>
              <td className="py-1">
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${TAG_COLORS[sk.tag] ?? 'bg-zinc-800 text-zinc-400'}`}>
                  {sk.tag}
                </span>
              </td>
              <td className="py-1 text-right text-zinc-400">{sk.multiplierStr}</td>
              <td className="py-1 text-right text-zinc-200 font-mono">{sk.expected.toLocaleString()}</td>
              <td className="py-1 text-right text-yellow-400 font-mono">{sk.crit.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-zinc-700">
            <td colSpan={3} className="py-1 text-zinc-400">总期望伤害</td>
            <td className="py-1 text-right text-zinc-200 font-mono font-medium">{result.totalExpected.toLocaleString()}</td>
            <td />
          </tr>
        </tfoot>
      </table>
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
  const [showDamage, setShowDamage] = useState(false)

  const char = characters.find(c => c.name === loadout.characterName)
  const calc = char?.calc ?? null
  const grade = getGrade(loadout.score)
  const hasDamageData = loadout.characterName in charsBase

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
        {hasDamageData && (
          <button
            type="button"
            onClick={() => setShowDamage(!showDamage)}
            className="text-xs text-purple-400 hover:text-purple-300"
          >
            {showDamage ? '收起伤害' : '伤害计算'}
          </button>
        )}
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

      {showDamage && <DamagePanel loadout={loadout} />}

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
