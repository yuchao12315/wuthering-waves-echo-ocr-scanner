import Dexie, { type Table } from 'dexie'
import type { Echo } from '@/types/echo'

export class EchoDatabase extends Dexie {
  echoes!: Table<Echo, string>

  constructor() {
    super('wuwa-echo-calc')
    this.version(1).stores({
      echoes: 'id, cost, sonata, level, tuneLevel',
    })
  }
}

export const db = new EchoDatabase()
