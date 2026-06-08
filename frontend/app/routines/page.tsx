'use client'
import { useState, useEffect } from 'react'
import { Plus, Play, Trash2, Shield, Zap, Target, X } from 'lucide-react'
import { getLocalISODate, getAPIUrl } from '@/components/dateUtils'

const API = getAPIUrl()

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // New Routine Form State
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newTasks, setNewTasks] = useState<{title: string, category: string, duration: number}[]>([])

  useEffect(() => {
    fetchRoutines()
  }, [])

  const fetchRoutines = async () => {
    try {
      const res = await fetch(`${API}/api/routines`)
      if (res.ok) setRoutines(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const deployRoutine = async (id: string) => {
    const today = getLocalISODate()
    const res = await fetch(`${API}/api/routines/${id}/deploy?date=${today}`, { method: 'POST' })
    if (res.ok) {
      alert("Protocol Successfully Deployed to Today's Dashboard!")
    }
  }

  const deleteRoutine = async (id: string) => {
    if(!confirm("Delete this Armory Protocol?")) return;
    await fetch(`${API}/api/routines/${id}`, { method: 'DELETE' })
    fetchRoutines()
  }

  const addTaskToNewRoutine = () => {
    setNewTasks([...newTasks, { title: '', category: 'Development', duration: 30 }])
  }

  const saveCustomRoutine = async () => {
    if (!newTitle.trim()) return alert("Needs a title!")
    if (newTasks.length === 0) return alert("Needs at least 1 task!")
    
    const newRoutine = {
      title: newTitle,
      description: newDesc,
      tasks: newTasks
    }
    
    await fetch(`${API}/api/routines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRoutine)
    })
    
    setIsModalOpen(false)
    setNewTitle('')
    setNewDesc('')
    setNewTasks([])
    fetchRoutines()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-900/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Shield size={16} className="text-amber-500" />
            <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100 uppercase">THE ARMORY (ROUTINES)</h1>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-1">Deploy pre-configured task bundles to your daily grid</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-amber-500/10 border border-amber-500/30 text-amber-500 px-4 py-2 rounded-lg font-mono text-xs font-semibold flex items-center gap-2 hover:bg-amber-500/25 transition shadow-[0_0_15px_rgba(251,191,36,0.1)]">
          <Plus size={14} /> NEW PROTOCOL
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {routines.map(r => (
          <div key={r._id} className="cinematic-panel border border-zinc-800/40 rounded-xl p-5 flex flex-col group">
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-lg font-bold font-mono text-zinc-100">{r.title}</h3>
              <button onClick={() => deleteRoutine(r._id)} className="text-zinc-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14}/></button>
            </div>
            <p className="text-xs text-zinc-500 mb-4 h-8">{r.description}</p>
            
            <div className="space-y-2 mb-6 flex-1">
              {r.tasks.map((t: any, i: number) => (
                <div key={i} className="bg-zinc-900/50 p-2 rounded flex items-center justify-between border border-zinc-800/50 text-xs font-mono">
                  <span className="text-zinc-300 truncate mr-2">{t.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 uppercase">{t.category}</span>
                    <span className="text-amber-500/80">{t.duration}m</span>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => deployRoutine(r._id)} className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 py-2.5 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-500/20 transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(52,211,153,0.05)]">
              <Zap size={14} /> DEPLOY PROTOCOL
            </button>
          </div>
        ))}

        {routines.length === 0 && !loading && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-xl">
             <Shield size={32} className="text-zinc-700 mb-3" />
             <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">Armory is Empty.</p>
             <p className="text-zinc-600 font-mono text-xs mt-1">Create a protocol bundle to begin.</p>
          </div>
        )}
      </div>

      {/* CREATE ROUTINE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-lg w-full relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold font-mono text-zinc-100 uppercase tracking-widest">Construct New Protocol</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-2 scrollbar-thin">
              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Protocol Title</label>
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Deep Work Morning" className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-300 focus:border-amber-500 outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Description</label>
                <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="e.g. My standard 3-hour deep work block" className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-300 focus:border-amber-500 outline-none transition-colors" />
              </div>

              <div className="mt-6 border-t border-zinc-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-[10px] font-mono text-zinc-500 uppercase">Task Manifest</label>
                  <button onClick={addTaskToNewRoutine} className="text-[10px] font-mono text-amber-500 hover:text-amber-400 flex items-center gap-1"><Plus size={10}/> Add Task</button>
                </div>
                
                <div className="space-y-3">
                  {newTasks.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-zinc-900/50 p-2 rounded border border-zinc-800/50">
                      <input 
                        type="text" 
                        value={t.title}
                        onChange={e => {
                          const nt = [...newTasks]
                          nt[idx].title = e.target.value
                          setNewTasks(nt)
                        }}
                        placeholder="Task Title"
                        className="flex-1 bg-transparent border-b border-zinc-700 text-xs font-mono text-zinc-300 px-1 py-1 outline-none focus:border-amber-500"
                      />
                      <select 
                        value={t.category}
                        onChange={e => {
                          const nt = [...newTasks]
                          nt[idx].category = e.target.value
                          setNewTasks(nt)
                        }}
                        className="bg-zinc-900 border border-zinc-700 text-[10px] font-mono text-zinc-400 p-1 rounded outline-none"
                      >
                        <option>Development</option>
                        <option>Health</option>
                        <option>Mindset</option>
                        <option>Routine</option>
                        <option>Others</option>
                      </select>
                      <input 
                        type="number" 
                        value={t.duration}
                        onChange={e => {
                          const nt = [...newTasks]
                          nt[idx].duration = parseInt(e.target.value) || 0
                          setNewTasks(nt)
                        }}
                        className="w-16 bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-300 p-1 rounded outline-none"
                      />
                      <span className="text-[10px] text-zinc-500 font-mono">min</span>
                      <button onClick={() => setNewTasks(newTasks.filter((_, i) => i !== idx))} className="text-zinc-600 hover:text-rose-400 ml-1"><X size={12}/></button>
                    </div>
                  ))}
                  {newTasks.length === 0 && <p className="text-[10px] font-mono text-zinc-600 italic">No tasks added to this protocol yet.</p>}
                </div>
              </div>
            </div>

            <button 
              onClick={saveCustomRoutine}
              className="w-full mt-6 shrink-0 bg-amber-500/10 border border-amber-500/30 text-amber-500 py-3 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all hover:scale-[1.02]"
            >
              <Zap size={14} /> SAVE PROTOCOL BUNDLE
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
