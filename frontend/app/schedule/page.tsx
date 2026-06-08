'use client'
import { useState, useEffect } from 'react'
import { Clock, GripVertical, AlertTriangle } from 'lucide-react'
import { getLocalISODate, getAPIUrl } from '@/components/dateUtils'

const API = getAPIUrl()

interface Conflict {
  taskBId: string;
  taskAId: string;
  taskBHour: number;
  completedMinsA: number;
  remainingMinsA: number;
  taskBName: string;
  taskAName: string;
}

export default function SchedulePage() {
  const [date, setDate] = useState(getLocalISODate())
  const [tasks, setTasks] = useState<any[]>([])
  const [conflict, setConflict] = useState<Conflict | null>(null)
  
  const hours = Array.from({length: 24}, (_, i) => i)

  useEffect(() => {
    fetchTasks()
  }, [date])

  const fetchTasks = async () => {
    const res = await fetch(`${API}/api/tasks/date/${date}`)
    if (res.ok) setTasks(await res.json())
  }

  const updateTaskTime = async (taskId: string, hour: number | null) => {
    const timeStr = hour !== null ? `${hour.toString().padStart(2, '0')}:00` : null
    
    // Optimistic UI Update
    setTasks(tasks.map(t => t._id === taskId ? { ...t, time: timeStr } : t))

    // Backend Sync
    await fetch(`${API}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time: timeStr })
    })
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId)
  }

  const handleDropOnHour = (e: React.DragEvent, hour: number) => {
    e.preventDefault()
    const bId = e.dataTransfer.getData('taskId')
    if (!bId) return

    const B = tasks.find(t => t._id === bId)
    if (!B) return

    const bStart = hour
    const bDuration = B.duration || 60
    const bEnd = bStart + (bDuration / 60)

    // Check for collisions
    const overlappingTask = tasks.find(A => {
      if (A._id === B._id) return false
      if (!A.time) return false
      
      const aStart = parseInt(A.time.split(':')[0])
      const aDuration = A.duration || 60
      const aEnd = aStart + (aDuration / 60)
      
      // Strict overlap condition
      return (bStart < aEnd) && (bEnd > aStart)
    })

    if (overlappingTask) {
       const aStart = parseInt(overlappingTask.time.split(':')[0])
       const aDuration = overlappingTask.duration || 60
       
       let completedMins = (bStart - aStart) * 60
       if (completedMins < 0) completedMins = 0
       
       let remainingMins = aDuration - completedMins
       if (remainingMins < 0) remainingMins = 0

       setConflict({
         taskBId: B._id,
         taskAId: overlappingTask._id,
         taskBHour: hour,
         completedMinsA: completedMins,
         remainingMinsA: remainingMins,
         taskBName: B.title,
         taskAName: overlappingTask.title
       })
       return
    }

    updateTaskTime(bId, hour)
  }

  const resolveConflict = async () => {
    if (!conflict) return
    const { taskAId, taskBId, taskBHour, completedMinsA, remainingMinsA } = conflict
    
    setConflict(null) // Hide modal immediately
    
    // 1. Move Task B to its new target hour
    await updateTaskTime(taskBId, taskBHour)
    
    // 2. Handle Task A Splitting
    const A = tasks.find(t => t._id === taskAId)
    if (completedMinsA > 0 && A) {
      // Shrink Task A to just the completed portion
      await fetch(`${API}/api/tasks/${taskAId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: completedMinsA })
      })
      
      // Create Task A' (the remaining portion) and send it to Unallocated
      if (remainingMinsA > 0) {
        const { _id, id, ...newA } = A
        newA.duration = remainingMinsA
        newA.time = null // Kick to unallocated
        
        await fetch(`${API}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newA)
        })
      }
    } else {
      // Task B completely displaced Task A (e.g. dropped exactly at the same start time)
      await updateTaskTime(taskAId, null)
    }
    
    // Sync everything to reflect the newly created split task
    fetchTasks()
  }

  const handleDropOnUnallocated = (e: React.DragEvent) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    if (taskId) updateTaskTime(taskId, null)
  }

  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const unallocatedTasks = tasks.filter(t => !t.time)

  const getCatColor = (cat: string) => {
    if (cat === 'Development') return 'border-sky-500 text-sky-400'
    if (cat === 'Health') return 'border-emerald-500 text-emerald-400'
    if (cat === 'Mindset') return 'border-purple-500 text-purple-400'
    return 'border-amber-500 text-amber-400'
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col space-y-6">
      
      {/* COLLISION RESOLUTION MODAL */}
      {conflict && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-lg w-full relative overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />
            <div className="flex items-center gap-3 mb-4 text-rose-500">
               <AlertTriangle size={24} />
               <h3 className="text-lg font-bold font-mono tracking-widest uppercase">Time Collision Detected</h3>
            </div>
            <p className="text-sm font-mono text-zinc-300 mb-4">
              You are dropping <strong className="text-emerald-400">"{conflict.taskBName}"</strong> into a time block that is currently occupied by <strong className="text-amber-400">"{conflict.taskAName}"</strong>.
            </p>
            <div className="bg-zinc-900/50 border border-zinc-800/50 p-4 rounded-lg mb-6 text-xs font-mono text-zinc-400 space-y-2">
               <p>If you proceed, the system will automatically split <strong className="text-amber-400">"{conflict.taskAName}"</strong> into two separate tasks:</p>
               <ul className="list-disc pl-4 space-y-1.5 text-zinc-300 mt-2">
                 <li>Mark the first <span className="text-sky-400 font-bold">{conflict.completedMinsA} minutes</span> as completed prior to this interruption.</li>
                 <li>Extract the remaining <span className="text-rose-400 font-bold">{conflict.remainingMinsA} minutes</span> into a brand new unallocated task so you can reschedule the rest of the work later.</li>
               </ul>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setConflict(null)} className="flex-1 py-3 text-xs font-bold font-mono bg-zinc-900 text-zinc-400 rounded-lg hover:bg-zinc-800 transition">ABORT OVERRIDE</button>
              <button onClick={resolveConflict} className="flex-1 py-3 text-xs font-bold font-mono bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition">CONFIRM & SPLIT</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-none flex items-center justify-between border-b border-zinc-900/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Clock size={16} className="text-emerald-500" />
            <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100 uppercase">TIME-BOXER</h1>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-1">Drag and drop tasks into strict hourly execution blocks</p>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded p-2 text-sm font-mono focus:outline-none focus:border-amber-500" />
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        
        {/* 24-Hour Timeline */}
        <div className="flex-[3] bg-zinc-950/50 border border-zinc-800/40 rounded-xl cinematic-panel h-full relative flex flex-col">
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
            <div className="relative">
            {hours.map(hour => {
              const hourStr = `${hour.toString().padStart(2, '0')}:00`
              const hourTasks = tasks.filter(t => t.time === hourStr)

              return (
                <div 
                  key={hour} 
                  className="flex border-b border-zinc-800/50 relative min-h-[80px] group"
                  onDragOver={allowDrop}
                  onDrop={(e) => handleDropOnHour(e, hour)}
                >
                  <div className="w-16 border-r border-zinc-800/50 text-[10px] font-mono text-zinc-500 pt-2 flex justify-center uppercase select-none">
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </div>
                  
                  <div className="flex-1 p-2 flex flex-col gap-2 transition-colors hover:bg-zinc-900/30">
                    {hourTasks.length === 0 && (
                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-[9px] font-mono text-zinc-600 pointer-events-none uppercase tracking-widest">
                          Drag Task Here
                       </div>
                    )}
                    {hourTasks.map(t => (
                      <div 
                        key={t._id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, t._id)}
                        className={`bg-zinc-900 border-l-2 ${getCatColor(t.category)} p-2 rounded shadow flex items-center gap-3 cursor-grab hover:brightness-125 z-10 relative`}
                        style={{ minHeight: t.duration ? `${Math.max(40, (t.duration / 60) * 80)}px` : 'auto' }}
                      >
                        <GripVertical size={14} className="text-zinc-600" />
                        <div>
                          <p className="text-xs font-bold font-mono text-zinc-200">{t.title}</p>
                          <p className="text-[9px] font-mono text-zinc-500">{t.duration ? `${t.duration} min` : 'Duration unspecified'} • {t.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        </div>

        {/* Unallocated Tasks Sidebar */}
        <div 
          className="flex-[1] bg-zinc-900/40 border border-zinc-800/40 rounded-xl flex flex-col h-full cinematic-panel"
          onDragOver={allowDrop}
          onDrop={handleDropOnUnallocated}
        >
          <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono text-zinc-400 tracking-widest uppercase">Unallocated Tasks</h3>
            <span className="bg-zinc-800 text-zinc-300 text-[10px] px-2 py-0.5 rounded-full font-mono">{unallocatedTasks.length}</span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-3 scrollbar-thin">
            {unallocatedTasks.length === 0 ? (
              <div className="text-center text-zinc-600 mt-10">
                <AlertTriangle size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-[10px] font-mono uppercase tracking-widest">No unallocated tasks</p>
                <p className="text-[9px] font-mono mt-1 opacity-50">Create tasks on the dashboard first.</p>
              </div>
            ) : (
              unallocatedTasks.map(t => (
                <div 
                  key={t._id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, t._id)}
                  className={`bg-zinc-950/80 border border-zinc-800 border-l-4 ${getCatColor(t.category)} p-3 rounded-lg shadow-lg cursor-grab hover:border-zinc-600 transition-colors group`}
                >
                  <p className="text-xs font-bold font-mono text-zinc-200">{t.title}</p>
                  <p className="text-[9px] font-mono text-zinc-500 mt-1">{t.category}</p>
                  <div className="mt-2 text-[8px] font-mono text-emerald-500/0 group-hover:text-emerald-500/70 uppercase tracking-widest transition-colors flex items-center justify-between">
                    <span>Drag to timeline ➔</span>
                    {t.duration && <span className="text-amber-500/70">{t.duration}m</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
