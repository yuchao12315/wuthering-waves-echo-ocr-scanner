/**
 * ETL Script: Download calc.json files from XutheringWavesUID upstream
 *
 * Usage: npx tsx scripts/fetch-calc-json.ts
 *
 * Downloads character weight data and outputs public/data/characters.json
 * Requires network access to ww1.loping151.top
 */

const BASE_URL = 'https://ww1.loping151.top/XutheringWavesUID/resource/map'
const CHAR_ID_URL = `${BASE_URL}/CharId2Data.json`
const OUTPUT_PATH = './public/data/characters.json'

interface CharIdEntry {
  id: number
  name: string
  element?: string
  weaponType?: string
  rarity?: number
}

async function main() {
  console.log('Fetching character ID mapping...')
  const charIdRes = await fetch(CHAR_ID_URL)
  if (!charIdRes.ok) {
    console.error(`Failed to fetch CharId2Data.json: ${charIdRes.status}`)
    process.exit(1)
  }

  const charIdData: Record<string, CharIdEntry> = await charIdRes.json()
  const characters: unknown[] = []
  const ids = Object.keys(charIdData)

  console.log(`Found ${ids.length} characters. Downloading calc.json files...`)

  for (const id of ids) {
    const url = `${BASE_URL}/character/${id}/calc.json`
    try {
      const res = await fetch(url)
      if (!res.ok) {
        console.warn(`  [SKIP] ${id} (${charIdData[id]?.name}): HTTP ${res.status}`)
        continue
      }
      const calc = await res.json()
      const entry = charIdData[id]
      characters.push({
        id: Number(id),
        name: entry?.name ?? calc.name?.split('-')[0] ?? `角色${id}`,
        element: entry?.element ?? 'unknown',
        weaponType: entry?.weaponType ?? 'unknown',
        rarity: entry?.rarity ?? 5,
        calc,
      })
      console.log(`  [OK] ${id} - ${calc.name}`)
    } catch (err) {
      console.warn(`  [ERR] ${id}: ${err}`)
    }
  }

  const { writeFileSync } = await import('fs')
  writeFileSync(OUTPUT_PATH, JSON.stringify(characters, null, 2))
  console.log(`\nDone! ${characters.length} characters saved to ${OUTPUT_PATH}`)
}

main()
