'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Headphones, Play, Pause, Timer, Radio, Volume2, CloudRain, Coffee, Moon, Activity, Disc3 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const STATIONS = [
  { id: 'space', name: 'Space Hum', icon: Moon, url: 'https://actions.google.com/sounds/v1/science_fiction/spaceship_engine.ogg' },
  { id: 'rain', name: 'Heavy Rain', icon: CloudRain, url: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg' },
  { id: 'cafe', name: 'Cyber Cafe', icon: Coffee, url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg' }
]

class AudioEngine {
  ctx: AudioContext;
  sources: Record<string, HTMLAudioElement> = {};
  gains: Record<string, GainNode> = {};
  panners: Record<string, PannerNode> = {};
  binauralGains: GainNode[] = [];
  masterGain: GainNode;
  animationFrame: number = 0;
  angle: number = 0;
  is3D: boolean = true;
  
  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    
    // Binaural Beats Engine (40Hz Gamma: 400L / 440R)
    const oscL = this.ctx.createOscillator();
    const oscR = this.ctx.createOscillator();
    oscL.frequency.value = 400;
    oscR.frequency.value = 440;
    
    const panL = this.ctx.createStereoPanner();
    const panR = this.ctx.createStereoPanner();
    panL.pan.value = -1;
    panR.pan.value = 1;
    
    const binGain = this.ctx.createGain();
    binGain.gain.value = 0;
    
    oscL.connect(panL).connect(binGain);
    oscR.connect(panR).connect(binGain);
    binGain.connect(this.masterGain);
    
    oscL.start();
    oscR.start();
    this.binauralGains = [binGain];
    
    // Ambient Tracks setup
    STATIONS.forEach(s => {
      const audio = new Audio(s.url);
      audio.crossOrigin = "anonymous";
      audio.loop = true;
      this.sources[s.id] = audio;
      
      const source = this.ctx.createMediaElementSource(audio);
      const panner = this.ctx.createPanner();
      panner.panningModel = 'HRTF'; // Cinematic 3D spatialization
      panner.distanceModel = 'inverse';
      
      const gain = this.ctx.createGain();
      gain.gain.value = 0; // Starts silent
      
      source.connect(panner).connect(gain).connect(this.masterGain);
      
      this.panners[s.id] = panner;
      this.gains[s.id] = gain;
    });

    this.animate();
  }
  
  setVolume(id: string, vol: number) {
    if (id === 'binaural') {
      this.binauralGains[0].gain.value = vol;
    } else if (this.gains[id]) {
      this.gains[id].gain.value = vol;
    }
  }
  
  play() {
    this.ctx.resume();
    Object.keys(this.sources).forEach(id => {
      this.sources[id].play().catch(()=>{});
    });
  }
  
  pause() {
    Object.keys(this.sources).forEach(id => this.sources[id].pause());
  }

  set3D(enabled: boolean) {
    this.is3D = enabled;
    if (!enabled) {
      Object.values(this.panners).forEach(p => {
        p.positionX.value = 0;
        p.positionZ.value = 0;
      });
    }
  }
  
  animate = () => {
    if (this.is3D) {
      this.angle += 0.003;
      Object.values(this.panners).forEach((panner, i) => {
         // Create swirling paths around the listener's head
         const px = Math.sin(this.angle + i * 2) * 5;
         const pz = Math.cos(this.angle + i * 2) * 5;
         panner.positionX.value = px;
         panner.positionZ.value = pz;
      });
    }
    this.animationFrame = requestAnimationFrame(this.animate);
  }
}

