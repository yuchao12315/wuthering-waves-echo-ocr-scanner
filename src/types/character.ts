export interface CalcJson {
  name: string
  main_props: Record<string, Record<string, number>>
  sub_props: Record<string, number>
  max_main_props: Record<string, string[]>
  max_sub_props: string[]
  score_max: [number, number, number]
  total_grade: number[]
  props_grade: number[][]
  grade: {
    valid_s: string[]
    valid_a: string[]
    valid_b: string[]
  }
}

export interface Character {
  id: number
  name: string
  element: string
  weaponType: string
  rarity: number
  calc: CalcJson
}
