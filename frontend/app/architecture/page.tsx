'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock, Zap, Target, Activity, Brain, ShieldCheck, Server, Database, BarChart2 } from 'lucide-react'

// --- Animated SVG Path Component ---
const DataPath = ({ d, color = "stroke-blue-500", delay = 0 }: { d: string, color?: string, delay?: number }) => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
    <path 
      d={d} 
      fill="none" 
      className={`${color} opacity-20`} 
      strokeWidth="2" 
    />
    <motion.path 
      d={d} 
      fill="none" 
      className={color} 
      strokeWidth="3"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ 
        duration: 2, 
        repeat: Infinity, 
        ease: "linear",
        delay: delay
      }}
      style={{ filter: "drop-shadow(0 0 8px currentColor)" }}
    />
  </svg>
)

const ModuleNode = ({ title, desc, icon: Icon, delay, x, y, color }: any) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, type: "spring", stiffness: 200 }}
    className={`absolute w-64 bg-zinc-950/80 backdrop-blur-xl border border-${color}-500/30 p-5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-10 group hover:border-${color}-400 transition-colors`}
    style={{ left: x, top: y }}
  >
    <div className={`absolute -top-3 -right-3 w-8 h-8 rounded-full bg-${color}-500/10 border border-${color}-500/30 flex items-center justify-center`}>
      <div className={`w-2 h-2 rounded-full bg-${color}-400 animate-pulse`} />
    </div>
    <div className={`w-10 h-10 rounded-xl bg-${color}-500/10 flex items-center justify-center mb-3`}>
      <Icon className={`text-${color}-400`} size={20} />
    </div>
    <h3 className="text-white font-bold mb-1">{title}</h3>
    <p className="text-zinc-400 text-xs leading-relaxed">{desc}</p>
  </motion.div>
)

export default function ArchitecturePage() {
  return (
    <div className="w-full min-h-screen bg-[#030305] text-zinc-100 overflow-hidden relative font-sans">
      
      {/* Premium Font Injection */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700;900&display=swap');
        .font-outfit { font-family: 'Outfit', sans-serif; }
      `}} />

      {/* Subtle Grid Background */}
      <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#3f3f46 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <div className="absolute top-8 left-8 z-50">
        <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all text-sm font-medium">
          <ArrowLeft size={16} /> Return to UI
        </Link>
      </div>

      <div className="text-center pt-20 relative z-20 font-outfit">
        <h1 className="text-5xl font-black text-white mb-4 tracking-tight">Data Workflow Topology</h1>
        <p className="text-zinc-400 font-medium">The lifecycle of a habit calculation inside the engine.</p>
      </div>

      {/* Architecture Canvas (1200x800 logical grid) */}
      <div className="relative w-[1200px] h-[800px] mx-auto mt-16 transform scale-75 md:scale-100 origin-top font-outfit">
        
        {/* SVG DATA PATHS */}
        {/* Input to DB */}
        <DataPath d="M 300 150 C 450 150, 450 400, 550 400" color="stroke-blue-500" delay={0} />
        <DataPath d="M 300 400 C 400 400, 450 400, 550 400" color="stroke-blue-500" delay={0.2} />
        <DataPath d="M 300 650 C 450 650, 450 400, 550 400" color="stroke-blue-500" delay={0.4} />

        {/* DB to Python Engine */}
        <DataPath d="M 650 400 L 750 400" color="stroke-indigo-500" delay={1} />
        
        {/* Engine to Outputs */}
        <DataPath d="M 850 400 C 900 400, 900 200, 1000 200" color="stroke-emerald-500" delay={1.5} />
        <DataPath d="M 850 400 C 900 400, 900 600, 1000 600" color="stroke-emerald-500" delay={1.7} />

        {/* COLUMN 1: SENSORY INPUTS (X: 50) */}
        <ModuleNode 
          title="Timebox Allocations" 
          desc="You insert your daily schedule by dragging time blocks on the 24-hour canvas. The system automatically logs exact start/end times to find 'leaks' in your day."
          icon={Clock} 
          delay={0.1} 
          x={50} y={100} 
          color="blue" 
        />
        <ModuleNode 
          title="Action Kanban" 
          desc="You log micro-tasks as you complete them in the Kanban board. The system tracks your raw execution speed and daily completion velocity."
          icon={Target} 
          delay={0.2} 
          x={50} y={350} 
          color="blue" 
        />
        <ModuleNode 
          title="Routine Armor" 
          desc="You simply check off your baseline habits (e.g., Morning workout). The system records this as a binary success metric for the day."
          icon={ShieldCheck} 
          delay={0.3} 
          x={50} y={600} 
          color="blue" 
        />

        {/* COLUMN 2: STORAGE (X: 500) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 }}
          className="absolute w-32 h-32 bg-zinc-900 border-2 border-indigo-500/50 rounded-full flex items-center justify-center z-10 shadow-[0_0_50px_rgba(99,102,241,0.2)] group"
          style={{ left: 520, top: 336 }}
        >
          <Database size={40} className="text-indigo-400 group-hover:scale-110 transition-transform" />
        </motion.div>

        {/* COLUMN 3: PYTHON ENGINE (X: 750) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2 }}
          className="absolute w-72 bg-indigo-950/40 backdrop-blur-xl border-2 border-indigo-500/50 p-6 rounded-3xl z-10 shadow-[0_0_80px_rgba(99,102,241,0.3)]"
          style={{ left: 700, top: 260 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Server size={24} className="text-indigo-400" />
            <h2 className="text-2xl font-black text-white">Statistical Engine</h2>
          </div>
          <p className="text-indigo-200 text-sm mb-4 leading-relaxed">The backend takes your raw manual inputs and runs complex standard deviations and moving averages in real-time behind the scenes.</p>
          <div className="space-y-2">
            <div className="bg-zinc-950/50 px-3 py-2 rounded border border-indigo-500/30 text-xs text-indigo-300 font-mono">
              def calculate_pearson_matrix():
            </div>
            <div className="bg-zinc-950/50 px-3 py-2 rounded border border-indigo-500/30 text-xs text-indigo-300 font-mono">
              def burnout_moving_average():
            </div>
          </div>
        </motion.div>

        {/* COLUMN 4: TELEMETRY OUTPUTS (X: 1000) */}
        <ModuleNode 
          title="Burnout Visualization" 
          desc="You visualize your mental strain via a live Burnout Gauge on the dashboard. It warns you visually if you are pushing past your biological capacity."
          icon={Activity} 
          delay={1.8} 
          x={1000} y={150} 
          color="emerald" 
        />
        <ModuleNode 
          title="Telemetry Matrices" 
          desc="You view exact mathematical correlations between habits on the Insights page. It visually proves if 'Reading' actually causes higher 'Deep Work' output the next day."
          icon={BarChart2} 
          delay={2.0} 
          x={1000} y={550} 
          color="emerald" 
        />

      </div>
    </div>
  )
}
