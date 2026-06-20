import { create } from 'zustand'
import type { Echo } from '@/types/echo'
import { db } from '@/db'

interface EchoStore {
  echoes: Echo[]
  loaded: boolean
  load: () => Promise<void>
  add: (echo: Echo) => Promise<void>
  remove: (id: string) => Promise<void>
  importAll: (echoes: Echo[]) => Promise<void>
  clear: () => Promise<void>
}

export const useEchoStore = create<EchoStore>((set, get) => ({
  echoes: [],
  loaded: false,

  load: async () => {
    const echoes = await db.echoes.toArray()
    set({ echoes, loaded: true })
  },

  add: async (echo) => {
    await db.echoes.put(echo)
    set({ echoes: [...get().echoes, echo] })
  },

  remove: async (id) => {
    await db.echoes.delete(id)
    set({ echoes: get().echoes.filter((e) => e.id !== id) })
  },

  importAll: async (echoes) => {
    // 确保每个声骸有id
    const cleaned = echoes.map(e => ({
      ...e,
      id: e.id || crypto.randomUUID(),
      substats: e.substats || [],
    }))
    try {
      await db.echoes.bulkPut(cleaned)
    } catch (err) {
      console.error('导入IndexedDB失败，尝试逐条导入:', err)
      for (const echo of cleaned) {
        try { await db.echoes.put(echo) } catch {}
      }
    }
    set({ echoes: await db.echoes.toArray() })
  },

  clear: async () => {
    await db.echoes.clear()
    set({ echoes: [] })
  },
}))
