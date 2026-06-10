'use client'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Activity, Clock, Zap, ArrowRight, Target, Brain, BarChart2, CheckCircle2, Shield, Network, Fingerprint } from 'lucide-react'
import { useRef, useState } from 'react'

// --- Advanced 3D Hover Card ---
function TiltCard({ children, className, depth = 30 }: { children: React.ReactNode, className?: string, depth?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    setRotateX(((y - centerY) / centerY) * -10)
    setRotateY(((x - centerX) / centerX) * 10)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setRotateX(0); setRotateY(0); }}
      animate={{ rotateX, rotateY, scale: isHovered ? 1.01 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ perspective: 1500 }}
      className={`relative ${className}`}
    >
      <div className="w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
        {children}
      </div>
    </motion.div>
  )
}

// --- Scrolling Feature Showcase ---
function FeatureShowcase() {
  const features = [
    {
      title: "Absolute Time Physics",
      desc: "A true 24-hour canvas. Stop writing lists; start allocating reality. Drag, drop, and split your habits with absolute precision.",
      icon: <Clock size={24} className="text-blue-400" />,
      color: "blue",
      stats: [ "Zero overlap conflicts", "Drag-and-drop allocations", "Midnight bridging" ]
    },
    {
      title: "Biological Burnout Model",
      desc: "The engine runs a moving average of your cognitive load. Push past 85% bandwidth for consecutive days, and the system mathematically enforces recovery.",
      icon: <Activity size={24} className="text-rose-400" />,
      color: "rose",
      stats: [ "Real-time strain tracking", "Algorithmic recovery limits", "Visual stress indicators" ]
    },
    {
      title: "Pearson Telemetry",
      desc: "Are your late nights destroying your morning focus? The engine cross-references every habit you track and calculates the exact mathematical correlation.",
      icon: <BarChart2 size={24} className="text-emerald-400" />,
      color: "emerald",
      stats: [ "Automated correlation matrices", "Identify toxic habits", "Prove what works" ]
    }
  ]

  return (
    <div className="py-24 relative z-20">
      <div className="text-center mb-20 relative z-20">
        <h2 className="text-3xl md:text-5xl font-semibold text-white mb-4 tracking-tight">Intelligence, not just lists.</h2>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto font-light">
          HabitTracker is a fully integrated statistical engine designed to dissect, analyze, and optimize your psychological bandwidth.
        </p>
      </div>

      <div className="space-y-32">
        {features.map((feat, i) => (
          <div key={i} className={`flex flex-col ${i % 2 !== 0 ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-16 relative z-20`}>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="flex-1 space-y-6"
            >
              <div className={`w-12 h-12 rounded-full bg-${feat.color}-500/10 border border-${feat.color}-500/30 flex items-center justify-center mb-6`}>
                {feat.icon}
              </div>
              <h3 className="text-3xl font-semibold text-white tracking-tight">{feat.title}</h3>
              <p className="text-lg text-zinc-400 font-light leading-relaxed">{feat.desc}</p>
              
              <ul className="mt-8 space-y-3">
                {feat.stats.map((stat, sIdx) => (
                  <li key={sIdx} className="flex items-center gap-3 text-zinc-400 font-light text-sm">
                    <CheckCircle2 size={16} className={`text-${feat.color}-400`} />
                    {stat}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="flex-1 w-full"
            >
              <TiltCard className="w-full aspect-video rounded-3xl bg-zinc-900/50 backdrop-blur-3xl border border-zinc-800 p-8 shadow-2xl flex items-center justify-center overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br from-${feat.color}-500/5 to-transparent opacity-50 pointer-events-none`} />
                
                {/* Abstract UI Representation */}
                {i === 0 && (
                  <div className="w-full h-full flex flex-col gap-4 relative" style={{ transform: 'translateZ(30px)' }}>
                    <div className="h-10 w-full bg-zinc-950 rounded-lg border border-zinc-800 flex items-center px-4"><div className="w-24 h-3 bg-blue-500/40 rounded-full" /></div>
                    <div className="h-20 w-3/4 bg-blue-500/10 rounded-lg border border-blue-500/30 ml-8 backdrop-blur-md" style={{ transform: 'translateZ(20px)' }} />
                    <div className="h-10 w-full bg-zinc-950 rounded-lg border border-zinc-800 flex items-center px-4"><div className="w-32 h-3 bg-amber-500/40 rounded-full" /></div>
                  </div>
                )}
                {i === 1 && (
                  <div className="relative w-40 h-40" style={{ transform: 'translateZ(40px)' }}>
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#27272a" strokeWidth="8" fill="none" />
                      <circle cx="50" cy="50" r="40" stroke="#f43f5e" strokeWidth="8" fill="none" strokeDasharray="200 251.2" className="animate-pulse" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-semibold text-rose-400">82%</span>
                      <span className="text-[10px] text-rose-500/70 uppercase tracking-widest mt-1">Strain</span>
                    </div>
                  </div>
                )}
                {i === 2 && (
                  <div className="w-full h-full grid grid-cols-2 gap-4" style={{ transform: 'translateZ(30px)' }}>
                    {[1,2,3,4].map(x => (
                      <div key={x} className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between">
                        <div className="flex justify-between items-center"><div className="w-12 h-2 bg-zinc-800 rounded-full"/><div className={`w-6 h-2 rounded-full ${x%2===0?'bg-emerald-500/50':'bg-rose-500/50'}`}/></div>
                        <div className="w-full h-1 bg-zinc-800 rounded-full mt-4"><div className={`h-full w-${x+2}/6 ${x%2===0?'bg-emerald-500/80':'bg-rose-500/80'} rounded-full`}/></div>
                      </div>
                    ))}
                  </div>
                )}
              </TiltCard>
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LandingPage() {
  const { scrollYProgress } = useScroll()
  const yHero = useTransform(scrollYProgress, [0, 1], [0, 200])
  const opacityHero = useTransform(scrollYProgress, [0, 0.4], [1, 0])

  return (
    <div className="w-full min-h-screen flex flex-col font-sans overflow-x-hidden relative bg-[#050505]">
      
      {/* Import Premium Font */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;600&display=swap');
      `}} />

      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 blur-[150px] pointer-events-none z-0 rounded-full" />

      <div className="max-w-6xl mx-auto w-full px-6 relative z-10 flex flex-col" style={{ fontFamily: "'Outfit', sans-serif" }}>
        
        {/* Navbar - Tightly spaced */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex items-center justify-between py-6 relative z-50"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
            </div>
            <span className="font-semibold text-xl tracking-tight text-white">HT.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/architecture" className="text-zinc-400 hover:text-white text-sm font-medium transition-colors relative z-50">
              Architecture
            </Link>
            <Link 
              href="/auth" 
              className="px-5 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors relative z-50 cursor-pointer"
            >
              Open App
            </Link>
          </div>
        </motion.header>

        {/* Hero Section - Fixed gap using pt instead of flex centering */}
        <div className="relative pt-20 pb-32 flex flex-col items-center text-center">
          
          <motion.div style={{ y: yHero, opacity: opacityHero }} className="flex flex-col items-center relative z-40 w-full">
            
            {/* Elegant, thin-to-thick text */}
            <motion.h1 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 1, ease: "easeOut" }}
              className="text-[4rem] sm:text-6xl md:text-[7rem] lg:text-[8rem] tracking-tighter text-white leading-none relative group flex items-center justify-center gap-0"
            >
              <span className="font-[200] text-zinc-300">Habit</span>
              <span className="font-[600] text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 relative">
                Tracker
                
                {/* Sophisticated Tracking Animation */}
                <motion.div 
                  className="absolute -bottom-2 left-0 h-[2px] bg-emerald-400"
                  initial={{ width: "0%", left: "0%" }}
                  animate={{ 
                    width: ["0%", "100%", "0%"], 
                    left: ["0%", "0%", "100%"] 
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                
                {/* Subdued Scanning glow */}
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 w-1/4 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg]"
                />
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-lg md:text-xl text-zinc-400 mt-8 mb-12 max-w-2xl font-[300] leading-relaxed"
            >
              A predictive behavioral engine that mathematically calculates your cognitive bandwidth, prevents burnout, and optimizes your daily output.
            </motion.p>
            
            {/* HERO BUTTONS */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-4 relative z-50"
            >
              <Link 
                href="/auth" 
                className="group relative z-50 flex items-center gap-2 px-8 py-3 rounded-full bg-blue-600 text-white text-sm font-[600] hover:bg-blue-500 transition-all cursor-pointer"
              >
                Initialize Engine <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/architecture" 
                className="relative z-50 flex items-center gap-2 px-8 py-3 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-[400] hover:bg-zinc-800 hover:text-white transition-all cursor-pointer"
              >
                <Network size={16} /> Data Workflow
              </Link>
            </motion.div>
          </motion.div>

        </div>
      </div>
        
      {/* Lower Sections */}
      <div className="max-w-6xl mx-auto w-full px-6">
        <FeatureShowcase />
        
        {/* Footer CTA */}
        <div className="py-24 flex flex-col items-center text-center relative z-50">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full max-w-3xl"
          >
            <h2 className="text-3xl md:text-5xl font-semibold text-white mb-8 tracking-tight">Time to compile your life.</h2>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors cursor-pointer relative z-50"
            >
              Start Operating <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
