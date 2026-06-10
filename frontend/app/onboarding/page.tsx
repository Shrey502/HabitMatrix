'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Sun, Moon, Sunrise, Battery, BatteryMedium, BatteryFull, Smartphone, Gamepad2, Tv, BrainCircuit, CheckCircle2 } from 'lucide-react'
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
  const router = useRouter()

  const handleSelect = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }))
  }

  const handleNext = () => {
    if (step < questions.length - 1) {
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
          const userId = localStorage.getItem('token')
          if (!userId) {
            router.push('/auth')
            return
          }

          await fetch('http://localhost:8000/api/auth/onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              chronotype: answers['chronotype'],
              burnout: answers['burnout'],
              leak: answers['leak']
            })
          })

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
            animate={{ width: `${((step) / questions.length) * 100}%` }}
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
                  Calibration {step + 1} of {questions.length}
                </span>
                <h2 className="text-4xl md:text-5xl font-[600] text-white mb-4 tracking-tight">
                  {questions[step].title}
                </h2>
                <p className="text-lg text-zinc-400 font-[300]">
                  {questions[step].desc}
                </p>
              </div>

              <div className="space-y-4">
                {questions[step].options.map((opt) => {
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
                  disabled={!answers[questions[step].id]}
                  className={`flex items-center gap-2 px-8 py-3 rounded-full font-[600] transition-all ${
                    !answers[questions[step].id] 
                      ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed' 
                      : 'bg-white text-black hover:bg-zinc-200'
                  }`}
                >
                  {step === questions.length - 1 ? 'Initialize Engine' : 'Continue'} <ArrowRight size={18} />
                </button>
              </div>

            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
