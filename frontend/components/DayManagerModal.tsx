'use client'
import { X, CheckCircle2, Circle, Plus, Clock } from 'lucide-react'

interface DayManagerProps {
  date: string;
  tasks: any[];
  onClose: () => void;
  onToggleTask: (id: string, currentStatus: string) => void;
  onOpenNewTask: (date: string) => void;
}

const BADGE_COLORS = { Development: 'bg-accent-dev/20 text-accent-dev', Health: 'bg-accent-health/20 text-accent-health', Mindset: 'bg-accent-mind/20 text-accent-mind', Routine: 'bg-accent-routine/20 text-accent-routine', Others: 'bg-zinc-800 text-zinc-400' }

export default function DayManagerModal({ date, tasks, onClose, onToggleTask, onOpenNewTask }: DayManagerProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-zinc-100">Tasks for {date}</h2>
            <p className="text-sm text-zinc-400 mt-1">{tasks.length} total tasks scheduled</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100 transition">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
          {tasks.length === 0 ? (
            <p className="text-zinc-500 italic text-center py-4">No tasks scheduled for this day.</p>
          ) : (
            tasks.map(task => (
              <div key={task._id} className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 flex justify-between items-start shadow-inner">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${BADGE_COLORS[task.category as keyof typeof BADGE_COLORS] || 'bg-zinc-800 text-zinc-400'}`}>
                      {task.category}
                    </span>
                    {task.time && (
                      <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800/60">
                        <Clock size={10} className="text-zinc-650" />
                        <span>{task.time}</span>
                        {task.duration && <span className="text-zinc-600">({task.duration}m)</span>}
                      </span>
                    )}
                  </div>
                  <p className={`mt-2 font-medium ${task.status === 'Done' ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                    {task.title}
                  </p>
                </div>
                <button onClick={() => onToggleTask(task._id, task.status)}>
                  {task.status === 'Done' ? <CheckCircle2 className="text-green-500" /> : <Circle className="text-zinc-600 hover:text-zinc-400" />}
                </button>
              </div>
            ))
          )}
        </div>

        <button 
          onClick={() => {
            onClose();
            onOpenNewTask(date);
          }}
          className="w-full bg-zinc-800 text-zinc-100 font-bold py-2.5 rounded-md hover:bg-zinc-700 transition flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Add Task for this Day
        </button>
      </div>
    </div>
  )
}