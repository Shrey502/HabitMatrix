'use client'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { CheckCircle2, Zap, Brain, Target, CalendarDays, Activity, Flame, Shield, ArrowRight, LayoutDashboard, Sparkles, Coffee } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { useState, useEffect } from 'react'

// Animated Aurora Background
function AuroraBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-zinc-950">
      <div className="absolute -inset-[10px] opacity-50">
        <motion.div
          animate={{
            transform: ['translate(0%, 0%) scale(1)', 'translate(-5%, 5%) scale(1.05)', 'translate(5%, -5%) scale(0.95)', 'translate(0%, 0%) scale(1)'],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/30 blur-[120px] mix-blend-screen"
        />
        <motion.div
          animate={{
            transform: ['translate(0%, 0%) scale(1)', 'translate(5%, -5%) scale(1.1)', 'translate(-5%, 5%) scale(0.9)', 'translate(0%, 0%) scale(1)'],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-purple-600/20 blur-[150px] mix-blend-screen"
        />
        <motion.div
          animate={{
            transform: ['translate(0%, 0%)', 'translate(10%, 10%)', 'translate(-10%, -10%)', 'translate(0%, 0%)'],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[20%] left-[30%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[130px] mix-blend-screen"
        />
      </div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
    </div>
  )
}

function FloatingHabitCard({ title, icon: Icon, color, delay, x, y, rotation }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: y + 50, x, rotate: rotation - 10 }}
      animate={{ opacity: 1, y, x, rotate: rotation }}
      transition={{ duration: 1.5, delay, type: "spring", bounce: 0.4 }}
      className={`absolute hidden lg:flex items-center gap-3 bg-zinc-900/60 backdrop-blur-xl border border-zinc-700/50 p-4 rounded-2xl shadow-xl z-0`}
    >
      <div className={`w-10 h-10 rounded-full bg-${color}-500/20 flex items-center justify-center`}>
        <Icon className={`text-${color}-400`} size={20} />
      </div>
      <div className="text-left">
        <p className="text-sm font-semibold text-white whitespace-nowrap">{title}</p>
        <p className="text-xs text-zinc-400">Completed</p>
      </div>
    </motion.div>
  )
}

export default function LandingPage() {
  const { scrollYProgress } = useScroll()
  const yHeroText = useTransform(scrollYProgress, [0, 0.3], [0, 100])
  const opacityHero = useTransform(scrollYProgress, [0, 0.3], [1, 0])
  const { isAuthenticated } = useAuth()

  return (
    <div className="w-full min-h-screen font-sans text-zinc-100 overflow-x-hidden selection:bg-blue-500/30">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}} />

      <AuroraBackground />

      {/* Floating Glass Navbar */}
      <motion.nav 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-4xl bg-zinc-900/40 backdrop-blur-2xl border border-zinc-700/50 rounded-full px-6 py-3 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">HabitMatrix</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="/workflow" className="hover:text-white transition-colors">How it Works</Link>
        </div>

        <Link 
          href={isAuthenticated ? "/dashboard" : "/auth"} 
          className="bg-white text-zinc-950 px-5 py-2 rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.3)]"
        >
          Open App
        </Link>
      </motion.nav>

      {/* Hero Section */}
      <div className="relative pt-40 pb-20 md:pt-52 md:pb-32 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        
        {/* Floating Background Cards */}
        <FloatingHabitCard title="Morning Run" icon={Activity} color="emerald" delay={0.2} x="-350px" y="-50px" rotation={-8} />
        <FloatingHabitCard title="Deep Work" icon={Target} color="blue" delay={0.4} x="350px" y="20px" rotation={6} />
        <FloatingHabitCard title="Read 10 Pages" icon={Brain} color="purple" delay={0.6} x="-300px" y="150px" rotation={5} />
        <FloatingHabitCard title="Hydrate" icon={Coffee} color="cyan" delay={0.5} x="300px" y="-100px" rotation={-5} />

        <motion.div style={{ y: yHeroText, opacity: opacityHero }} className="relative z-10 max-w-4xl mx-auto">
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Organize your life, effortlessly.
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-500 leading-[1.1] pb-4"
          >
            Master your habits.<br />Avoid burnout.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 text-lg md:text-2xl text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            A beautifully simple workspace to plan your day, build routines that stick, and actually feel good doing it.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link 
              href={isAuthenticated ? "/dashboard" : "/auth"} 
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2"
            >
              Get Started Free <ArrowRight size={20} />
            </Link>
            <Link 
              href="/workflow" 
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-lg transition-all flex items-center justify-center gap-2"
            >
              See how it works
            </Link>
          </motion.div>

        </motion.div>
      </div>

      {/* Bento Box Features Section */}
      <div id="features" className="max-w-6xl mx-auto px-6 py-24 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Everything you need.<br/>Nothing you don't.</h2>
          <p className="text-zinc-400 text-lg mt-4 max-w-xl mx-auto">Designed for humans, not robots. Say goodbye to overwhelming lists and hello to visual clarity.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Bento Item 1: Large Span */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="md:col-span-2 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 backdrop-blur-xl border border-zinc-800 p-8 rounded-3xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-6">
                <CalendarDays size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Visual Time-Boxing</h3>
              <p className="text-zinc-400 text-lg mb-8 max-w-md">Drag and drop your tasks onto a beautiful timeline. See exactly how your day unfolds.</p>
              
              {/* Mini Interactive UI */}
              <div className="mt-auto w-full h-40 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 p-4 relative overflow-hidden">
                <div className="absolute top-4 left-4 right-4 h-12 bg-zinc-800/50 rounded-lg flex items-center px-4 gap-3">
                  <div className="w-4 h-4 rounded-full border-2 border-zinc-600" />
                  <div className="h-2 w-24 bg-zinc-600 rounded-full" />
                </div>
                <motion.div 
                  animate={{ y: [0, 4, 0] }} transition={{ duration: 4, repeat: Infinity }}
                  className="absolute top-8 left-8 right-8 h-16 bg-blue-500/20 border border-blue-500/40 rounded-lg flex items-center px-4 gap-3 shadow-lg backdrop-blur-md"
                >
                  <div className="w-4 h-4 rounded-full bg-blue-400" />
                  <div className="h-2 w-32 bg-blue-400/80 rounded-full" />
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Bento Item 2: Tall */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} delay={0.1}
            className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 backdrop-blur-xl border border-zinc-800 p-8 rounded-3xl relative overflow-hidden flex flex-col"
          >
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center mb-6 relative z-10">
              <Shield size={24} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 relative z-10">Burnout Protection</h3>
            <p className="text-zinc-400 text-lg mb-8 relative z-10">We track your energy levels and gently remind you when it's time to rest.</p>
            
            <div className="mt-auto relative w-full aspect-square bg-zinc-950/50 rounded-2xl border border-zinc-800/50 flex flex-col items-center justify-center z-10">
              <svg viewBox="0 0 100 100" className="w-24 h-24 transform -rotate-90">
                <circle cx="50" cy="50" r="40" stroke="#27272a" strokeWidth="8" fill="none" />
                <motion.circle 
                  initial={{ strokeDasharray: "0 251.2" }}
                  whileInView={{ strokeDasharray: "150 251.2" }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  cx="50" cy="50" r="40" stroke="#f43f5e" strokeWidth="8" fill="none" strokeLinecap="round" 
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold text-white">60%</span>
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Energy</span>
              </div>
            </div>
          </motion.div>

          {/* Bento Item 3: Wide */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="md:col-span-3 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 backdrop-blur-xl border border-zinc-800 p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-center gap-12"
          >
            <div className="absolute top-1/2 left-1/2 w-full h-full bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
            
            <div className="flex-1 z-10">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mb-6">
                <Brain size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Smart Insights</h3>
              <p className="text-zinc-400 text-lg">Connect the dots. See exactly how your sleep affects your focus, or how exercise boosts your mood. Real insights, effortlessly presented to you.</p>
            </div>

            <div className="flex-1 w-full flex justify-center z-10">
              <div className="relative w-full max-w-sm h-48 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 p-6 flex flex-col justify-between overflow-hidden">
                <div className="flex justify-between items-end h-full gap-3">
                  {[40, 60, 30, 80, 50, 90, 70].map((height, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${height}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.1 }}
                      className="w-full bg-gradient-to-t from-emerald-500/20 to-emerald-400/80 rounded-t-md relative group"
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white font-bold">
                        {height}%
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

          </motion.div>

        </div>
      </div>

      {/* Footer CTA */}
      <div className="relative py-32 mt-12 overflow-hidden border-t border-zinc-900">
        <div className="absolute inset-0 bg-blue-600/5" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">Stop planning. Start doing.</h2>
          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">Join thousands of users building better habits and taking back control of their time.</p>
          <Link 
            href={isAuthenticated ? "/dashboard" : "/auth"} 
            className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-white text-zinc-950 text-lg font-bold hover:bg-zinc-200 hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]"
          >
            Create Your Profile <ArrowRight size={20} />
          </Link>
        </div>
      </div>
      
    </div>
  )
}
