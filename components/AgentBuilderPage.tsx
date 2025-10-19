
import React, { useState, useEffect, useCallback, useRef } from 'react';

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

// --- DEFAULTS & MOCKS (for new agents) ---
const createDefaultNodes = (): NodeData[] => [
    { id: 'start', type: 'start', label: 'Start', x: 50, y: 230, height: 72, inputs: [], outputs: [{ id: 'start-out', pos: 50 }] },
    { id: 'end', type: 'end', label: 'End', x: 510, y: 230, height: 72, inputs: [{ id: 'end-in', pos: 50 }], outputs: [] },
];

const createDefaultEdges = (): EdgeData[] => [
    { id: `edge-${Date.now()}`, from: 'start', fromPort: 'start-out', to: 'end', toPort: 'end-in' },
];


// --- UI COMPONENTS ---

const Node: React.FC<{ data: NodeData; children?: React.ReactNode; onMouseDown: (e: React.MouseEvent) => void }> = ({ data, children, onMouseDown }) => {
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
            onMouseDown={onMouseDown}
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
                <div key={input.id} id={input.id} className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full hover:bg-blue-400" style={{top: `${input.pos}%`}}></div>
            ))}
            
            {data.outputs?.map((output: any) => (
                <div key={output.id} id={output.id} className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full hover:bg-blue-400" style={{top: `${output.pos}%`}}></div>
            ))}
        </div>
    );
};

const Edge: React.FC<{ fromNode: NodeData; toNode: NodeData; fromPortId: string; toPortId: string }> = ({ fromNode, toNode, fromPortId, toPortId }) => {
    const startX = fromNode.x + 180;
    const endX = toNode.x;
    
    const fromPort = fromNode.outputs.find(o => o.id === fromPortId) || { pos: 50 };
    const toPort = toNode.inputs.find(i => i.id === toPortId) || { pos: 50 };

    const startY = fromNode.y + ((fromPort.pos / 100) * fromNode.height);
    const endY = toNode.y + ((toPort.pos / 100) * toNode.height);

    const controlX1 = startX + Math.max(50, (endX - startX) / 2);
    const controlY1 = startY;
    const controlX2 = endX - Math.max(50, (endX - startX) / 2);
    const controlY2 = endY;

    return (
        <path
            d={`M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`}
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

    const activeAgent = agents.find(agent => agent.id === activeAgentId);
    const nodesMap = new Map(activeAgent?.nodes.map(n => [n.id, n]));

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
            // Adjust for scroll position of the canvas
            const offsetX = e.clientX - canvasRect.left + canvasRef.current.scrollLeft - node.x;
            const offsetY = e.clientY - canvasRect.top + canvasRef.current.scrollTop - node.y;
            setDraggingNode({ id: nodeId, offsetX, offsetY });
        }
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!draggingNode || !canvasRef.current || !activeAgentId) return;

        const canvasRect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - canvasRect.left + canvasRef.current.scrollLeft - draggingNode.offsetX;
        const y = e.clientY - canvasRect.top + canvasRef.current.scrollTop - draggingNode.offsetY;

        setAgents(prevAgents => prevAgents.map(agent => {
            if (agent.id === activeAgentId) {
                return {
                    ...agent,
                    nodes: agent.nodes.map(node =>
                        node.id === draggingNode.id ? { ...node, x: Math.max(0, x), y: Math.max(0, y) } : node
                    ),
                };
            }
            return agent;
        }));
    }, [draggingNode, activeAgentId]);

    const handleMouseUp = useCallback(() => {
        setDraggingNode(null);
    }, []);

    useEffect(() => {
        const canvasElement = canvasRef.current;
        if (canvasElement) {
             // We attach to window to catch mouseup even if it's outside the canvas
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);


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
         <div ref={canvasRef} className="flex-1 relative overflow-auto" style={{
            backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)',
            backgroundSize: '20px 20px',
         }}>
             {activeAgent ? (
                <>
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0, minWidth: '2000px', minHeight: '1000px' }}>
                    {activeAgent.edges.map(edge => {
                        const fromNode = nodesMap.get(edge.from);
                        const toNode = nodesMap.get(edge.to);
                        if (!fromNode || !toNode) return null;
                        return <Edge key={edge.id} fromNode={fromNode} toNode={toNode} fromPortId={edge.fromPort} toPortId={edge.toPort} />;
                    })}
                </svg>

                {activeAgent.nodes.map(node => (
                    <Node key={node.id} data={node} onMouseDown={(e) => handleNodeMouseDown(e, node.id)} />
                ))}
                </>
             ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                    <p>Select an agent or create a new one to get started.</p>
                </div>
             )}
         </div>
      </main>
    </div>
    <TestAgentModal agentName={activeAgent?.name || ''} isOpen={isTestViewOpen} onClose={() => setIsTestViewOpen(false)} />
    </>
  );
};