export default function FocusDeck() {
  const pathname = usePathname()
  const [tasks, setTasks] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [draggedItem, setDraggedItem] = useState<any>(null)
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [vols, setVols] = useState({ space: 0, rain: 0.8, cafe: 0, binaural: 0 })
  const [is3D, setIs3D] = useState(true)
  
  // Pomodoro
  const [timerInput, setTimerInput] = useState(25)
  const [timeLeft, setTimeLeft] = useState(0) // 0 means inactive

  const engineRef = useRef<AudioEngine | null>(null)

  useEffect(() => {
    // Only tick if timer is active
    if (timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setIsPlaying(false) // Auto-pause music when timer hits 0
            return 0
          }
          return t - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [timeLeft])

  useEffect(() => {
    if (!engineRef.current && isPlaying) {
      // Lazy init AudioContext on first play gesture to bypass browser restrictions
      engineRef.current = new AudioEngine()
    }

    if (engineRef.current) {
      engineRef.current.set3D(is3D)
      
      // Sync volumes
      engineRef.current.setVolume('space', vols.space)
      engineRef.current.setVolume('rain', vols.rain)
      engineRef.current.setVolume('cafe', vols.cafe)
      engineRef.current.setVolume('binaural', vols.binaural)

      if (isPlaying) {
        engineRef.current.play()
      } else {
        engineRef.current.pause()
      }
    }
  }, [isPlaying, vols, is3D])

  const togglePlay = () => setIsPlaying(!isPlaying)

  const handleVolChange = (id: string, val: number) => {
    setVols(v => ({ ...v, [id]: val }))
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const hiddenRoutes = ['/', '/architecture', '/auth', '/onboarding']
  if (hiddenRoutes.includes(pathname || '')) return null

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4 bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800 p-5 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] w-[340px] cinematic-panel"
          >
            <div className="flex items-center justify-between mb-5 border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Radio size={14} className="text-amber-500 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-widest">Focus Deck Pro</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIs3D(!is3D)}
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded transition-colors border ${is3D ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}
                >
                  <Disc3 size={10} className="inline mr-1 mb-0.5" /> 3D SPATIAL
                </button>
                {isPlaying && (
                  <div className="flex gap-1 items-end h-3">
                    {[1,2,3].map(i => <div key={i} className="w-1 bg-amber-500 rounded-full animate-pulse" style={{ height: `${Math.random()*100}%`, animationDelay: `${i*0.2}s` }}/>)}
                  </div>
                )}
              </div>
            </div>

            {/* Auto-Pomodoro Section */}
            <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50 mb-5">
               <div className="flex items-center justify-between mb-2">
                 <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1 uppercase tracking-widest"><Timer size={10} /> Auto-Pomodoro</span>
                 {timeLeft > 0 ? (
                   <span className="text-sm font-mono font-bold text-emerald-400">{formatTime(timeLeft)}</span>
                 ) : (
                   <span className="text-[10px] font-mono text-zinc-600">Inactive</span>
                 )}
               </div>
               {timeLeft === 0 ? (
                 <div className="flex gap-2">
                   <input type="number" value={timerInput} onChange={e => setTimerInput(parseInt(e.target.value)||0)} className="w-14 bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-mono text-center rounded focus:outline-none focus:border-amber-500" />
                   <button onClick={() => setTimeLeft(timerInput * 60)} className="flex-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-mono font-bold rounded uppercase hover:bg-emerald-500/20 transition-colors">Start Focus Block</button>
                 </div>
               ) : (
                 <button onClick={() => setTimeLeft(0)} className="w-full py-1.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-mono font-bold rounded uppercase hover:bg-rose-500/20 transition-colors">Abort Block</button>
               )}
            </div>

            {/* Audio Mixer */}
            <div className="space-y-4 mb-5">
              {STATIONS.map(s => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-24 flex items-center gap-2 text-zinc-400 shrink-0">
                    <s.icon size={12} className={vols[s.id as keyof typeof vols] > 0 ? 'text-amber-500' : ''} />
                    <span className="text-[10px] font-mono">{s.name}</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.05" value={vols[s.id as keyof typeof vols]} onChange={e => handleVolChange(s.id, parseFloat(e.target.value))} className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none accent-amber-500" />
                </div>
              ))}
              <div className="flex items-center gap-3">
                  <div className="w-24 flex items-center gap-2 text-zinc-400 shrink-0">
                    <Activity size={12} className={vols.binaural > 0 ? 'text-purple-500' : ''} />
                    <span className="text-[10px] font-mono text-purple-400/80">40Hz Gamma</span>
                  </div>
                  <input type="range" min="0" max="0.5" step="0.01" value={vols.binaural} onChange={e => handleVolChange('binaural', parseFloat(e.target.value))} className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none accent-purple-500" />
              </div>
            </div>

            {/* Master Controls */}
            <div className="flex justify-center border-t border-zinc-800/80 pt-4">
              <button 
                onClick={togglePlay}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-[0_0_20px_rgba(251,191,36,0.15)] ${isPlaying ? 'bg-amber-500 text-zinc-950 hover:scale-105' : 'bg-zinc-100 text-zinc-950 hover:scale-105'}`}
              >
                {isPlaying ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current ml-1" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl border ${isOpen ? 'bg-amber-500 text-zinc-950 border-amber-400 scale-110' : isPlaying ? 'bg-zinc-950 text-amber-500 border-amber-500/50 animate-pulse-slow' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'}`}
      >
        <Headphones size={24} />
      </button>
    </div>
  )
}
