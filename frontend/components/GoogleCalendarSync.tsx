'use client'
// GoogleCalendarSync.tsx
// ─────────────────────────────────────────────────────────────────────────────
// HOW GOOGLE CALENDAR INTEGRATION WORKS:
//
// 1. User clicks "Connect Google Calendar"
// 2. We redirect to Google OAuth2 consent screen
// 3. Google redirects back to /api/auth/google/callback with a code
// 4. You exchange the code for an access_token (server-side in FastAPI)
// 5. Use the token to call Google Calendar API and fetch events
// 6. POST those events to /api/calendar/sync
//
// For LOCAL DEMO (no OAuth setup yet):
//   The component below shows the full UI and uses a MOCK sync
//   that lets you paste a Google Calendar public iCal URL or
//   demonstrates with hardcoded sample events.
//
// SETUP STEPS (for production):
//   1. Go to console.cloud.google.com → Create project
//   2. Enable "Google Calendar API"
//   3. Create OAuth2 credentials → Web Application
//   4. Add redirect URI: http://localhost:8000/api/auth/google/callback
//   5. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your FastAPI .env
//   6. Replace GOOGLE_CLIENT_ID below with your actual client ID
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Calendar, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, X } from 'lucide-react'
import { getAPIUrl } from '@/components/dateUtils'
import { apiFetch } from "@/lib/api";

const API = getAPIUrl()
// Replace with your actual Google OAuth client ID after setup
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''
const REDIRECT_URI     = `${API}/api/auth/google/callback`

interface SyncStatus {
  synced_count: number
  last_sync: string | null
}

// Sample events for demo mode (shown when not connected)
const DEMO_EVENTS = [
  { google_event_id: 'demo-1', title: 'Morning Workout',      date: new Date().toISOString().split('T')[0], time: '08:00', duration: 45, category: 'Health' },
  { google_event_id: 'demo-2', title: 'Team Standup',         date: new Date().toISOString().split('T')[0], time: '10:30', duration: 30, category: 'Development' },
  { google_event_id: 'demo-3', title: 'Weekly Review',        date: new Date().toISOString().split('T')[0], time: '14:00', duration: 120, category: 'Mindset' },
]

export default function GoogleCalendarSync() {
  const [status, setStatus]     = useState<SyncStatus | null>(null)
  const [syncing, setSyncing]   = useState(false)
  const [connected, setConnected] = useState(false)
  const [result, setResult]     = useState<{ created: number; updated: number; skipped: number } | null>(null)
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    apiFetch(`${API}/api/calendar/status`)
      .then(r => r.json())
      .then(d => {
        setStatus(d)
        if (d.synced_count > 0) setConnected(true)
      })
      .catch(() => {})
  }, [])

  // Initiates Google OAuth flow
  const connectGoogle = () => {
    const params = new URLSearchParams({
      client_id:     GOOGLE_CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      response_type: 'code',
      scope:         'https://www.googleapis.com/auth/calendar.readonly',
      access_type:   'offline',
      prompt:        'consent',
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  // Demo sync — pushes sample events to your backend
  const demoSync = async () => {
    setSyncing(true)
    setResult(null)
    try {
      const res = await apiFetch(`${API}/api/calendar/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: DEMO_EVENTS })
      })
      const data = await res.json()
      setResult(data)
      setConnected(true)
      // Refresh status
      const s = await apiFetch(`${API}/api/calendar/status`).then(r => r.json())
      setStatus(s)
    } catch (e) {
      console.error(e)
    } finally { setSyncing(false) }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Never'
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="mt-auto pt-4 border-t border-zinc-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-accent-health" />
          <span className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">Google Calendar</span>
        </div>
        <button onClick={() => setShowInfo(o => !o)} className="text-zinc-600 hover:text-zinc-400 transition">
          {showInfo ? <X size={12} /> : <ExternalLink size={12} />}
        </button>
      </div>

      {showInfo && (
        <div className="mb-3 p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <p className="text-[9px] font-mono text-zinc-400 leading-relaxed">
            Connect your Google Calendar to auto-import events as daily tasks.
            Click "Demo Sync" to try with sample events, or set up OAuth for real sync.
          </p>
        </div>
      )}

      {/* Status */}
      {connected && status && (
        <div className="mb-2 flex items-center justify-between text-[9px] font-mono">
          <span className="flex items-center gap-1 text-emerald-500">
            <CheckCircle2 size={10} /> {status.synced_count} synced
          </span>
          <span className="text-zinc-600">{formatDate(status.last_sync)}</span>
        </div>
      )}

      {/* Result flash */}
      {result && (
        <div className="mb-2 p-2 rounded-lg bg-accent-health/5 border border-accent-health/20 text-[9px] font-mono text-emerald-400">
          ✓ {result.created} created · {result.updated} updated · {result.skipped} skipped
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-1.5">
        <button onClick={demoSync} disabled={syncing}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-zinc-700 text-[10px] font-mono text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition disabled:opacity-50">
          <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'SYNCING...' : 'DEMO SYNC'}
        </button>
        <button onClick={connectGoogle}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent-health/10 border border-accent-health/20 text-[10px] font-mono text-accent-health hover:bg-accent-health/20 transition">
          <Calendar size={11} />
          CONNECT GOOGLE
        </button>
      </div>
    </div>
  )
}
