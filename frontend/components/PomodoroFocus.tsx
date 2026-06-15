'use client'
import { useState, useEffect } from 'react'
import { Clock, Play, Pause, Square, ChevronDown, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { BADGE_COLORS } from '@/lib/constants'
import { getAPIUrl } from '@/components/dateUtils'
import { apiFetch } from "@/lib/api";

export default function PomodoroFocus({ 
  availableTasks, 
  onProgressUpdate 
}: { 
  availableTasks: any[],
  onProgressUpdate?: (taskId: string, progress: number, isActive: boolean) => void
}) {
  const [isActive, setIsActive] = useState(false)
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [initialTime, setInitialTime] = useState(25 * 60)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [timerFinishState, setTimerFinishState] = useState<'none' | 'ask_complete' | 'ask_reschedule' | 'ask_time'>('none')
  const [newRescheduleTime, setNewRescheduleTime] = useState('')
  const [desyncState, setDesyncState] = useState<'none' | 'late' | 'elapsed'>('none')
  const [minutesLate, setMinutesLate] = useState(0)

  const selectedTask = availableTasks.find(t => t._id === taskId)
  const currentProgress = initialTime > 0 ? ((initialTime - timeLeft) / initialTime) * 100 : 0

  // Bubble up progress
  useEffect(() => {
    if (taskId && onProgressUpdate) {
      onProgressUpdate(taskId, currentProgress, isActive)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, currentProgress, isActive])

  // Load state on mount
  useEffect(() => {
    const saved = localStorage.getItem('pomodoro_state')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const now = Date.now()
        
        if (parsed.isActive) {
          const elapsedSecs = Math.floor((now - parsed.lastTick) / 1000)
          const newTimeLeft = Math.max(0, parsed.timeLeft - elapsedSecs)
          setTimeLeft(newTimeLeft)
          setIsActive(newTimeLeft > 0)
        } else {
          setTimeLeft(parsed.timeLeft)
          setIsActive(false)
        }
        setInitialTime(parsed.initialTime)
        setTaskId(parsed.taskId)
      } catch (e) {
        console.error("Failed to parse pomodoro state", e)
      }
    }
    setIsLoaded(true)
  }, [])

  // Timer interval
  useEffect(() => {
    let interval: any = null
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1)
      }, 1000)
    } else if (timeLeft <= 0 && isActive) {
      setIsActive(false)
      setTimerFinishState('ask_complete')
    }
    return () => clearInterval(interval)
  }, [isActive, timeLeft])

  // Save state to localStorage
  useEffect(() => {
    if (isLoaded) {
      const state = {
        isActive,
        timeLeft,
        initialTime,
        lastTick: Date.now(),
        taskId
      }
      localStorage.setItem('pomodoro_state', JSON.stringify(state))
    }
  }, [isActive, timeLeft, initialTime, taskId, isLoaded])

  const selectTask = (id: string) => {
    if (id === '') {
      setTaskId(null)
      setIsActive(false)
      return
    }
    const task = availableTasks.find(t => t._id === id)
    if (task) {
      const durationSecs = (task.duration || 25) * 60
      setTaskId(id)
      setInitialTime(durationSecs)
      setTimeLeft(durationSecs)
      setIsActive(false)
    }
  }

  const toggleTimer = async () => {
    if (!isActive && selectedTask) {
      const isFreshStart = timeLeft === initialTime;
      
      if (isFreshStart && selectedTask.time) {
        const now = new Date();
        const currentH = now.getHours();
        const currentM = now.getMinutes();
        const [taskH, taskM] = selectedTask.time.split(':').map(Number);
        const currentMinutes = currentH * 60 + currentM;
        const taskMinutes = taskH * 60 + taskM;
        const duration = selectedTask.duration || 25;
        
        let diff = currentMinutes - taskMinutes;
        
        if (diff >= duration) {
           setMinutesLate(diff);
           setDesyncState('elapsed');
           return;
        } else if (diff > 0) {
           setMinutesLate(diff);
           setDesyncState('late');
           return;
        }
      }
      
      if (selectedTask.status !== 'In Progress') {
        await startActualTimer();
      } else {
        setIsActive(true);
      }
    } else {
      setIsActive(false);
    }
  }

  const startActualTimer = async (forcedTimeLeft?: number, procrastinationDelta: number = 0, maintainInitialTime: boolean = false) => {
    try {
      await apiFetch(`${getAPIUrl()}/api/tasks/${selectedTask?._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'In Progress' })
      })
      if (procrastinationDelta > 0) {
        await apiFetch(`${getAPIUrl()}/api/tasks/${selectedTask?._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...selectedTask, procrastination_delta: procrastinationDelta })
        })
      }
      setTimeout(() => window.dispatchEvent(new Event('refresh_tasks')), 500)
    } catch (e) {
      console.error(e)
    }
    if (forcedTimeLeft !== undefined) {
      setTimeLeft(forcedTimeLeft);
      if (!maintainInitialTime) {
        setInitialTime(forcedTimeLeft);
      }
    }
    setIsActive(true);
    setDesyncState('none');
  }

  const handleLateOptionA = () => {
     startActualTimer(undefined, minutesLate);
  }

  const handleLateOptionB = () => {
     const durationSecs = (selectedTask?.duration || 25) * 60;
     const newTimeLeft = Math.max(0, durationSecs - minutesLate * 60);
     startActualTimer(newTimeLeft, 0, true);
  }

  const handleElapsedYes = () => {
     handleComplete(true);
     setDesyncState('none');
  }

  const handleElapsedNo = () => {
     setDesyncState('none');
     setTimerFinishState('ask_time');
  }

  const updateTaskStatus = async (status: string) => {
    try {
      await apiFetch(`${getAPIUrl()}/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
    } catch (e) {
      console.error(e)
    }
  }

  const clearPomodoroAndReload = () => {
    setTimerFinishState('none')
    setTaskId(null)
    localStorage.removeItem('pomodoro_state')
    setTimeout(() => window.dispatchEvent(new Event('refresh_tasks')), 300)
  }

  const handleComplete = async (isDone: boolean) => {
    if (isDone) {
      await updateTaskStatus('Done')
      clearPomodoroAndReload()
    } else {
      setTimerFinishState('ask_reschedule')
    }
  }

  const handlePending = async () => {
    await updateTaskStatus('To-Do')
    clearPomodoroAndReload()
  }

  const handleRescheduleSubmit = async () => {
    if (!newRescheduleTime) return;
    try {
      await apiFetch(`${getAPIUrl()}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...selectedTask, time: newRescheduleTime, status: 'To-Do' })
      })
      clearPomodoroAndReload()
    } catch (e) {
      console.error(e)
    }
  }

  const resetTimer = () => {
    setIsActive(false)
    setTimeLeft(initialTime)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="cinematic-panel p-4 rounded-2xl border border-zinc-800/60 shadow-2xl flex flex-col relative overflow-hidden h-[180px] group ring-1 ring-white/5">
      <img 
        src="/interstellar.gif" 
        alt="Interstellar Background" 
        className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" 
      />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/80 to-zinc-950/30 pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col h-full justify-between">
        {/* Overlays for Finish Workflow */}
        <AnimatePresence>
          {timerFinishState === 'ask_complete' && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center rounded-2xl">
              <CheckCircle2 size={32} className="text-emerald-500 mb-2 animate-bounce" />
              <h3 className="text-zinc-100 font-bold mb-1 font-mono text-xs">MISSION ACCOMPLISHED?</h3>
              <p className="text-[9px] text-zinc-400 mb-4 font-mono truncate w-full px-4">{selectedTask?.title}</p>
              <div className="flex gap-3">
                <button onClick={() => handleComplete(true)} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded hover:bg-emerald-500/30 font-mono text-[10px]">YES, DONE</button>
                <button onClick={() => handleComplete(false)} className="px-3 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/50 rounded hover:bg-rose-500/30 font-mono text-[10px]">NO</button>
              </div>
            </motion.div>
          )}

          {timerFinishState === 'ask_reschedule' && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center rounded-2xl">
              <Clock size={32} className="text-amber-500 mb-2" />
              <h3 className="text-zinc-100 font-bold mb-3 font-mono text-xs">RESCHEDULE MISSION?</h3>
              <div className="flex gap-3">
                <button onClick={() => setTimerFinishState('ask_time')} className="px-3 py-1.5 bg-sky-500/20 text-sky-400 border border-sky-500/50 rounded hover:bg-sky-500/30 font-mono text-[10px]">YES</button>
                <button onClick={() => handlePending()} className="px-3 py-1.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded hover:bg-zinc-700 font-mono text-[10px]">LEAVE PENDING</button>
              </div>
            </motion.div>
          )}

          {timerFinishState === 'ask_time' && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center rounded-2xl">
              <h3 className="text-zinc-100 font-bold mb-3 font-mono text-xs">NEW COORDINATES</h3>
              <input 
                type="time" 
                value={newRescheduleTime}
                onChange={(e) => setNewRescheduleTime(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded p-1.5 text-zinc-200 mb-3 font-mono text-xs w-28 text-center outline-none focus:border-amber-500/50"
              />
              <div className="flex gap-3">
                <button onClick={() => handleRescheduleSubmit()} className="px-3 py-1.5 bg-amber-500/20 text-amber-500 border border-amber-500/50 rounded hover:bg-amber-500/30 font-mono text-[10px]">CONFIRM</button>
                <button onClick={() => handlePending()} className="px-3 py-1.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded hover:bg-zinc-700 font-mono text-[10px]">SKIP</button>
              </div>
            </motion.div>
          )}

          {desyncState === 'late' && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 z-[60] bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center rounded-2xl">
              <h3 className="text-rose-500 font-bold mb-2 font-mono text-xs">TELEMETRY DESYNC</h3>
              <p className="text-[10px] text-zinc-300 mb-4 font-mono w-full px-2">You are {minutesLate} minutes late.</p>
              <div className="flex flex-col gap-2 w-full max-w-[200px]">
                <button onClick={handleLateOptionA} className="px-2 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/50 rounded hover:bg-rose-500/30 font-mono text-[9px] leading-tight text-left">A. Start from Now<br/><span className="text-[8px] text-rose-500/70">(Log Procrastination)</span></button>
                <button onClick={handleLateOptionB} className="px-2 py-1.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded hover:bg-zinc-700 font-mono text-[9px] leading-tight text-left">B. Already Working<br/><span className="text-[8px] text-zinc-500">(Deduct time passed)</span></button>
              </div>
            </motion.div>
          )}

          {desyncState === 'elapsed' && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 z-[60] bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center rounded-2xl">
              <h3 className="text-rose-500 font-bold mb-2 font-mono text-xs">TIMEBOX ELAPSED</h3>
              <p className="text-[10px] text-zinc-300 mb-4 font-mono w-full px-2">You completely missed this scheduled window. Did you actually complete this task?</p>
              <div className="flex gap-3">
                <button onClick={handleElapsedYes} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded hover:bg-emerald-500/30 font-mono text-[10px]">YES (MARK DONE)</button>
                <button onClick={handleElapsedNo} className="px-3 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/50 rounded hover:bg-rose-500/30 font-mono text-[10px]">NO (RESCHEDULE)</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between items-center border-b border-zinc-900/50 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <motion.div animate={isActive ? { rotate: 360 } : {}} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
              <Clock size={14} className={isActive ? 'text-amber-500' : 'text-zinc-400'} />
            </motion.div>
            <h3 className="text-zinc-200 font-mono text-xs font-bold tracking-wider uppercase">Focus Telemetry</h3>
          </div>
          <span className={`text-[8px] font-mono px-2 py-0.5 rounded border ${
            isActive ? 'bg-amber-500/10 text-amber-500 border-amber-500/25' :
            selectedTask ? 'bg-emerald-500/10 text-emerald-455 border-emerald-500/25' :
            'bg-zinc-900 text-zinc-550 border-zinc-800'
          }`}>
            {isActive ? 'POMODORO_ENGAGED' : selectedTask ? 'READY_FOR_FOCUS' : 'RADAR_STANDBY'}
          </span>
        </div>

        {!selectedTask ? (
          <div className="flex-1 flex flex-col items-center justify-center pt-2">
            <p className="text-zinc-400 font-mono text-[10px] uppercase tracking-widest mb-2">Select Mission to Engage</p>
            <div className="relative w-full max-w-[250px]">
              <select 
                onChange={(e) => selectTask(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-200 rounded-lg p-2 appearance-none focus:outline-none focus:border-amber-500/50"
                value={taskId || ''}
              >
                <option value="">-- Choose a Task --</option>
                {availableTasks.map(t => (
                  <option key={t._id} value={t._id}>{t.title} ({t.duration || 25}m)</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-2.5 text-zinc-500 pointer-events-none" />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-5 mt-3">
            <div className="bg-zinc-950/80 border border-zinc-800/80 p-3 rounded-xl flex flex-col items-center justify-center min-w-[140px] shadow-[0_0_20px_rgba(0,0,0,0.5)] z-10 backdrop-blur-md shrink-0">
              <p className={`text-3xl font-black tracking-tighter ${isActive ? 'text-amber-500 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]' : 'text-zinc-300'}`}>
                {formatTime(initialTime - Math.max(0, timeLeft))}
              </p>
              <span className="text-[8px] text-zinc-500 font-bold tracking-widest uppercase mt-0.5">
                {formatTime(Math.max(0, timeLeft))} REMAINING
              </span>
              <div className="flex gap-4 mt-2">
                <button onClick={toggleTimer} className={`p-1.5 rounded-full transition-all ${isActive ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' : 'bg-zinc-800 text-emerald-400 hover:bg-zinc-700'}`}>
                  {isActive ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                </button>
                <button onClick={resetTimer} className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-all">
                  <Square size={12} fill="currentColor" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-3 min-w-0 pr-2">
              <div className="relative">
                <button onClick={() => setTaskId(null)} className="absolute right-0 top-0 text-[10px] text-zinc-500 hover:text-zinc-300 font-mono underline">Change</button>
                <span className={`text-[8px] px-2 py-0.5 rounded-full font-mono border inline-block mb-1.5 ${BADGE_COLORS[selectedTask.category as keyof typeof BADGE_COLORS] || BADGE_COLORS.Others}`}>
                  {selectedTask.category.toUpperCase()}
                </span>
                <p className="text-sm font-bold text-zinc-100 truncate pr-10">{selectedTask.title}</p>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[8px] text-zinc-400 font-bold tracking-widest">
                  <span>COVERED {Math.floor((initialTime - timeLeft) / 60)}M / {Math.floor(initialTime / 60)}M</span>
                  <span>{Math.round(currentProgress)}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${currentProgress}%` }}
                    transition={{ type: 'spring', bounce: 0 }}
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                    style={{ boxShadow: '0 0 10px rgba(251,191,36,0.5)' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
