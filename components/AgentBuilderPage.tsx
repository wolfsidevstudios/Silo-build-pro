

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';

// --- TYPE DEFINITIONS ---
interface Port {
    id: string;
    pos: number; // Position as a percentage of height
}

interface NodeData {
    id: string;
    type: 'start' | 'guardrail' | 'agent' | 'conditional' | 'end';
    label: string;
    sublabel?: string;
    x: number;
    y: number;
    height: number;
    inputs: Port[];
    outputs: Port[];
}

interface EdgeData {
    id: string;
    from: string;
    fromPort: string;
    to: string;
    toPort: string;
}

interface Agent {
    id: string;
    name: string;
    nodes: NodeData[];
    edges: EdgeData[];
}

const LOCAL_STORAGE_KEY_AGENTS = 'silo_agents';

// --- DEFAULTS & TEMPLATES ---
const createDefaultNodes = (): NodeData[] => [
    { id: 'start', type: 'start', label: 'Start', x: 50, y: 230, height: 72, inputs: [], outputs: [{ id: 'start-out', pos: 50 }] },
    { id: 'end', type: 'end', label: 'End', x: 510, y: 230, height: 72, inputs: [{ id: 'end-in', pos: 50 }], outputs: [] },
];

const createDefaultEdges = (): EdgeData[] => [
    { id: `edge-${Date.now()}`, from: 'start', fromPort: 'start-out', to: 'end', toPort: 'end-in' },
];

const NODE_TEMPLATES = [
  { type: 'agent', label: 'Agent', sublabel: 'Performs a task', height: 100, inputs: [{ id: 'in', pos: 50 }], outputs: [{ id: 'out', pos: 50 }] },
  { type: 'guardrail', label: 'Guardrail', sublabel: 'Enforces rules', height: 120, inputs: [{ id: 'in', pos: 50 }], outputs: [{ id: 'out-pass', pos: 35 }, { id: 'out-fail', pos: 65 }] },
  { type: 'conditional', label: 'Conditional', sublabel: 'Routes based on logic', height: 120, inputs: [{ id: 'in', pos: 50 }], outputs: [{ id: 'out-true', pos: 35 }, { id: 'out-false', pos: 65 }] },
];

// Helper function to get Gemini client
const getAiClient = () => {
    const userApiKey = localStorage.getItem('gemini_api_key');
    const apiKey = userApiKey || (process.env.API_KEY as string);
    
    if (!apiKey) {
      throw new Error("Gemini API key is not set. Please add it in Settings.");
    }
    return new GoogleGenAI({ apiKey });
}


// --- UI COMPONENTS ---

const Node: React.FC<{ 
    data: NodeData; 
    children?: React.ReactNode; 
    onNodeMouseDown: (e: React.MouseEvent) => void;
    onPortMouseDown: (e: React.MouseEvent, portId: string) => void;
    onPortMouseUp: (portId: string) => void;
}> = ({ data, children, onNodeMouseDown, onPortMouseDown, onPortMouseUp }) => {
    const typeStyles: any = {
        start: { bg: 'bg-green-100', border: 'border-green-300', icon: 'play_circle', iconColor: 'text-green-600' },
        guardrail: { bg: 'bg-yellow-100', border: 'border-yellow-300', icon: 'security', iconColor: 'text-yellow-600' },
        agent: { bg: 'bg-blue-100', border: 'border-blue-300', icon: 'smart_toy', iconColor: 'text-blue-600' },
        conditional: { bg: 'bg-purple-100', border: 'border-purple-300', icon: 'fork_right', iconColor: 'text-purple-600' },
        end: { bg: 'bg-gray-200', border: 'border-gray-300', icon: 'stop_circle', iconColor: 'text-gray-600' },
    };
    const style = typeStyles[data.type] || typeStyles.agent;

    return (
        <div
            id={data.id}
            className={`absolute ${style.bg} ${style.border} border rounded-2xl shadow-lg flex flex-col transition-all duration-300 ease-in-out cursor-grab active:cursor-grabbing`}
            style={{ left: data.x, top: data.y, minWidth: 180, zIndex: 10 }}
            onMouseDown={onNodeMouseDown}
        >
            <div className="flex items-center space-x-2 p-3 border-b border-black/10">
                <span className={`material-symbols-outlined ${style.iconColor}`}>{style.icon}</span>
                <div className="flex-1">
                    <p className="font-bold text-sm text-gray-800">{data.label}</p>
                    {data.sublabel && <p className="text-xs text-gray-500">{data.sublabel}</p>}
                </div>
            </div>
            {children && <div className="p-1 space-y-1">{children}</div>}
            
            {data.inputs?.map((input: any) => (
                <div 
                    key={input.id} 
                    id={input.id} 
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full hover:bg-blue-400 cursor-crosshair" 
                    style={{top: `${input.pos}%`}}
                    onMouseUp={() => onPortMouseUp(input.id)}
                ></div>
            ))}
            
            {data.outputs?.map((output: any) => (
                <div 
                    key={output.id} 
                    id={output.id} 
                    className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full hover:bg-blue-400 cursor-crosshair" 
                    style={{top: `${output.pos}%`}}
                    onMouseDown={(e) => onPortMouseDown(e, output.id)}
                ></div>
            ))}
        </div>
    );
};

