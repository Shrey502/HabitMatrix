'use client'
import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Circle, Clock, ChevronLeft, ChevronRight, Bell, Radio, Calendar } from 'lucide-react'
import { getLocalISODate, getAPIUrl } from '@/components/dateUtils'
import { apiFetch } from "@/lib/api";

const API = getAPIUrl()

const CATEGORY_COLORS: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  Development: { text: 'text-accent-dev',    bg: 'bg-accent-dev/10',    border: 'border-accent-dev/20', glow: 'group-hover:shadow-[0_0_15px_rgba(56,189,248,0.15)] group-hover:border-accent-dev/40' },
  Health:      { text: 'text-accent-health', bg: 'bg-accent-health/10', border: 'border-accent-health/20', glow: 'group-hover:shadow-[0_0_15px_rgba(52,211,153,0.15)] group-hover:border-accent-health/40' },
  Mindset:     { text: 'text-accent-mind',   bg: 'bg-accent-mind/10',   border: 'border-accent-mind/20', glow: 'group-hover:shadow-[0_0_15px_rgba(129,140,248,0.15)] group-hover:border-accent-mind/40' },
  Routine:     { text: 'text-accent-routine', bg: 'bg-accent-routine/10', border: 'border-accent-routine/20', glow: 'group-hover:shadow-[0_0_15px_rgba(251,191,36,0.15)] group-hover:border-accent-routine/40' },
  Others:      { text: 'text-zinc-400',      bg: 'bg-zinc-800/50',      border: 'border-zinc-750/30', glow: 'group-hover:shadow-[0_0_15px_rgba(161,161,170,0.1)] group-hover:border-zinc-600' },
}

// Generate the Mon–Sun for a given ISO week offset from today
function getWeekDates(offset = 0) {
  const today = new Date()
  const dow = today.getDay() === 0 ? 7 : today.getDay() // 1=Mon
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow - 1) + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function toISO(d: Date) { return getLocalISODate(d) }

function DayHealthBar({ rate }: { rate: number }) {
  const color = rate >= 80 ? '#34d399' : rate >= 50 ? '#fbbf24' : rate > 0 ? '#f43f5e' : '#27272a'
  return (
    <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden mt-2 border border-zinc-800 shadow-inner">
      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${rate}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}80` }} />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'Done':        'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_8px_rgba(52,211,153,0.2)]',
    'In Progress': 'text-orange-400 bg-orange-500/10 border-orange-500/30 shadow-[0_0_8px_rgba(251,146,60,0.2)]',
    'To-Do':       'text-zinc-500 bg-zinc-900 border-zinc-800/80',
  }
  return (
    <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono border transition-all duration-300 ${map[status] ?? ''}`}>
      {status === 'In Progress' ? 'IN PROG' : status.toUpperCase()}
    </span>
  )
}

