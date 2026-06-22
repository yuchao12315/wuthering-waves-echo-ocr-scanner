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
import type { CharacterBase, Weapon, DamageResult, StatSource } from '@/types/damage'

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

const SKILL_TYPE_LABELS: Record<string, string> = {
  '常态攻击': '普攻', '共鸣技能': '技能', '共鸣解放': '解放',
  '变奏技能': '变奏', '共鸣回路': '回路',
}

function SourceTooltip({ sources, isAtk, baseAtk }: { sources: StatSource[]; isAtk?: boolean; baseAtk?: number }) {
  if (!sources.length) return null
  return (
    <div className="absolute z-10 left-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded p-2 shadow-lg min-w-[180px] text-left">
      {isAtk && baseAtk != null && (
        <div className="flex justify-between text-[10px] mb-1">
          <span className="text-zinc-500">攻击白值</span>
          <span className="text-zinc-300">{baseAtk}</span>
        </div>
      )}
      {sources.map((s, i) => (
        <div key={i} className="flex justify-between text-[10px]">
          <span className="text-zinc-500">{s.label}</span>
          <span className="text-zinc-300">
            {isAtk && s.label === '声骸固定攻击' ? `+${s.value}` : `+${(s.value * 100).toFixed(1)}%`}
          </span>
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, value, sources, isAtk, baseAtk }: {
  label: string; value: string; sources: StatSource[]; isAtk?: boolean; baseAtk?: number
}) {
  const [show, setShow] = useState(false)
  return (
    <div
      className="bg-zinc-800 rounded p-2 text-center relative cursor-pointer"
      onClick={() => setShow(!show)}
      onMouseLeave={() => setShow(false)}
    >
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-sm font-medium">{value}</div>
      {sources.length > 0 && <div className="text-[9px] text-zinc-600 mt-0.5">点击查看明细</div>}
      {show && <SourceTooltip sources={sources} isAtk={isAtk} baseAtk={baseAtk} />}
    </div>
  )
}

function PanelDisplay({ result }: { result: DamageResult }) {
  const bd = result.breakdown
  return (
    <>
      <div className="grid grid-cols-4 gap-2 mb-3">
        <StatCard label="攻击力" value={result.panel.atk.toFixed(1)} sources={bd.atk.sources} isAtk baseAtk={bd.atk.baseAtk} />
        <StatCard label="暴击率" value={`${(result.panel.critRate * 100).toFixed(1)}%`} sources={bd.critRate.sources} />
        <StatCard label="暴击伤害" value={`${(result.panel.critDmg * 100).toFixed(1)}%`} sources={bd.critDmg.sources} />
        <StatCard label="属性增伤" value={`${(result.panel.elemDmg * 100).toFixed(1)}%`} sources={bd.elemDmg.sources} />
      </div>
      {(result.panel.resonanceSkillDmg > 0 || result.panel.resonanceLiberationDmg > 0 || result.panel.normalAtkDmg > 0 || result.panel.heavyAtkDmg > 0) && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {result.panel.normalAtkDmg > 0 && (
            <StatCard label="普攻增伤" value={`${(result.panel.normalAtkDmg * 100).toFixed(1)}%`} sources={bd.normalAtkDmg.sources} />
          )}
          {result.panel.heavyAtkDmg > 0 && (
            <StatCard label="重击增伤" value={`${(result.panel.heavyAtkDmg * 100).toFixed(1)}%`} sources={bd.heavyAtkDmg.sources} />
          )}
          {result.panel.resonanceSkillDmg > 0 && (
            <StatCard label="共鸣技能增伤" value={`${(result.panel.resonanceSkillDmg * 100).toFixed(1)}%`} sources={bd.resonanceSkillDmg.sources} />
          )}
          {result.panel.resonanceLiberationDmg > 0 && (
            <StatCard label="共鸣解放增伤" value={`${(result.panel.resonanceLiberationDmg * 100).toFixed(1)}%`} sources={bd.resonanceLiberationDmg.sources} />
          )}
        </div>
      )}
    </>
  )
}

function DamagePanel({ loadout }: { loadout: SavedLoadout }) {
  const charBase = charsBase[loadout.characterName]
  const availableWeapons = charBase ? weapons.filter(w => w.type === charBase.weaponType) : []
  const [weaponName, setWeaponName] = useState(availableWeapons[0]?.name ?? '')
  const [refine, setRefine] = useState(1)
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set())
  const [chainLevel, setChainLevel] = useState(0)

  if (!charBase) {
    return <p className="text-xs text-zinc-500 mt-2">暂无该角色的伤害数据</p>
  }

  const weapon = weapons.find(w => w.name === weaponName)
  if (!weapon) return null

  const hasChainEffects = (charBase.chainEffects?.length ?? 0) > 0
  const result = calcDamage(charBase, weapon, refine, loadout.echoes, -1, 10, 90, 89, 0.1, chainLevel)

  const allSkillTypes = useMemo(() => {
    const seen = new Set<string>()
    const ordered: string[] = []
    for (const s of charBase.skills) {
      if (s.skillType && !seen.has(s.skillType)) {
        seen.add(s.skillType)
        ordered.push(s.skillType)
      }
    }
    return ordered
  }, [charBase.skills])

  const toggleType = (t: string) => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  const filteredSkills = useMemo(() => {
    if (activeTypes.size === 0) return result.skills
    return result.skills.filter(sk => activeTypes.has(sk.skillType))
  }, [result.skills, activeTypes])
  const filteredTotal = filteredSkills.reduce((s, sk) => s + sk.expected, 0)

  return (
    <div className="mt-3 border-t border-zinc-800 pt-3">
      {hasChainEffects && (
        <div className="flex items-center gap-1.5 mb-3">
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
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-xs text-zinc-500">技能筛选:</span>
          {allSkillTypes.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => toggleType(t)}
              className={`px-2 py-0.5 text-xs rounded ${
                activeTypes.has(t)
                  ? 'bg-purple-600 text-white'
                  : activeTypes.size === 0
                    ? 'bg-zinc-800 text-zinc-300'
                    : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {SKILL_TYPE_LABELS[t] ?? t}
            </button>
          ))}
          {activeTypes.size > 0 && (
            <button
              type="button"
              onClick={() => setActiveTypes(new Set())}
              className="text-xs text-red-400 hover:text-red-300 ml-1"
            >
              清除
            </button>
          )}
        </div>
      )}

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

      <PanelDisplay result={result} />

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
          {filteredSkills.map(sk => (
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
            <td colSpan={3} className="py-1 text-zinc-400">{activeTypes.size > 0 ? '筛选期望伤害' : '总期望伤害'}</td>
            <td className="py-1 text-right text-zinc-200 font-mono font-medium">{filteredTotal.toLocaleString()}</td>
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
