#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const sourcePath = path.join(root, 'src/lib/damage.ts')
const outputPath = path.join(root, 'miniprogram/lib/damage.js')

function generate() {
  let source = fs.readFileSync(sourcePath, 'utf8')
  source = source
    .replace(
      "import SONATA_EFFECTS from '@/data/sonata-effects.json'",
      "import SONATA_EFFECTS = require('../data/sonata-effects.js')",
    )
    .replace(
      "import { getNightmareBonus } from '@/data/nightmare-bonuses'",
      "import { getNightmareBonus } from '../data/nightmare-bonuses.js'",
    )

  const result = ts.transpileModule(source, {
    fileName: sourcePath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      removeComments: false,
    },
  })
  return '// Auto-generated from src/lib/damage.ts. Do not edit directly.\n' + result.outputText
}

const output = generate()
if (process.argv.includes('--check')) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : ''
  if (current !== output) {
    console.error('miniprogram/lib/damage.js is stale; run npm run generate:miniprogram-damage')
    process.exit(1)
  }
} else {
  fs.writeFileSync(outputPath, output)
}
