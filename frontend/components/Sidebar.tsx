'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarDays, Grid3X3, BarChart2, Radio, KanbanSquare, BookOpen, Shield, Network, Clock, Brain, Settings } from 'lucide-react'
import GoogleCalendarSync from './GoogleCalendarSync'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/weekly',    icon: CalendarDays,    label: 'Weekly View' },
  { href: '/kanban',    icon: KanbanSquare,    label: 'Tasks Board' },
  { href: '/grid',      icon: Grid3X3,         label: 'Yearly Grid' },
  { href: '/analytics', icon: BarChart2,       label: 'Performance' },
  { href: '/telemetry', icon: Brain,           label: 'Insights' },
  { href: '/goals',     icon: Network,         label: 'Mind Map' },
  { href: '/schedule',  icon: Clock,           label: 'Time-Boxer' },
  { href: '/routines',  icon: Shield,          label: 'Routines' },
  { href: '/journal',   icon: BookOpen,        label: 'Journal' },
  { href: '/settings',  icon: Settings,        label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  const hiddenRoutes = ['/', '/architecture', '/auth', '/onboarding']
  if (hiddenRoutes.includes(pathname || '')) return null

  return (
    <aside className="w-64 bg-zinc-950/50 backdrop-blur-2xl border-r border-zinc-900/60 p-6 flex flex-col h-screen z-20 relative font-sans">
      {/* Logo Area */}
      <div className="mb-10 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
            <Radio size={14} className="text-blue-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 tracking-wide">HabitTracker</h2>
            <p className="text-[10px] text-zinc-500 tracking-wide mt-0.5">Personal Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-1.5">
        <p className="text-[10px] text-zinc-500 font-medium uppercase mb-2 px-2">Menu</p>
        
        {NAV.map(({ href, icon: Icon, label }) => {
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
                  size={16} 
                  className={`transition-colors duration-300 ${
                    isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-blue-400'
                  }`} 
                />
                <span className="font-medium">{label}</span>
              </div>
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
