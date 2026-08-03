#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const sourcePath = path.join(root, 'src/lib/damage.ts')
const outputPath = path.join(root, 'miniprogram/services/damage.js')

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
    .replace(/^export\s+(?=(?:const|function)\s+(?:KEY_SKILL_DAMAGE_LIMIT|selectKeySkills|parseMultiplierStr|calcDamage)\b)/gm, '')

  const result = ts.transpileModule(source, {
    fileName: sourcePath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES5,
      removeComments: false,
    },
  })
  const commonJsBody = result.outputText
    .replace(/^Object\.defineProperty\(exports, "__esModule", \{ value: true \}\);\r?\n/m, '')

  return '// Auto-generated as ES5 from src/lib/damage.ts. Do not edit directly.\n'
    + commonJsBody
    + '\nmodule.exports = { KEY_SKILL_DAMAGE_LIMIT: KEY_SKILL_DAMAGE_LIMIT, selectKeySkills: selectKeySkills, parseMultiplierStr: parseMultiplierStr, calcDamage: calcDamage }\n'
}

const output = generate()
if (process.argv.includes('--check')) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : ''
  if (current !== output) {
    console.error('miniprogram/services/damage.js is stale; run npm run generate:miniprogram-damage')
    process.exit(1)
  }
} else {
  fs.writeFileSync(outputPath, output)
}
