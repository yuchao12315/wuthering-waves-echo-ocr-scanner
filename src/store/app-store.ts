import { create } from 'zustand'
import type { Character } from '@/types/character'
import type { Echo } from '@/types/echo'

type Page = 'echoes' | 'calculator' | 'characters'

interface LoadoutResult {
  echoes: Echo[]
  score: number
}

interface AppStore {
  page: Page
  setPage: (page: Page) => void
  selectedCharacter: Character | null
  setSelectedCharacter: (char: Character | null) => void
  characters: Character[]
  setCharacters: (chars: Character[]) => void
  // 计算状态（全局持久化，切换tab不丢失）
  computing: boolean
  computeProgress: number
  computeResults: LoadoutResult[]
  setComputing: (v: boolean) => void
  setComputeProgress: (v: number) => void
  setComputeResults: (v: LoadoutResult[]) => void
}

export const useAppStore = create<AppStore>((set) => ({
  page: 'echoes',
  setPage: (page) => set({ page }),
  selectedCharacter: null,
  setSelectedCharacter: (selectedCharacter) => set({ selectedCharacter }),
  characters: [],
  setCharacters: (characters) => set({ characters }),
  computing: false,
  computeProgress: 0,
  computeResults: [],
  setComputing: (computing) => set({ computing }),
  setComputeProgress: (computeProgress) => set({ computeProgress }),
  setComputeResults: (computeResults) => set({ computeResults }),
}))
