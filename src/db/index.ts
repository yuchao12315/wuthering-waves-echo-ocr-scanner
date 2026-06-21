import Dexie, { type Table } from 'dexie'
import type { Echo, SavedLoadout } from '@/types/echo'

export class EchoDatabase extends Dexie {
  echoes!: Table<Echo, string>
  loadouts!: Table<SavedLoadout, string>

  constructor() {
    super('wuwa-echo-calc')
    this.version(1).stores({
      echoes: 'id, cost, sonata, level, tuneLevel',
    })
    this.version(2).stores({
      echoes: 'id, cost, sonata, level, tuneLevel',
      loadouts: 'id, characterName, savedAt',
    })
  }
}

export const db = new EchoDatabase()
