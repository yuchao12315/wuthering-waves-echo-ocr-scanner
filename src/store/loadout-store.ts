import { create } from 'zustand'
import type { SavedLoadout } from '@/types/echo'
import { db } from '@/db'

interface LoadoutStore {
  loadouts: SavedLoadout[]
  loaded: boolean
  load: () => Promise<void>
  add: (loadout: SavedLoadout) => Promise<void>
  remove: (id: string) => Promise<void>
  rename: (id: string, name: string) => Promise<void>
  update: (id: string, patch: Partial<SavedLoadout>) => Promise<void>
}

export const useLoadoutStore = create<LoadoutStore>((set, get) => ({
  loadouts: [],
  loaded: false,

  load: async () => {
    const loadouts = await db.loadouts.toArray()
    set({ loadouts, loaded: true })
  },

  add: async (loadout) => {
    await db.loadouts.put(loadout)
    set({ loadouts: [...get().loadouts, loadout] })
  },

  remove: async (id) => {
    await db.loadouts.delete(id)
    set({ loadouts: get().loadouts.filter(l => l.id !== id) })
  },

  rename: async (id, name) => {
    await db.loadouts.update(id, { name })
    set({ loadouts: get().loadouts.map(l => l.id === id ? { ...l, name } : l) })
  },

  update: async (id, patch) => {
    await db.loadouts.update(id, patch)
    set({ loadouts: get().loadouts.map(l => l.id === id ? { ...l, ...patch } : l) })
  },
}))
