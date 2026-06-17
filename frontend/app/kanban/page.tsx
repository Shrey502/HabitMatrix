'use client'
import { useState, useEffect, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Clock, Pencil, Plus, AlertTriangle, Target, CheckCheck, ListTodo, Loader2 } from 'lucide-react'
import { getLocalISODate, getAPIUrl } from '@/components/dateUtils'
import { BADGE_COLORS } from '@/lib/constants'
import TaskModal from '@/components/TaskModal'
import { motion } from 'framer-motion'
import { apiFetch } from "@/lib/api";

const API = getAPIUrl()

const COLUMNS: { key: string; label: string; icon: React.ReactNode; accentClass: string; glowColor: string }[] = [
  { key: 'To-Do',       label: 'QUEUED',        icon: <ListTodo size={14} />,   accentClass: 'text-amber-400',   glowColor: 'rgba(251,191,36,0.15)' },
  { key: 'In Progress', label: 'IN EXECUTION',  icon: <Loader2 size={14} className="animate-spin" />, accentClass: 'text-sky-400', glowColor: 'rgba(56,189,248,0.15)' },
  { key: 'Done',        label: 'COMPLETED',     icon: <CheckCheck size={14} />, accentClass: 'text-emerald-400', glowColor: 'rgba(52,211,153,0.15)' },
]

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [completedFlash, setCompletedFlash] = useState<string | null>(null)

  const today = getLocalISODate()

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/api/tasks/date/${today}`)
      const data = await res.json()
      setTasks(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally { setLoading(false) }
  }, [today])

  useEffect(() => { 
    fetchTasks() 
    window.addEventListener('refresh_tasks', fetchTasks)
    return () => window.removeEventListener('refresh_tasks', fetchTasks)
  }, [fetchTasks])

  // Reorder within same column + move across columns
  const onDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result
    if (!destination) return

    const newStatus = destination.droppableId
    const previousTasks = [...tasks];

    // Same column reorder — just rearrange locally
    if (source.droppableId === destination.droppableId) {
      if (source.index === destination.index) return;
      setTasks(prev => {
        const colTasks = prev.filter(t => t.status === source.droppableId)
        const otherTasks = prev.filter(t => t.status !== source.droppableId)
        const [moved] = colTasks.splice(source.index, 1)
        colTasks.splice(destination.index, 0, moved)
        return [...otherTasks, ...colTasks]
      })
      return
    }

    // Cross-column move
    const wasDone = newStatus === 'Done'
    if (wasDone || newStatus === 'To-Do') {
      if (wasDone) {
        setCompletedFlash(draggableId)
        setTimeout(() => setCompletedFlash(null), 1200)
      }
      const saved = localStorage.getItem('pomodoro_state');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.taskId === draggableId) {
             localStorage.removeItem('pomodoro_state');
             window.dispatchEvent(new Event('sync_pomodoro'));
          }
        } catch(e){}
      }
    } else if (newStatus === 'In Progress') {
      const draggedTask = tasks.find(t => t._id === draggableId);
      if (draggedTask) {
        const saved = localStorage.getItem('pomodoro_state');
        let maintainTime = false;
        let existingLeft = 0;
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.taskId === draggableId && parsed.timeLeft > 0) {
               maintainTime = true;
               existingLeft = parsed.timeLeft;
            }
          } catch(e){}
        }
        
        const durationSecs = (draggedTask.duration || 25) * 60;
        const pomodoroState = {
          isActive: true,
          timeLeft: maintainTime ? existingLeft : durationSecs,
          initialTime: durationSecs,
          lastTick: Date.now(),
          taskId: draggableId
        };
        localStorage.setItem('pomodoro_state', JSON.stringify(pomodoroState));
        window.dispatchEvent(new Event('sync_pomodoro'));
      }
    }

    // Proper optimistic update: place the item at the EXACT destination index
    // If we don't, the DND library snaps it back.
    setTasks(prev => {
      const allTasks = [...prev]
      const draggedTaskIndex = allTasks.findIndex(t => t._id === draggableId)
      if (draggedTaskIndex > -1) {
        const [draggedTask] = allTasks.splice(draggedTaskIndex, 1)
        draggedTask.status = newStatus
        
        const newColTasks = allTasks.filter(t => t.status === newStatus)
        newColTasks.splice(destination.index, 0, draggedTask)
        
        const otherTasks = allTasks.filter(t => t.status !== newStatus)
        return [...otherTasks, ...newColTasks]
      }
      return prev
    })

    try {
      const res = await apiFetch(`${API}/api/tasks/${draggableId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error("Failed to update status")
      window.dispatchEvent(new Event('refresh_tasks'))
    } catch {
      // Revert optimistic update on failure
      setTasks(previousTasks)
    }
  }

  // --- Telemetry Calculations ---
  const totalTasks = tasks.length
  const doneTasks = tasks.filter(t => t.status === 'Done').length
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length
  const progressPercent = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100)

  const totalPlannedMinutes = tasks.reduce((sum, t) => sum + (t.duration || 0), 0)
  const executedMinutes = tasks.filter(t => t.status === 'Done').reduce((sum, t) => sum + (t.duration || 0), 0)
  const unallocatedCount = tasks.filter(t => (!t.time || !t.duration) && t.status !== 'Done').length

  return (
    <div className="space-y-5 h-full flex flex-col max-w-7xl mx-auto">
      {/* ─── Header ─── */}
      <div className="shrink-0">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h1 className="text-3xl font-extrabold font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500 uppercase">
              MISSION KANBAN
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-1 tracking-wider">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 px-5 py-2.5 rounded-xl font-mono text-xs font-bold tracking-widest transition-all duration-200 flex items-center gap-2.5 hover:shadow-[0_0_20px_rgba(251,191,36,0.12)] active:scale-[0.97]"
          >
            <Plus size={14} strokeWidth={3} /> NEW MISSION
          </button>
        </div>

        {/* ─── Telemetry Strip ─── */}
        <div className="grid grid-cols-4 gap-3">
          {/* Execution Progress */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Execution</span>
              <span className={`text-sm font-mono font-black ${progressPercent === 100 ? 'text-emerald-400' : progressPercent > 50 ? 'text-sky-400' : 'text-zinc-300'}`}>
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${progressPercent === 100 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-gradient-to-r from-amber-500 to-sky-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Task Count */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3 flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Completed</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-mono font-black text-emerald-400">{doneTasks}</span>
              <span className="text-[10px] font-mono text-zinc-600">/ {totalTasks}</span>
            </div>
          </div>

          {/* Time Telemetry */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3 flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Time Logged</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-mono font-black text-sky-400">{executedMinutes}</span>
              <span className="text-[10px] font-mono text-zinc-600">/ {totalPlannedMinutes}m</span>
            </div>
          </div>

          {/* Unallocated Warning */}
          <div className={`rounded-xl p-3 flex items-center justify-between border transition-colors duration-300 ${
            unallocatedCount > 0
              ? 'bg-rose-500/5 border-rose-500/20'
              : 'bg-zinc-900/50 border-zinc-800/60'
          }`}>
            <span className={`text-[10px] font-mono uppercase tracking-widest ${unallocatedCount > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
              Unallocated
            </span>
            <div className="flex items-center gap-1.5">
              {unallocatedCount > 0 && <AlertTriangle size={12} className="text-rose-400" />}
              <span className={`text-sm font-mono font-black ${unallocatedCount > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                {unallocatedCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Kanban Columns ─── */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex gap-5 h-full">
            {COLUMNS.map((col) => (
              <div key={col.key} className="flex-1 bg-zinc-900/20 rounded-2xl border border-zinc-800/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-5 h-full pb-4">
              {COLUMNS.map(col => {
                const colTasks = tasks.filter(t => t.status === col.key)
                return (
                  <Droppable key={col.key} droppableId={col.key}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 min-w-[300px] rounded-2xl flex flex-col overflow-hidden transition-all duration-300 border ${
                          snapshot.isDraggingOver
                            ? 'border-amber-500/40 bg-zinc-900/50'
                            : 'border-zinc-800/50 bg-zinc-950/30'
                        }`}
                        style={{
                          boxShadow: snapshot.isDraggingOver ? `0 0 30px ${col.glowColor}` : 'none',
                        }}
                      >
                        {/* Column Header */}
                        <div className="p-4 border-b border-zinc-800/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={col.accentClass}>{col.icon}</span>
                              <h2 className={`text-xs font-bold font-mono tracking-[0.2em] uppercase ${col.accentClass}`}>
                                {col.label}
                              </h2>
                            </div>
                            <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-md ${
                              col.key === 'Done' && colTasks.length > 0
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-zinc-800/80 text-zinc-500'
                            }`}>
                              {colTasks.length}
                            </span>
                          </div>
                        </div>

                        {/* Task Cards */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                          {colTasks.map((task, index) => (
                            <Draggable key={task._id} draggableId={task._id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`group relative rounded-xl border p-4 cursor-grab active:cursor-grabbing transition-colors duration-150 ${
                                    snapshot.isDragging
                                      ? 'border-amber-500/50 bg-zinc-900 shadow-[0_8px_25px_rgba(0,0,0,0.5)] z-50'
                                      : task.status === 'Done'
                                        ? 'border-emerald-500/15 bg-zinc-900/30'
                                        : 'border-zinc-800/60 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-zinc-700/70'
                                  }`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    boxShadow: completedFlash === task._id
                                      ? '0 0 25px rgba(52,211,153,0.3), inset 0 0 15px rgba(52,211,153,0.05)'
                                      : snapshot.isDragging ? undefined : (provided.draggableProps.style as any)?.boxShadow,
                                    transform: completedFlash === task._id ? 'scale(1.03)' : (provided.draggableProps.style as any)?.transform,
                                    transition: completedFlash === task._id ? 'all 0.3s ease-out' : (provided.draggableProps.style as any)?.transition,
                                  }}
                                >
                                  {/* Completion flash overlay */}
                                  {completedFlash === task._id && (
                                    <div className="absolute inset-0 rounded-xl bg-emerald-500/10 pointer-events-none animate-pulse" />
                                  )}

                                  {/* Unallocated warning badge */}
                                  {(!task.time || !task.duration) && task.status !== 'Done' && (
                                    <div className="absolute -top-2 -right-2 z-10">
                                      <div className="bg-zinc-950 border border-rose-500/40 text-rose-400 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                                        <AlertTriangle size={8} /> NO TIME
                                      </div>
                                    </div>
                                  )}

                                  {/* Category + Edit */}
                                  <div className="flex items-center justify-between gap-1.5 mb-2.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold tracking-wider border ${BADGE_COLORS[task.category as keyof typeof BADGE_COLORS] || BADGE_COLORS.Others}`}>
                                        {task.category?.toUpperCase()}
                                      </span>
                                      {task.routine_id && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-mono border border-purple-500/25 bg-purple-500/5 text-purple-400 flex items-center gap-0.5">
                                          <Target size={8} /> LINKED
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => setEditingTask(task)}
                                      className="text-zinc-600 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-all duration-150 p-1 rounded hover:bg-zinc-800"
                                    >
                                      <Pencil size={11} />
                                    </button>
                                  </div>

                                  {/* Title */}
                                  <p className={`text-[13px] font-semibold leading-snug mb-2 transition-colors ${
                                    task.status === 'Done'
                                      ? 'text-zinc-500 line-through decoration-emerald-500/40'
                                      : 'text-zinc-200 group-hover:text-white'
                                  }`}>
                                    {task.title}
                                  </p>

                                  {/* Time + Duration chip */}
                                  {(task.time || task.duration) && (
                                    <div className="flex items-center gap-2 mt-1">
                                      {task.time && (
                                        <div className={`text-[10px] font-mono flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                                          task.status === 'Done'
                                            ? 'border-emerald-500/15 text-emerald-500/50 bg-emerald-500/5'
                                            : 'border-zinc-800/60 text-zinc-400 bg-zinc-950/50'
                                        }`}>
                                          <Clock size={10} className={task.status === 'Done' ? 'text-emerald-500/50' : 'text-amber-500/60'} />
                                          {task.time}
                                        </div>
                                      )}
                                      {task.duration && (
                                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                                          task.status === 'Done'
                                            ? 'text-emerald-500/40 bg-emerald-500/5'
                                            : 'text-zinc-500 bg-zinc-800/40'
                                        }`}>
                                          {task.duration}m
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}

                          {/* Empty state */}
                          {colTasks.length === 0 && !snapshot.isDraggingOver && (
                            <div className="flex flex-col items-center justify-center py-12 opacity-30">
                              <span className={`${col.accentClass}`}>{col.icon}</span>
                              <p className="text-[10px] font-mono text-zinc-600 mt-2 tracking-widest uppercase">
                                {col.key === 'Done' ? 'No completions yet' : 'Drop tasks here'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Droppable>
                )
              })}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* ─── Modals ─── */}
      {isModalOpen && <TaskModal onClose={() => setIsModalOpen(false)} />}
      {editingTask && <TaskModal onClose={() => setEditingTask(null)} editTask={editingTask} />}
    </div>
  )
}
