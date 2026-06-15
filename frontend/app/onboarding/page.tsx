'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Sun, Moon, Sunrise, Battery, BatteryMedium, BatteryFull, Smartphone, Gamepad2, Tv, BrainCircuit, CheckCircle2, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

const questions = [
  {
    id: 'chronotype',
    title: 'Biological Peak Velocity',
    desc: 'When does your brain naturally operate at its highest cognitive capacity?',
    options: [
      { id: 'morning', icon: Sunrise, label: 'Early Morning (5am - 9am)' },
      { id: 'midday', icon: Sun, label: 'Mid-Day (10am - 2pm)' },
      { id: 'night', icon: Moon, label: 'Late Night (9pm - 2am)' },
    ]
  },
  {
    id: 'burnout',
    title: 'Cognitive Threshold',
    desc: 'How many hours of intense, uninterrupted deep work can you sustain before a biological crash?',
    options: [
      { id: '2h', icon: Battery, label: '2-3 Hours (Sprint Focus)' },
      { id: '4h', icon: BatteryMedium, label: '4-6 Hours (Sustained Load)' },
      { id: '8h', icon: BatteryFull, label: '8+ Hours (Extreme Endurance)' },
    ]
  },
  {
    id: 'leak',
    title: 'Primary Time Leak',
    desc: 'The engine needs to monitor a friction point. What is your most damaging behavioral loop?',
    options: [
      { id: 'doomscroll', icon: Smartphone, label: 'Algorithmic Feeds (Doomscrolling)' },
      { id: 'gaming', icon: Gamepad2, label: 'Interactive Media (Gaming)' },
      { id: 'netflix', icon: Tv, label: 'Passive Consumption (Streaming)' },
    ]
  }
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [weekoffs, setWeekoffs] = useState<number[]>([5, 6])
  const [routineTasks, setRoutineTasks] = useState<{title: string, category: string, time: string, endTime: string, duration: number}[]>([])
  const totalSteps = questions.length + 2;
  const router = useRouter()

  const calcDuration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60;
    return diff;
  }

  const handleSelect = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }))
  }

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1)
    } else {
      // Start calibration sequence
      setIsCalibrating(true)
    }
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  // Calibration Loading & Backend Submit
  useEffect(() => {
    if (isCalibrating) {
      const submitData = async () => {
        try {
          const { apiPost } = await import('../../lib/api')
          
          await apiPost('/api/auth/onboarding', {
            chronotype: answers['chronotype'],
            burnout: answers['burnout'],
            leak: answers['leak'],
            weekoffs: weekoffs,
            routine: routineTasks
          })

          // In AuthContext, checkAuth is called on mount, but we can just set this for fallback
          localStorage.setItem('onboarding_completed', 'true')
          
          setTimeout(() => {
            router.push('/dashboard')
          }, 3500)

        } catch (e) {
          console.error("Failed to save onboarding data", e)
          router.push('/dashboard') // Push anyway on demo error
        }
      }
      
      submitData()
    }
  }, [isCalibrating, router, answers])

  return (
    <div className="w-full min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>
      
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;600&display=swap');
      `}} />

      {/* Progress Bar */}
      {!isCalibrating && (
        <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900">
          <motion.div 
            className="h-full bg-blue-500"
            initial={{ width: "0%" }}
            animate={{ width: `${((step) / totalSteps) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      )}

      {isCalibrating ? (
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center flex flex-col items-center"
        >
          <div className="relative w-32 h-32 mb-8">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-2 border-dashed border-blue-500/30 rounded-full"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4 border-2 border-dashed border-emerald-500/30 rounded-full"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <BrainCircuit size={40} className="text-blue-400 animate-pulse" />
            </div>
          </div>
          
          <h2 className="text-3xl font-[600] text-white mb-3 tracking-tight">Calibrating Engine</h2>
          
          <div className="h-6">
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="text-zinc-400 font-[300]"
            >
              Setting biological burnout thresholds...
            </motion.p>
          </div>
        </motion.div>

      ) : (

        <div className="w-full max-w-2xl px-6 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <div className="text-center mb-12">
                <span className="text-blue-500 font-[600] text-sm uppercase tracking-widest mb-3 block">
                  Calibration {step + 1} of {totalSteps}
                </span>
                <h2 className="text-4xl md:text-5xl font-[600] text-white mb-4 tracking-tight">
                  {step < questions.length ? questions[step].title : step === questions.length ? 'Define Weekoffs' : 'Base Protocol'}
                </h2>
                <p className="text-lg text-zinc-400 font-[300]">
                  {step < questions.length ? questions[step].desc : step === questions.length ? 'When does your engine rest?' : 'What core actions must be executed daily?'}
                </p>
              </div>

              <div className="space-y-4">
                {step < questions.length && questions[step].options.map((opt) => {
                  const Icon = opt.icon
                  const isSelected = answers[questions[step].id] === opt.id
                  
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelect(questions[step].id, opt.id)}
                      className={`w-full flex items-center gap-4 p-5 rounded-2xl border text-left transition-all ${
                        isSelected 
                          ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                          : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        <Icon size={20} />
                      </div>
                      <span className={`flex-1 text-lg font-[400] ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                        {opt.label}
                      </span>
                      {isSelected && <CheckCircle2 className="text-blue-500" size={24} />}
                    </button>
                  )
                })}

                {step === questions.length && (
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 text-left">
                    <label className="block text-sm font-[400] text-zinc-400 mb-6">Select your off days. We will exclude Work/School tasks on these days.</label>
                    <div className="flex flex-wrap gap-3">
                      {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((day, idx) => (
                        <button 
                          key={idx}
                          onClick={() => setWeekoffs(weekoffs.includes(idx) ? weekoffs.filter(d => d !== idx) : [...weekoffs, idx])}
                          className={`px-4 py-3 rounded-xl text-sm font-[600] transition-all ${weekoffs.includes(idx) ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 hover:bg-zinc-800'}`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === questions.length + 1 && (
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 text-left">
                    <label className="block text-sm font-[400] text-zinc-400 mb-6">Define your core execution timeline. Input the immovable blocks of your daily schedule (e.g., Office Hours, Deep Work, Gym).</label>
                    
                    <div className="space-y-3 mb-6">
                      {routineTasks.map((t, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-zinc-900/80 p-3 rounded-xl border border-zinc-700/50">
                          <input 
                            type="text" 
                            value={t.title}
                            onChange={e => {
                              const nt = [...routineTasks]
                              nt[idx].title = e.target.value
                              setRoutineTasks(nt)
                            }}
                            placeholder="Task Title"
                            className="flex-1 bg-transparent border-b border-zinc-700 text-sm font-[400] text-zinc-300 px-2 py-1 outline-none focus:border-blue-500"
                          />
                          <select 
                            value={t.category}
                            onChange={e => {
                              const nt = [...routineTasks]
                              nt[idx].category = e.target.value
                              setRoutineTasks(nt)
                            }}
                            className="bg-zinc-800 border border-zinc-700 text-xs font-[400] text-zinc-400 p-2 rounded outline-none"
                          >
                            <option>Development</option>
                            <option>Health</option>
                            <option>Mindset</option>
                            <option>Routine</option>
                            <option>Work</option>
                            <option>Others</option>
                          </select>
                          <input 
                            type="time" 
                            value={t.time || ''}
                            onChange={e => {
                              const nt = [...routineTasks]
                              nt[idx].time = e.target.value
                              nt[idx].duration = calcDuration(e.target.value, t.endTime)
                              setRoutineTasks(nt)
                            }}
                            className="bg-zinc-800 border border-zinc-700 text-xs font-[400] text-zinc-300 p-2 rounded outline-none"
                          />
                          <span className="text-zinc-500 font-mono text-xs">to</span>
                          <input 
                            type="time" 
                            value={t.endTime || ''}
                            onChange={e => {
                              const nt = [...routineTasks]
                              nt[idx].endTime = e.target.value
                              nt[idx].duration = calcDuration(t.time, e.target.value)
                              setRoutineTasks(nt)
                            }}
                            className="bg-zinc-800 border border-zinc-700 text-xs font-[400] text-zinc-300 p-2 rounded outline-none"
                          />
                          <button onClick={() => setRoutineTasks(routineTasks.filter((_, i) => i !== idx))} className="text-zinc-500 hover:text-rose-400 ml-1 p-1"><X size={14}/></button>
                        </div>
                      ))}
                      {routineTasks.length === 0 && <p className="text-sm font-[300] text-zinc-600 italic">No timeline blocks defined. You can skip this step.</p>}
                    </div>
                    
                    <button 
                      onClick={() => setRoutineTasks([...routineTasks, { title: '', category: 'Routine', time: '09:00', endTime: '10:00', duration: 60 }])}
                      className="text-sm font-[600] text-blue-400 hover:text-blue-300 flex items-center gap-1 border border-blue-500/30 bg-blue-500/10 px-4 py-2 rounded-xl transition-all hover:bg-blue-500/20"
                    >
                      <Plus size={14}/> ADD TIMELINE BLOCK
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-12">
                <button 
                  onClick={handleBack}
                  disabled={step === 0}
                  className={`flex items-center gap-2 font-[400] transition-colors ${step === 0 ? 'text-zinc-800 cursor-not-allowed' : 'text-zinc-400 hover:text-white'}`}
                >
                  <ArrowLeft size={18} /> Back
                </button>
                <button 
                  onClick={handleNext}
                  disabled={step < questions.length && !answers[questions[step].id]}
                  className={`flex items-center gap-2 px-8 py-3 rounded-full font-[600] transition-all ${
                    (step < questions.length && !answers[questions[step].id])
                      ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed' 
                      : 'bg-white text-black hover:bg-zinc-200'
                  }`}
                >
                  {step === totalSteps - 1 ? 'Initialize Engine' : 'Continue'} <ArrowRight size={18} />
                </button>
              </div>

            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