export default function WeeklyBoard() {
  const [tasks, setTasks] = useState<any[]>([])
  const [summary, setSummary] = useState<Record<string, { total: number; done: number; rate: number }>>({})
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notifTask, setNotifTask] = useState<string | null>(null)
  const [notifTime, setNotifTime] = useState('')

  const weekDates = getWeekDates(weekOffset)
  const startDate = toISO(weekDates[0])
  const endDate   = toISO(weekDates[6])

  const fetchWeek = useCallback(async () => {
    setLoading(true)
    try {
      const [t, s] = await Promise.all([
        apiFetch(`${API}/api/tasks/weekly?start_date=${startDate}&end_date=${endDate}`).then(r => r.json()),
        apiFetch(`${API}/api/tasks/weekly-summary?start_date=${startDate}&end_date=${endDate}`).then(r => r.json()),
      ])
      setTasks(Array.isArray(t) ? t : [])
      setSummary(s ?? {})
    } catch (e) {
      console.error(e)
      setTasks([])
    } finally { setLoading(false) }
  }, [startDate, endDate])

  useEffect(() => { fetchWeek() }, [fetchWeek])

  const cycleStatus = async (id: string, current: string) => {
    const next = current === 'To-Do' ? 'In Progress' : current === 'In Progress' ? 'Done' : 'To-Do'
    await apiFetch(`${API}/api/tasks/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next })
    })
    setTasks(prev => prev.map(t => t._id === id ? { ...t, status: next } : t))
    // update local summary
    setSummary(prev => {
      const d = toISO(new Date(tasks.find(t => t._id === id)?.date ?? ''))
      if (!prev[d]) return prev
      const wasDone = current === 'Done'
      const isDone  = next === 'Done'
      const delta   = isDone ? 1 : wasDone ? -1 : 0
      const newDone = Math.max(0, (prev[d].done ?? 0) + delta)
      const total   = prev[d].total ?? 1
      return { ...prev, [d]: { ...prev[d], done: newDone, rate: Math.round((newDone / total) * 100) } }
    })
  }

  const scheduleNotif = async () => {
    if (!notifTask || !notifTime) return
    const task = tasks.find(t => t._id === notifTask)
    if (!task) return
    await apiFetch(`${API}/api/notifications/schedule`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: notifTask, title: task.title, remind_at: new Date(notifTime).toISOString() })
    })
    setNotifTask(null)
    setNotifTime('')
  }

  const today = toISO(new Date())
  const isCurrentWeek = weekOffset === 0

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <Radio size={18} className="text-amber-500 animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            <h1 className="text-3xl font-extrabold font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400 uppercase">
              WEEKLY COMMAND
            </h1>
            {isCurrentWeek && (
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.2)]">
                LIVE_FEED
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-400 font-medium mt-1.5 flex items-center gap-2">
            <span>{weekDates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
            <span className="text-zinc-600">—</span>
            <span>{weekDates[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setWeekOffset(w => w - 1)}
            className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-600 transition-all duration-300 hover:shadow-lg">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setWeekOffset(0)} disabled={isCurrentWeek}
            className="text-xs font-bold font-mono px-4 py-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 uppercase tracking-widest shadow-sm">
            Current Orbit
          </button>
          <button onClick={() => setWeekOffset(w => w + 1)}
            className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-600 transition-all duration-300 hover:shadow-lg">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Week overview bar */}
      <div className="grid grid-cols-7 gap-4 shrink-0">
        {weekDates.map(d => {
          const iso   = toISO(d)
          const s     = summary[iso]
          const isToday = iso === today
          return (
            <div key={iso} className={`relative rounded-2xl p-4 border transition-all duration-500 overflow-hidden ${
              isToday 
                ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-zinc-950 shadow-[0_0_20px_rgba(251,191,36,0.1)] transform -translate-y-1' 
                : 'border-zinc-800/50 bg-zinc-900/40 hover:bg-zinc-800/40 hover:border-zinc-700'
            }`}>
              {isToday && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/20 blur-2xl rounded-full -mr-8 -mt-8 pointer-events-none" />
              )}
              <div className="relative z-10 flex flex-col items-center">
                <p className={`text-[10px] font-bold font-mono uppercase tracking-widest mb-1 ${isToday ? 'text-amber-400 drop-shadow-md' : 'text-zinc-500'}`}>
                  {d.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <p className={`text-2xl font-black font-sans tracking-tighter ${isToday ? 'text-white' : 'text-zinc-300'}`}>
                  {d.getDate()}
                </p>
                <div className="w-full mt-2 pt-2 border-t border-zinc-800/50">
                  <p className="text-[10px] font-mono text-zinc-400 text-center flex justify-between px-1">
                    <span>{s?.done ?? 0}</span>
                    <span className="text-zinc-600">/</span>
                    <span>{s?.total ?? 0}</span>
                  </p>
                  <DayHealthBar rate={s?.rate ?? 0} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Kanban columns wrapper - Fixed height to enable scrolling for tasks! */}
      <div className="flex-1 min-h-0 overflow-hidden mt-2 pb-2">
        {loading ? (
          <div className="flex gap-5 h-full overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="min-w-[280px] flex-1 h-full bg-zinc-900/30 rounded-2xl border border-zinc-800/40 animate-pulse backdrop-blur-sm" />
            ))}
          </div>
        ) : (
          <div className="flex gap-5 h-full overflow-x-auto overflow-y-hidden pb-4 snap-x">
            {weekDates.map(d => {
              const iso     = toISO(d)
              const isToday = iso === today
              const dayTasks = tasks.filter(t => t.date === iso)
              const s        = summary[iso]

              return (
                <div key={iso} className={`snap-center min-w-[290px] w-[290px] flex-shrink-0 rounded-2xl border flex flex-col overflow-hidden transition-all duration-500 ${
                  isToday 
                    ? 'border-amber-500/30 bg-zinc-950/90 shadow-[0_8px_30px_rgba(251,191,36,0.08)]' 
                    : 'border-zinc-800/60 bg-zinc-950/60 backdrop-blur-xl'
                }`}>
                  
                  {/* Column Header */}
                  <div className={`p-4 border-b shrink-0 bg-gradient-to-b ${isToday ? 'from-amber-500/5 to-transparent border-amber-500/20' : 'from-zinc-900/50 to-transparent border-zinc-800/80'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black tracking-widest uppercase ${isToday ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'text-zinc-300'}`}>
                          {d.toLocaleDateString('en-US', { weekday: 'long' })}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${isToday ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
                        {d.getDate()}
                      </span>
                    </div>
                    {/* Completion Mini-HUD */}
                    {s && s.total > 0 && (
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1.5 font-medium">
                          <span>PROGRESS</span>
                          <span className={s.rate === 100 ? 'text-emerald-400 font-bold drop-shadow-sm' : s.rate > 50 ? 'text-amber-400 font-bold' : 'text-zinc-400'}>
                            {s.rate}%
                          </span>
                        </div>
                        <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                          <div className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ 
                              width: `${s.rate}%`, 
                              backgroundColor: s.rate === 100 ? '#34d399' : s.rate > 50 ? '#fbbf24' : '#71717a',
                              boxShadow: `0 0 10px ${s.rate === 100 ? '#34d399' : s.rate > 50 ? '#fbbf24' : '#71717a'}`
                            }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Scrollable Tasks Container */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    {dayTasks.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-40 opacity-50">
                        <div className="w-8 h-8 rounded-full border border-dashed border-zinc-600 flex items-center justify-center mb-2">
                          <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">// NO_TASKS //</p>
                      </div>
                    )}
                    {dayTasks.map(task => {
                      const cat = CATEGORY_COLORS[task.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.Others
                      return (
                        <div key={task._id}
                          className={`group relative rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-900/80 ${cat.glow}
                            ${task.status === 'Done' ? 'opacity-50 grayscale hover:grayscale-0' : ''}`}>
                          
                          {/* Accent left border */}
                          <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full opacity-50 group-hover:opacity-100 transition-opacity ${cat.bg.replace('/10', '')}`} />

                          {/* Category + Source */}
                          <div className="flex items-center justify-between gap-1.5 mb-2.5 pl-2">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold tracking-wider border ${cat.bg} ${cat.text} ${cat.border}`}>
                              {task.category?.toUpperCase()}
                            </span>
                            {task.source === 'google_calendar' && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                                <Calendar size={10} /> GCAL
                              </span>
                            )}
                          </div>
                          
                          {/* Title */}
                          <p className={`text-sm font-semibold leading-snug mb-3 pl-2 ${
                            task.status === 'Done' ? 'line-through text-zinc-500' : 'text-slate-100 group-hover:text-white transition-colors'}`}>
                            {task.title}
                          </p>
                          
                          {/* Time & Duration */}
                          {task.time && (
                            <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5 mb-3 pl-2 bg-zinc-950/50 w-fit px-2 py-1 rounded-md border border-zinc-800/50">
                              <Clock size={12} className={task.status === 'Done' ? 'text-zinc-600' : 'text-amber-500/70'} />
                              <span className="font-medium text-zinc-300">{task.time}</span>
                              {task.duration && <span className="text-zinc-500 ml-1">({task.duration}m)</span>}
                            </div>
                          )}
                          
                          {/* Action row */}
                          <div className="flex items-center justify-between border-t border-zinc-800/60 pt-3 mt-1 pl-2">
                            <StatusBadge status={task.status} />
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 duration-300">
                              <button onClick={() => setNotifTask(task._id)}
                                className="p-1.5 rounded-md text-zinc-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors" title="Set Reminder">
                                <Bell size={14} />
                              </button>
                              <button onClick={() => cycleStatus(task._id, task.status)}
                                className="p-1.5 rounded-md text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors" title="Toggle Status">
                                {task.status === 'Done'
                                  ? <CheckCircle2 size={16} className="text-emerald-500 shadow-emerald-500/50 drop-shadow-md" />
                                  : <Circle size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Notification scheduler modal */}
      {notifTask && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md transition-opacity">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-7 w-96 shadow-[0_0_50px_rgba(0,0,0,0.5)] transform scale-100 transition-transform">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg">
                <Bell size={18} />
              </div>
              <h3 className="font-mono font-bold text-zinc-100 text-lg">SET REMINDER</h3>
            </div>
            <p className="text-sm text-zinc-400 font-medium mb-6 truncate border-l-2 border-zinc-700 pl-3 py-1 bg-zinc-800/30 rounded-r-md">
              {tasks.find(t => t._id === notifTask)?.title}
            </p>
            
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 font-bold">Time of Alert</label>
            <input type="datetime-local" value={notifTime} onChange={e => setNotifTime(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 mb-6 transition-all [color-scheme:dark] shadow-inner" />
            
            <div className="flex gap-3">
              <button onClick={() => setNotifTask(null)}
                className="flex-1 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 text-xs font-bold font-mono hover:bg-zinc-700 hover:text-white transition-all">
                ABORT
              </button>
              <button onClick={scheduleNotif}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-black text-xs font-black font-mono hover:bg-amber-400 hover:shadow-[0_0_20px_rgba(251,191,36,0.4)] transition-all transform hover:-translate-y-0.5">
                ENGAGE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
