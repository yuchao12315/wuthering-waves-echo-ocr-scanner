import { useEffect } from 'react'
import { useEchoStore } from '@/store/echo-store'
import { useAppStore } from '@/store/app-store'
import { EchoesPage } from '@/pages/echoes'
import { CalculatorPage } from '@/pages/calculator'
import { CharactersPage } from '@/pages/characters'
import { CHARACTER_WEIGHTS } from '@/lib/characters'
import type { Character } from '@/types/character'

export default function App() {
  const { load } = useEchoStore()
  const { page, setPage, setCharacters } = useAppStore()

  useEffect(() => {
    load()
    // 优先从内嵌权重表构建角色列表，回退到旧API
    const chars: Character[] = Object.entries(CHARACTER_WEIGHTS).map(([name, calc], i) => ({
      id: i + 1,
      name,
      element: 'unknown',
      weaponType: 'unknown',
      rarity: 5,
      calc,
    }))
    if (chars.length > 0) {
      // 补充元素/武器信息（从旧characters.json合并）
      fetch('/data/characters.json')
        .then(r => r.json())
        .then((oldChars: Character[]) => {
          const oldMap = new Map(oldChars.map(c => [c.name, c]))
          const merged = chars.map(c => {
            const old = oldMap.get(c.name)
            if (old) {
              return { ...c, element: old.element, weaponType: old.weaponType, id: old.id }
            }
            return c
          })
          setCharacters(merged)
        })
        .catch(() => setCharacters(chars))
    } else {
      fetch('/data/characters.json')
        .then(r => r.json())
        .then(setCharacters)
        .catch(() => {})
    }
  }, [])

  const tabs = [
    { key: 'echoes' as const, label: '声骸管理' },
    { key: 'calculator' as const, label: '搭配计算' },
    { key: 'characters' as const, label: '角色' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">鸣潮声骸计算器</h1>
      <nav className="flex gap-1 mb-6 border-b border-zinc-800">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setPage(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              page === t.key
                ? 'bg-zinc-800 text-white border-b-2 border-purple-500'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {page === 'echoes' && <EchoesPage />}
      {page === 'calculator' && <CalculatorPage />}
      {page === 'characters' && <CharactersPage />}
    </div>
  )
}
