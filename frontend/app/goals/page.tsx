'use client'
import { useState, useEffect, useCallback } from 'react'
import { Network, Plus, Trash2, Target, X, Save, Sparkles, Workflow } from 'lucide-react'
import { getAPIUrl } from '@/components/dateUtils'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  Handle,
  Position,
  BackgroundVariant
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import { apiFetch } from "@/lib/api";

const API = getAPIUrl()

// --- Custom Node Component ---
const GoalNodeComponent = ({ data, id, isConnectable }: any) => {
  return (
    <div className="bg-zinc-900/90 backdrop-blur border border-zinc-700 p-4 rounded-xl shadow-2xl w-56 group transition-all hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] relative">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-3 h-3 border-2 border-zinc-900 bg-purple-500" />
      
      <div className="flex items-start justify-between mb-2">
        <Target size={14} className="text-purple-400 pointer-events-none" />
        <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); data.onEdit(id, data.title, data.description); }} className="text-zinc-500 hover:text-purple-400 transition">
            <Sparkles size={12} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); data.onDelete(id); }} className="text-zinc-600 hover:text-rose-400 transition">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <h3 className="text-xs font-bold font-mono text-zinc-200 mb-1">{data.title}</h3>
      <p className="text-[10px] font-mono text-zinc-500 line-clamp-3">{data.description}</p>
      
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-3 h-3 border-2 border-zinc-900 bg-purple-500" />
    </div>
  )
}

const nodeTypes: NodeTypes = {
  goalNode: GoalNodeComponent,
}

// --- Layout Engine ---
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  
  const nodeWidth = 260
  const nodeHeight = 140

  dagreGraph.setGraph({ rankdir: direction })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    }
  })

  return { nodes, edges }
}

export default function MindMapPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [editingNode, setEditingNode] = useState<{id: string, title: string, description: string} | null>(null)

  // API sync
  const updateNodeAPI = async (id: string, updates: any) => {
    await apiFetch(`${API}/api/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
  }

  const onDeleteNode = useCallback(async (id: string) => {
    await apiFetch(`${API}/api/goals/${id}`, { method: 'DELETE' })
    setNodes((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
  }, [setNodes, setEdges])

  const onEditNode = useCallback((id: string, title: string, description: string) => {
    setEditingNode({ id, title, description })
  }, [])

  useEffect(() => {
    apiFetch(`${API}/api/goals`)
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        const initialNodes: Node[] = d.map((n: any) => ({
          id: n._id,
          type: 'goalNode',
          position: { x: n.x || 0, y: n.y || 0 },
          data: { 
            title: n.title, 
            description: n.description,
            onDelete: onDeleteNode,
            onEdit: onEditNode
          }
        }))
        
        const initialEdges: Edge[] = []
        d.forEach((n: any) => {
          if (n.connections) {
            n.connections.forEach((targetId: string) => {
              initialEdges.push({
                id: `${n._id}-${targetId}`,
                source: n._id,
                target: targetId,
                animated: true,
                style: { stroke: '#a855f7', strokeWidth: 2 }
              })
            })
          }
        })
        
        setNodes(initialNodes)
        setEdges(initialEdges)
      })
      .catch(() => {})
  }, [setNodes, setEdges, onDeleteNode, onEditNode])

  const onConnect = useCallback(async (params: Connection) => {
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#a855f7', strokeWidth: 2 } }, eds))
    const sourceNode = nodes.find(n => n.id === params.source)
    if (sourceNode && params.source && params.target) {
      const resp = await apiFetch(`${API}/api/goals`)
      const d = await resp.json()
      const dbNode = d.find((n: any) => n._id === params.source)
      if (dbNode) {
        const conns = dbNode.connections || []
        if (!conns.includes(params.target)) {
          await updateNodeAPI(params.source, { connections: [...conns, params.target] })
        }
      }
    }
  }, [nodes, setEdges])

  const onEdgesDelete = useCallback(async (edgesToDelete: Edge[]) => {
    for (const edge of edgesToDelete) {
      const { source, target } = edge
      const sourceNode = nodes.find(n => n.id === source)
      if (sourceNode) {
        const resp = await apiFetch(`${API}/api/goals`)
        const d = await resp.json()
        const dbNode = d.find((n: any) => n._id === source)
        if (dbNode && dbNode.connections) {
          const newConns = dbNode.connections.filter((c: string) => c !== target)
          await updateNodeAPI(source, { connections: newConns })
        }
      }
    }
  }, [nodes])

  const onNodeDragStop = useCallback((_: any, node: Node) => {
    updateNodeAPI(node.id, { x: node.position.x, y: node.position.y })
  }, [])

  const addNode = async () => {
    const newNodeData = {
      title: "New Objective",
      description: "Describe the long-term goal",
      x: 100 + Math.random() * 50,
      y: 100 + Math.random() * 50,
      connections: []
    }
    const res = await apiFetch(`${API}/api/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNodeData)
    })
    if (res.ok) {
      const created = await res.json()
      setNodes((nds) => [...nds, {
        id: created._id,
        type: 'goalNode',
        position: { x: created.x, y: created.y },
        data: {
          title: created.title,
          description: created.description,
          onDelete: onDeleteNode,
          onEdit: onEditNode
        }
      }])
    }
  }

  const handleSaveEdit = () => {
    if (!editingNode) return
    setNodes((nds) => nds.map((n) => {
      if (n.id === editingNode.id) {
        return {
          ...n,
          data: { ...n.data, title: editingNode.title, description: editingNode.description }
        }
      }
      return n
    }))
    updateNodeAPI(editingNode.id, { title: editingNode.title, description: editingNode.description })
    setEditingNode(null)
  }

  const onLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges)
    setNodes([...layoutedNodes])
    setEdges([...layoutedEdges])
    layoutedNodes.forEach(n => {
      updateNodeAPI(n.id, { x: n.position.x, y: n.position.y })
    })
  }, [nodes, edges, setNodes, setEdges])

  return (
    <div className="space-y-6 h-full flex flex-col relative pb-10">
      <div className="flex items-center justify-between border-b border-zinc-900/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Network size={16} className="text-purple-500 animate-pulse" />
            <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100 uppercase">MIND MAP (MACRO GOALS)</h1>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Build your objective tree with professional flowchart mechanics
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onLayout} className="bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 px-4 py-2 rounded-lg font-mono text-xs font-semibold flex items-center gap-2 hover:bg-zinc-800 transition">
            <Workflow size={14} /> AUTO-LAYOUT
          </button>
          <button onClick={addNode} className="bg-purple-500/10 border border-purple-500/30 text-purple-400 px-4 py-2 rounded-lg font-mono text-xs font-semibold flex items-center gap-2 hover:bg-purple-500/20 transition shadow-[0_0_15px_rgba(168,85,247,0.1)]">
            <Plus size={14} /> SPAWN NODE
          </button>
        </div>
      </div>

      <div className="flex-1 bg-zinc-950 border border-zinc-900 rounded-xl relative overflow-hidden cinematic-panel min-h-[600px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          className="dark"
        >
          <Background color="#52525b" variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls className="bg-zinc-900 border-zinc-800 fill-zinc-400" />
          <MiniMap 
            nodeColor="#a855f7" 
            maskColor="rgba(0, 0, 0, 0.7)" 
            className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden" 
          />
        </ReactFlow>
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
              onClick={handleSaveEdit}
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
