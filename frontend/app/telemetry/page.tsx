'use client'
import { useState, useEffect } from 'react'
import { Activity, Zap, TrendingDown, Target, Brain, AlertTriangle, ShieldCheck, Clock, ArrowRight } from 'lucide-react'
import { getAPIUrl } from '@/components/dateUtils'
import { apiFetch } from "@/lib/api";

const API = getAPIUrl()

export default function TelemetryDashboard() {
  const [telemetry, setTelemetry] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`${API}/api/analytics/telemetry`)
      .then(r => r.json())
      .then(data => {
        setTelemetry(data)
        setLoading(false)
      })
      .catch(e => {
        console.error(e)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Activity size={32} className="text-sky-500" />
          <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase">Booting Statistical Engine...</p>
        </div>
      </div>
    )
  }

  const burnout = telemetry?.burnout
  const leakage = telemetry?.time_leakage || []
  const correlations = telemetry?.correlations || []

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 font-sans">
      {/* HEADER */}
      <div className="border-b border-zinc-900/60 pb-5">
        <div className="flex items-center gap-3 mb-1.5">
          <Brain size={24} className="text-blue-400" />
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Insights & Analytics</h1>
        </div>
        <p className="text-sm text-zinc-500 ml-9">
          Statistical engine calculating behavioral variance, time consistency, and productivity correlations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* BURNOUT PREDICTOR */}
        <div className="col-span-12 md:col-span-8 bg-zinc-950/40 backdrop-blur-sm border border-zinc-800/40 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-6">
            <Activity size={16} className="text-rose-400" />
            <h2 className="text-sm font-semibold tracking-wide text-zinc-300">Burnout Risk Forecast</h2>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-center">
            {/* Burnout Score Gauge */}
            <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#27272a" strokeWidth="8" fill="none" />
                <circle 
                  cx="50" cy="50" r="40" 
                  stroke={burnout?.risk_level === 'High' ? '#ef4444' : burnout?.risk_level === 'Elevated' ? '#f59e0b' : '#10b981'} 
                  strokeWidth="8" fill="none" 
                  strokeDasharray={`${(burnout?.score || 0) * 2.51} 251.2`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-zinc-100">{Math.round(burnout?.score || 0)}%</span>
                <span className="text-xs text-zinc-500 mt-1">Utilization</span>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className={`p-4 rounded-xl border ${
                burnout?.risk_level === 'High' ? 'bg-rose-500/10 border-rose-500/30' : 
                burnout?.risk_level === 'Elevated' ? 'bg-amber-500/10 border-amber-500/30' : 
                'bg-emerald-500/10 border-emerald-500/30'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  {burnout?.risk_level === 'High' ? <AlertTriangle size={20} className="text-rose-500" /> : <ShieldCheck size={20} className="text-emerald-500" />}
                  <h3 className={`text-lg font-bold tracking-tight ${
                    burnout?.risk_level === 'High' ? 'text-rose-400' : burnout?.risk_level === 'Elevated' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {burnout?.risk_level} Risk
                  </h3>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {burnout?.message}
                </p>
              </div>
              <p className="text-sm text-zinc-500">
                <strong className="text-zinc-400">Science:</strong> The engine measures rolling Bandwidth Utilization. Consecutive days above 75% trigger mathematical threshold warnings to prevent biological fatigue.
              </p>
            </div>
          </div>
        </div>

        {/* CORRELATION MATRIX */}
        <div className="col-span-12 md:col-span-4 bg-zinc-950/40 backdrop-blur-sm border border-zinc-800/40 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Zap size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold tracking-wide text-zinc-300">Habit Correlations</h2>
          </div>
          
          <div className="space-y-4">
            {correlations.map((corr: any, i: number) => (
              <div key={i} className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-zinc-300 font-medium">{corr.metric}</span>
                  <span className={`text-sm font-bold ${corr.value > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {corr.value > 0 ? '+' : ''}{corr.value}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {corr.message}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* TIME LEAKAGE ENGINE */}
        <div className="col-span-12 bg-zinc-950/40 backdrop-blur-sm border border-zinc-800/40 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock size={16} className="text-indigo-400" />
            <h2 className="text-sm font-semibold tracking-wide text-zinc-300">Schedule Consistency</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {leakage.map((leak: any, i: number) => (
              <div key={i} className="flex flex-col bg-zinc-950/50 rounded-xl border border-zinc-800/60 p-5 overflow-hidden relative group">
                {leak.status === 'High Leakage' && <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-[50px] rounded-full pointer-events-none" />}
                
                <div className="flex justify-between items-start mb-4 z-10">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-200">{leak.category} Focus</h3>
                    <p className={`text-xs font-medium mt-1 ${leak.status === 'High Leakage' ? 'text-rose-400' : leak.status === 'Moderate Leakage' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {leak.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-zinc-100">±{leak.variance_mins}</span>
                    <span className="text-xs text-zinc-500 ml-1">mins</span>
                  </div>
                </div>

                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden mb-4 relative z-10">
                  <div className={`h-full rounded-full ${leak.status === 'High Leakage' ? 'bg-rose-500' : leak.status === 'Moderate Leakage' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (leak.variance_mins / 120) * 100)}%` }} />
                </div>

                <p className="text-sm text-zinc-400 leading-relaxed z-10">
                  {leak.message}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-lg flex items-start gap-4">
            <Target className="text-indigo-400 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-indigo-200/70 leading-relaxed">
              <strong>Insight:</strong> The engine calculates the standard deviation of your task start times. High variance indicates schedule "friction" where you are wasting energy deciding <em>when</em> to do something rather than <em>doing</em> it. Reduce variance to below ±30 mins to achieve consistency.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
