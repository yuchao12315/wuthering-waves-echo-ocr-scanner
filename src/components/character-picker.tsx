import { useAppStore } from '@/store/app-store'

export function CharacterPicker() {
  const { characters, selectedCharacter, setSelectedCharacter } = useAppStore()

  return (
    <select
      value={selectedCharacter?.id ?? ''}
      onChange={e => {
        const char = characters.find(c => c.id === Number(e.target.value))
        setSelectedCharacter(char ?? null)
      }}
      className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
    >
      <option value="">选择角色...</option>
      {characters.map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  )
}
