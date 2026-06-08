'use client'
import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Flame, Calendar, BarChart2, Radio, Filter, Clock, X, CheckCircle2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { getLocalISODate, getAPIUrl } from '@/components/dateUtils'
import { motion, AnimatePresence } from 'framer-motion'

const API = getAPIUrl()
const YEAR = new Date().getFullYear()

function generateYearDays(year: number) {
  const days: string[] = []
  const start = new Date(`${year}-01-01`)
  const end   = new Date(`${year}-12-31`)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1))
    days.push(d.toISOString().split('T')[0])
  return days
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getMonthOffsets(year: number) {
  return MONTHS.map((m, i) => {
    const first = new Date(year, i, 1)
    const dayOfYear = Math.floor((first.getTime() - new Date(year, 0, 1).getTime()) / 86400000)
    const startDow = new Date(`${year}-01-01`).getDay()
    return { label: m, col: Math.floor((dayOfYear + startDow) / 7) }
  })
}

const BADGE_COLORS = {
  Development: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Health:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Mindset:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Routine:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Others:      'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  Auto:        'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
}

interface CompletedTask {
  _id: string;
  title: string;
  category: string;
  date: string;
  duration: number | null;
}

export default function ContributionGrid() {
  const [allTasks, setAllTasks] = useState<CompletedTask[]>([])
  const [allJournals, setAllJournals] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'count' | 'time'>('count')
  const [categoryFilter, setCategoryFilter] = useState('All')
  
  const [tooltip, setTooltip]     = useState<{ date: string; value: number; x: number; y: number } | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    fetch(`${API}/api/analytics/grid?year=${YEAR}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setAllTasks(Array.isArray(d) ? d : []))
      .catch(() => setAllTasks([]))
      .finally(() => setLoading(false))

    fetch(`${API}/api/journal`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setAllJournals(Array.isArray(d) ? d : []))
      .catch(() => setAllJournals([]))
  }, [])

  // Filter tasks based on selected category
  const filteredTasks = allTasks.filter(t => categoryFilter === 'All' || t.category === categoryFilter)

  // Compute grid data mapping: date -> value (count or time in hours)
  const gridData = filteredTasks.reduce((acc, t) => {
    if (viewMode === 'count') {
      acc[t.date] = (acc[t.date] || 0) + 1
    } else {
      const hours = (t.duration || 0) / 60
      acc[t.date] = (acc[t.date] || 0) + hours
    }
    return acc
  }, {} as Record<string, number>)

  const getDotStyle = (val: number) => {
    if (!val || val === 0) return { size: '4px', bg: '#1c1c1f', glow: 'none' }
    if (viewMode === 'count') {
      if (val === 1) return { size: '6px', bg: '#1e3a5f', glow: 'none' }
      if (val <= 3)  return { size: '8px', bg: '#1d4ed8', glow: '0 0 8px rgba(29, 78, 216, 0.5)' }
      if (val <= 6)  return { size: '10px', bg: '#3b82f6', glow: '0 0 12px rgba(59, 130, 246, 0.7)' }
      return { size: '12px', bg: '#7dd3fc', glow: '0 0 16px rgba(125, 211, 252, 0.9)' }
    } else {
      if (val <= 0.5) return { size: '6px', bg: '#1e3a5f', glow: 'none' }
      if (val <= 2)   return { size: '8px', bg: '#1d4ed8', glow: '0 0 8px rgba(29, 78, 216, 0.5)' }
      if (val <= 4)   return { size: '10px', bg: '#3b82f6', glow: '0 0 12px rgba(59, 130, 246, 0.7)' }
      return { size: '12px', bg: '#7dd3fc', glow: '0 0 16px rgba(125, 211, 252, 0.9)' }
    }
  }

  const getIntensityLabel = (val: number): string => {
    if (!val || val === 0) return 'No activity'
    if (viewMode === 'count') {
      return val === 1 ? '1 task' : `${val} tasks`
    } else {
      return `${val.toFixed(1)} hours`
    }
  }

  const days = generateYearDays(YEAR)
  const monthOffsets = getMonthOffsets(YEAR)

  const startDow = new Date(`${YEAR}-01-01`).getDay()
  const leadingEmpty = startDow === 0 ? 6 : startDow - 1

  const allCells = [...Array(leadingEmpty).fill(null), ...days]
  const totalWeeks = Math.ceil(allCells.length / 7)

  // ── Stats ────────────────────────────────────────────────────────────
  const totalValue  = Object.values(gridData).reduce((a, b) => a + b, 0)
  const activeDays  = Object.values(gridData).filter(v => v > 0).length
  const peakDay     = Object.entries(gridData).reduce((a, b) => b[1] > a[1] ? b : a, ['—', 0])
  const avgPerActive = activeDays > 0 ? (totalValue / activeDays).toFixed(1) : '0'

  // Month totals
  const monthTotals = MONTHS.map((_, mi) => {
    const prefix = `${YEAR}-${String(mi + 1).padStart(2, '0')}-`
    return Object.entries(gridData).filter(([k]) => k.startsWith(prefix)).reduce((s, [, v]) => s + v, 0)
  })
  const maxMonth = Math.max(...monthTotals, 1)

  // Streak
  let currentStreak = 0
  const todayStr = getLocalISODate()
  const check = new Date()
  if (!gridData[todayStr] || gridData[todayStr] === 0) {
    check.setDate(check.getDate() - 1)
  }
  while (gridData[getLocalISODate(check)] && gridData[getLocalISODate(check)] > 0) {
    currentStreak++
    check.setDate(check.getDate() - 1)
  }

  const activeDateTasks = selectedDate ? filteredTasks.filter(t => t.date === selectedDate) : []
  const activeJournal = selectedDate ? allJournals.find(j => j.date === selectedDate) : null

  const areaData = MONTHS.map((m, i) => ({
    name: m,
    value: monthTotals[i]
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value
      const idx = MONTHS.indexOf(label)
      let growthStr = ''
      let isUp = false
      let isDown = false
      if (idx > 0) {
        const prev = monthTotals[idx - 1]
        if (prev > 0) {
          const diff = ((val - prev) / prev) * 100
          isUp = diff > 0
          isDown = diff < 0
          if (isUp || isDown) growthStr = `${isUp ? '+' : ''}${diff.toFixed(0)}% vs ${MONTHS[idx-1]}`
        } else if (prev === 0 && val > 0) {
          isUp = true
          growthStr = `+100% vs ${MONTHS[idx-1]}`
        }
      }
      return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 shadow-2xl font-mono text-xs">
          <p className="text-zinc-500 font-bold mb-1 uppercase">{label}</p>
          <p className="text-sky-400 font-bold text-lg mb-1">{viewMode === 'count' ? val : val.toFixed(1)} {viewMode === 'count' ? 'Tasks' : 'Hours'}</p>
          {growthStr && (
            <div className={`flex items-center gap-1 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span className="font-bold">{growthStr}</span>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between border-b border-zinc-900/60 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Radio size={16} className="text-amber-500 animate-pulse" />
            <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100 uppercase">YEARLY CONTRIBUTION GRID</h1>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-1">{YEAR} // telemetry metrics for task execution heatmap</p>
        </div>
        
        <div className="flex items-center gap-3 bg-zinc-950/80 p-2 rounded-xl border border-zinc-800/60 shadow-xl">
          {/* Time vs Count Toggle */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('count')}
              className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-md transition-all ${viewMode === 'count' ? 'bg-amber-500/20 text-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.1)]' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Task Count
            </button>
            <button 
              onClick={() => setViewMode('time')}
              className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-md transition-all flex items-center gap-1.5 ${viewMode === 'time' ? 'bg-amber-500/20 text-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.1)]' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Clock size={10} /> Focus Time
            </button>
          </div>
          
          <div className="w-px h-6 bg-zinc-800" />
          
          {/* Category Filter */}
          <div className="relative flex items-center">
            <Filter size={12} className="absolute left-2.5 text-zinc-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-mono py-1.5 pl-8 pr-8 rounded-lg focus:outline-none transition-colors"
            >
              <option value="All">All Categories</option>
              <option value="Development">Development</option>
              <option value="Health">Health</option>
              <option value="Mindset">Mindset</option>
              <option value="Routine">Routine</option>
              <option value="Others">Others</option>
            </select>
          </div>
        </div>
      </div>

      {/* Streak Banner */}
      {currentStreak > 0 && (
        <div className="flex items-center justify-between bg-orange-500/5 border border-orange-500/20 p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center animate-pulse">
              <Flame size={20} className="text-orange-500" />
            </div>
            <div>
              <p className="text-zinc-100 font-bold font-mono uppercase tracking-wider">{currentStreak}-Day Streak Active!</p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase">Keep the momentum going.</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: viewMode === 'count' ? 'Total Completed' : 'Total Hours', val: viewMode === 'count' ? totalValue : totalValue.toFixed(1), icon: BarChart2, color: 'text-accent-dev', panel: 'hud-panel-dev' },
          { label: 'Active Days',     val: activeDays, icon: Calendar,  color: 'text-accent-health', panel: 'hud-panel-health' },
          { label: viewMode === 'count' ? 'Avg Tasks / Day' : 'Avg Hours / Day', val: avgPerActive, icon: TrendingUp, color: 'text-accent-mind', panel: 'hud-panel-mind' },
          { label: viewMode === 'count' ? 'Peak Day Count' : 'Peak Hours Day',  val: viewMode === 'count' ? peakDay[1] : peakDay[1].toFixed(1), icon: Flame,     color: 'text-accent-routine', panel: 'hud-panel-routine' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`cinematic-panel border border-zinc-800/40 rounded-xl p-5 ${s.panel}`}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={14} className={s.color} />
                <span className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">{s.label}</span>
              </div>
              <p className="text-3xl font-bold font-mono text-zinc-100">{loading ? '—' : s.val}</p>
            </div>
          )
        })}
      </div>

      {/* Sleek Area Chart for Monthly Momentum */}
      <div className="cinematic-panel border border-zinc-800/40 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-accent-dev" />
            <span className="text-[10px] font-mono text-zinc-400 tracking-widest uppercase">Monthly Momentum</span>
          </div>
        </div>
        <div className="h-[200px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" activeDot={{ r: 6, fill: '#38bdf8', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* The heatmap grid - REDESIGNED DOT MATRIX */}
      <div className="cinematic-panel border border-zinc-800/40 rounded-xl p-6 overflow-x-auto scrollbar-thin">
        <div className="relative" style={{ minWidth: `${totalWeeks * 16}px` }}>
          {/* Month labels */}
          <div className="flex mb-4" style={{ paddingLeft: '32px' }}>
            {monthOffsets.map(({ label, col }) => (
              <div key={label} className="absolute text-[9px] font-mono text-zinc-550 tracking-wider font-semibold"
                style={{ left: `${32 + col * 16}px` }}>
                {label.toUpperCase()}
              </div>
            ))}
          </div>

          <div className="flex mt-6">
            {/* Day labels */}
            <div className="flex flex-col gap-2 mr-3">
              {['M','T','W','T','F','S','S'].map((d, i) => (
                <div key={i} className="h-4 text-[9px] font-mono text-zinc-500 flex items-center font-bold">{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid gap-2" style={{
              gridTemplateRows: 'repeat(7, 16px)',
              gridTemplateColumns: `repeat(${totalWeeks}, 16px)`,
              gridAutoFlow: 'column',
            }}>
              {allCells.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="w-4 h-4" />
                const val = gridData[date] ?? 0
                const isToday = date === todayStr
                const style = getDotStyle(val)
                const isBubbling = val > 0
                // Generate a stable random delay based on date string so it doesn't flicker on re-renders
                const delay = isBubbling ? (date.charCodeAt(date.length - 1) % 4) + (date.charCodeAt(date.length - 2) % 10) * 0.1 : 0
                
                return (
                  <div key={date}
                    className="w-4 h-4 flex items-center justify-center"
                    onMouseEnter={e => {
                      const r = (e.target as HTMLElement).getBoundingClientRect()
                      setTooltip({ date, value: val, x: r.left, y: r.top })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => { if (val > 0) setSelectedDate(date) }}
                  >
                    <div 
                      className={`rounded-full transition-all duration-300 ${isToday ? 'ring-2 ring-amber-500 ring-offset-1 ring-offset-zinc-950' : ''} ${val > 0 ? 'cursor-pointer hover:!scale-150 animate-grid-bubble' : ''}`}
                      style={{ 
                        width: style.size, 
                        height: style.size, 
                        backgroundColor: style.bg,
                        boxShadow: style.glow,
                        animationDelay: `${delay}s`
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-3 mt-6 border-t border-zinc-900/60 pt-4">
            <span className="text-[9px] font-mono text-zinc-500 font-semibold uppercase">Less</span>
            {[
              { size: '4px', bg: '#1c1c1f', glow: 'none' },
              { size: '6px', bg: '#1e3a5f', glow: 'none' },
              { size: '8px', bg: '#1d4ed8', glow: '0 0 8px rgba(29, 78, 216, 0.5)' },
              { size: '10px', bg: '#3b82f6', glow: '0 0 12px rgba(59, 130, 246, 0.7)' },
              { size: '12px', bg: '#7dd3fc', glow: '0 0 16px rgba(125, 211, 252, 0.9)' }
            ].map((c, i) => (
              <div key={i} className="w-4 h-4 flex items-center justify-center">
                <div className="rounded-full" style={{ width: c.size, height: c.size, backgroundColor: c.bg, boxShadow: c.glow }} />
              </div>
            ))}
            <span className="text-[9px] font-mono text-zinc-500 font-semibold uppercase">More</span>
          </div>
        </div>
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-zinc-950 border border-zinc-800/90 rounded-lg px-3 py-2 text-xs font-mono shadow-2xl"
          style={{ left: tooltip.x + 16, top: tooltip.y - 56 }}>
          <p className="text-zinc-400 font-bold">{new Date(tooltip.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
          <p className="text-accent-dev font-bold mt-0.5">{getIntensityLabel(tooltip.value).toUpperCase()}</p>
        </div>
      )}

      {/* Drill-down Modal */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-md w-full relative overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 to-indigo-500" />
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold font-mono text-zinc-100 uppercase tracking-widest">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </h3>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase mt-1">
                    {activeDateTasks.length} Tasks Completed // {(activeDateTasks.reduce((a, t) => a + (t.duration || 0), 0) / 60).toFixed(1)} Hours
                  </p>
                </div>
                <button onClick={() => setSelectedDate(null)} className="p-2 hover:bg-zinc-900 rounded-lg transition-colors text-zinc-500 hover:text-zinc-300">
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto pr-2 space-y-4 flex-1 scrollbar-thin">
                
                {activeJournal && (
                  <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3 border-b border-indigo-500/20 pb-2">
                      <span className="text-[10px] font-mono text-indigo-400 tracking-widest uppercase">Captain's Log</span>
                    </div>
                    <div className="flex gap-4 mb-3">
                      <div>
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block">Mood</span>
                        <span className="text-sm font-bold font-mono text-zinc-200">{activeJournal.mood_score}/10</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block">Energy</span>
                        <span className="text-sm font-bold font-mono text-zinc-200">{activeJournal.energy_score}/10</span>
                      </div>
                    </div>
                    {activeJournal.tags && activeJournal.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {activeJournal.tags.map((t: string) => <span key={t} className="text-[9px] font-mono text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30">{t}</span>)}
                      </div>
                    )}
                    {activeJournal.reflection && (
                      <p className="text-xs font-mono text-zinc-400 italic border-l-2 border-indigo-500/50 pl-2">"{activeJournal.reflection}"</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-2">Executed Tasks</h4>
                {activeDateTasks.map(task => (
                  <div key={task._id} className="bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-lg flex flex-col gap-2 group hover:border-zinc-700 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <p className="text-sm font-semibold text-zinc-200 leading-tight group-hover:text-sky-300 transition-colors">{task.title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border ${BADGE_COLORS[task.category as keyof typeof BADGE_COLORS] || BADGE_COLORS.Others}`}>
                        {task.category.toUpperCase()}
                      </span>
                      {task.duration && (
                        <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                          <Clock size={10} /> {task.duration}m
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {activeDateTasks.length === 0 && <p className="text-[10px] font-mono text-zinc-600">No tasks recorded.</p>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
