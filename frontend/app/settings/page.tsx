'use client'
import { useRouter } from 'next/navigation'
import { LogOut, Settings as SettingsIcon } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'

export default function SettingsPage() {
  const router = useRouter()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
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
