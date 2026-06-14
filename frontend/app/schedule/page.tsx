'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Clock, GripVertical, AlertTriangle, Settings2, X, GripHorizontal, ZoomIn, ZoomOut, Magnet, Copy, Trash2, SplitSquareHorizontal, Scissors } from 'lucide-react'
import { getLocalISODate, getAPIUrl } from '@/components/dateUtils'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from "@/lib/api";

const API = getAPIUrl()

interface Conflict {
  taskBId: string;
  taskAId: string;
  taskBTime: string;
  completedMinsA: number;
  remainingMinsA: number;
  taskBName: string;
  taskAName: string;
}

export default function SchedulePage() {
  const [date, setDate] = useState(getLocalISODate())
  const [tasks, setTasks] = useState<any[]>([])
  const [conflict, setConflict] = useState<Conflict | null>(null)
  
  // Real-time "Now" indicator
  const [now, setNow] = useState(new Date())
  
  // Advanced Features State
  const [zoomLevel, setZoomLevel] = useState(80) // 80px to 240px per hour
  const [contextMenu, setContextMenu] = useState<{taskId: string, x: number, y: number} | null>(null)
  
  // Cut & Reallocate
  const [cutTaskState, setCutTaskState] = useState<{
    taskId: string;
    cutTime: string;
    reallocateTime: string;
    isPermanent: boolean;
  } | null>(null)

  // Zone Configuration
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [zones, setZones] = useState({
    sleep: { start: 23, end: 7 },
    office: { start: 9, end: 17 },
    lunch: { start: 12, end: 13 },
    family: { start: 18, end: 21 }
  })

  const [dragHoverMins, setDragHoverMins] = useState<number | null>(null)

  const timelineRef = useRef<HTMLDivElement>(null)
  const PX_PER_HOUR = zoomLevel
  const PX_PER_MIN = PX_PER_HOUR / 60
  const SNAP_THRESHOLD = 8 // minutes threshold for magnetic snap
  const TIMELINE_START_HOUR = 0
  const TIMELINE_START_MINS = TIMELINE_START_HOUR * 60

  const getNextDay = (d: string) => {
      const dt = new Date(d);
      dt.setDate(dt.getDate() + 1);
      return dt.toISOString().split('T')[0];
  }

  const absoluteMinsToTimeAndDate = (absMins: number, baseDate: string) => {
      if (absMins >= 1440) {
          return { time: minsToTimeStr(absMins - 1440), date: getNextDay(baseDate) }
      }
      return { time: minsToTimeStr(absMins), date: baseDate }
  }

  const timeAndDateToAbsoluteMins = (time: string, taskDate: string, baseDate: string) => {
      if (!time) return 0;
      const m = timeStrToMins(time);
      if (taskDate && baseDate && taskDate !== baseDate) {
          return m + 1440; // Tomorrow
      }
      return m; // Today
  }

  useEffect(() => {
    const savedZones = localStorage.getItem('thinktank_zones')
    if (savedZones) setZones(JSON.parse(savedZones))
    
    const savedZoom = localStorage.getItem('thinktank_zoom')
    if (savedZoom) setZoomLevel(parseInt(savedZoom))
    
    const interval = setInterval(() => setNow(new Date()), 60000)
    
    const closeContext = () => setContextMenu(null)
    window.addEventListener('click', closeContext)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('click', closeContext)
    }
  }, [])

  useEffect(() => { fetchTasks() }, [date])

  const fetchTasks = async () => {
    const d1 = date;
    const d2 = getNextDay(date);
    const [res1, res2] = await Promise.all([
       apiFetch(`${API}/api/tasks/date/${d1}`),
       apiFetch(`${API}/api/tasks/date/${d2}`)
    ]);
    const tasks1 = res1.ok ? await res1.json() : [];
    const tasks2 = res2.ok ? await res2.json() : [];
    
    const validTasks1 = tasks1.filter((t: any) => t.time ? timeStrToMins(t.time) >= TIMELINE_START_MINS : true); 
    const validTasks2 = tasks2.filter((t: any) => t.time ? timeStrToMins(t.time) < TIMELINE_START_MINS : false); 
    setTasks([...validTasks1, ...validTasks2]);
  }

  // --- Calculations ---
  const getDur = (s: number, e: number) => e < s ? (24 - s + e) * 60 : (e - s) * 60
  const totalSleep = getDur(zones.sleep.start, zones.sleep.end)
  const totalOffice = getDur(zones.office.start, zones.office.end)
  const totalLunch = getDur(zones.lunch.start, zones.lunch.end)
  const totalFamily = getDur(zones.family.start, zones.family.end)
  
  const totalAllocated = totalSleep + totalOffice + totalLunch + totalFamily
  const theoreticalFreeTime = (24 * 60) - totalAllocated

  let freeTimeUsed = 0
  tasks.filter(t => t.time).forEach(t => {
      const [h, m] = t.time.split(':').map(Number)
      const isSleep = (zones.sleep.end < zones.sleep.start) ? (h >= zones.sleep.start || h < zones.sleep.end) : (h >= zones.sleep.start && h < zones.sleep.end)
      const isOffice = (zones.office.end < zones.office.start) ? (h >= zones.office.start || h < zones.office.end) : (h >= zones.office.start && h < zones.office.end)
      const isLunch = (zones.lunch.end < zones.lunch.start) ? (h >= zones.lunch.start || h < zones.lunch.end) : (h >= zones.lunch.start && h < zones.lunch.end)
      const isFamily = (zones.family.end < zones.family.start) ? (h >= zones.family.start || h < zones.family.end) : (h >= zones.family.start && h < zones.family.end)
      
      if (!isSleep && !isOffice && !isLunch && !isFamily) freeTimeUsed += (t.duration || 60)
  })

  const actualFreeTime = Math.max(0, theoreticalFreeTime - freeTimeUsed)
  const freeTimeHours = Math.floor(actualFreeTime / 60)
  const freeTimeMins = actualFreeTime % 60

  // --- Chronological Flow Builder ---
  const scheduleBlocks = useMemo(() => {
    const getZ = (h: number) => {
      const isS = (zones.sleep.end <= zones.sleep.start) ? (h >= zones.sleep.start || h < zones.sleep.end) : (h >= zones.sleep.start && h < zones.sleep.end)
      const isL = (zones.lunch.end <= zones.lunch.start) ? (h >= zones.lunch.start || h < zones.lunch.end) : (h >= zones.lunch.start && h < zones.lunch.end)
      const isO = (zones.office.end <= zones.office.start) ? (h >= zones.office.start || h < zones.office.end) : (h >= zones.office.start && h < zones.office.end)
      const isF = (zones.family.end <= zones.family.start) ? (h >= zones.family.start || h < zones.family.end) : (h >= zones.family.start && h < zones.family.end)
      if (isS) return 'SLEEP'
      if (isL) return 'LUNCH'
      if (isO) return 'OFFICE'
      if (isF) return 'FAMILY'
      return 'FREE'
    }
    
    let blocks = []
    let curZ: string | null = getZ(TIMELINE_START_HOUR)
    let startH = TIMELINE_START_HOUR
    
    for (let h = 1; h <= 24; h++) {
      const realH = (TIMELINE_START_HOUR + h) % 24
      const z = h === 24 ? null : getZ(realH)
      if (z !== curZ) {
        blocks.push({ label: curZ as string, start: startH, end: h === 24 ? TIMELINE_START_HOUR : realH })
        curZ = z
        startH = realH
      }
    }
    return blocks
  }, [zones])

  // --- API Sync Helpers ---
  const syncTaskBackend = async (taskId: string, updates: any) => {
    await apiFetch(`${API}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
  }

  // --- Time Converters ---
  const minsToTimeStr = (mins: number) => {
    const h = Math.floor(mins / 60) % 24
    const m = mins % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }
  const timeStrToMins = (str: string) => {
    if (!str) return 0
    const [h, m] = str.split(':').map(Number)
    return h * 60 + m
  }

  // --- Magnetic Snapping Engine ---
  const getMagneticSnapEdges = (ignoreTaskId: string) => {
    return tasks.filter(t => t._id !== ignoreTaskId && t.time).flatMap(t => {
       const s = timeAndDateToAbsoluteMins(t.time, t.date, date)
       return [s, s + (t.duration || 60)]
    })
  }

  const checkCollision = (bId: string, bStartAbs: number, bDur: number) => {
    const bEndAbs = bStartAbs + bDur
    return tasks.find(A => {
      if (A._id === bId || !A.time) return false
      const aStartAbs = timeAndDateToAbsoluteMins(A.time, A.date, date)
      const aEndAbs = aStartAbs + (A.duration || 60)
      return (bStartAbs < aEndAbs) && (bEndAbs > aStartAbs)
    })
  }

  // --- HTML5 Drag from Sidebar to Timeline ---
  const handleDragStartSidebar = (e: React.DragEvent, taskId: string, dur: number) => {
    e.dataTransfer.setData('taskId', taskId)
    e.dataTransfer.setData('duration', dur.toString())
  }

  const handleDragOverTimeline = (e: React.DragEvent) => {
    e.preventDefault()
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top + timelineRef.current.scrollTop
    const rawMins = y / PX_PER_MIN
    const absMins = rawMins + TIMELINE_START_MINS
    
    // Magnetic Snap or 15m grid
    let snappedAbsMins = absMins
    const edges = getMagneticSnapEdges('')
    let snappedToEdge = false
    
    for (const edge of edges) {
       if (Math.abs(absMins - edge) < SNAP_THRESHOLD) {
          snappedAbsMins = edge
          snappedToEdge = true
          break
       }
    }
    
    if (!snappedToEdge) {
       snappedAbsMins = Math.round(absMins / 15) * 15
    }
    setDragHoverMins(snappedAbsMins)
  }

  const handleDropOnTimeline = async (e: React.DragEvent) => {
    e.preventDefault()
    const finalAbsMins = dragHoverMins || TIMELINE_START_MINS
    setDragHoverMins(null)
    
    const bId = e.dataTransfer.getData('taskId')
    if (!bId) return

    const B = tasks.find(t => t._id === bId)
    if (!B) return

    const { time: timeStr, date: newDate } = absoluteMinsToTimeAndDate(finalAbsMins, date)
    const bDur = B.duration || 60
    const collision = checkCollision(bId, finalAbsMins, bDur)

    if (collision) {
       const aStart = timeAndDateToAbsoluteMins(collision.time, collision.date, date)
       let completedMins = finalAbsMins - aStart
       if (completedMins < 0) completedMins = 0
       let remainingMins = (collision.duration || 60) - completedMins
       if (remainingMins < 0) remainingMins = 0

       setConflict({
         taskBId: B._id,
         taskAId: collision._id,
         taskBTime: timeStr,
         completedMinsA: completedMins,
         remainingMinsA: remainingMins,
         taskBName: B.title,
         taskAName: collision.title
       })
       return
    }

    setTasks(prev => prev.map(t => t._id === bId ? { ...t, time: timeStr, date: newDate } : t))
    await syncTaskBackend(bId, { time: timeStr, date: newDate })
  }

  // --- Interactive Pointer Drag/Resize on Timeline ---
  const handlePointerDownTask = (e: React.PointerEvent, taskId: string, isResize: boolean) => {
    e.stopPropagation()
    const task = tasks.find(t => t._id === taskId)
    if (!task) return

    const startY = e.clientY
    const initialAbsMins = timeAndDateToAbsoluteMins(task.time, task.date, date)
    const initialDur = task.duration || 60
    const edges = getMagneticSnapEdges(taskId)

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startY
      const rawDeltaMins = deltaY / PX_PER_MIN

      setTasks(prev => prev.map(t => {
        if (t._id === taskId) {
          if (isResize) {
            let tentativeDur = initialDur + rawDeltaMins
            let tentativeEnd = initialAbsMins + tentativeDur
            let snapped = false
            
            for (const edge of edges) {
               if (Math.abs(tentativeEnd - edge) < SNAP_THRESHOLD) {
                  tentativeDur = edge - initialAbsMins
                  snapped = true
                  break
               }
            }
            if (!snapped) tentativeDur = Math.round(tentativeDur / 15) * 15
            
            return { ...t, duration: Math.max(10, tentativeDur) }
          } else {
            let tentativeStart = initialAbsMins + rawDeltaMins
            let tentativeEnd = tentativeStart + initialDur
            let snapped = false
            
            for (const edge of edges) {
               if (Math.abs(tentativeStart - edge) < SNAP_THRESHOLD) {
                  tentativeStart = edge
                  snapped = true
                  break
               }
               if (Math.abs(tentativeEnd - edge) < SNAP_THRESHOLD) {
                  tentativeStart = edge - initialDur
                  snapped = true
                  break
               }
            }
            if (!snapped) tentativeStart = Math.round(tentativeStart / 15) * 15
            
            const newAbsMins = Math.max(TIMELINE_START_MINS, Math.min(TIMELINE_START_MINS + 1440 - 10, tentativeStart))
            const { time: newTimeStr, date: newDate } = absoluteMinsToTimeAndDate(newAbsMins, date)
            return { ...t, time: newTimeStr, date: newDate }
          }
        }
        return t
      }))
    }

    const onPointerUp = async () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)

      setTasks(prev => {
        const finalTask = prev.find(t => t._id === taskId)
        if (finalTask) syncTaskBackend(taskId, { time: finalTask.time, date: finalTask.date, duration: finalTask.duration })
        return prev
      })
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  // --- De-fragmenter Engine ---
  const runDefragmenter = async () => {
    const allocated = [...tasks.filter(t => t.time)].sort((a, b) => timeAndDateToAbsoluteMins(a.time, a.date, date) - timeAndDateToAbsoluteMins(b.time, b.date, date))
    if (allocated.length === 0) return

    let currentAbs = timeAndDateToAbsoluteMins(allocated[0].time, allocated[0].date, date)
    const updates = []
    const newTasks = [...tasks]
    
    for (const t of allocated) {
        const dur = t.duration || 60
        const { time: newTimeStr, date: newDate } = absoluteMinsToTimeAndDate(currentAbs, date)
        
        if (t.time !== newTimeStr || t.date !== newDate) {
            updates.push({ id: t._id, time: newTimeStr, date: newDate })
            const idx = newTasks.findIndex(x => x._id === t._id)
            if (idx > -1) newTasks[idx] = { ...newTasks[idx], time: newTimeStr, date: newDate }
        }
        currentAbs += dur
    }
    
    setTasks(newTasks)
    for (const update of updates) await syncTaskBackend(update.id, { time: update.time, date: update.date })
  }

  // --- Context Menu Actions ---
  const handleSplitTask = async (taskId: string) => {
    const t = tasks.find(x => x._id === taskId)
    if (!t || !t.duration || t.duration < 10) return
    const halfDur = Math.floor(t.duration / 2)
    const secondStartMins = timeStrToMins(t.time) + halfDur
    
    setTasks(prev => prev.map(x => x._id === taskId ? { ...x, duration: halfDur } : x))
    await syncTaskBackend(taskId, { duration: halfDur })
    
    const { _id, ...newT } = t
    newT.duration = t.duration - halfDur
    newT.time = minsToTimeStr(secondStartMins)
    await apiFetch(`${API}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newT) })
    fetchTasks()
  }

  const handleDuplicateTask = async (taskId: string) => {
    const t = tasks.find(x => x._id === taskId)
    if (!t) return
    const { _id, ...newT } = t
    newT.time = null // send to unallocated
    await apiFetch(`${API}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newT) })
    fetchTasks()
  }

  const handleKickTask = async (taskId: string) => {
    setTasks(prev => prev.map(x => x._id === taskId ? { ...x, time: null } : x))
    await syncTaskBackend(taskId, { time: null })
  }

  const executeCutAndReallocate = async () => {
    if (!cutTaskState) return;
    const t = tasks.find(x => x._id === cutTaskState.taskId);
    if (!t || !t.time) return;

    const taskStartMins = timeStrToMins(t.time);
    const taskDur = t.duration || 60;
    const taskEndMins = taskStartMins + taskDur;
    
    const cutMins = timeStrToMins(cutTaskState.cutTime);
    if (cutMins <= taskStartMins || cutMins >= taskEndMins) {
       alert("Cut time must be within the task's current duration!");
       return;
    }

    const firstDur = cutMins - taskStartMins;
    const secondDur = taskEndMins - cutMins;
    const newTimeStr = cutTaskState.reallocateTime || null;

    // 1. Update original task
    setTasks(prev => prev.map(x => x._id === cutTaskState.taskId ? { ...x, duration: firstDur } : x));
    await syncTaskBackend(cutTaskState.taskId, { duration: firstDur });

    // 2. Create the cut portion task
    const { _id, ...newT } = t;
    newT.duration = secondDur;
    newT.time = newTimeStr;
    const res = await apiFetch(`${API}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newT) });
    const createdTask = await res.json();
    setTasks(prev => [...prev, createdTask]);

    // 3. Permanent Routine Update
    if (cutTaskState.isPermanent && t.routine_id) {
       const routinesRes = await apiFetch(`${API}/api/routines`);
       const routines = await routinesRes.json();
       const routine = routines.find((r: any) => r._id === t.routine_id);
       if (routine) {
          const taskIdx = routine.tasks.findIndex((rt: any) => rt.title === t.title);
          if (taskIdx > -1) {
             const originalTemplate = routine.tasks[taskIdx];
             routine.tasks[taskIdx] = { ...originalTemplate, duration: firstDur, time: t.time };
             routine.tasks.push({ ...originalTemplate, duration: secondDur, time: newTimeStr });
             await apiFetch(`${API}/api/routines/${t.routine_id}`, {
                 method: 'PUT',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ title: routine.title, description: routine.description, tasks: routine.tasks })
             });
          }
       }
    }

    setCutTaskState(null);
  }

  const getCatColor = (cat: string) => {
    if (cat === 'Development') return 'border-sky-500 text-sky-400 bg-sky-900/10'
    if (cat === 'Health') return 'border-emerald-500 text-emerald-400 bg-emerald-900/10'
    if (cat === 'Mindset') return 'border-purple-500 text-purple-400 bg-purple-900/10'
    return 'border-amber-500 text-amber-400 bg-amber-900/10'
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col space-y-6 max-w-7xl mx-auto">
      
      {/* ZONE CONFIG MODAL */}
      <AnimatePresence>
        {isConfigOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full font-mono">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">Zone Configuration</h3>
                <button onClick={() => setIsConfigOpen(false)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
              </div>
              <div className="space-y-4">
                {Object.entries(zones).map(([key, val]) => (
                  <div key={key} className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
                    <label className="block text-[10px] text-zinc-500 uppercase tracking-widest mb-2">{key} TIME</label>
                    <div className="flex items-center gap-3">
                      <input type="number" min="0" max="23" value={val.start} onChange={e => setZones({...zones, [key]: {...val, start: parseInt(e.target.value) || 0}})} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 text-center" />
                      <span className="text-zinc-600">TO</span>
                      <input type="number" min="0" max="23" value={val.end} onChange={e => setZones({...zones, [key]: {...val, end: parseInt(e.target.value) || 0}})} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 text-center" />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => { localStorage.setItem('thinktank_zones', JSON.stringify(zones)); setIsConfigOpen(false) }} className="w-full mt-6 bg-purple-500/10 border border-purple-500/30 text-purple-400 py-2.5 rounded-lg text-xs font-bold transition hover:bg-purple-500/20">SAVE ZONES</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUT & REALLOCATE MODAL */}
      <AnimatePresence>
        {cutTaskState && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full font-mono">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2"><Scissors size={14} className="text-amber-500" /> Cut & Reallocate</h3>
                <button onClick={() => setCutTaskState(null)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
                   <label className="block text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Cut Task At</label>
                   <input type="time" value={cutTaskState.cutTime} onChange={e => setCutTaskState({...cutTaskState, cutTime: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 focus:border-amber-500 outline-none" />
                   <p className="text-[9px] text-zinc-600 mt-1">Time to split the task (e.g. interruption start)</p>
                </div>

                <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
                   <label className="block text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Reallocate To (Optional)</label>
                   <input type="time" value={cutTaskState.reallocateTime} onChange={e => setCutTaskState({...cutTaskState, reallocateTime: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 focus:border-amber-500 outline-none" />
                   <p className="text-[9px] text-zinc-600 mt-1">Leave blank to send to unallocated</p>
                </div>

                <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50 flex items-start gap-3 cursor-pointer" onClick={() => setCutTaskState({...cutTaskState, isPermanent: !cutTaskState.isPermanent})}>
                   <div className={`w-4 h-4 rounded border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${cutTaskState.isPermanent ? 'bg-amber-500 border-amber-500' : 'bg-zinc-950 border-zinc-700'}`}>
                      {cutTaskState.isPermanent && <div className="w-2 h-2 bg-zinc-900 rounded-sm" />}
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase tracking-widest cursor-pointer">Permanent Change</label>
                      <p className="text-[9px] text-zinc-500 mt-0.5">Update the routine template for future days. Uncheck to apply to today only.</p>
                   </div>
                </div>
              </div>
              
              <button onClick={executeCutAndReallocate} className="w-full mt-6 bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 py-2.5 rounded-lg text-xs font-bold transition flex justify-center items-center gap-2">
                 CONFIRM CUT
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTEXT MENU */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            className="fixed z-[200] bg-zinc-900 border border-zinc-700 shadow-2xl rounded-xl py-1.5 min-w-[160px] overflow-hidden backdrop-blur-xl"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
             <button onClick={() => {
                const t = tasks.find(x => x._id === contextMenu.taskId);
                if (!t) return;
                setCutTaskState({
                   taskId: t._id,
                   cutTime: t.time || '',
                   reallocateTime: '',
                   isPermanent: false
                });
                setContextMenu(null);
             }} className="w-full text-left px-4 py-2 text-xs font-mono text-amber-400 hover:bg-zinc-800 flex items-center gap-2"><Scissors size={12} /> Cut & Reallocate</button>
             <div className="h-[1px] bg-zinc-800 my-1 w-full" />
             <button onClick={() => handleSplitTask(contextMenu.taskId)} className="w-full text-left px-4 py-2 text-xs font-mono text-zinc-300 hover:bg-zinc-800 hover:text-sky-400 flex items-center gap-2"><SplitSquareHorizontal size={12} /> Split in Half</button>
             <button onClick={() => handleDuplicateTask(contextMenu.taskId)} className="w-full text-left px-4 py-2 text-xs font-mono text-zinc-300 hover:bg-zinc-800 hover:text-emerald-400 flex items-center gap-2"><Copy size={12} /> Duplicate Task</button>
             <div className="h-[1px] bg-zinc-800 my-1 w-full" />
             <button onClick={() => handleKickTask(contextMenu.taskId)} className="w-full text-left px-4 py-2 text-xs font-mono text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"><Trash2 size={12} /> Kick to Unallocated</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-none flex items-center justify-between border-b border-zinc-900/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Clock size={16} className="text-emerald-500 animate-pulse" />
            <h1 className="text-3xl font-extrabold font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400 uppercase">TIME-BOXER</h1>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-1">Magnetic Snapping • Auto-Pack • Context Actions</p>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Timeline Controls */}
           <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/60">
              <button 
                onClick={() => { setZoomLevel(prev => Math.max(40, prev - 20)); localStorage.setItem('thinktank_zoom', Math.max(40, zoomLevel - 20).toString()) }} 
                className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition" title="Zoom Out"
              ><ZoomOut size={14} /></button>
              <span className="text-[10px] font-mono text-zinc-600 px-1">{zoomLevel}px</span>
              <button 
                onClick={() => { setZoomLevel(prev => Math.min(240, prev + 20)); localStorage.setItem('thinktank_zoom', Math.min(240, zoomLevel + 20).toString()) }} 
                className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition" title="Zoom In"
              ><ZoomIn size={14} /></button>
           </div>
           
           <button onClick={runDefragmenter} className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-lg text-xs font-mono font-bold hover:bg-amber-500/20 transition group">
              <Magnet size={14} className="group-hover:scale-110 transition-transform" /> DE-FRAGMENT
           </button>
           <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2 text-sm font-mono focus:outline-none focus:border-amber-500 transition-colors" />
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex gap-6 min-h-0">
        
        {/* 24-Hour Timeline */}
        <div className="flex-[3] bg-zinc-950/80 border border-zinc-800/50 rounded-xl cinematic-panel h-full relative flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar relative" ref={timelineRef} onDragOver={handleDragOverTimeline} onDrop={handleDropOnTimeline} onDragLeave={() => setDragHoverMins(null)}>
            
            <div className="relative w-full" style={{ height: `${24 * PX_PER_HOUR}px` }}>
              
              {/* NOW Indicator */}
              {(() => {
                 const startOfView = new Date(`${date}T12:00:00`);
                 const endOfView = new Date(startOfView);
                 endOfView.setHours(endOfView.getHours() + 24);
                 
                 if (now >= startOfView && now < endOfView) {
                    const diffMins = (now.getTime() - startOfView.getTime()) / 60000;
                    return (
                      <div 
                        className="absolute left-16 right-0 z-50 pointer-events-none flex items-center shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all duration-1000"
                        style={{ top: `${diffMins * PX_PER_MIN}px` }}
                      >
                        <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e] -translate-x-1" />
                        <div className="h-[1px] w-full bg-rose-500/80 shadow-[0_0_10px_#f43f5e]" />
                      </div>
                    )
                 }
                 return null;
              })()}

              {/* GRID */}
              <div className="absolute inset-0 flex flex-col pointer-events-none">
                {Array.from({length: 25}).map((_, i) => {
                  const hour = (TIMELINE_START_HOUR + i) % 24
                  const isSleep = (zones.sleep.end <= zones.sleep.start) ? (hour >= zones.sleep.start || hour < zones.sleep.end) : (hour >= zones.sleep.start && hour < zones.sleep.end)
                  const isOffice = (zones.office.end <= zones.office.start) ? (hour >= zones.office.start || hour < zones.office.end) : (hour >= zones.office.start && hour < zones.office.end)
                  const isLunch = (zones.lunch.end <= zones.lunch.start) ? (hour >= zones.lunch.start || hour < zones.lunch.end) : (hour >= zones.lunch.start && hour < zones.lunch.end)
                  const isFamily = (zones.family.end <= zones.family.start) ? (hour >= zones.family.start || hour < zones.family.end) : (hour >= zones.family.start && hour < zones.family.end)
                  
                  const activeZone = (i < 24 && isSleep) ? { name: 'SLEEP', bg: 'bg-indigo-900/10', text: 'text-indigo-500/5' } 
                                   : (i < 24 && isLunch) ? { name: 'LUNCH', bg: 'bg-amber-900/5', text: 'text-amber-500/5' }
                                   : (i < 24 && isOffice) ? { name: 'OFFICE', bg: 'bg-sky-900/5', text: 'text-sky-500/5' } 
                                   : (i < 24 && isFamily) ? { name: 'DINNER', bg: 'bg-rose-900/5', text: 'text-rose-500/5' } : null;

                  return (
                    <div key={i} className={`flex ${i < 24 ? 'border-b border-zinc-800/30' : ''} relative ${activeZone ? activeZone.bg : ''}`} style={{ height: i < 24 ? `${PX_PER_HOUR}px` : '0px' }}>
                      {activeZone && (
                        <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-5xl font-black italic tracking-tighter ${activeZone.text} pointer-events-none select-none z-0 overflow-hidden`}>
                            {activeZone.name}
                        </div>
                      )}
                      {/* 15 min sub-grids */}
                      {i < 24 && (
                        <>
                          <div className="absolute left-16 right-0 border-b border-zinc-800/10" style={{ top: '25%' }} />
                          <div className="absolute left-16 right-0 border-b border-zinc-800/20" style={{ top: '50%' }} />
                          <div className="absolute left-16 right-0 border-b border-zinc-800/10" style={{ top: '75%' }} />
                        </>
                      )}

                      <div className={`w-16 border-r border-zinc-800/50 text-[10px] font-mono text-zinc-500 flex justify-center uppercase select-none bg-zinc-950/40 backdrop-blur-sm z-10 ${i === 24 ? '-mt-2 absolute top-0 bottom-auto left-0 h-4' : 'pt-2'}`}>
                        {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* COLLISION PREVIEW */}
              {dragHoverMins !== null && (
                <div 
                  className="absolute left-16 right-4 bg-amber-500/10 border-2 border-dashed border-amber-500/50 rounded-lg pointer-events-none z-10 transition-all duration-75"
                  style={{ top: `${(dragHoverMins - TIMELINE_START_MINS) * PX_PER_MIN}px`, height: `${60 * PX_PER_MIN}px` }}
                />
              )}

              {/* TASK BLOCKS */}
              <div className="absolute top-0 right-0 left-16 bottom-0 z-20">
                {tasks.filter(t => t.time).map(t => {
                  const absMins = timeAndDateToAbsoluteMins(t.time, t.date, date)
                  const dur = t.duration || 60
                  const topPx = (absMins - TIMELINE_START_MINS) * PX_PER_MIN
                  const heightPx = dur * PX_PER_MIN
                  
                  return (
                    <div 
                      key={t._id} 
                      className={`absolute left-2 right-4 ${getCatColor(t.category)} bg-opacity-95 backdrop-blur-md border border-l-4 p-2 rounded-lg shadow-xl flex flex-col group transition-shadow duration-200 select-none`}
                      style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ taskId: t._id, x: e.clientX, y: e.clientY }) }}
                    >
                      {/* Move Handle */}
                      <div className="flex items-start gap-2 cursor-grab active:cursor-grabbing flex-1 overflow-hidden" onPointerDown={(e) => handlePointerDownTask(e, t._id, false)}>
                        <GripVertical size={14} className="text-zinc-500 opacity-50 group-hover:opacity-100 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold font-mono text-zinc-200 truncate">{t.title}</p>
                          {heightPx > 40 && <p className="text-[9px] font-mono text-zinc-500/80 mt-0.5">{t.time} • {dur} min</p>}
                        </div>
                      </div>
                      
                      {/* Resize Handle */}
                      <div className="h-3 w-full absolute bottom-0 left-0 cursor-ns-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-zinc-900/50 to-transparent rounded-b-lg" onPointerDown={(e) => handlePointerDownTask(e, t._id, true)}>
                        <GripHorizontal size={10} className="text-zinc-500" />
                      </div>
                    </div>
                  )
                })}
              </div>

            </div>
          </div>
        </div>

        {/* Unallocated Tasks Sidebar */}
        <div 
          className="flex-[1] bg-zinc-900/40 border border-zinc-800/40 rounded-xl flex flex-col h-full cinematic-panel"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const id = e.dataTransfer.getData('taskId')
            if (id) syncTaskBackend(id, { time: null }).then(fetchTasks)
          }}
        >
          <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-950/30">
            <h3 className="text-xs font-bold font-mono text-zinc-400 tracking-widest uppercase">Unallocated</h3>
            <span className="bg-zinc-800 text-zinc-300 text-[10px] px-2 py-0.5 rounded-full font-mono">{tasks.filter(t => !t.time).length}</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
            {tasks.filter(t => !t.time).map(t => (
              <div 
                key={t._id} 
                draggable
                onDragStart={(e) => handleDragStartSidebar(e, t._id, t.duration || 60)}
                className={`bg-zinc-950/80 border border-zinc-800 border-l-4 ${getCatColor(t.category)} p-3 rounded-lg shadow-lg cursor-grab hover:border-zinc-600 transition-colors group relative`}
              >
                <p className="text-xs font-bold font-mono text-zinc-200 truncate">{t.title}</p>
                <p className="text-[9px] font-mono text-zinc-500 mt-1">{t.category}</p>
                <div className="mt-2 text-[8px] font-mono text-amber-500/0 group-hover:text-amber-500/70 uppercase tracking-widest transition-colors flex items-center justify-between">
                  <span>Drag to schedule ➔</span>
                  {t.duration && <span>{t.duration}m</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ─── BOTTOM PANEL: REDESIGNED BANDWIDTH & CHRONO FLOW ─── */}
      <div className="flex-none bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-5 shadow-2xl flex flex-col gap-4">
        
        {/* Bandwidth Monitor */}
        <div className="w-full">
          <div className="flex justify-between items-end mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold font-mono text-zinc-300 tracking-widest uppercase">Bandwidth Tracker</h2>
              <button onClick={() => setIsConfigOpen(true)} className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition shadow-sm" title="Configure Zones"><Settings2 size={14} /></button>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-emerald-400 tracking-tight">{freeTimeHours}h {freeTimeMins}m</span>
              <span className="text-xs font-mono text-zinc-500 ml-2 uppercase tracking-widest">Free Time</span>
            </div>
          </div>
          
          <div className="h-4 w-full bg-zinc-900 rounded-lg overflow-hidden flex shadow-inner">
            <div style={{ width: `${(totalSleep/1440)*100}%` }} className="bg-indigo-600/80 hover:bg-indigo-500 transition-colors cursor-crosshair" title="Sleep Cycle" />
            <div style={{ width: `${(totalOffice/1440)*100}%` }} className="bg-sky-600/80 hover:bg-sky-500 transition-colors cursor-crosshair" title="Office Time" />
            <div style={{ width: `${(totalLunch/1440)*100}%` }} className="bg-amber-600/80 hover:bg-amber-500 transition-colors cursor-crosshair" title="Lunch Time" />
            <div style={{ width: `${(totalFamily/1440)*100}%` }} className="bg-rose-600/80 hover:bg-rose-500 transition-colors cursor-crosshair" title="Family Time" />
            <div style={{ width: `${(freeTimeUsed/1440)*100}%` }} className="bg-amber-500 hover:bg-amber-400 transition-colors cursor-crosshair shadow-[0_0_10px_#f59e0b]" title="Allocated Tasks" />
            <div style={{ width: `${(actualFreeTime/1440)*100}%` }} className="bg-emerald-500/20 hover:bg-emerald-500/40 transition-colors cursor-crosshair" title="Free Time" />
          </div>
        </div>
        
        {/* Chronological Flow */}
        <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2 pt-1 items-center">
          {scheduleBlocks.map((b, i) => (
            <div key={i} className="flex items-center gap-3 shrink-0 group cursor-default">
              <div className={`px-3 py-1.5 rounded-lg border transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-1 ${
                b.label === 'SLEEP' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 group-hover:shadow-[0_5px_15px_rgba(99,102,241,0.2)]' :
                b.label === 'OFFICE' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20 group-hover:shadow-[0_5px_15px_rgba(14,165,233,0.2)]' :
                b.label === 'LUNCH' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 group-hover:shadow-[0_5px_15px_rgba(245,158,11,0.2)]' :
                b.label === 'FAMILY' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 group-hover:shadow-[0_5px_15px_rgba(244,63,94,0.2)]' :
                'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 group-hover:shadow-[0_5px_15px_rgba(16,185,129,0.3)]'
              }`}>
                <span className="text-xs font-mono font-bold tracking-widest">{b.label}</span>
              </div>
              <span className="text-xs font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">
                {b.start.toString().padStart(2, '0')}:00 - {b.end.toString().padStart(2, '0')}:00
              </span>
              {i < scheduleBlocks.length - 1 && <span className="text-zinc-700 ml-1">➔</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
