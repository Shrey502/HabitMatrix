'use client'
import { useState, useEffect } from 'react'
import { X, Clock, Trash2 } from 'lucide-react'
import { getLocalISODate, getAPIUrl } from '@/components/dateUtils'

export default function TaskModal({ onClose, defaultDate, editTask }: { onClose: () => void, defaultDate?: string, editTask?: any }) {
  const [title, setTitle] = useState(editTask?.title || '')
  const [category, setCategory] = useState(editTask?.category || 'Auto')
  const [time, setTime] = useState(editTask?.time || '') 
  const [durationPreset, setDurationPreset] = useState(editTask?.duration ? 'custom' : 'none')
  const [customDuration, setCustomDuration] = useState(editTask?.duration?.toString() || '60')
  const [reminder, setReminder] = useState(editTask?.reminder_minutes?.toString() || '15')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const date = editTask?.date || defaultDate || getLocalISODate()
    
    let parsedDuration: number | null = null
    if (time) {
      if (durationPreset === 'custom') {
        parsedDuration = parseInt(customDuration, 10) || 60
      } else if (durationPreset !== 'none') {
        parsedDuration = parseInt(durationPreset, 10)
      }
    }

    try {
      const isEditing = !!editTask;
      const url = isEditing 
        ? `${getAPIUrl()}/api/tasks/${editTask._id}` 
        : `${getAPIUrl()}/api/tasks`

      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          category, 
          status: editTask?.status || 'To-Do', 
          date,
          time: time || null, 
          duration: parsedDuration,
          reminder_minutes: parseInt(reminder, 10)
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error("Backend Error Details:", errorData)
        throw new Error(JSON.stringify(errorData.detail || 'Failed to save task'))
      }
      
      onClose()
      window.location.reload() 
    } catch (error) {
      console.error("Fetch failed:", error)
      alert(`Error saving task: ${error instanceof Error ? error.message : "Is the backend running?"}`)
    }
  }

  const handleDelete = async () => {
    if (!editTask) return
    if (!confirm("Are you sure you want to delete this task?")) return
    
    try {
      const res = await fetch(`${getAPIUrl()}/api/tasks/${editTask._id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error("Failed to delete")
      onClose()
      window.location.reload()
    } catch (e) {
      console.error(e)
      alert("Error deleting task")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800/80 p-6 rounded-xl w-full max-w-md shadow-2xl font-mono relative">
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-3">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
            {editTask ? '// Edit Task' : defaultDate ? `// Schedule for ${defaultDate}` : '// New Task'}
          </h2>
          <div className="flex items-center gap-2">
            {editTask && (
              <button onClick={handleDelete} className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded transition">
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100 transition p-1.5">
              <X size={18} />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">Task Title</label>
            <input 
              required 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-accent-dev transition" 
              placeholder="E.g., Read book, Exercise..." 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">Category</label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value)} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-150 focus:outline-none focus:border-accent-dev transition"
              >
                <option value="Auto">Auto (AI Categorize)</option>
                <option value="Development">Development</option>
                <option value="Health">Health</option>
                <option value="Mindset">Mindset</option>
                <option value="Routine">Routine</option>
                <option value="Others">Others</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">Start Time (Optional)</label>
              <input 
                type="time" 
                value={time} 
                onChange={e => setTime(e.target.value)} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-accent-dev transition [color-scheme:dark]" 
              />
            </div>
          </div>

          {time && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-zinc-950/40 rounded-lg border border-zinc-900/60 animate-fadeIn">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">Duration</label>
                <select 
                  value={durationPreset} 
                  onChange={e => setDurationPreset(e.target.value)} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-150 focus:outline-none focus:border-accent-dev transition"
                >
                  <option value="none">Untimed (Default)</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                  <option value="180">3 hours</option>
                  <option value="custom">Custom min</option>
                </select>
              </div>

              {durationPreset === 'custom' && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">Minutes</label>
                  <input 
                    type="number"
                    min="1"
                    max="1440"
                    value={customDuration}
                    onChange={e => setCustomDuration(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-accent-dev transition"
                  />
                </div>
              )}
              
              <div className="col-span-2">
                <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">Reminder</label>
                <select 
                  value={reminder} 
                  onChange={e => setReminder(e.target.value)} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-150 focus:outline-none focus:border-accent-dev transition"
                >
                  <option value="0">At start time</option>
                  <option value="5">5 minutes before</option>
                  <option value="10">10 minutes before</option>
                  <option value="15">15 minutes before</option>
                  <option value="30">30 minutes before</option>
                  <option value="60">1 hour before</option>
                </select>
              </div>
            </div>
          )}
          
          <button type="submit" className={`w-full font-bold py-2.5 rounded-md transition mt-4 text-xs tracking-wider uppercase shadow-lg ${
            editTask 
              ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700' 
              : 'bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/25 shadow-[0_0_15px_rgba(251,191,36,0.02)]'
          }`}>
            {editTask ? 'Save Changes' : 'Create Task'}
          </button>
        </form>
      </div>
    </div>
  )
}