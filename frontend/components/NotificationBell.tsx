'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell, BellOff, X, Clock, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react'
import { getLocalISODate, getAPIUrl } from '@/components/dateUtils'
import { motion, AnimatePresence } from 'framer-motion'

const API = getAPIUrl()

interface Task {
  _id: string;
  title: string;
  date: string;
  time: string | null;
  duration: number | null;
  status: string;
  reminder_minutes: number | null;
}

interface ScheduledNotif {
  id: string
  title: string
  task_id: string
  remind_at: string
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [tasks, setTasks] = useState<Task[]>([])
  const [upcoming, setUpcoming] = useState<ScheduledNotif[]>([])
  const [unread, setUnread] = useState(0)
  
  const [activePopup, setActivePopup] = useState<Task | null>(null)
  const [rescheduleTime, setRescheduleTime] = useState('')
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Acknowledged reminders stored in local storage to prevent duplicate popups
  // Structure: { [taskId]: 'remind_at_iso_string' }
  const getAcknowledged = () => {
    if (typeof localStorage === 'undefined') return {};
    return JSON.parse(localStorage.getItem('acknowledged_reminders') || '{}');
  }
  
  const setAcknowledged = (taskId: string, remindAt: string) => {
    const ack = getAcknowledged();
    ack[taskId] = remindAt;
    localStorage.setItem('acknowledged_reminders', JSON.stringify(ack));
  }

  // Init permission state
  useEffect(() => {
    if (typeof Notification !== 'undefined')
      setPermission(Notification.permission)
  }, [])

  // Fetch tasks for the next 3 days to populate upcoming reminders
  const fetchTasks = async () => {
    try {
      const today = new Date();
      const endDay = new Date();
      endDay.setDate(today.getDate() + 3);
      
      const start = getLocalISODate(today);
      const end = getLocalISODate(endDay);
      
      const data = await fetch(`${API}/api/tasks/weekly?start_date=${start}&end_date=${end}`).then(r => r.json());
      if (Array.isArray(data)) {
        setTasks(data);
        updateUpcoming(data);
      }
    } catch (e) {
      console.error(e);
    }
  }
  
