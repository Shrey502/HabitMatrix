'use client'
import { useState, useEffect, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Clock, Calendar, CheckCircle2, Circle, Pencil, Plus } from 'lucide-react'
import { getLocalISODate, getAPIUrl } from '@/components/dateUtils'
import { BADGE_COLORS } from '@/lib/constants'
import TaskModal from '@/components/TaskModal'

const API = getAPIUrl()

const COLUMNS = ['To-Do', 'In Progress', 'Done']

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  
  const today = getLocalISODate()

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/tasks/date/${today}`)
      const data = await res.json()
      setTasks(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally { setLoading(false) }
  }, [today])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const onDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId) return

    const newStatus = destination.droppableId
    
    // Optimistic UI update
    setTasks(prev => prev.map(t => t._id === draggableId ? { ...t, status: newStatus } : t))
    
    try {
      await fetch(`${API}/api/tasks/${draggableId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
    } catch (err) {
      // Revert on failure
      fetchTasks()
    }
  }

  return (
    <div className="space-y-6 h-full flex flex-col max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400 uppercase">
            MISSION KANBAN
          </h1>
          <p className="text-sm text-zinc-400 font-medium mt-1.5 flex items-center gap-2">
            <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/25 px-4 py-2.5 rounded-xl font-mono text-xs font-semibold tracking-wider transition-all duration-300 flex items-center gap-2 shadow-[0_0_15px_rgba(251,191,36,0.02)]"
        >
          <Plus size={14} /> NEW MISSION
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex gap-6 h-full">
            {COLUMNS.map((_, i) => (
              <div key={i} className="flex-1 bg-zinc-900/30 rounded-2xl border border-zinc-800/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-6 h-full overflow-x-auto pb-4 custom-scrollbar">
              {COLUMNS.map(col => {
                const colTasks = tasks.filter(t => t.status === col)
                return (
                  <Droppable key={col} droppableId={col}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 min-w-[320px] rounded-2xl flex flex-col overflow-hidden cinematic-panel transition-colors duration-300 ${
                          snapshot.isDraggingOver ? 'bg-zinc-900/60 border-amber-500/30' : 'bg-zinc-950/40 border-zinc-800/60'
                        }`}
                      >
                        <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/30">
                          <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold font-mono tracking-widest uppercase text-zinc-300">
                              {col}
                            </h2>
                            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs font-mono">
                              {colTasks.length}
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                          {colTasks.map((task, index) => (
                            <Draggable key={task._id} draggableId={task._id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`group relative rounded-xl border p-4 transition-all duration-200 ${
                                    snapshot.isDragging 
                                      ? 'border-amber-500/50 bg-zinc-900/90 shadow-[0_10px_30px_rgba(251,191,36,0.15)] z-50 scale-105' 
                                      : 'border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700/80'
                                  }`}
                                  style={provided.draggableProps.style}
                                >
                                  <div className="flex items-center justify-between gap-1.5 mb-2.5">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold tracking-wider border ${BADGE_COLORS[task.category as keyof typeof BADGE_COLORS] || BADGE_COLORS.Others}`}>
                                      {task.category?.toUpperCase()}
                                    </span>
                                    <button 
                                      onClick={() => setEditingTask(task)}
                                      className="text-zinc-500 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-zinc-900 rounded"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                  </div>
                                  
                                  <p className="text-sm font-semibold leading-snug mb-3 text-slate-100 group-hover:text-white transition-colors">
                                    {task.title}
                                  </p>
                                  
                                  {task.time && (
                                    <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5 bg-zinc-950/50 w-fit px-2 py-1 rounded-md border border-zinc-800/50">
                                      <Clock size={12} className="text-amber-500/70" />
                                      <span className="font-medium text-zinc-300">{task.time}</span>
                                      {task.duration && <span className="text-zinc-500 ml-1">({task.duration}m)</span>}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
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

      {isModalOpen && <TaskModal onClose={() => setIsModalOpen(false)} />}
      {editingTask && <TaskModal onClose={() => setEditingTask(null)} editTask={editingTask} />}
    </div>
  )
}
