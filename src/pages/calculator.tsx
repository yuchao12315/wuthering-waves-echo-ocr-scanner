import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { useEchoStore } from '@/store/echo-store'
import { useAppStore } from '@/store/app-store'
import { CharacterPicker } from '@/components/character-picker'
import { EchoCard } from '@/components/echo-card'
import { SONATA_NAMES } from '@/lib/constants'
import { getGrade } from '@/lib/scoring'
import type { SonataType } from '@/types/echo'

// Worker 持久引用（模块级，不随组件卸载销毁）
let globalWorker: Worker | null = null

function formatTime(ms: number): string {
  const sec = Math.ceil(ms / 1000)
  if (sec >= 60) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}分${s}秒`
  }
  return `${sec}秒`
}

export function CalculatorPage() {
  const { echoes } = useEchoStore()
  const { selectedCharacter, computing, computeProgress, computeResults,
          setComputing, setComputeProgress, setComputeResults } = useAppStore()
  const [sonatas, setSonatas] = useState<SonataType[]>([])
  const [costFilter, setCostFilter] = useState<string>('all')
  const [countdown, setCountdown] = useState('')
  const progressTimerRef = useRef<number | null>(null)

  const allSonatas = useMemo(() => {
    const known = { ...SONATA_NAMES }
    for (const echo of echoes) {
      if (echo.sonata && !(echo.sonata in known)) {
        known[echo.sonata] = echo.sonata
      }
    }
    return known
  }, [echoes])

  const toggleSonata = (s: SonataType) => {
    if (sonatas.includes(s)) {
      setSonatas(sonatas.filter(x => x !== s))
    } else if (sonatas.length < 2) {
      setSonatas([...sonatas, s])
    }
  }

  // 清理进度条定时器
  const stopProgressTimer = useCallback(() => {
    if (progressTimerRef.current !== null) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }
  }, [])

  // 组件卸载时不终止 Worker（切 tab 不影响计算）
  useEffect(() => {
    return () => stopProgressTimer()
  }, [stopProgressTimer])

  const calculate = () => {
    if (!selectedCharacter) return
    setComputing(true)
    setComputeProgress(0)
    setComputeResults([])

    // 终止旧 Worker
    if (globalWorker) {
      globalWorker.terminate()
      globalWorker = null
    }

    const worker = new Worker(
      new URL('@/workers/loadout-worker.ts', import.meta.url),
      { type: 'module' }
    )
    globalWorker = worker

    // 预估耗时：基于声骸数量和搭配模式
    // 散件模式(~45万组合) > 双合鸣(~28万) > 单套装(~5万)
    const baseMs = sonatas.length === 0 ? 3000 : sonatas.length === 1 ? 800 : 1500
    const estimatedMs = Math.max(500, baseMs * (echoes.length / 50))
    const startTime = Date.now()

    setCountdown(formatTime(estimatedMs))

    progressTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min(95, (elapsed / estimatedMs) * 100)
      const remaining = Math.max(0, estimatedMs - elapsed)
      setComputeProgress(pct)
      setCountdown(remaining > 0 ? formatTime(remaining) : '即将完成...')
    }, 200)

    worker.onmessage = (e) => {
      const msg = e.data
      if (msg.type === 'PROGRESS' && typeof msg.percent === 'number') {
        setComputeProgress(msg.percent)
      } else {
        // 计算完成
        stopProgressTimer()
        setComputeProgress(100)
        setCountdown('完成!')
        setComputeResults(msg.results || [])
        setTimeout(() => setComputing(false), 500)
        worker.terminate()
        globalWorker = null
      }
    }

    worker.onerror = () => {
      stopProgressTimer()
      setComputing(false)
      setComputeProgress(0)
      worker.terminate()
      globalWorker = null
    }

    worker.postMessage({
      echoes,
      calc: selectedCharacter.calc,
      sonatas,
      costFilter,
    })
  }

  const calc = selectedCharacter?.calc ?? null
  const results = computeResults

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <CharacterPicker />
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <p className="text-xs text-zinc-400">选择声骸套装 (最多2个，不选=散件模式):</p>
          {sonatas.length > 0 && (
            <button
              type="button"
              onClick={() => setSonatas([])}
              className="text-xs text-red-400 hover:text-red-300"
            >
              清除选择
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-1.5">
          {Object.entries(allSonatas).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => toggleSonata(k as SonataType)}
              className={`px-2 py-1.5 text-xs rounded truncate ${
                sonatas.includes(k as SonataType)
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title={v}
            >
              {v}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500 mt-1.5">
          {sonatas.length === 0 ? '散件模式：全库存参与，纯评分最大化'
           : sonatas.length === 1 ? `5件套模式：${allSonatas[sonatas[0]]} 全套`
           : `双合鸣模式：${allSonatas[sonatas[0]]} + ${allSonatas[sonatas[1]]}`}
        </p>
      </div>

      <div className="mb-4">
        <p className="text-xs text-zinc-400 mb-2">Cost分配:</p>
        <div className="flex gap-1.5">
          {[
            { key: 'all', label: '全部' },
            { key: '4+3+3+1+1', label: '4+3+3+1+1' },
            { key: '4+4+1+1+1', label: '4+4+1+1+1' },
          ].map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setCostFilter(opt.key)}
              className={`px-3 py-1.5 text-xs rounded ${
                costFilter === opt.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={calculate}
        disabled={!selectedCharacter || computing}
        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-6 py-2 rounded text-sm mb-4"
      >
        {computing ? '计算中...' : '开始计算'}
      </button>

      {/* 进度条 + 倒计时 */}
      {computing && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs text-zinc-400">正在计算最优搭配...</span>
            <span className="text-xs text-purple-400 font-mono">{countdown}</span>
            <span className="text-xs text-zinc-500">{Math.round(computeProgress)}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-200"
              style={{ width: `${computeProgress}%` }}
            />
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-zinc-300">
            Top {results.length} 搭配
            {selectedCharacter && <span className="text-zinc-500 ml-2">— {selectedCharacter.name}</span>}
          </h3>
          {results.map((r, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-medium">#{i + 1}</span>
                <span className="text-sm">总分: {r.score.toFixed(2)}</span>
                <span className={`text-sm font-bold ${
                  r.score >= 210 ? 'text-red-400' :
                  r.score >= 195 ? 'text-orange-400' :
                  r.score >= 175 ? 'text-yellow-400' :
                  r.score >= 150 ? 'text-purple-400' : 'text-blue-400'
                }`}>
                  {getGrade(r.score)}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {r.echoes.map(echo => (
                  <EchoCard key={echo.id} echo={echo} calc={calc} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
