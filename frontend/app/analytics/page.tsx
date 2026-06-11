'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, TrendingUp, TrendingDown, Minus, RefreshCw, Clock, Zap, Target, Activity, Radio } from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, AreaChart, Area, CartesianGrid
} from 'recharts'
import TaskModal from '@/components/TaskModal'
import NotificationBell from '../../components/NotificationBell'
import { getAPIUrl } from '@/components/dateUtils'
import { apiFetch } from '../../lib/api'
import { useAuth } from '@/lib/AuthContext'

const API = getAPIUrl()

const CAT_COLORS: Record<string, string> = {
  Development: '#3b82f6',
  Health:      '#22c55e',
  Mindset:     '#a855f7',
  Routine:     '#f97316',
  Others:      '#71717a',
}

// ── Sparkline mini component ──────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1)
  const w = 80, h = 28
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - (v / max) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" opacity={0.8} />
    </svg>
  )
}

// ── Productivity score arc ────────────────────────────────────────────────────
function ScoreArc({ score }: { score: number }) {
  const r = 52, cx = 64, cy = 68
  const arc = (2 * Math.PI * r * 0.75)
  const filled = (score / 100) * arc
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f97316' : '#ef4444'
  return (
    <svg width="128" height="80" viewBox="0 0 128 80">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#27272a" strokeWidth="10"
        strokeDasharray={`${arc} ${2*Math.PI*r}`} strokeDashoffset={-(2*Math.PI*r*0.125)}
        strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${filled} ${2*Math.PI*r}`} strokeDashoffset={-(2*Math.PI*r*0.125)}
        strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#f4f4f5" fontSize="22" fontWeight="700">{score}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#71717a" fontSize="9" letterSpacing="1">SCORE</text>
    </svg>
  )
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-2xl">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<{
    kpi: { todo: number; in_progress: number; done: number }
    categories: { name: string; value: number }[]
  }>({ kpi: { todo: 0, in_progress: 0, done: 0 }, categories: [] })

  const [today, setToday] = useState<{ tasks: any[]; total: number; done: number; rate: number } | null>(null)
  const [trends, setTrends] = useState<{ date: string; completed: number; total: number }[]>([])
  const [breakdown, setBreakdown] = useState<{ category: string; total: number; done: number; rate: number }[]>([])
  const [isModalOpen, setModalOpen] = useState(false)
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState(true)

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fetchAll = useCallback(async () => {
    try {
      const [m, t, tr, b] = await Promise.all([
        apiFetch(`/api/dashboard/metrics`).then(r => r.json()),
        apiFetch(`/api/tasks/today`).then(r => r.json()),
        apiFetch(`/api/analytics/trends`).then(r => r.json()),
        apiFetch(`/api/analytics/category-breakdown`).then(r => r.json()),
      ])
      if (m.kpi) setMetrics(m)
      if (t.tasks) setToday(t)
      if (Array.isArray(tr)) setTrends(tr)
      if (Array.isArray(b)) setBreakdown(b)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Derived
  const total = metrics.kpi.todo + metrics.kpi.in_progress + metrics.kpi.done
  const productivityScore = total > 0 ? Math.round((metrics.kpi.done / total) * 100) : 0
  const last7 = trends.slice(-7)

  // Radar data
  const radarData = breakdown.map(b => ({ subject: (b.category || 'Oth').slice(0, 3), value: b.rate, fullMark: 100 }))

  // KPI delta mock (in real app: compare to previous week)
  const kpiCards = [
    { label: 'To-Do',       val: metrics.kpi.todo,        color: '#71717a', spark: [2,3,1,4,2,3,metrics.kpi.todo],        trend: 0 },
    { label: 'In Progress', val: metrics.kpi.in_progress, color: '#f97316', spark: [1,2,3,2,4,3,metrics.kpi.in_progress], trend: 1 },
    { label: 'Done',        val: metrics.kpi.done,        color: '#22c55e', spark: [3,4,5,6,5,7,metrics.kpi.done],        trend: 1 },
    { label: 'Total',       val: total,                   color: '#3b82f6', spark: [5,6,7,8,9,10,total],                  trend: 1 },
  ]

  return (
    <div className="space-y-6 relative">
      {/* ── Header ── */}
      <div className="flex items-start justify-between border-b border-zinc-900/60 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <Radio size={16} className="text-amber-500 animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 font-mono uppercase">{user ? `${user.name.split(' ')[0]}'s PERFORMANCE` : 'PERFORMANCE DASHBOARD'}</h1>
          </div>
          <p className="text-xs text-zinc-500 font-mono ml-7">
            {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            <span className="ml-3 text-accent-dev tabular-nums font-semibold">{now.toLocaleTimeString()}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchAll} className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-650 transition">
            <RefreshCw size={14} className="animate-spin-slow" />
          </button>
          <button onClick={() => setModalOpen(true)}
            className="bg-accent-dev/10 border border-accent-dev/30 text-accent-dev px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-accent-dev/20 transition font-mono">
            <Plus size={16} /> NEW TASK
          </button>
        </div>
      </div>

      {/* ── KPI Sparkline Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map(k => (
          <div key={k.label}
            className="cinematic-panel border border-zinc-800/40 rounded-xl p-5 hover:border-zinc-700/80 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold text-zinc-500 tracking-widest uppercase">{k.label}</span>
              {k.trend === 1 ? <TrendingUp size={12} className="text-emerald-400" />
               : k.trend === -1 ? <TrendingDown size={12} className="text-rose-400" />
               : <Minus size={12} className="text-zinc-600" />}
            </div>
            <p className="text-3xl font-bold font-mono text-zinc-100">{loading ? '—' : k.val}</p>
            <div className="mt-3 opacity-50 group-hover:opacity-100 transition-opacity">
              <Sparkline data={k.spark} color={k.color} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Score + Today Feed + 7-day bar ── */}
      <div className="grid grid-cols-12 gap-6">
        {/* Productivity Score */}
        <div className="col-span-12 md:col-span-3 cinematic-panel border border-zinc-800/40 rounded-xl p-5 flex flex-col items-center justify-center">
          <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-4">Productivity Score</p>
          <ScoreArc score={productivityScore} />
          <p className="text-xs text-zinc-400 mt-4 text-center font-mono">
            {productivityScore >= 70 ? '🟢 ON TRACK' : productivityScore >= 40 ? '🟡 BUILDING' : '🔴 ACTION_REQUIRED'}
          </p>
        </div>

        {/* Today's Task Feed */}
        <div className="col-span-12 md:col-span-4 cinematic-panel border border-zinc-800/40 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-accent-routine" />
                <span className="text-[10px] font-mono text-zinc-400 tracking-widest uppercase">Today's Focus</span>
              </div>
              {today && (
                <span className="text-xs font-mono text-accent-health font-bold">
                  {today.done}/{today.total} <span className="text-zinc-550 font-normal">done</span>
                </span>
              )}
            </div>
            {/* Progress bar */}
            {today && today.total > 0 && (
              <div className="w-full h-1 bg-zinc-950 rounded-full mb-4 overflow-hidden border border-zinc-900/60">
                <div className="h-full bg-accent-health rounded-full transition-all duration-750"
                  style={{ width: `${today.rate}%` }} />
              </div>
            )}
            <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
              {today?.tasks.length === 0 && (
                <p className="text-xs text-zinc-600 font-mono text-center py-8">// ORBIT_CLEAR //</p>
              )}
              {today?.tasks.slice(0, 6).map((t: any) => (
                <div key={t._id} className="flex items-center gap-2.5 py-2 border-b border-zinc-900/45">
                  <div className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: CAT_COLORS[t.category] ?? '#71717a' }} />
                  <span className={`text-xs flex-1 truncate font-mono ${t.status === 'Done' ? 'line-through text-zinc-650' : 'text-zinc-300'}`}>
                    {t.title}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border ${
                    t.status === 'Done' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    t.status === 'In Progress' ? 'bg-orange-500/10 text-orange-450 border-orange-550/20' :
                    'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 7-day bar chart */}
        <div className="col-span-12 md:col-span-5 cinematic-panel border border-zinc-800/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={13} className="text-accent-dev" />
            <span className="text-[10px] font-mono text-zinc-400 tracking-widest uppercase">7-Day Completion</span>
          </div>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={last7} barGap={2}>
                <CartesianGrid vertical={false} stroke="#1f1f23" strokeDasharray="3 3" />
                <XAxis dataKey="date"
                  tickFormatter={d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                  tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }}
                  axisLine={false} tickLine={false} width={20} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="total" name="Total" fill="#18181b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="completed" name="Done" fill="#38bdf8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Row 3: 30-day trend + Pie + Radar ── */}
      <div className="grid grid-cols-12 gap-6">
        {/* 30-day area trend */}
        <div className="col-span-12 lg:col-span-6 cinematic-panel border border-zinc-800/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={13} className="text-accent-health" />
            <span className="text-[10px] font-mono text-zinc-400 tracking-widest uppercase">30-Day Trend</span>
          </div>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={trends} margin={{ left: -20, right: 4 }}>
                <defs>
                  <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1f1f23" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date"
                  tickFormatter={(d, i) => i % 6 === 0 ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase() : ''}
                  tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }}
                  axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="completed" name="Completed"
                  stroke="#38bdf8" strokeWidth={2} fill="url(#gDone)" dot={false}
                  activeDot={{ r: 3, fill: '#38bdf8', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 cinematic-panel border border-zinc-800/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target size={13} className="text-accent-mind" />
            <span className="text-[10px] font-mono text-zinc-400 tracking-widest uppercase">Category Split</span>
          </div>
          {metrics.categories.length > 0 ? (
            <>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie data={metrics.categories} dataKey="value" nameKey="name"
                      innerRadius={35} outerRadius={52} paddingAngle={3}>
                      {metrics.categories.map((e, i) => (
                        <Cell key={i} fill={CAT_COLORS[e.name || 'Others']} stroke="#030305" strokeWidth={1} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2 overflow-y-auto max-h-24 scrollbar-thin">
                {metrics.categories.map((c, i) => (
                  <div key={c.name || i} className="flex items-center justify-between text-[10px] font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[c.name || 'Others'] }} />
                      <span className="text-zinc-400">{(c.name || 'Others').toUpperCase()}</span>
                    </span>
                    <span className="text-zinc-500 font-bold">{c.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
             <div className="h-32 flex items-center justify-center">
               <p className="text-zinc-650 text-xs font-mono animate-pulse">// LOADING //</p>
             </div>
          )}
        </div>

        {/* Radar */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 cinematic-panel border border-zinc-800/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={13} className="text-accent-routine" />
            <span className="text-[10px] font-mono text-zinc-400 tracking-widest uppercase">Completion Radar</span>
          </div>
          {radarData.length > 0 ? (
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <RadarChart data={radarData} margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
                  <PolarGrid stroke="#1f1f23" />
                  <PolarAngleAxis dataKey="subject"
                    tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }} />
                  <Radar name="Rate" dataKey="value" stroke="#38bdf8"
                    fill="#38bdf8" fillOpacity={0.12} strokeWidth={1.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center">
              <p className="text-zinc-650 text-xs font-mono animate-pulse">// LOADING //</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && <TaskModal onClose={() => { setModalOpen(false); fetchAll() }} />}
    </div>
  )
}
