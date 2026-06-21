'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { LogOut, Settings as SettingsIcon, Cpu, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'

export default function SettingsPage() {
  const router = useRouter()
  const { logout } = useAuth()
  const [ecoMode, setEcoMode] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mode = localStorage.getItem('performance_mode') === 'true'
      setEcoMode(mode)
    }
  }, [])

  const handleLogout = () => {
    logout()
  }

  const toggleEcoMode = () => {
    const newVal = !ecoMode
    setEcoMode(newVal)
    localStorage.setItem('performance_mode', newVal.toString())
    // Dispatch a custom event to notify CinematicBackground and other listeners immediately
    window.dispatchEvent(new Event('performance_mode_changed'))
  }

  return (
    <div className="p-8 max-w-2xl text-slate-100">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <SettingsIcon className="text-blue-500" />
          Settings
        </h1>
        <p className="text-zinc-500 mt-2">Manage your account and behavioral engine preferences.</p>
      </div>

      {/* Performance Preferences */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="text-blue-400" size={20} />
          <h2 className="text-xl font-semibold text-zinc-100">Performance Preferences</h2>
        </div>
        <p className="text-sm text-zinc-400 mb-6">
          Optimize application workload. If you experience lags or want to extend laptop battery life, enable Eco Mode.
        </p>

        <div className="flex items-center justify-between p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-zinc-200">Eco-Performance Mode</p>
            <p className="text-xs text-zinc-500 mt-1">Disables live starfield animations and reduces background ticks to achieve 0% idle CPU utilization.</p>
          </div>
          <button 
            onClick={toggleEcoMode}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${ecoMode ? 'bg-emerald-500' : 'bg-zinc-700'}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${ecoMode ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-rose-400">Danger Zone</h2>
        <p className="text-sm text-zinc-400 mb-6">
          Logging out will end your current active session. You will need to re-authenticate to access the engine.
        </p>
        
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-400 rounded-lg font-medium transition-all"
        >
          <LogOut size={18} />
          Log Out
        </button>
      </div>

      <div className="bg-zinc-900/20 border border-zinc-800/40 rounded-xl p-6 text-center text-zinc-500 text-sm">
        More settings modules (Notification Preferences, Data Export, Integrations) are currently under development.
      </div>
    </div>
  )
}