  const updateUpcoming = (fetchedTasks: Task[]) => {
    const now = new Date().getTime();
    const upc: ScheduledNotif[] = [];
    
    fetchedTasks.forEach(task => {
      if (task.time && task.status !== 'Done') {
        const [h, m] = task.time.split(':').map(Number);
        const [year, month, day] = task.date.split('-').map(Number);
        const taskTime = new Date(year, month - 1, day, h, m, 0);
        
        const remindMins = task.reminder_minutes !== null && task.reminder_minutes !== undefined ? task.reminder_minutes : 15;
        const remindTime = new Date(taskTime.getTime() - remindMins * 60000);
        
        if (remindTime.getTime() > now) {
          upc.push({
            id: task._id + '_' + remindTime.getTime(),
            title: task.title,
            task_id: task._id,
            remind_at: remindTime.toISOString()
          });
        }
      }
    });
    
    upc.sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime());
    setUpcoming(upc.slice(0, 10)); // keep top 10
  }

  useEffect(() => { fetchTasks() }, [])

  // Poll every 10 seconds for due reminders
  useEffect(() => {
    const poll = () => {
      const now = new Date().getTime();
      const ack = getAcknowledged();
      
      let foundPopup = false;
      
      tasks.forEach(task => {
        if (task.time && task.status !== 'Done') {
          const [h, m] = task.time.split(':').map(Number);
          const [year, month, day] = task.date.split('-').map(Number);
          const taskTime = new Date(year, month - 1, day, h, m, 0);
          
          const remindMins = task.reminder_minutes !== null && task.reminder_minutes !== undefined ? task.reminder_minutes : 15;
          const remindTime = new Date(taskTime.getTime() - remindMins * 60000);
          
          // If within the reminder window (e.g. within 2 minutes after remindTime)
          // and not already acknowledged for THIS exact remindTime
          const timeSinceRemind = now - remindTime.getTime();
          
          if (timeSinceRemind >= 0 && timeSinceRemind < 120000) {
            const remindKey = remindTime.toISOString();
            if (ack[task._id] !== remindKey && !foundPopup) {
               // Trigger!
               setActivePopup(task);
               setRescheduleTime(task.time);
               if (permission === 'granted') {
                 new Notification('Habit Tracker Reminder', {
                   body: `Time for: ${task.title} in ${remindMins} minutes!`,
                   icon: '/favicon.ico',
                 });
               }
               setUnread(u => u + 1);
               foundPopup = true; // only one popup at a time
            }
          }
        }
      });
    }
    
    poll();
    intervalRef.current = setInterval(poll, 10000);
    
    const bgFetchRef = setInterval(fetchTasks, 60000);
    
    return () => { 
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(bgFetchRef);
    }
  }, [tasks, permission]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const requestPermission = async () => {
    const result = await Notification.requestPermission()
    setPermission(result)
  }

  const dismissPopup = () => {
    if (activePopup) {
       const [h, m] = activePopup.time!.split(':').map(Number);
       const [year, month, day] = activePopup.date.split('-').map(Number);
       const taskTime = new Date(year, month - 1, day, h, m, 0);
       const remindMins = activePopup.reminder_minutes !== null ? activePopup.reminder_minutes : 15;
       const remindTime = new Date(taskTime.getTime() - remindMins * 60000);
       setAcknowledged(activePopup._id, remindTime.toISOString());
    }
    setActivePopup(null);
  }

  const handleReschedule = async () => {
    if (!activePopup || !rescheduleTime) return;
    
    try {
      await fetch(`${API}/api/tasks/${activePopup._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          time: rescheduleTime
        })
      });
      
      dismissPopup();
      // Reload page to reflect task time change across app
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const timeUntil = (iso: string) => {
    const diff = new Date(iso).getTime() - Date.now()
    if (diff < 0) return 'overdue'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    if (h > 24) return `in ${Math.floor(h / 24)}d`
    if (h > 0)  return `in ${h}h ${m}m`
    return `in ${m}m`
  }

  return (
    <>
      <div className="relative z-[60]" ref={panelRef}>
        <button
          onClick={() => { setOpen(o => !o); setUnread(0) }}
          className={`relative p-2 rounded-lg border transition-all ${
            open ? 'border-accent-dev/40 bg-accent-dev/10 text-accent-dev'
                 : 'border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'
          }`}
        >
          {permission === 'granted' ? <Bell size={16} /> : <BellOff size={16} />}
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-routine rounded-full text-[9px] font-bold text-white flex items-center justify-center font-mono">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-11 w-80 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Bell size={13} className="text-accent-routine" />
                <span className="text-xs font-mono font-bold text-zinc-100 tracking-widest">REMINDERS</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-400 transition">
                <X size={14} />
              </button>
            </div>

            {permission !== 'granted' && (
              <div className="px-4 py-3 border-b border-zinc-800 bg-orange-500/5">
                <p className="text-[10px] font-mono text-zinc-400 mb-2">
                  Enable browser notifications to receive background task reminders.
                </p>
                <button onClick={requestPermission}
                  className="w-full text-xs font-mono py-1.5 rounded-lg bg-accent-routine/20 border border-accent-routine/30 text-accent-routine hover:bg-accent-routine/30 transition">
                  ENABLE NOTIFICATIONS
                </button>
              </div>
            )}

            <div className="max-h-72 overflow-y-auto">
              {upcoming.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <CheckCircle2 size={24} className="text-zinc-700" />
                  <p className="text-[10px] font-mono text-zinc-600">No upcoming reminders</p>
                </div>
              ) : (
                upcoming.map(n => (
                  <div key={n.id}
                    className="flex items-start gap-3 px-4 py-3 border-b border-zinc-900 hover:bg-zinc-900 transition group">
                    <div className="mt-0.5 w-6 h-6 rounded-lg bg-accent-routine/10 flex items-center justify-center shrink-0">
                      <Clock size={12} className="text-accent-routine" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-200 font-medium truncate">{n.title}</p>
                      <p className="text-[9px] font-mono text-zinc-500 mt-0.5">{formatTime(n.remind_at)}</p>
                      <span className={`inline-block text-[9px] font-mono px-1.5 py-0.5 rounded mt-1
                        ${new Date(n.remind_at).getTime() < Date.now() ? 'text-red-400 bg-red-500/10' : 'text-accent-dev bg-accent-dev/10'}`}>
                        {timeUntil(n.remind_at)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-2 border-t border-zinc-900 flex items-center justify-between">
              <p className="text-[9px] font-mono text-zinc-600">
                {permission === 'granted' ? '● Push enabled' : '○ Push disabled'}
              </p>
              <button onClick={fetchTasks}
                className="text-[9px] font-mono text-zinc-600 hover:text-zinc-400 transition">
                REFRESH
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top Right Popup Notification */}
      <AnimatePresence>
        {activePopup && (
          <motion.div 
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="fixed top-20 right-8 z-[100] pointer-events-auto shadow-2xl"
          >
            <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] max-w-sm w-full font-mono relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 animate-pulse"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 text-amber-500">
                  <AlertTriangle size={18} />
                  <h3 className="font-bold text-sm tracking-widest uppercase">Task Reminder</h3>
                </div>
                <button onClick={dismissPopup} className="text-zinc-500 hover:text-zinc-300">
                  <X size={16} />
                </button>
              </div>
              
              <div className="mb-6 space-y-2">
                <p className="text-zinc-100 font-semibold text-lg">{activePopup.title}</p>
                <div className="flex items-center gap-2 text-zinc-400 text-xs">
                  <Calendar size={12} />
                  <span>Scheduled for: {activePopup.time}</span>
                </div>
                <div className="inline-block px-2 py-0.5 bg-zinc-800 text-zinc-300 text-[10px] rounded border border-zinc-700 uppercase tracking-widest">
                  Starts in {activePopup.reminder_minutes !== null && activePopup.reminder_minutes !== undefined ? activePopup.reminder_minutes : 15} min
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-zinc-800">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Reschedule Task</p>
                <div className="flex items-center gap-2">
                  <input 
                    type="time" 
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 text-xs focus:outline-none focus:border-amber-500 transition [color-scheme:dark]"
                  />
                  <button 
                    onClick={handleReschedule}
                    className="bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border border-amber-500/50 px-4 py-2 rounded text-xs font-bold transition whitespace-nowrap"
                  >
                    Confirm
                  </button>
                </div>
              </div>
              
              <button 
                onClick={dismissPopup}
                className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded text-xs font-bold transition uppercase tracking-widest"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