const getEdgePath = (startX: number, startY: number, endX: number, endY: number): string => {
    const dx = endX - startX;
    const controlX1 = startX + Math.max(50, dx / 2.5);
    const controlY1 = startY;
    const controlX2 = endX - Math.max(50, dx / 2.5);
    const controlY2 = endY;
    return `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
};

const Edge: React.FC<{ fromNode: NodeData; toNode: NodeData; fromPortId: string; toPortId: string }> = ({ fromNode, toNode, fromPortId, toPortId }) => {
    const startX = fromNode.x + 180;
    const endX = toNode.x;
    
    const fromPort = fromNode.outputs.find(o => o.id === fromPortId) || { pos: 50 };
    const toPort = toNode.inputs.find(i => i.id === toPortId) || { pos: 50 };

    const startY = fromNode.y + ((fromPort.pos / 100) * fromNode.height);
    const endY = toNode.y + ((toPort.pos / 100) * toNode.height);

    return (
        <path
            d={getEdgePath(startX, startY, endX, endY)}
            stroke="#9ca3af"
            strokeWidth="2.5"
            fill="none"
        />
    );
};

const TestAgentModal: React.FC<{ agentName: string, isOpen: boolean, onClose: () => void }> = ({ agentName, isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white w-full h-full max-w-4xl max-h-[80vh] rounded-2xl shadow-xl flex flex-col relative" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-800">{agentName}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </header>
                <main className="flex-1 p-4 overflow-y-auto">
                    {/* Chat history will be rendered here */}
                    <div className="text-center text-gray-500">
                        Test view for your agent.
                    </div>
                </main>
                <footer className="p-4 border-t border-gray-200 flex-shrink-0">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Send a message..."
                            className="w-full p-4 pr-16 bg-gray-100 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button className="absolute top-1/2 right-2.5 -translate-y-1/2 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors">
                            <span className="material-symbols-outlined">arrow_upward</span>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export const AgentBuilderPage: React.FC = () => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
    const [isTestViewOpen, setIsTestViewOpen] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);
    const [draggingNode, setDraggingNode] = useState<{ id: string, offsetX: number, offsetY: number } | null>(null);
    const [connecting, setConnecting] = useState<{ nodeId: string, portId: string } | null>(null);
    const [tempEdgePos, setTempEdgePos] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);

    const activeAgent = agents.find(agent => agent.id === activeAgentId);
    // FIX: Correctly initialize nodesMap with a typed array to prevent type inference issues.
    const nodesMap = new Map((activeAgent?.nodes || []).map(n => [n.id, n]));

    useEffect(() => {
        const savedAgents = localStorage.getItem(LOCAL_STORAGE_KEY_AGENTS);
        if (savedAgents) {
            const parsedAgents = JSON.parse(savedAgents);
            setAgents(parsedAgents);
            if (parsedAgents.length > 0 && !activeAgentId) {
                setActiveAgentId(parsedAgents[0].id);
            }
        }
    }, []);

    useEffect(() => {
        if (agents.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEY_AGENTS, JSON.stringify(agents));
        }
    }, [agents]);

    const handleAddAgent = () => {
        const newAgent: Agent = {
            id: `agent_${Date.now()}`,
            name: `New Agent ${agents.length + 1}`,
            nodes: createDefaultNodes(),
            edges: createDefaultEdges(),
        };
        setAgents(prev => [...prev, newAgent]);
        setActiveAgentId(newAgent.id);
    };

    const handleDeleteAgent = (agentId: string) => {
        if (!window.confirm("Are you sure you want to delete this agent?")) return;
        setAgents(prev => {
            const newAgents = prev.filter(a => a.id !== agentId);
            if (activeAgentId === agentId) {
                setActiveAgentId(newAgents.length > 0 ? newAgents[0].id : null);
            }
            if(newAgents.length === 0) {
                localStorage.removeItem(LOCAL_STORAGE_KEY_AGENTS);
            }
            return newAgents;
        });
    };

    const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
        e.preventDefault();
        e.stopPropagation();
        const node = nodesMap.get(nodeId);
        if (node && canvasRef.current) {
            const canvasRect = canvasRef.current.getBoundingClientRect();
            const offsetX = e.clientX - canvasRect.left + canvasRef.current.scrollLeft - node.x;
            const offsetY = e.clientY - canvasRect.top + canvasRef.current.scrollTop - node.y;
            setDraggingNode({ id: nodeId, offsetX, offsetY });
        }
    };

    const handleDragStart = (e: React.DragEvent, nodeType: string) => {
        e.dataTransfer.setData('silo/node-type', nodeType);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!canvasRef.current || !activeAgentId) return;

        const nodeType = e.dataTransfer.getData('silo/node-type');
        if (!nodeType) return;
        
        const template = NODE_TEMPLATES.find(t => t.type === nodeType);
        if (!template) return;

        const canvasRect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - canvasRect.left + canvasRef.current.scrollLeft;
        const y = e.clientY - canvasRect.top + canvasRef.current.scrollTop;

        const uniqueId = Date.now();
        const newNode: NodeData = {
            id: `${nodeType}_${uniqueId}`,
            type: template.type as NodeData['type'],
            label: template.label,
            sublabel: template.sublabel,
            x,
            y,
            height: template.height,
            inputs: template.inputs.map(p => ({ ...p, id: `${nodeType}_${uniqueId}_${p.id}` })),
            outputs: template.outputs.map(p => ({ ...p, id: `${nodeType}_${uniqueId}_${p.id}` })),
        };

        setAgents(prev => prev.map(agent => 
            agent.id === activeAgentId 
                ? { ...agent, nodes: [...agent.nodes, newNode] }
                : agent
        ));
    };
    
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, portId: string) => {
        e.stopPropagation();
        setConnecting({ nodeId, portId });
    };

    const handlePortMouseUp = (nodeId: string, portId: string) => {
        if (connecting) {
            if (connecting.nodeId === nodeId) return;

            const fromNode = nodesMap.get(connecting.nodeId);
            const fromPort = fromNode?.outputs.find(p => p.id === connecting.portId);
            const toNode = nodesMap.get(nodeId);
            const toPort = toNode?.inputs.find(i => i.id === portId);

            if (fromNode && toNode && fromPort && toPort) {
                const newEdge: EdgeData = {
                    id: `edge-${Date.now()}`,
                    from: connecting.nodeId,
                    fromPort: connecting.portId,
                    to: nodeId,
                    toPort: portId,
                };
                setAgents(prev => prev.map(agent =>
                    agent.id === activeAgentId
                        ? { ...agent, edges: [...agent.edges, newEdge] }
                        : agent
                ));
            }
        }
    };
    
    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (draggingNode) {
             if (!canvasRef.current || !activeAgentId) return;
            const canvasRect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - canvasRect.left + e.currentTarget.scrollLeft - draggingNode.offsetX;
            const y = e.clientY - canvasRect.top + e.currentTarget.scrollTop - draggingNode.offsetY;
            setAgents(prevAgents => prevAgents.map(agent => 
                agent.id === activeAgentId ? {
                    ...agent,
                    nodes: agent.nodes.map(node =>
                        node.id === draggingNode.id ? { ...node, x: Math.max(0, x), y: Math.max(0, y) } : node
                    ),
                } : agent
            ));
        }
        if (connecting && canvasRef.current) {
            const startPortEl = document.getElementById(connecting.portId);
            if (startPortEl) {
                const canvasRect = canvasRef.current.getBoundingClientRect();
                const startRect = startPortEl.getBoundingClientRect();
                const x1 = startRect.left - canvasRect.left + canvasRef.current.scrollLeft + startRect.width / 2;
                const y1 = startRect.top - canvasRect.top + canvasRef.current.scrollTop + startRect.height / 2;
                const x2 = e.clientX - canvasRect.left + canvasRef.current.scrollLeft;
                const y2 = e.clientY - canvasRect.top + canvasRef.current.scrollTop;
                setTempEdgePos({ x1, y1, x2, y2 });
            }
        }
    };

    const handleCanvasMouseUp = () => {
        setDraggingNode(null);
        setConnecting(null);
        setTempEdgePos(null);
    };

  return (
    <>
    <div className="flex h-screen bg-gray-100 pt-16">
      <aside className="w-72 bg-white border-r border-gray-200 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">My Agents</h2>
            <button onClick={handleAddAgent} className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                <span className="material-symbols-outlined">add</span>
            </button>
        </div>
        <div className="space-y-2 overflow-y-auto">
            {agents.map(agent => (
                 <div key={agent.id} onClick={() => setActiveAgentId(agent.id)} className={`group p-3 rounded-lg cursor-pointer ${activeAgentId === agent.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className={`font-semibold ${activeAgentId === agent.id ? 'text-blue-800' : 'text-gray-700'}`}>{agent.name}</p>
                            <p className="text-xs text-gray-500">{agent.nodes.length} nodes</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteAgent(agent.id); }} className="p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </aside>
      <main className="flex-1 flex flex-col">
         <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center z-10">
            <h1 className="text-2xl font-bold text-gray-900">{activeAgent?.name || 'Agent Builder'}</h1>
            <div className="flex items-center space-x-2">
                <button onClick={() => setIsTestViewOpen(true)} disabled={!activeAgent} className="px-4 py-2 text-sm bg-gray-200 rounded-full font-semibold hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">Test</button>
                <button disabled={!activeAgent} className="px-4 py-2 text-sm bg-black text-white rounded-full font-semibold hover:bg-zinc-800 disabled:bg-gray-400 disabled:cursor-not-allowed">Publish</button>
            </div>
         </div>
         <div className="flex-1 flex overflow-hidden">
             <div 
                ref={canvasRef} 
                className="flex-1 relative overflow-auto" 
                style={{
                    backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
             >
                 {activeAgent ? (
                    <>
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 1, minWidth: '2000px', minHeight: '1000px' }}>
                        {activeAgent.edges.map(edge => {
                            const fromNode = nodesMap.get(edge.from);
                            const toNode = nodesMap.get(edge.to);
                            if (!fromNode || !toNode) return null;
                            return <Edge key={edge.id} fromNode={fromNode} toNode={toNode} fromPortId={edge.fromPort} toPortId={edge.toPort} />;
                        })}
                        {tempEdgePos && <path d={getEdgePath(tempEdgePos.x1, tempEdgePos.y1, tempEdgePos.x2, tempEdgePos.y2)} stroke="#3b82f6" strokeWidth="2.5" fill="none" />}
                    </svg>

                    {activeAgent.nodes.map(node => (
                        <Node 
                            key={node.id} 
                            data={node} 
                            onNodeMouseDown={(e) => handleNodeMouseDown(e, node.id)} 
                            onPortMouseDown={(e, portId) => handlePortMouseDown(e, node.id, portId)}
                            onPortMouseUp={(portId) => handlePortMouseUp(node.id, portId)}
                        />
                    ))}
                    </>
                 ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Select an agent or create a new one to get started.</p>
                    </div>
                 )}
             </div>
              <aside className="w-60 bg-white border-l border-gray-200 p-4 flex-shrink-0">
                <h3 className="font-bold text-gray-800 mb-4">Nodes</h3>
                <div className="space-y-3">
                    {NODE_TEMPLATES.map(nodeTmpl => (
                        <div 
                            key={nodeTmpl.type} 
                            draggable 
                            onDragStart={(e) => handleDragStart(e, nodeTmpl.type)}
                            className="p-3 border border-gray-300 rounded-lg cursor-grab bg-gray-50 hover:bg-gray-100 active:cursor-grabbing active:bg-blue-100"
                        >
                            <p className="font-semibold text-sm">{nodeTmpl.label}</p>
                            <p className="text-xs text-gray-500">{nodeTmpl.sublabel}</p>
                        </div>
                    ))}
                </div>
              </aside>
          </div>
      </main>
    </div>
    <TestAgentModal agentName={activeAgent?.name || ''} isOpen={isTestViewOpen} onClose={() => setIsTestViewOpen(false)} />
    </>
  );
};