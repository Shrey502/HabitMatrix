'use client'
import { useState, useEffect, useRef } from 'react'
import { Clock, GripVertical, AlertTriangle, Settings2, X, GripHorizontal, ZoomIn, ZoomOut, Magnet, Copy, Trash2, SplitSquareHorizontal } from 'lucide-react'
import { getLocalISODate, getAPIUrl } from '@/components/dateUtils'
import { motion, AnimatePresence } from 'framer-motion'

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
  
  // Zone Configuration
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [zones, setZones] = useState({
    sleep: { start: 23, end: 7 },
    office: { start: 9, end: 17 },
    family: { start: 18, end: 21 }
  })

  const [dragHoverMins, setDragHoverMins] = useState<number | null>(null)

  const timelineRef = useRef<HTMLDivElement>(null)
  const PX_PER_HOUR = zoomLevel
  const PX_PER_MIN = PX_PER_HOUR / 60
  const SNAP_THRESHOLD = 8 // minutes threshold for magnetic snap

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
    const res = await fetch(`${API}/api/tasks/date/${date}`)
    if (res.ok) setTasks(await res.json())
  }

  // --- Calculations ---
  const getDur = (s: number, e: number) => e < s ? (24 - s + e) * 60 : (e - s) * 60
  const totalSleep = getDur(zones.sleep.start, zones.sleep.end)
  const totalOffice = getDur(zones.office.start, zones.office.end)
  const totalFamily = getDur(zones.family.start, zones.family.end)
  
  const totalAllocated = totalSleep + totalOffice + totalFamily
  const theoreticalFreeTime = (24 * 60) - totalAllocated

  let freeTimeUsed = 0
  tasks.filter(t => t.time).forEach(t => {
      const [h, m] = t.time.split(':').map(Number)
      const isSleep = (zones.sleep.end < zones.sleep.start) ? (h >= zones.sleep.start || h < zones.sleep.end) : (h >= zones.sleep.start && h < zones.sleep.end)
      const isOffice = (zones.office.end < zones.office.start) ? (h >= zones.office.start || h < zones.office.end) : (h >= zones.office.start && h < zones.office.end)
      const isFamily = (zones.family.end < zones.family.start) ? (h >= zones.family.start || h < zones.family.end) : (h >= zones.family.start && h < zones.family.end)
      
      if (!isSleep && !isOffice && !isFamily) freeTimeUsed += (t.duration || 60)
  })

  const actualFreeTime = Math.max(0, theoreticalFreeTime - freeTimeUsed)
  const freeTimeHours = Math.floor(actualFreeTime / 60)
  const freeTimeMins = actualFreeTime % 60

  // --- API Sync Helpers ---
  const syncTaskBackend = async (taskId: string, updates: any) => {
    await fetch(`${API}/api/tasks/${taskId}`, {
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
       const s = timeStrToMins(t.time)
       return [s, s + (t.duration || 60)]
    })
  }

  const checkCollision = (bId: string, bStartMins: number, bDur: number) => {
    const bEndMins = bStartMins + bDur
    return tasks.find(A => {
      if (A._id === bId || !A.time) return false
      const aStartMins = timeStrToMins(A.time)
      const aEndMins = aStartMins + (A.duration || 60)
      return (bStartMins < aEndMins) && (bEndMins > aStartMins)
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
    const y = e.clientY - rect.top
    const rawMins = y / PX_PER_MIN
    
    // Magnetic Snap or 15m grid
    let snappedMins = rawMins
    const edges = getMagneticSnapEdges('')
    let snappedToEdge = false
    
    for (const edge of edges) {
       if (Math.abs(rawMins - edge) < SNAP_THRESHOLD) {
          snappedMins = edge
          snappedToEdge = true
          break
       }
    }
    
    if (!snappedToEdge) {
       snappedMins = Math.round(rawMins / 15) * 15
    }
    setDragHoverMins(snappedMins)
  }

  const handleDropOnTimeline = async (e: React.DragEvent) => {
    e.preventDefault()
    const finalMins = dragHoverMins || 0
    setDragHoverMins(null)
    
    const bId = e.dataTransfer.getData('taskId')
    if (!bId) return

    const B = tasks.find(t => t._id === bId)
    if (!B) return

    const timeStr = minsToTimeStr(finalMins)
    const bDur = B.duration || 60
    const collision = checkCollision(bId, finalMins, bDur)

    if (collision) {
       const aStart = timeStrToMins(collision.time)
       let completedMins = finalMins - aStart
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

    setTasks(prev => prev.map(t => t._id === bId ? { ...t, time: timeStr } : t))
    await syncTaskBackend(bId, { time: timeStr })
  }

  // --- Interactive Pointer Drag/Resize on Timeline ---
  const handlePointerDownTask = (e: React.PointerEvent, taskId: string, isResize: boolean) => {
    e.stopPropagation()
    const task = tasks.find(t => t._id === taskId)
    if (!task) return

    const startY = e.clientY
    const initialTimeMins = timeStrToMins(task.time)
    const initialDur = task.duration || 60
    const edges = getMagneticSnapEdges(taskId)

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startY
      const rawDeltaMins = deltaY / PX_PER_MIN

      setTasks(prev => prev.map(t => {
        if (t._id === taskId) {
          if (isResize) {
            let tentativeDur = initialDur + rawDeltaMins
            let tentativeEnd = initialTimeMins + tentativeDur
            let snapped = false
            
            for (const edge of edges) {
               if (Math.abs(tentativeEnd - edge) < SNAP_THRESHOLD) {
                  tentativeDur = edge - initialTimeMins
                  snapped = true
                  break
               }
            }
            if (!snapped) tentativeDur = Math.round(tentativeDur / 15) * 15
            
            return { ...t, duration: Math.max(10, tentativeDur) }
          } else {
            let tentativeStart = initialTimeMins + rawDeltaMins
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
            
            const newMins = Math.max(0, Math.min(24*60 - 10, tentativeStart))
            return { ...t, time: minsToTimeStr(newMins) }
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
        if (finalTask) syncTaskBackend(taskId, { time: finalTask.time, duration: finalTask.duration })
        return prev
      })
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  // --- De-fragmenter Engine ---
  const runDefragmenter = async () => {
    const allocated = [...tasks.filter(t => t.time)].sort((a, b) => timeStrToMins(a.time) - timeStrToMins(b.time))
    if (allocated.length === 0) return

    let currentMins = timeStrToMins(allocated[0].time)
    const updates = []
    const newTasks = [...tasks]
    
    for (const t of allocated) {
        const dur = t.duration || 60
        const newTimeStr = minsToTimeStr(currentMins)
        
        if (t.time !== newTimeStr) {
            updates.push({ id: t._id, time: newTimeStr })
            const idx = newTasks.findIndex(x => x._id === t._id)
            if (idx > -1) newTasks[idx] = { ...newTasks[idx], time: newTimeStr }
        }
        currentMins += dur
    }
    
    setTasks(newTasks)
    for (const update of updates) await syncTaskBackend(update.id, { time: update.time })
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
    await fetch(`${API}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newT) })
    fetchTasks()
  }

  const handleDuplicateTask = async (taskId: string) => {
    const t = tasks.find(x => x._id === taskId)
    if (!t) return
    const { _id, ...newT } = t
    newT.time = null // send to unallocated
    await fetch(`${API}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newT) })
    fetchTasks()
  }

  const handleKickTask = async (taskId: string) => {
    setTasks(prev => prev.map(x => x._id === taskId ? { ...x, time: null } : x))
    await syncTaskBackend(taskId, { time: null })
  }

  const getCatColor = (cat: string) => {
    if (cat === 'Development') return 'border-sky-500 text-sky-400 bg-sky-900/10'
    if (cat === 'Health') return 'border-emerald-500 text-emerald-400 bg-emerald-900/10'
    if (cat === 'Mindset') return 'border-purple-500 text-purple-400 bg-purple-900/10'
    return 'border-amber-500 text-amber-400 bg-amber-900/10'
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col space-y-6 max-w-7xl mx-auto">
      
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
           <button onClick={() => setIsConfigOpen(true)} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition">
              <Settings2 size={16} />
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
              {date === getLocalISODate() && (
                <div 
                  className="absolute left-16 right-0 z-50 pointer-events-none flex items-center shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all duration-1000"
                  style={{ top: `${(now.getHours() * PX_PER_HOUR) + (now.getMinutes() * PX_PER_MIN)}px` }}
                >
                  <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e] -translate-x-1" />
                  <div className="h-[1px] w-full bg-rose-500/80 shadow-[0_0_10px_#f43f5e]" />
                </div>
              )}

              {/* GRID */}
              <div className="absolute inset-0 flex flex-col pointer-events-none">
                {Array.from({length: 24}).map((_, hour) => {
                  const isSleep = (zones.sleep.end < zones.sleep.start) ? (hour >= zones.sleep.start || hour < zones.sleep.end) : (hour >= zones.sleep.start && hour < zones.sleep.end)
                  const isOffice = (zones.office.end < zones.office.start) ? (hour >= zones.office.start || hour < zones.office.end) : (hour >= zones.office.start && hour < zones.office.end)
                  const isFamily = (zones.family.end < zones.family.start) ? (hour >= zones.family.start || hour < zones.family.end) : (hour >= zones.family.start && hour < zones.family.end)
                  
                  const activeZone = isSleep ? { name: 'SLEEP', bg: 'bg-indigo-900/10', text: 'text-indigo-500/5' } 
                                   : isOffice ? { name: 'OFFICE', bg: 'bg-sky-900/5', text: 'text-sky-500/5' } 
                                   : isFamily ? { name: 'DINNER', bg: 'bg-rose-900/5', text: 'text-rose-500/5' } : null;

                  return (
                    <div key={hour} className={`flex border-b border-zinc-800/30 relative ${activeZone ? activeZone.bg : ''}`} style={{ height: `${PX_PER_HOUR}px` }}>
                      {activeZone && (
                        <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-5xl font-black italic tracking-tighter ${activeZone.text} pointer-events-none select-none z-0 overflow-hidden`}>
                            {activeZone.name}
                        </div>
                      )}
                      {/* 15 min sub-grids */}
                      <div className="absolute left-16 right-0 border-b border-zinc-800/10" style={{ top: '25%' }} />
                      <div className="absolute left-16 right-0 border-b border-zinc-800/20" style={{ top: '50%' }} />
                      <div className="absolute left-16 right-0 border-b border-zinc-800/10" style={{ top: '75%' }} />

                      <div className="w-16 border-r border-zinc-800/50 text-[10px] font-mono text-zinc-500 pt-2 flex justify-center uppercase select-none bg-zinc-950/40 backdrop-blur-sm z-10">
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
                  style={{ top: `${dragHoverMins * PX_PER_MIN}px`, height: `${60 * PX_PER_MIN}px` }}
                />
              )}

              {/* TASK BLOCKS */}
              <div className="absolute top-0 right-0 left-16 bottom-0 z-20">
                {tasks.filter(t => t.time).map(t => {
                  const startMins = timeStrToMins(t.time)
                  const dur = t.duration || 60
                  const topPx = startMins * PX_PER_MIN
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
    </div>
  )
}
