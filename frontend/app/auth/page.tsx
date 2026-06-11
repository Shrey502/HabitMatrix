'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, BrainCircuit, Mail, Lock, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/AuthContext'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const { login, register, isAuthenticated, user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.onboarding_completed) {
        router.push('/dashboard')
      } else {
        router.push('/onboarding')
      }
    }
  }, [isAuthenticated, user, isLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      let success = false;
      if (isLogin) {
        success = await login({ email, password })
      } else {
        success = await register({ name, email, password })
      }
      
      if (!success) {
        setError('Authentication failed')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    }
  }

  return (
    <div className="w-full min-h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>
      
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;600&display=swap');
      `}} />

      {/* Abstract Background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 blur-[150px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md p-8 md:p-12 bg-zinc-950/60 backdrop-blur-2xl border border-zinc-800/80 rounded-[2rem] shadow-2xl"
      >
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <BrainCircuit className="text-blue-400" size={24} />
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-[600] text-white tracking-tight mb-2">
            {isLogin ? "Welcome back." : "Initialize Profile."}
          </h1>
          <p className="text-zinc-400 font-[300] text-sm">
            {isLogin ? "Enter your credentials to access the engine." : "Create an account to calibrate your baseline."}
          </p>
        </div>

        {error && <div className="mb-4 text-rose-400 text-sm text-center bg-rose-500/10 border border-rose-500/30 rounded-lg p-2">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {!isLogin && (
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User size={18} className="text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-blue-500/50 focus:bg-zinc-900 transition-all font-[300]"
                placeholder="Full Name"
              />
            </div>
          )}

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail size={18} className="text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-blue-500/50 focus:bg-zinc-900 transition-all font-[300]"
              placeholder="Email Address"
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock size={18} className="text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-blue-500/50 focus:bg-zinc-900 transition-all font-[300]"
              placeholder="Password"
            />
          </div>

          <button 
            type="submit"
            className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-[600] py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2"
          >
            {isLogin ? "Access Engine" : "Create Account"} <ArrowRight size={18} />
          </button>

        </form>

        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-sm font-[300]">
            {isLogin ? "Don't have an account?" : "Already have a profile?"}
            <button 
              onClick={() => {setIsLogin(!isLogin); setError('');}}
              className="ml-2 text-white font-[400] hover:text-blue-400 transition-colors"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>

      </motion.div>
    </div>
  )
}
