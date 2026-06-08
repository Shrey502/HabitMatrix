'use client'
import { useState, useEffect } from 'react'
import { BookOpen, Sparkles, Brain, Flame, Activity, CheckCircle2, AlertTriangle, Hash } from 'lucide-react'
import { getLocalISODate, getAPIUrl } from '@/components/dateUtils'

const API = getAPIUrl()

const TAGS = ['#FlowState', '#Distracted', '#HighEnergy', '#Burnout', '#GoodSleep', '#PoorSleep', '#Anxious', '#Motivated']

export default function JournalPage() {
  const [date, setDate] = useState(getLocalISODate())
  const [journal, setJournal] = useState({ mood_score: 5, energy_score: 5, reflection: '', tags: [] as string[] })
  const [dayStats, setDayStats] = useState({ total: 0, done: 0 })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Fetch Journal Entry
    fetch(`${API}/api/journal/${date}`)
      .then(r => r.ok ? r.json() : { mood_score: 5, energy_score: 5, reflection: '', tags: [] })
      .then(d => setJournal(d))
      .catch(() => {})

    // Fetch Day's Tasks for Correlation
    fetch(`${API}/api/tasks/date/${date}`)
      .then(r => r.ok ? r.json() : [])
      .then(tasks => {
        const done = tasks.filter((t: any) => t.status === 'Done').length
        setDayStats({ total: tasks.length, done })
      })
      .catch(() => {})
  }, [date])

  const toggleTag = (t: string) => {
    const newTags = journal.tags.includes(t) 
      ? journal.tags.filter(x => x !== t) 
      : [...(journal.tags || []), t]
    setJournal({ ...journal, tags: newTags })
  }

  const saveJournal = async () => {
    setIsSaving(true)
    await fetch(`${API}/api/journal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...journal, date })
    })
    setTimeout(() => {
       setIsSaving(false)
       alert("Captain's Log Encrypted & Saved!")
    }, 600)
  }

  const getMoodColor = (score: number) => {
    if (score >= 8) return 'text-emerald-400'
    if (score >= 5) return 'text-amber-400'
    return 'text-rose-400'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 h-full pb-10">
      <div className="flex items-center justify-between border-b border-zinc-900/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <BookOpen size={16} className="text-sky-500" />
            <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100 uppercase">CAPTAIN'S LOG</h1>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-1">End-of-day execution review and biometric correlation</p>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded p-2 text-sm font-mono focus:border-sky-500 outline-none transition-colors" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Data & Biometrics */}
        <div className="space-y-6">
          {/* HUD Stats */}
          <div className="cinematic-panel border border-zinc-800/40 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4 border-b border-zinc-800/50 pb-2">
              <Activity size={14} className="text-sky-400" />
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Execution Telemetry</span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-3xl font-bold font-mono text-zinc-100">{dayStats.done} <span className="text-sm text-zinc-600">/ {dayStats.total}</span></p>
                <p className="text-[9px] font-mono text-zinc-500 uppercase mt-1">Tasks Completed</p>
              </div>
              <div className="text-right">
                 {dayStats.total > 0 ? (
                    <div className="text-emerald-400 font-mono font-bold text-lg">{Math.round((dayStats.done / dayStats.total) * 100)}%</div>
                 ) : (
                    <div className="text-zinc-600 font-mono font-bold text-lg">N/A</div>
                 )}
                 <p className="text-[9px] font-mono text-zinc-500 uppercase mt-1">Daily Win Rate</p>
              </div>
            </div>
          </div>

          {/* Biometrics */}
          <div className="cinematic-panel border border-zinc-800/40 rounded-xl p-5 space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-800/50 pb-2 mb-2">
              <Brain size={14} className="text-purple-400" />
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Biometric Sliders</span>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold font-mono text-zinc-300 uppercase">Mental State (Mood)</label>
                <span className={`font-mono font-bold ${getMoodColor(journal.mood_score)}`}>{journal.mood_score} / 10</span>
              </div>
              <input type="range" min="1" max="10" value={journal.mood_score} onChange={e => setJournal({...journal, mood_score: parseInt(e.target.value)})} className="w-full accent-purple-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
              <div className="flex justify-between text-[8px] font-mono text-zinc-600 mt-1 uppercase"><span>Depressed</span><span>Euphoric</span></div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold font-mono text-zinc-300 uppercase">Physical Energy</label>
                <span className={`font-mono font-bold ${getMoodColor(journal.energy_score)}`}>{journal.energy_score} / 10</span>
              </div>
              <input type="range" min="1" max="10" value={journal.energy_score} onChange={e => setJournal({...journal, energy_score: parseInt(e.target.value)})} className="w-full accent-orange-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
              <div className="flex justify-between text-[8px] font-mono text-zinc-600 mt-1 uppercase"><span>Exhausted</span><span>Limitless</span></div>
            </div>
          </div>

          {/* Tags */}
          <div className="cinematic-panel border border-zinc-800/40 rounded-xl p-5">
             <div className="flex items-center gap-2 mb-4 border-b border-zinc-800/50 pb-2">
              <Hash size={14} className="text-amber-400" />
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Correlation Tags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(t => {
                const isActive = journal.tags?.includes(t)
                return (
                  <button 
                    key={t}
                    onClick={() => toggleTag(t)}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-all border ${isActive ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(251,191,36,0.2)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Reflection */}
        <div className="lg:col-span-2 cinematic-panel border border-zinc-800/40 rounded-xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-800/50 pb-3">
             <AlertTriangle size={16} className="text-rose-400" />
             <span className="text-xs font-bold font-mono text-zinc-100 uppercase tracking-widest">Debriefing & Reflection</span>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4 mb-4">
             <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 border-b border-zinc-800 pb-1">Guided Analysis Parameters</p>
             <ul className="text-xs font-mono text-zinc-400 space-y-1 ml-2 list-disc list-inside">
                <li>What was your biggest victory today?</li>
                <li>What caused friction or distraction?</li>
                <li>How can you optimize tomorrow's execution?</li>
             </ul>
          </div>

          <textarea 
            value={journal.reflection}
            onChange={e => setJournal({...journal, reflection: e.target.value})}
            className="flex-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-200 font-mono text-sm focus:ring-1 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all outline-none resize-none"
            placeholder="Initialize text sequence..."
          />

          <button 
            onClick={saveJournal}
            disabled={isSaving}
            className="w-full mt-6 bg-sky-500/10 border border-sky-500/30 text-sky-400 py-3.5 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 hover:bg-sky-500/20 transition-all hover:scale-[1.01] shadow-[0_0_20px_rgba(14,165,233,0.1)]"
          >
            {isSaving ? <span className="animate-pulse">UPLOADING...</span> : <><Sparkles size={16} /> COMMIT LOG TO DATABASE</>}
          </button>
        </div>

      </div>
    </div>
  )
}
