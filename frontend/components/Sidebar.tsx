'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarDays, Grid3X3, BarChart2, Radio, KanbanSquare, BookOpen, Shield, Network, Clock } from 'lucide-react'
import GoogleCalendarSync from './GoogleCalendarSync'

const NAV = [
  { href: '/',          icon: LayoutDashboard, label: 'Dashboard',    index: '01' },
  { href: '/weekly',    icon: CalendarDays,    label: 'Weekly Board', index: '02' },
  { href: '/kanban',    icon: KanbanSquare,    label: 'Mission Kanban', index: '03' },
  { href: '/grid',      icon: Grid3X3,         label: 'Yearly Grid',  index: '04' },
  { href: '/analytics', icon: BarChart2,       label: 'Analytics',    index: '05' },
  { href: '/goals',     icon: Network,         label: 'Mind Map',     index: '06' },
  { href: '/schedule',  icon: Clock,           label: 'Time-Boxer',   index: '07' },
  { href: '/routines',  icon: Shield,          label: 'The Armory',   index: '08' },
  { href: '/journal',   icon: BookOpen,        label: 'Captain\'s Log',index: '09' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-zinc-950/50 backdrop-blur-2xl border-r border-zinc-900/60 p-6 flex flex-col h-screen z-20 relative font-mono">
      {/* HUD Border top-left highlights */}
      <div className="absolute top-0 left-0 w-4 h-1 bg-amber-500/20" />
      <div className="absolute top-0 left-0 w-1 h-4 bg-amber-500/20" />

      {/* Logo Area */}
      <div className="mb-10 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/35 flex items-center justify-center animate-pulse">
            <Radio size={12} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 tracking-widest uppercase cinematic-glow">ENDURANCE</h2>
            <p className="text-[7px] text-zinc-650 tracking-widest mt-0.5">PRODUCTIVITY_OS_v4.9</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-2.5">
        <p className="text-[8px] text-zinc-600 tracking-widest uppercase mb-2 px-2">// NAVIGATION_LINKS</p>
        
        {NAV.map(({ href, icon: Icon, label, index }) => {
          const isActive = pathname === href
          return (
            <Link 
              key={href} 
              href={href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all duration-300 group text-xs ${
                isActive 
                  ? 'bg-zinc-900/60 border-zinc-800 text-slate-100 shadow-[inset_0_0_12px_rgba(255,255,255,0.02)]' 
                  : 'border-transparent text-zinc-500 hover:text-slate-100 hover:bg-zinc-900/30 hover:border-zinc-900/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon 
                  size={14} 
                  className={`transition-colors duration-300 ${
                    isActive ? 'text-amber-400' : 'text-zinc-650 group-hover:text-amber-400'
                  }`} 
                />
                <span className="font-semibold tracking-wide">{label}</span>
              </div>
              <span className={`text-[8px] font-bold ${
                isActive ? 'text-amber-500/80' : 'text-zinc-750 group-hover:text-zinc-500'
              }`}>
                [{index}]
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Google Calendar Connection Console */}
      <div className="mt-8 border-t border-zinc-900/80 pt-6">
        <GoogleCalendarSync />
      </div>
    </aside>
  )
}
