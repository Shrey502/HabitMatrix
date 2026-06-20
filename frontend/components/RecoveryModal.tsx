'use client'
import { useState, useEffect } from 'react'
import { X, Clock, AlertTriangle, ArrowRight, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { getAPIUrl } from '@/components/dateUtils'

export default function RecoveryModal({ 
  missedTasks, 
  onClose, 
  onComplete 
}: { 
  missedTasks: any[], 
  onClose: () => void, 
  onComplete: () => void 
}) {
  const [step, setStep] = useState<'review' | 'preview'>('review')
  const [proposedSchedule, setProposedSchedule] = useState<any[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  type Dest = 'today' | 'tomorrow' | 'skip'
  const [taskDestinations, setTaskDestinations] = useState<Record<string, Dest>>(() => {
    const init: Record<string, Dest> = {}
    missedTasks.forEach(t => init[t.id || t._id] = 'today')
    return init
  })
  const [currentDateIndex, setCurrentDateIndex] = useState(0)
  const sortOrder = 'oldest' // Enforce chronological order for carousel

  const tasksByDate = missedTasks.reduce((acc, task) => {
    if (!acc[task.date]) acc[task.date] = []
    acc[task.date].push(task)
    return acc
  }, {} as Record<string, any[]>)

  const sortedDates = Object.keys(tasksByDate).sort((a, b) => {
    return sortOrder === 'oldest' ? a.localeCompare(b) : b.localeCompare(a)
  })



  const handleCalculate = async () => {
    setIsProcessing(true)
    try {
      const res = await apiFetch(`${getAPIUrl()}/api/tasks/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_ids: Object.keys(taskDestinations).filter(id => taskDestinations[id] === 'today') })
      })
      const data = await res.json()
      setProposedSchedule(data.proposed_schedule || [])
      setWarnings(data.warnings || [])
      setStep('preview')
    } catch (err) {
      console.error(err)
      alert("Error calculating reschedule")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCommit = async () => {
    setIsProcessing(true)
    try {
      await apiFetch(`${getAPIUrl()}/api/tasks/reschedule/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          task_ids: Object.keys(taskDestinations).filter(id => taskDestinations[id] === 'today'),
          tomorrow_task_ids: Object.keys(taskDestinations).filter(id => taskDestinations[id] === 'tomorrow'),
          skipped_task_ids: Object.keys(taskDestinations).filter(id => taskDestinations[id] === 'skip')
        })
      })
      onComplete()
    } catch (err) {
      console.error(err)
      alert("Error committing reschedule")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDiscardAll = async () => {
    setIsProcessing(true)
    try {
      await apiFetch(`${getAPIUrl()}/api/tasks/reschedule/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_ids: [], skipped_task_ids: missedTasks.map(t => t.id || t._id) })
      })
      onComplete()
    } catch (err) {
      console.error(err)
      alert("Error committing discard")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center backdrop-blur-xl p-4 font-sans">
      <div className="bg-[#0A0A0A]/95 border border-white/10 p-8 rounded-[32px] w-full max-w-2xl shadow-[0_0_80px_rgba(0,0,0,0.8)] relative overflow-hidden">
        {/* Subtle top edge lighting */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        
        <div className="flex justify-between items-start mb-8 border-b border-white/5 pb-6">
          <div>
            <h2 className="text-xl font-medium text-zinc-100 tracking-wide flex items-center gap-3">
              <Clock className="text-zinc-400" size={22} />
              Recovery Assistant
            </h2>
            <p className="text-sm text-zinc-500 mt-2 tracking-wide font-light">You have uncompleted tasks from previous sessions. Choose what to carry over.</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {step === 'review' ? (
          <div className="space-y-6">
            <div className="flex flex-col h-[400px]">
              <div className="flex justify-between items-center mb-4 pb-2 px-2">
                <div className="flex items-center gap-3 bg-white/[0.03] rounded-full p-1 border border-white/5">
                  <button 
                    onClick={() => setCurrentDateIndex(prev => Math.max(0, prev - 1))} 
                    disabled={currentDateIndex === 0} 
                    className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-zinc-300 font-medium text-xs tracking-widest w-24 text-center">
                    {currentDateIndex + 1} OF {sortedDates.length}
                  </span>
                  <button 
                    onClick={() => setCurrentDateIndex(prev => Math.min(sortedDates.length - 1, prev + 1))} 
                    disabled={currentDateIndex === sortedDates.length - 1} 
                    className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTaskDestinations(prev => {
                      const next = { ...prev }
                      missedTasks.forEach(t => next[t.id || t._id] = 'today')
                      return next
                    })}
                    className="text-[11px] font-semibold tracking-wider text-zinc-400 hover:text-zinc-100 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-colors"
                  >
                    SELECT ALL
                  </button>
                  <button 
                    onClick={() => setTaskDestinations(prev => {
                      const next = { ...prev }
                      missedTasks.forEach(t => next[t.id || t._id] = 'skip')
                      return next
                    })}
                    className="text-[11px] font-semibold tracking-wider text-zinc-500 hover:text-zinc-300 bg-transparent hover:bg-white/5 px-4 py-2 rounded-full transition-colors"
                  >
                    DESELECT ALL
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin flex items-center justify-center">
                {sortedDates.length > 0 && (
                  (() => {
                    const date = sortedDates[currentDateIndex];
                    const dateTasks = tasksByDate[date];
                  const allSelectedForDate = dateTasks.every((t: any) => taskDestinations[t.id || t._id] === 'today');
                  
                  const toggleDateTasks = () => {
                    const next = { ...taskDestinations }
                    if (allSelectedForDate) {
                      dateTasks.forEach((t: any) => next[t.id || t._id] = 'skip')
                    } else {
                      dateTasks.forEach((t: any) => next[t.id || t._id] = 'today')
                    }
                    setTaskDestinations(next)
                  }

                  return (
                    <div key={date} className="w-full bg-[#18181A] border border-white/5 rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)] ring-1 ring-white/5 relative transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 zoom-in-[0.98] ease-out font-sans">
                      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                      
                      <div className="bg-white/[0.01] px-6 py-5 border-b border-white/5 flex justify-between items-center">
                        <h4 className="text-[15px] font-medium text-zinc-100 flex items-center gap-3 tracking-wide">
                          <Clock size={16} className="text-zinc-400" /> 
                          {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </h4>
                        <button 
                          onClick={toggleDateTasks}
                          className={`text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full transition-colors ${allSelectedForDate ? 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                          {allSelectedForDate ? 'DESELECT' : 'SELECT'}
                        </button>
                      </div>
                      <ul className="p-4 space-y-2 min-h-[220px]">
                        {dateTasks.map((t: any) => (
                          <li 
                            key={t.id || t._id} 
                            className="text-sm text-zinc-300 hover:bg-white/[0.03] p-3 rounded-2xl border border-transparent hover:border-white/5 flex items-center justify-between transition-all group" 
                          >
                            <div className="flex items-center gap-3">
                              <span className={`font-medium tracking-wide ${taskDestinations[t.id || t._id] === 'skip' ? 'line-through text-zinc-600' : 'text-zinc-200'}`}>{t.title}</span>
                            </div>
                            
                            {/* Hover Action Buttons */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setTaskDestinations(p => ({...p, [t.id || t._id]: 'today'})) }} 
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest transition-colors ${taskDestinations[t.id || t._id] === 'today' ? 'bg-zinc-200 text-black' : 'bg-white/10 text-zinc-300 hover:bg-white/20'}`}
                              >
                                TODAY
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setTaskDestinations(p => ({...p, [t.id || t._id]: 'tomorrow'})) }} 
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest transition-colors ${taskDestinations[t.id || t._id] === 'tomorrow' ? 'bg-blue-500 text-white' : 'bg-white/10 text-zinc-300 hover:bg-white/20'}`}
                              >
                                NEXT DAY
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setTaskDestinations(p => ({...p, [t.id || t._id]: 'skip'})) }} 
                                className={`p-1 rounded-full transition-colors ${taskDestinations[t.id || t._id] === 'skip' ? 'text-red-400 bg-red-500/10' : 'text-zinc-500 hover:bg-white/10 hover:text-zinc-300'}`}
                                title="Discard"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            
                            {/* Selected Badge (shows when not hovered) */}
                            <div className="group-hover:hidden flex items-center">
                               {taskDestinations[t.id || t._id] === 'today' && <span className="text-[10px] font-bold tracking-widest text-zinc-300 px-2.5 py-1 bg-white/10 rounded-full">TODAY</span>}
                               {taskDestinations[t.id || t._id] === 'tomorrow' && <span className="text-[10px] font-bold tracking-widest text-blue-400 px-2.5 py-1 bg-blue-500/10 rounded-full">NEXT DAY</span>}
                               {taskDestinations[t.id || t._id] === 'skip' && <span className="text-[10px] font-bold tracking-widest text-zinc-600 px-2.5 py-1 bg-zinc-800/50 rounded-full line-through">DISCARD</span>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })()
              )}</div>
            </div>
            
            <div className="flex gap-4 pt-4">
              <button 
                onClick={handleCalculate}
                disabled={isProcessing || Object.keys(taskDestinations).filter(id => taskDestinations[id] !== 'skip').length === 0}
                className="flex-1 bg-zinc-100 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-4 rounded-full tracking-wide text-sm transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                {isProcessing ? 'Calculating...' : 'Carry Over Selected'}
              </button>
              <button 
                onClick={handleDiscardAll}
                disabled={isProcessing}
                className="flex-1 bg-[#1A1A1A] border border-white/10 hover:bg-[#222] text-zinc-300 font-semibold py-4 rounded-full tracking-wide text-sm transition-all"
              >
                Discard All
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {warnings.length > 0 && (
               <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 space-y-3 shadow-inner">
                {warnings.map((w, i) => (
                  <p key={i} className="text-amber-500/90 text-sm font-medium flex items-start gap-3">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{w}</span>
                  </p>
                ))}
              </div>
            )}

            <div className="bg-[#18181A] border border-white/5 rounded-3xl p-6 shadow-inner">
              <h3 className="text-zinc-400 text-xs uppercase tracking-widest mb-4 font-semibold">Mathematical Proposal</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                {proposedSchedule.map((t, i) => (
                  <div key={i} className="text-sm bg-white/[0.02] p-4 rounded-2xl border border-white/5 flex flex-col gap-2 transition-all hover:bg-white/[0.04]">
                    <span className="text-zinc-100 font-medium">{t.title}</span>
                    <div className="flex items-center gap-3 text-xs font-medium">
                      <span className="text-zinc-500 line-through">{t.old_date}</span>
                      <ArrowRight size={12} className="text-zinc-600" />
                      <span className="text-zinc-300 bg-white/10 px-2 py-0.5 rounded-full">{t.new_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={handleCommit}
                disabled={isProcessing}
                className="flex-1 bg-zinc-100 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-4 rounded-full tracking-wide text-sm transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                {isProcessing ? 'Committing...' : 'Accept Shift'}
              </button>
              <button 
                onClick={() => setStep('review')}
                className="bg-[#1A1A1A] border border-white/10 hover:bg-[#222] text-zinc-300 font-semibold py-4 px-8 rounded-full tracking-wide text-sm transition-all"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
