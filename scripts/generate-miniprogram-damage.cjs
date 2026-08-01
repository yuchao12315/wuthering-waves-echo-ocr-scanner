#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const sourcePath = path.join(root, 'src/lib/damage.ts')
const outputPath = path.join(root, 'miniprogram/lib/damage.ts')

function generate() {
  let source = fs.readFileSync(sourcePath, 'utf8')
  source = source
    .replace("from '@/types/echo'", "from '../typings/echo'")
    .replace("from '@/types/damage'", "from '../typings/damage'")
    .replace(
      "import SONATA_EFFECTS from '@/data/sonata-effects.json'",
      "declare const require: (path: string) => unknown\nconst SONATA_EFFECTS = require('../data/sonata-effects.js') as Record<string, SonataEffect>",
    )
    .replace(
      "import { getNightmareBonus } from '@/data/nightmare-bonuses'",
      "import { getNightmareBonus } from '../data/nightmare-bonuses'",
    )

  return '// Auto-generated from src/lib/damage.ts. Do not edit directly.\n' + source
}

const output = generate()
if (process.argv.includes('--check')) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : ''
  if (current !== output) {
    console.error('miniprogram/lib/damage.ts is stale; run npm run generate:miniprogram-damage')
    process.exit(1)
  }
} else {
  fs.writeFileSync(outputPath, output)
}
