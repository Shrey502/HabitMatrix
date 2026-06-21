'use client'
import { apiFetch } from '@/lib/api';
import { useState, useEffect, useRef } from 'react'
import { Plus, CheckCircle2, Circle, Clock, Calendar, Activity, ShieldCheck, Radio, Sparkles, Pencil, RefreshCw } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Sector, CartesianGrid } from 'recharts'
import dynamic from 'next/dynamic'
import PomodoroFocus from '@/components/PomodoroFocus'
import NotificationBell from '@/components/NotificationBell'
import { getLocalISODate, getAPIUrl } from '@/components/dateUtils'

const TaskModal = dynamic(() => import('@/components/TaskModal'), { ssr: false })
const DayManagerModal = dynamic(() => import('@/components/DayManagerModal'), { ssr: false })

import { COLORS, BADGE_COLORS } from '@/lib/constants'
import { getTaskTimeStatus, findFocusTask, getFocusQuote } from '@/lib/taskUtils'
import { useAuth } from '@/lib/AuthContext'
import RecoveryModal from '@/components/RecoveryModal'

const CustomPie = Pie as any;

export default function Dashboard() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<{ kpi: { todo: number, in_progress: number, done: number }, categories: { name: string, value: number }[] }>({
    kpi: { todo: 0, in_progress: 0, done: 0 }, categories: []
  })

  const [monthTasks, setMonthTasks] = useState<any[]>([])
  const [isTaskModalOpen, setTaskModalOpen] = useState(false)
  const [showWeeklyModal, setShowWeeklyModal] = useState(false)
  const [weeklyDeployedCount, setWeeklyDeployedCount] = useState(0)
  const [taskModalDate, setTaskModalDate] = useState<string | undefined>(undefined)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [activeTaskProgress, setActiveTaskProgress] = useState<{ id: string, progress: number, isActive: boolean } | null>(null)

  // Check in/out state
  const [systemStatus, setSystemStatus] = useState<string>('Checked_In')
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [missedTasks, setMissedTasks] = useState<any[]>([])

  // Day Manager Modal State
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // Interactive selected/hovered day state
  const [displayDate, setDisplayDate] = useState<string>('')
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null)
  const [minuteTick, setMinuteTick] = useState(0)

  useEffect(() => {
    setDisplayDate(getLocalISODate())
    const interval = setInterval(() => {
      setMinuteTick(t => t + 1)
    }, 30000) // Update every 30 seconds to refresh relative task time statuses
    return () => {
      clearInterval(interval)
    }
  }, [])

  // Generate Current Month Dates
  const getDaysInCurrentMonth = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return getLocalISODate(d);
    });
  }

  const monthDates = getDaysInCurrentMonth();

  const fetchDashboardData = async () => {
    // Deploy week routines first
    try {
      const deployRes = await apiFetch(`${getAPIUrl()}/api/routines/deploy-week`, { method: 'POST' });
      const deployData = await deployRes.json()
      if (deployData.deployed_count && deployData.deployed_count > 0) {
        setWeeklyDeployedCount(deployData.deployed_count)
        setShowWeeklyModal(true)
      }
    } catch (err) {
      console.error("Error deploying weekly routines", err);
    }

    try {
      // Fetch User Settings for Biological Date and System Status
      const settingsRes = await apiFetch(`${getAPIUrl()}/api/auth/me`)
      const settingsData = await settingsRes.json()
      const settings = settingsData.settings || {}

      const newStatus = settings.system_status || 'Checked_In'
      setSystemStatus(newStatus)

      const biologicalDate = settings.biological_date || getLocalISODate()
      setDisplayDate(biologicalDate)

      // Fetch KPI Metrics
      const metricsRes = await apiFetch(`${getAPIUrl()}/api/dashboard/metrics`)
      setMetrics(await metricsRes.json())

      // Fetch All Tasks for Current Month
      const startOfMonth = getDaysInCurrentMonth()[0]
      const endOfMonth = getDaysInCurrentMonth()[getDaysInCurrentMonth().length - 1]

      const tasksRes = await apiFetch(`${getAPIUrl()}/api/tasks/weekly?start_date=${startOfMonth}&end_date=${endOfMonth}`)
      setMonthTasks(await tasksRes.json())
    } catch (err) {
      console.error("Error fetching dashboard data", err)
    }
  };

  useEffect(() => {
    fetchDashboardData()
    setCurrentTime(new Date())
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // Update every second for live timers
    return () => {
      clearInterval(interval)
    }
  }, [])

  const focusData = findFocusTask(monthTasks, currentTime);

  useEffect(() => {
    // Handle Google Calendar Sync success param check safely on client side
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      const gcalSync = searchParams.get('gcal_sync')
      if (gcalSync === 'success') {
        const created = searchParams.get('created')
        const updated = searchParams.get('updated') || '0'
        const skipped = searchParams.get('skipped')
        const rescheduled = searchParams.get('rescheduled')
        alert(`Google Calendar Sync Successful!\nCreated: ${created}\nUpdated: ${updated}\nSkipped: ${skipped}\nRescheduled Conflicts: ${rescheduled || 0}`)
        // Clean URL params to prevent alert on refresh
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }

    // Listens for external refresh
    window.addEventListener('refresh_tasks', fetchDashboardData);
    return () => window.removeEventListener('refresh_tasks', fetchDashboardData);
  }, [])

  const handleCheckIn = async () => {
    try {
      const res = await apiFetch(`${getAPIUrl()}/api/auth/checkin`, { method: 'POST' })
      const data = await res.json()
      setSystemStatus('Checked_In')
      setDisplayDate(data.biological_date || getLocalISODate())

      // Check for missed tasks immediately
      const missedRes = await apiFetch(`${getAPIUrl()}/api/tasks/missed`)
      const missedData = await missedRes.json()
      if (missedData && missedData.length > 0) {
        setMissedTasks(missedData)
        setShowRecoveryModal(true)
      }

      fetchDashboardData()
    } catch (err) {
      alert("Error checking in")
    }
  }

  const handleCheckOut = async () => {
    try {
      await apiFetch(`${getAPIUrl()}/api/auth/checkout`, { method: 'POST' })
      setSystemStatus('Checked_Out')
    } catch (err) {
      alert("Error checking out")
    }
  }

  // Calculate intensity class based on total tasks for a day
  const getIntensityClass = (total: number, isHovered: boolean) => {
    if (total === 0) return 'bg-zinc-950 border border-zinc-900/60 text-zinc-600 hover:border-zinc-700'
    let bg = ''
    if (total <= 2) bg = 'bg-accent-dev/10 text-accent-dev border border-accent-dev/20 hover:border-accent-dev/50'
    else if (total <= 4) bg = 'bg-accent-dev/20 text-accent-dev border border-accent-dev/40 hover:border-accent-dev/70'
    else bg = 'bg-accent-dev/40 text-sky-200 border border-accent-dev/60 hover:border-accent-dev/90'

    if (isHovered) {
      return `${bg} ring-2 ring-accent-dev/30 shadow-[0_0_15px_rgba(56,189,248,0.2)]`
    }
    return bg
  }

  const toggleTaskStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Done' ? 'To-Do' : 'Done'
    const originalTasks = [...monthTasks]

    // Optimistic UI Update
    setMonthTasks(prev => prev.map(t => t._id === id ? { ...t, status: newStatus } : t))

    try {
      const res = await apiFetch(`${getAPIUrl()}/api/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error('Failed to update status')

      // Refresh KPIs after toggle
      const metricsData = await apiFetch(`${getAPIUrl()}/api/dashboard/metrics`).then(res => res.json())
      setMetrics(metricsData)
      window.dispatchEvent(new Event('refresh_tasks'))
    } catch (err) {
      console.error(err)
      setMonthTasks(originalTasks)
      alert('Failed to update task status. Reverting change.')
    }
  }

  // Local calculations for the selected/hovered display date
  const activeDate = displayDate || getLocalISODate()
  const displayTasks = monthTasks.filter(t => t.date === activeDate)

  const displayKPI = {
    todo: displayTasks.filter(t => t.status === 'To-Do').length,
    in_progress: displayTasks.filter(t => t.status === 'In Progress').length,
    done: displayTasks.filter(t => t.status === 'Done').length
  }

  const totalDisplay = displayTasks.length
  const completedDisplay = displayKPI.done

  const totalCompletionSum = displayTasks.reduce((acc, t) => {
    if (t.status === 'Done') return acc + 100
    if (activeTaskProgress && t._id === activeTaskProgress.id) return acc + activeTaskProgress.progress
    return acc
  }, 0)
  const displayCompletionRate = totalDisplay > 0 ? Math.round(totalCompletionSum / totalDisplay) : 0

  const categoriesList = ['Development', 'Health', 'Mindset', 'Routine', 'Others']
  const displayCategories = categoriesList.map(cat => {
    const catTasks = displayTasks.filter(t => t.category === cat)
    let completedFraction = 0
    let inProgressFraction = 0

    catTasks.forEach(t => {
      if (t.status === 'Done') {
        completedFraction += 1
      } else if (activeTaskProgress && t._id === activeTaskProgress.id) {
        const prog = activeTaskProgress.progress / 100
        completedFraction += prog
        inProgressFraction += (1 - prog)
      } else if (t.status === 'In Progress') {
        inProgressFraction += 1
      }
    })

    return {
      name: cat,
      value: catTasks.length,
      completed: Number(completedFraction.toFixed(2)),
      in_progress: Number(inProgressFraction.toFixed(2)),
      remaining: Number((catTasks.length - completedFraction - inProgressFraction).toFixed(2))
    }
  }).filter(c => c.value > 0)

  const renderActiveShape = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill } = props
    const RADIAN = Math.PI / 180
    // Explode shift: pull the hovered slice outward by 8px along the midAngle
    const sin = Math.sin(-RADIAN * midAngle)
    const cos = Math.cos(-RADIAN * midAngle)
    const mx = cx + 8 * cos
    const my = cy + 8 * sin

    return (
      <g>
        <Sector
          cx={mx}
          cy={my}
          innerRadius={innerRadius - 2}
          outerRadius={outerRadius + 8} // Zoom little
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          stroke="#030305"
          strokeWidth={2} // Boundary line
        />
      </g>
    )
  }

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const catColor = COLORS[data.name as keyof typeof COLORS] || '#71717a'
      return (
        <div className="bg-zinc-950 border border-zinc-800/80 p-3 rounded-lg shadow-xl text-xs font-mono">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catColor }} />
            <span className="font-bold text-zinc-100">{data.name.toUpperCase()}</span>
          </div>
          <p className="text-emerald-400">✓ Completed: {data.completed}</p>
          <p className="text-amber-400">▶ In Progress: {data.in_progress}</p>
          <p className="text-rose-400">✗ Remaining: {data.remaining}</p>
          <p className="text-zinc-500 mt-1">Total: {data.value} tasks</p>
        </div>
      )
    }
    return null
  }

  // Radial track calculations for circular gauge
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (displayCompletionRate / 100) * circumference

  return (
    <div className="space-y-6 relative pb-10">
      {/* HUD Header */}
      <div className="flex justify-between items-center border-b border-zinc-900/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Radio size={16} className="text-amber-500 animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight font-mono text-zinc-100 uppercase">
              {user ? `${user.name.split(' ')[0]}'s Telemetry` : "Endurance Telemetry"}
            </h1>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              SYSTEM_ACTIVE
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Productivity dashboard and daily task executor // station: ENDURANCE_49
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              fetchDashboardData()
            }}
            className="p-2 text-zinc-500 hover:text-sky-400 hover:bg-zinc-900 rounded-full transition-all duration-300"
            title="Refresh Dashboard"
          >
            <RefreshCw size={18} />
          </button>
          <NotificationBell />
          {systemStatus === 'Checked_In' ? (
            <button
              onClick={handleCheckOut}
              className="bg-rose-500/10 border border-rose-500/30 text-rose-500 px-5 py-2.5 rounded-lg font-mono text-xs font-bold tracking-widest hover:bg-rose-500/20 transition-all duration-300 shadow-[0_0_15px_rgba(244,63,94,0.05)]"
            >
              SYSTEM CHECK OUT
            </button>
          ) : (
            <button
              onClick={handleCheckIn}
              className="bg-emerald-500 border border-emerald-500/30 text-black px-5 py-2.5 rounded-lg font-mono text-xs font-bold tracking-widest hover:bg-emerald-400 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              SYSTEM CHECK IN
            </button>
          )}
        </div>
      </div>

      {/* Main Asymmetric Grid */}
      <div className="grid grid-cols-12 gap-6">

        {/* Left Side: Telemetry Scrub Calendar & Analytics (Col-span 8) */}
        <div className="col-span-12 xl:col-span-8 space-y-6">

          {/* Tactical Scrub Calendar */}
          <div className="relative z-50 cinematic-panel !overflow-visible p-5 rounded-xl border border-zinc-800/40">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-accent-dev" />
                <h3 className="text-zinc-400 font-mono text-xs tracking-wider uppercase">SYSTEM_EXECUTION_CALENDAR</h3>
              </div>
              <span className="text-[9px] font-mono text-zinc-500">// HOVER CELLS TO SCRUB TIMELINE</span>
            </div>

            <div className="grid grid-cols-7 gap-2 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-15 xl:grid-cols-16">
              {monthDates.map(date => {
                const dayTasks = monthTasks.filter(t => t.date === date);
                const doneCount = dayTasks.filter(t => t.status === 'Done').length;
                const dayNumber = date.split('-')[2];
                const isHovered = date === activeDate;
                const isToday = date === getLocalISODate();

                return (
                  <div
                    key={date}
                    className={`relative group hover:z-[70] flex flex-col items-center justify-center h-12 rounded-lg cursor-default transition-all duration-300 ${getIntensityClass(dayTasks.length, isHovered)} ${isToday && !isHovered ? 'border-amber-500/30 bg-amber-500/5' : ''}`}
                  >
                    {isToday && (
                      <span className="absolute top-1 right-1 flex h-1.5 w-1.5" title="Today">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                      </span>
                    )}
                    <span className={`font-bold text-xs font-mono ${isToday ? 'text-amber-400' : ''}`}>{dayNumber}</span>
                    {dayTasks.length > 0 && (
                      <span className="text-[8px] font-mono mt-0.5 opacity-60">
                        {doneCount}/{dayTasks.length}
                      </span>
                    )}

                    {/* Hover Menu Overlay */}
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[60] flex flex-col gap-1.5 bg-zinc-950/95 backdrop-blur-xl border border-zinc-700/50 p-2 rounded-xl shadow-[0_15px_35px_-5px_rgba(0,0,0,0.8),0_0_15px_rgba(56,189,248,0.1)] min-w-[150px]">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedDay(date); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 bg-zinc-900/50 hover:bg-amber-500/15 border border-zinc-800/50 hover:border-amber-500/40 rounded-lg font-mono text-[10px] font-semibold tracking-wider text-zinc-300 hover:text-amber-400 transition-all duration-300 group/btn shadow-inner"
                      >
                        <CheckCircle2 size={13} className="text-amber-500/70 group-hover/btn:text-amber-400 group-hover/btn:scale-110 transition-all" />
                        <span>TASKS</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDisplayDate(date); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 bg-zinc-900/50 hover:bg-sky-500/15 border border-zinc-800/50 hover:border-sky-500/40 rounded-lg font-mono text-[10px] font-semibold tracking-wider text-zinc-300 hover:text-sky-400 transition-all duration-300 group/btn shadow-inner"
                      >
                        <Activity size={13} className="text-sky-500/70 group-hover/btn:text-sky-400 group-hover/btn:scale-110 transition-all" />
                        <span>DASHBOARD</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Hover Indicator Stats Strip */}
            <div className="mt-4 pt-3 border-t border-zinc-900/50 flex justify-between items-center font-mono text-[10px] text-zinc-500">
              <div className="flex items-center gap-4">
                <span>ACTIVE_DATE: <strong className="text-zinc-300">{activeDate}</strong></span>
                <span>TASKS: <strong className="text-zinc-300">{totalDisplay}</strong></span>
                <span>COMPLETED: <strong className="text-emerald-400">{completedDisplay}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span>EFFICIENCY:</span>
                <span className={`font-bold ${displayCompletionRate >= 85 ? 'text-emerald-400' : displayCompletionRate >= 50 ? 'text-amber-500' : displayCompletionRate > 0 ? 'text-rose-500' : 'text-zinc-600'}`}>
                  {displayCompletionRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="relative cinematic-panel p-5 rounded-xl border border-zinc-800/40 overflow-hidden group">
            <img
              src="/blackhole2.gif"
              alt="Blackhole Background"
              className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none group-hover:opacity-75 group-hover:scale-[1.02] transition-all duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/70 to-zinc-950/30 pointer-events-none z-0" />

            <div className="relative z-10">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-accent-mind" />
                  <h3 className="text-zinc-300 font-mono text-xs font-bold tracking-wider uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">ANALYTICS // {activeDate === getLocalISODate() ? 'TODAY' : activeDate}</h3>
                </div>
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              </div>

              {displayCategories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <div className="bg-zinc-950/40 border border-zinc-900/55 p-4 rounded-lg flex flex-col h-[320px] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                      <h4 className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase">Category Focus Share</h4>
                    </div>
                    <div className="flex-1 min-h-0 relative">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart>
                          <CustomPie
                            data={displayCategories}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={50}
                            outerRadius={80}
                            isAnimationActive={false}
                            activeIndex={activePieIndex !== null ? activePieIndex : undefined}
                            activeShape={renderActiveShape}
                            onMouseEnter={(_: any, index: number) => setActivePieIndex(index)}
                            onMouseLeave={() => setActivePieIndex(null)}
                            label={({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
                              const RADIAN = Math.PI / 180;
                              const radius = outerRadius * 1.25;
                              const x = cx + radius * Math.cos(-midAngle * RADIAN);
                              const y = cy + radius * Math.sin(-midAngle * RADIAN);
                              return (
                                <text x={x} y={y} fill={COLORS[name as keyof typeof COLORS] || '#71717a'} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={9} fontFamily="monospace" fontWeight="bold">
                                  {`${name} (${(percent * 100).toFixed(0)}%)`}
                                </text>
                              );
                            }}
                          >
                            {displayCategories.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} stroke="#09090b" strokeWidth={3} />
                            ))}
                          </CustomPie>
                          <RechartsTooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <div className="bg-zinc-950/40 border border-zinc-900/55 p-4 rounded-lg flex flex-col h-[320px] shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      <h4 className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase">Completion Status</h4>
                    </div>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={displayCategories} margin={{ top: 20, right: 10, left: -25, bottom: 5 }} barSize={16}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="name" stroke="#52525b" tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                          <YAxis stroke="#52525b" tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: '#0d0d12', borderColor: '#27272a', borderRadius: '8px' }} />
                          <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" isAnimationActive={false} radius={[0, 0, 0, 0]} />
                          <Bar dataKey="in_progress" name="In Progress" stackId="a" fill="#f59e0b" isAnimationActive={false} radius={[0, 0, 0, 0]} />
                          <Bar dataKey="remaining" name="Remaining" stackId="a" fill="#e11d48" isAnimationActive={false} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-72 flex flex-col items-center justify-center bg-zinc-950/30 rounded-lg border border-zinc-900/50 gap-4">
                  <p className="text-zinc-600 font-mono text-xs tracking-wider">
                  // TELEMETRY_STANDBY: NO MISSION SCHEDULING DETECTED
                  </p>
                  <button
                    onClick={() => { setTaskModalDate(activeDate); setTaskModalOpen(true); }}
                    className="bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/25 px-4 py-2 rounded-lg font-mono text-xs font-semibold tracking-wider transition-all duration-300"
                  >
                    SCHEDULE_TASK
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Mission Details & Interactive Task Checkbox Console (Col-span 4) */}
        <div className="col-span-12 xl:col-span-4 space-y-6">

          {/* Circular Telemetry Gauge */}
          <div className="cinematic-panel p-5 rounded-xl border border-zinc-800/40 flex items-center justify-between">
            <div className="space-y-1.5 font-mono">
              <span className="text-[10px] text-zinc-500 tracking-wider block">MISSION_DATE</span>
              <p className="text-lg font-bold text-zinc-100 tracking-tight">
                {activeDate === getLocalISODate() ? 'TODAY' : new Date(activeDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
              </p>
              <div className="flex items-center gap-1.5 text-[9px]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                <span className="text-zinc-400">
                  {displayCompletionRate === 100 ? 'LOCK_SECURED' : displayCompletionRate > 0 ? 'FLIGHT_IN_PROG' : 'ORBIT_STANDBY'}
                </span>
              </div>
            </div>

            {/* Radial Ring */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                {/* Track circle */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  className="stroke-zinc-900"
                  strokeWidth="6"
                  fill="transparent"
                />
                {/* Completion indicator circle */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  className="stroke-amber-500 transition-all duration-500"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center font-mono">
                <span className="text-lg font-bold text-zinc-100">{displayCompletionRate}%</span>
                <span className="text-[8px] text-zinc-500 uppercase tracking-widest">Rate</span>
              </div>
            </div>
          </div>

          <PomodoroFocus
            availableTasks={displayTasks.filter(t => t.status !== 'Done')}
            onProgressUpdate={(id, progress, isActive) => setActiveTaskProgress({ id, progress, isActive })}
          />

          {/* Execution Check Console */}
          <div className="cinematic-panel p-5 rounded-xl border border-zinc-800/40 flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-accent-health" />
                <h3 className="text-zinc-300 font-mono text-xs font-semibold tracking-wider uppercase">Active Mission Tasks</h3>
              </div>
              <span className="text-[9px] font-mono text-zinc-500">
                {completedDisplay}/{totalDisplay} DONE
              </span>
            </div>

            {/* Tasks Live Feed */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 scrollbar-thin">
              {displayTasks.filter(t => t.status !== 'Done').length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <p className="text-zinc-600 font-mono text-xs italic">
                    // ORBIT_CLEAR //
                  </p>
                  <p className="text-[10px] text-zinc-600 font-mono mt-1">
                    No active tasks scheduled for this coordinates.
                  </p>
                </div>
              ) : (
                displayTasks.filter(t => t.status !== 'Done').map(task => (
                  <div
                    key={task._id}
                    className="bg-zinc-950/80 border border-zinc-900 hover:border-zinc-800/60 p-3 rounded-lg flex items-center justify-between gap-3 transition-all duration-300 group"
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className={`text-xs font-semibold leading-tight tracking-wide font-mono truncate ${task.status === 'Done' ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold border ${BADGE_COLORS[task.category as keyof typeof BADGE_COLORS] || BADGE_COLORS.Others}`}>
                          {task.category.toUpperCase()}
                        </span>
                        {(() => {
                          const isPomodoroActive = activeTaskProgress?.id === task._id && activeTaskProgress?.isActive;
                          const timeStatus = getTaskTimeStatus(task.date, task.time, task.duration, task.status, isPomodoroActive);

                          if (!task.time && !timeStatus) return null;

                          return (
                            <span className={`text-[8px] font-mono flex items-center gap-1.5 ${timeStatus?.color || 'text-zinc-500'}`}>
                              {task.time && (
                                <>
                                  <Clock size={10} />
                                  <span>{task.time}</span>
                                  {task.duration && <span className="text-zinc-650">({task.duration}m)</span>}
                                  {timeStatus && <span className="border-l border-zinc-800 pl-1.5"></span>}
                                </>
                              )}
                              {timeStatus && <span>{timeStatus.text}</span>}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingTask(task)}
                        className="p-1 opacity-0 group-hover:opacity-100 transition-all hover:scale-105 text-zinc-500 hover:text-amber-400"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => toggleTaskStatus(task._id, task.status)}
                        className="p-1 hover:scale-105 transition-transform"
                      >
                        {task.status === 'Done' ? (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        ) : (
                          <Circle size={16} className="text-zinc-700 hover:text-emerald-500 transition-colors" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick append input */}
            <div className="mt-3 pt-3 border-t border-zinc-900">
              <button
                onClick={() => { setTaskModalDate(activeDate); setTaskModalOpen(true); }}
                className="w-full bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800/80 text-zinc-400 hover:text-zinc-100 font-mono text-[10px] font-bold py-2 rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5"
              >
                <Plus size={12} /> ADD_TASK_FOR_COORD
              </button>
            </div>
          </div>
        </div>

      </div>

      {systemStatus === 'Checked_Out' && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center border border-zinc-800/50">
          <div className="text-center space-y-4">
            <Radio size={48} className="text-zinc-600 mx-auto animate-pulse" />
            <h2 className="text-2xl font-mono font-bold tracking-widest text-zinc-400">SYSTEM OFFLINE</h2>
            <p className="text-zinc-500 font-mono text-sm max-w-sm mx-auto">
              You are currently checked out. The environment is in standby mode. Check in to resume operations and resolve missed tasks.
            </p>
            <button
              onClick={handleCheckIn}
              className="mt-4 bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-3 rounded-xl font-mono font-bold tracking-widest transition-all duration-300 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
            >
              INITIALIZE SYSTEM CHECK-IN
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showRecoveryModal && (
        <RecoveryModal
          missedTasks={missedTasks}
          onClose={() => setShowRecoveryModal(false)}
          onComplete={() => {
            setShowRecoveryModal(false)
            fetchDashboardData()
          }}
        />
      )}
      {showWeeklyModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-[#050505] border border-zinc-800 p-8 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
            <h2 className="text-2xl font-[600] text-white mb-2 font-mono uppercase tracking-tight">Weekly Briefing</h2>
            <p className="text-zinc-400 text-sm mb-6 font-[300]">Your engine has been provisioned for the upcoming week. Base protocols have been deployed, and Work/School tasks have been successfully stripped from your off days.</p>

            <div className="bg-zinc-900/50 rounded-xl p-4 mb-6 border border-zinc-800">
              <p className="text-zinc-300 text-sm font-mono flex items-center gap-2 mb-2"><CheckCircle2 className="text-emerald-500" size={16} /> {weeklyDeployedCount} Tasks Deployed</p>
              <p className="text-zinc-300 text-sm font-mono flex items-center gap-2"><CheckCircle2 className="text-emerald-500" size={16} /> Auto-Telemetry Active</p>
            </div>

            <p className="text-xs text-zinc-500 mb-6 italic font-[300]">You can surgically edit or delete any auto-generated tasks on your timeline without affecting your master templates.</p>

            <button
              onClick={() => {
                setShowWeeklyModal(false);
                const fetchDashboardData = async () => {
                  apiFetch(`${getAPIUrl()}/api/dashboard/metrics`)
                    .then(res => res.json())
                    .then(data => setMetrics(data))
                    .catch(err => console.error("Error fetching metrics", err))

                  const startOfMonth = monthDates[0];
                  const endOfMonth = monthDates[monthDates.length - 1];

                  apiFetch(`${getAPIUrl()}/api/tasks/weekly?start_date=${startOfMonth}&end_date=${endOfMonth}`)
                    .then(res => res.json())
                    .then(data => setMonthTasks(data))
                    .catch(err => console.error("Error fetching month tasks", err))
                };
                fetchDashboardData();
              }}
              className="w-full bg-white text-black font-[600] py-3 rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Acknowledge & Execute
            </button>
          </div>
        </div>
      )}

      {isTaskModalOpen && (
        <TaskModal
          onClose={() => {
            setTaskModalOpen(false);
            // Refresh dashboard tasks and KPIs
            apiFetch(`${getAPIUrl()}/api/dashboard/metrics`)
              .then(res => res.json())
              .then(data => setMetrics(data))
              .catch(err => console.error(err))

            const startOfMonth = monthDates[0];
            const endOfMonth = monthDates[monthDates.length - 1];
            apiFetch(`${getAPIUrl()}/api/tasks/weekly?start_date=${startOfMonth}&end_date=${endOfMonth}`)
              .then(res => res.json())
              .then(data => setMonthTasks(data))
              .catch(err => console.error(err))
          }}
          defaultDate={taskModalDate}
        />
      )}

      {editingTask && (
        <TaskModal
          onClose={() => {
            setEditingTask(null);
            // Refresh dashboard tasks and KPIs
            apiFetch(`${getAPIUrl()}/api/dashboard/metrics`)
              .then(res => res.json())
              .then(data => setMetrics(data))
              .catch(err => console.error(err))

            const startOfMonth = monthDates[0];
            const endOfMonth = monthDates[monthDates.length - 1];
            apiFetch(`${getAPIUrl()}/api/tasks/weekly?start_date=${startOfMonth}&end_date=${endOfMonth}`)
              .then(res => res.json())
              .then(data => setMonthTasks(data))
              .catch(err => console.error(err))
          }}
          editTask={editingTask}
        />
      )}

      {selectedDay && (
        <DayManagerModal
          date={selectedDay}
          tasks={monthTasks.filter(t => t.date === selectedDay)}
          onClose={() => setSelectedDay(null)}
          onToggleTask={toggleTaskStatus}
          onOpenNewTask={(date) => {
            setTaskModalDate(date);
            setTaskModalOpen(true);
          }}
        />
      )}
    </div>
  )
}