'use client'
import { useState, useEffect, useRef } from 'react'
import { Network, Plus, Trash2, Target, X, Save, Link2 } from 'lucide-react'
import { getAPIUrl } from '@/components/dateUtils'

const API = getAPIUrl()

interface GoalNode {
  _id: string;
  title: string;
  description: string;
  x: number;
  y: number;
  connections?: string[];
}

export default function MindMapPage() {
  const [nodes, setNodes] = useState<GoalNode[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [editingNode, setEditingNode] = useState<GoalNode | null>(null)
  
  // Connection Mode State
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`${API}/api/goals`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setNodes(d))
      .catch(() => {})
  }, [])

  const addNode = async () => {
    const newNode = {
      title: "New Objective",
      description: "Describe the long-term goal",
      x: 50 + Math.random() * 200,
      y: 50 + Math.random() * 200,
      connections: []
    }
    const res = await fetch(`${API}/api/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNode)
    })
    if (res.ok) {
      const created = await res.json()
      setNodes([...nodes, created])
    }
  }

  const deleteNode = async (id: string) => {
    await fetch(`${API}/api/goals/${id}`, { method: 'DELETE' })
    setNodes(nodes.filter(n => n._id !== id))
    if (editingNode?._id === id) setEditingNode(null)
  }

  const updateNode = async (id: string, data: Partial<GoalNode>) => {
    // Optimistic UI update
    setNodes(nodes.map(n => n._id === id ? { ...n, ...data } : n))
    
    // Background API sync
    await fetch(`${API}/api/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
  }

  // --- Dragging Logic ---
  const handlePointerDown = (e: React.PointerEvent, node: GoalNode) => {
    if ((e.target as HTMLElement).closest('button')) return // Don't drag if clicking a button
    
    // If in connecting mode, tapping another node connects them!
    if (connectingFrom) {
      if (connectingFrom !== node._id) {
        const sourceNode = nodes.find(n => n._id === connectingFrom)
        if (sourceNode) {
          const currentConns = sourceNode.connections || []
          if (!currentConns.includes(node._id)) {
            updateNode(sourceNode._id, { connections: [...currentConns, node._id] })
          }
        }
      }
      setConnectingFrom(null) // Exit connection mode
      return
    }

    setDraggingId(node._id)
    setOffset({
      x: e.clientX - node.x,
      y: e.clientY - node.y
    })
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (connectingFrom && containerRef.current) {
       const rect = containerRef.current.getBoundingClientRect()
       setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
       return
    }
    
    if (!draggingId) return
    const newX = e.clientX - offset.x
    const newY = e.clientY - offset.y
    
    // Update local state instantly for smooth dragging
    setNodes(nodes.map(n => n._id === draggingId ? { ...n, x: newX, y: newY } : n))
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingId) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    
    // Find the final position and save to DB
    const finalNode = nodes.find(n => n._id === draggingId)
    if (finalNode) {
      updateNode(draggingId, { x: finalNode.x, y: finalNode.y })
    }
    setDraggingId(null)
  }

  // Drawing curved connection lines
  const renderConnections = () => {
    const lines = []
    
    // Render persistent connections
    nodes.forEach(node => {
      if (!node.connections) return
      node.connections.forEach(targetId => {
        const target = nodes.find(n => n._id === targetId)
        if (target) {
          const startX = node.x + 112 // approx center of 224px width
          const startY = node.y + 60  // approx center
          const endX = target.x + 112
          const endY = target.y + 60
          
          lines.push(
            <path 
              key={`${node._id}-${targetId}`}
              d={`M ${startX} ${startY} Q ${(startX + endX)/2} ${startY}, ${(startX + endX)/2} ${(startY + endY)/2} T ${endX} ${endY}`}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              strokeDasharray="4 4"
              className="opacity-50"
            />
          )
        }
      })
    })

    // Render active drawing line
    if (connectingFrom) {
      const source = nodes.find(n => n._id === connectingFrom)
      if (source) {
          const startX = source.x + 112
          const startY = source.y + 60
          lines.push(
            <line 
              key="active-connection"
              x1={startX} 
              y1={startY} 
              x2={mousePos.x} 
              y2={mousePos.y} 
              stroke="#a855f7" 
              strokeWidth="2" 
              className="animate-pulse shadow-[0_0_10px_#a855f7]" 
            />
          )
      }
    }
    return lines
  }

  return (
    <div className="space-y-6 h-full flex flex-col relative pb-10">
      <div className="flex items-center justify-between border-b border-zinc-900/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Network size={16} className="text-purple-500 animate-pulse" />
            <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100 uppercase">MIND MAP (MACRO GOALS)</h1>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            {connectingFrom ? (
              <span className="text-purple-400 font-bold animate-pulse">CONNECTION MODE ACTIVE: Click a target node to link them. Click anywhere else to abort.</span>
            ) : (
              "Drag, drop, and link nodes to build your objective tree"
            )}
          </p>
        </div>
        <button onClick={addNode} className="bg-purple-500/10 border border-purple-500/30 text-purple-400 px-4 py-2 rounded-lg font-mono text-xs font-semibold flex items-center gap-2 hover:bg-purple-500/20 transition shadow-[0_0_15px_rgba(168,85,247,0.1)]">
          <Plus size={14} /> SPAWN NODE
        </button>
      </div>

      <div 
        ref={containerRef}
        className={`flex-1 bg-zinc-950 border border-zinc-900 rounded-xl relative overflow-hidden cinematic-panel min-h-[600px] touch-none ${connectingFrom ? 'cursor-crosshair' : ''}`}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => {
          handlePointerUp(e)
          // Abort connection if clicked on empty space
          if (connectingFrom && !(e.target as HTMLElement).closest('.node-block')) {
            setConnectingFrom(null)
          }
        }}
        onPointerLeave={(e) => {
          handlePointerUp(e)
          setConnectingFrom(null)
        }}
      >
        {/* SVG Connection Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
           {renderConnections()}
        </svg>
        
        {/* Grid background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        {nodes.map(node => (
          <div 
            key={node._id}
            onPointerDown={(e) => handlePointerDown(e, node)}
            onDoubleClick={() => setEditingNode(node)}
            className={`node-block absolute bg-zinc-900/90 backdrop-blur border p-4 rounded-xl shadow-2xl w-56 group select-none transition-shadow ${
              draggingId === node._id ? 'border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.3)] z-50 cursor-grabbing' : 
              connectingFrom === node._id ? 'border-purple-500 ring-2 ring-purple-500 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_20px_rgba(168,85,247,0.5)] z-20' : 
              'border-zinc-700 cursor-grab hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] z-10'
            }`}
            style={{ left: node.x, top: node.y }}
          >
            <div className="flex items-start justify-between mb-2">
              <Target size={14} className="text-purple-400 pointer-events-none" />
              <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    setConnectingFrom(connectingFrom === node._id ? null : node._id)
                  }} 
                  className={`transition ${connectingFrom === node._id ? 'text-purple-400' : 'text-zinc-500 hover:text-purple-400'}`}
                >
                  <Link2 size={12} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNode(node._id)
                  }} 
                  className="text-zinc-600 hover:text-rose-400 transition"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <h3 className="text-xs font-bold font-mono text-zinc-200 mb-1 pointer-events-none">{node.title}</h3>
            <p className="text-[10px] font-mono text-zinc-500 pointer-events-none line-clamp-3">{node.description}</p>
            <div className="mt-3 border-t border-zinc-800/50 pt-2 text-[8px] font-mono text-zinc-600 text-center uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              Dbl-Click to Edit
            </div>
          </div>
        ))}

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-zinc-600 font-mono text-sm animate-pulse tracking-widest">NO NODES DETECTED. SPAWN A NODE TO BEGIN.</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingNode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-purple-500" />
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold font-mono text-zinc-100 uppercase tracking-widest">Edit Node Data</h3>
              <button onClick={() => setEditingNode(null)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Objective Title</label>
                <input 
                  type="text" 
                  value={editingNode.title}
                  onChange={e => setEditingNode({...editingNode, title: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-300 focus:border-purple-500 outline-none transition-colors" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Strategic Details</label>
                <textarea 
                  value={editingNode.description}
                  onChange={e => setEditingNode({...editingNode, description: e.target.value})}
                  className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-300 focus:border-purple-500 outline-none transition-colors resize-none" 
                />
              </div>
            </div>

            <button 
              onClick={() => {
                updateNode(editingNode._id, { title: editingNode.title, description: editingNode.description })
                setEditingNode(null)
              }}
              className="w-full mt-6 bg-purple-500/10 border border-purple-500/30 text-purple-400 py-2.5 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 hover:bg-purple-500/20 transition-all hover:scale-[1.02]"
            >
              <Save size={14} /> SAVE OVERRIDE
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
