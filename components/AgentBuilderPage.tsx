import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { SpreadsheetEditor, SpreadsheetData } from './SpreadsheetEditor';


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
    description?: string;
    nodes: NodeData[];
    edges: EdgeData[];
    trainingData?: string;
    spreadsheets?: SpreadsheetData[];
    webPages?: string[];
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
const AIBuilderModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (prompt: string) => void;
    isLoading: boolean;
    error: string | null;
}> = ({ isOpen, onClose, onGenerate, isLoading, error }) => {
    const [prompt, setPrompt] = useState('');

    if (!isOpen) return null;

    const handleGenerateClick = () => {
        if (prompt.trim()) {
            onGenerate(prompt);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl flex flex-col relative" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Build Agent with AI</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </header>
                <main className="p-6">
                    {isLoading ? (
                        <div className="text-center py-10">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-gray-600 mt-4">Generating agent workflow... Please wait.</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-gray-600 mb-4">Describe the agent you want to create. The AI will generate the nodes, connections, and overall workflow for you.</p>
                            <textarea
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                rows={5}
                                placeholder="e.g., A customer support agent that first checks for angry sentiment. If the user is angry, offer a discount. Otherwise, try to answer their question."
                                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                            <button
                                onClick={handleGenerateClick}
                                disabled={!prompt.trim()}
                                className="mt-4 w-full py-3 bg-black text-white rounded-full font-semibold hover:bg-zinc-800 transition-colors disabled:bg-gray-400"
                            >
                                Generate Agent
                            </button>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};


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

const TestAgentModal: React.FC<{ agent: Agent | undefined, isOpen: boolean, onClose: () => void }> = ({ agent, isOpen, onClose }) => {
    interface Message {
        actor: 'user' | 'ai' | 'system';
        text: string;
    }

    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    useEffect(() => {
        if (isOpen) {
            setMessages([]);
            setUserInput('');
            setIsLoading(false);
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!userInput.trim() || isLoading || !agent) return;

        const currentInput = userInput;
        const newMessages: Message[] = [...messages, { actor: 'user', text: currentInput }];
        setMessages(newMessages);
        setUserInput('');
        setIsLoading(true);

        try {
            const ai = getAiClient();
            const historyText = newMessages.map(m => `${m.actor}: ${m.text}`).join('\n');

            const prompt = `
                You are simulating an agent's response based on a defined workflow and a conversation history.

                **Workflow Definition:**
                ${JSON.stringify({ nodes: agent.nodes, edges: agent.edges }, null, 2)}
                
                **Available Data Sources:**

                1. Training Instructions:
                ${agent.trainingData || 'No training instructions provided.'}

                2. Spreadsheets:
                ${agent.spreadsheets && agent.spreadsheets.length > 0
                    ? agent.spreadsheets.map(s => `Sheet Name: ${s.name}\nColumns: ${s.columns.join(', ')}\nData:\n${s.rows.map(r => r.join(' | ')).join('\n')}`).join('\n\n')
                    : 'No spreadsheets available.'
                }
                
                3. Web Page Knowledge Base:
                ${agent.webPages && agent.webPages.length > 0
                    ? agent.webPages.map(url => `- ${url}`).join('\n')
                    : 'No websites provided.'
                }

                **Conversation History:**
                ${historyText}

                **Task:**
                Based on the user's last message ("${currentInput}"), trace its path through the workflow and use the available data sources (including the web pages) to determine the agent's final response. Provide only the agent's response as a plain string, without any additional explanation or formatting.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            
            setMessages(prev => [...prev, { actor: 'ai', text: response.text }]);

        } catch (e: any) {
            setMessages(prev => [...prev, { actor: 'system', text: `Error: ${e.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
        const baseStyle = "p-3 rounded-xl max-w-lg mb-2 text-sm shadow";
        const userStyle = "bg-blue-600 text-white self-end";
        const aiStyle = "bg-gray-200 text-gray-800 self-start";
        const systemStyle = "bg-red-100 text-red-800 self-center text-xs italic w-full text-center";

        const getStyle = () => {
            switch (message.actor) {
                case 'user': return `${baseStyle} ${userStyle}`;
                case 'ai': return `${baseStyle} ${aiStyle}`;
                case 'system': return `${baseStyle} ${systemStyle}`;
            }
        };
        return <div className={getStyle()}>{message.text}</div>;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white w-full h-full max-w-4xl max-h-[80vh] rounded-2xl shadow-xl flex flex-col relative" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{agent?.name}</h2>
                      {agent?.description && <p className="text-sm text-gray-500 mt-1">{agent.description}</p>}
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </header>
                <main className="flex-1 p-4 overflow-y-auto flex flex-col space-y-2">
                    {messages.map((msg, index) => <ChatMessage key={index} message={msg} />)}
                    {isLoading && (
                        <div className="self-start bg-gray-200 p-3 rounded-lg flex items-center space-x-2 shadow">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </main>
                <footer className="p-4 border-t border-gray-200 flex-shrink-0">
                    <div className="relative">
                        <input
                            type="text"
                            value={userInput}
                            onChange={e => setUserInput(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleSend()}
                            placeholder="Send a message..."
                            disabled={isLoading}
                            className="w-full p-4 pr-16 bg-gray-100 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button onClick={handleSend} disabled={isLoading || !userInput.trim()} className="absolute top-1/2 right-2.5 -translate-y-1/2 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors disabled:bg-gray-400">
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
    const [isAiBuilderOpen, setIsAiBuilderOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<'workflow' | 'data'>('workflow');
    const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string | null>(null);
    const [newUrl, setNewUrl] = useState('');

    const activeAgent = agents.find(agent => agent.id === activeAgentId);
    const nodesMap = new Map((activeAgent?.nodes || []).map(n => [n.id, n]));

    useEffect(() => {
        const savedAgents = localStorage.getItem(LOCAL_STORAGE_KEY_AGENTS);
        if (savedAgents) {
            try {
                const parsedAgents = JSON.parse(savedAgents);
                setAgents(parsedAgents);
                if (parsedAgents.length > 0 && !activeAgentId) {
                    setActiveAgentId(parsedAgents[0].id);
                }
            } catch (e) {
                console.error("Failed to parse agents from local storage", e);
                localStorage.removeItem(LOCAL_STORAGE_KEY_AGENTS);
            }
        }
    }, []);

    useEffect(() => {
        if (agents.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEY_AGENTS, JSON.stringify(agents));
        }
    }, [agents]);

    const updateActiveAgent = (updater: (agent: Agent) => Agent) => {
        if (!activeAgentId) return;
        setAgents(prev => prev.map(agent => agent.id === activeAgentId ? updater(agent) : agent));
    };

    const handleAddAgent = () => {
        const newAgent: Agent = {
            id: `agent_${Date.now()}`,
            name: `New Agent ${agents.length + 1}`,
            description: 'A manually created agent workflow.',
            nodes: createDefaultNodes(),
            edges: createDefaultEdges(),
            trainingData: '',
            spreadsheets: [],
            webPages: [],
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

    const handleGenerateAgentWithAI = async (prompt: string) => {
        setIsGenerating(true);
        setGenerationError(null);
        try {
            const ai = getAiClient();
            
            const generationPrompt = `
                You are an expert agent workflow designer. Your task is to design a workflow for an agent builder tool based on a user's request.
                You must generate a JSON object representing the agent, including its name, description, nodes, and edges.

                **Available Node Types:**
                - \`start\`: The entry point. It has one output port with id 'start-out'. Every workflow must have exactly one start node.
                - \`end\`: The exit point. It has one input port with id 'end-in'. Every workflow must have exactly one end node.
                - \`agent\`: Represents a task or action (e.g., an API call, a calculation). It has one input port ('in') and one output port ('out'). Give it a descriptive label.
                - \`guardrail\`: A safety or policy check. It has one input port ('in') and two output ports ('out-pass', 'out-fail'). Give it a descriptive label for the check it performs.
                - \`conditional\`: A branching logic node (if/else). It has one input port ('in') and two output ports ('out-true', 'out-false'). Label it with the condition being checked.

                **Instructions:**
                1. Read the user's request carefully.
                2. Determine a suitable name and a brief description for the agent.
                3. Design a logical workflow using the available node types.
                4. Define all necessary nodes. Each node needs a unique \`id\`, a \`type\`, a short \`label\`, an optional \`sublabel\`, and x/y coordinates for its position.
                5. Define all the edges to connect the nodes. Each edge needs a unique \`id\`, and must specify the source node/port and target node/port. Port IDs must be unique per node.
                6. Arrange the nodes on a virtual canvas from left-to-right.
                   - The 'start' node MUST be at \`x: 50, y: 230\`.
                   - Place subsequent nodes with an x-increment of about 250px.
                   - If you have branches (from a guardrail or conditional), place the branches vertically, with a y-increment of about 150px.
                   - The 'end' node should be the rightmost node.
                7. Ensure all IDs are unique strings. Use a clear naming convention (e.g., 'node_1', 'node_1_in', 'edge_1').
                8. If the user's request implies storing or managing structured data (e.g., "product inventory", "customer list", "to-do items"), you MUST also define a spreadsheet for this data. The spreadsheet should have a descriptive name, a list of column headers, and 2-3 sample rows of data. If no structured data is needed, omit the \`spreadsheet\` key from your JSON response.

                **CRITICAL:** Your entire response must be ONLY a single, valid JSON object matching the provided schema. Do not include any other text, markdown, or explanations.

                **User Request:** "${prompt}"
            `;

            const portSchema = {
                type: Type.OBJECT,
                properties: { id: { type: Type.STRING }, pos: { type: Type.NUMBER } },
                required: ['id', 'pos']
            };

            const agentSchema = {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    nodes: { type: Type.ARRAY, items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ['start', 'guardrail', 'agent', 'conditional', 'end'] },
                            label: { type: Type.STRING },
                            sublabel: { type: Type.STRING, nullable: true },
                            x: { type: Type.NUMBER },
                            y: { type: Type.NUMBER },
                            height: { type: Type.NUMBER },
                            inputs: { type: Type.ARRAY, items: portSchema },
                            outputs: { type: Type.ARRAY, items: portSchema },
                        },
                        required: ['id', 'type', 'label', 'x', 'y', 'height', 'inputs', 'outputs']
                    }},
                    edges: { type: Type.ARRAY, items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            from: { type: Type.STRING },
                            fromPort: { type: Type.STRING },
                            to: { type: Type.STRING },
                            toPort: { type: Type.STRING },
                        },
                        required: ['id', 'from', 'fromPort', 'to', 'toPort']
                    }},
                    spreadsheet: {
                        type: Type.OBJECT,
                        nullable: true,
                        properties: {
                            name: { type: Type.STRING },
                            columns: { type: Type.ARRAY, items: { type: Type.STRING } },
                            rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } }
                        },
                        required: ['name', 'columns', 'rows']
                    }
                },
                required: ['name', 'description', 'nodes', 'edges']
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: generationPrompt,
                config: { responseMimeType: 'application/json', responseSchema: agentSchema }
            });

            const agentData = JSON.parse(response.text);
            if (!agentData.name || !agentData.nodes || !agentData.edges) {
                throw new Error("AI returned an invalid agent structure.");
            }

            const newAgent: Agent = { 
                ...agentData, 
                id: `agent_${Date.now()}`,
                trainingData: '',
                spreadsheets: [],
                webPages: [],
            };

            if (agentData.spreadsheet) {
                newAgent.spreadsheets?.push({
                    id: `spreadsheet_${Date.now()}`,
                    ...agentData.spreadsheet
                });
            }


            setAgents(prev => [...prev, newAgent]);
            setActiveAgentId(newAgent.id);
            setIsAiBuilderOpen(false);

        } catch (e: any) {
            console.error("AI Agent Generation Error:", e);
            setGenerationError(`Failed to generate agent: ${e.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
        e.preventDefault();
        e.stopPropagation();
        const node = nodesMap.get(nodeId);
        if (node && canvasRef.current) {
            const canvasRect = canvasRef.current.getBoundingClientRect();
            const offsetX = e.clientX - canvasRect.left + canvasRef.current.scrollLeft - (node as NodeData).x;
            const offsetY = e.clientY - canvasRect.top + canvasRef.current.scrollTop - (node as NodeData).y;
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

            // FIX: Add optional chaining to prevent crash if fromNode or toNode is not found.
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

    const handleAddSpreadsheet = () => {
        const newSpreadsheet: SpreadsheetData = {
            id: `spreadsheet_${Date.now()}`,
            name: `Data Sheet ${(activeAgent?.spreadsheets?.length || 0) + 1}`,
            columns: ['Column A', 'Column B'],
            rows: [['', ''], ['', '']],
        };
        updateActiveAgent(agent => ({
            ...agent,
            spreadsheets: [...(agent.spreadsheets || []), newSpreadsheet]
        }));
    };

    const handleDeleteSpreadsheet = (spreadsheetId: string) => {
        if (!window.confirm("Are you sure you want to delete this spreadsheet?")) return;
        updateActiveAgent(agent => ({
            ...agent,
            spreadsheets: (agent.spreadsheets || []).filter(s => s.id !== spreadsheetId)
        }));
    };

    const handleUpdateSpreadsheet = (updatedSpreadsheet: SpreadsheetData) => {
        updateActiveAgent(agent => ({
            ...agent,
            spreadsheets: (agent.spreadsheets || []).map(s => s.id === updatedSpreadsheet.id ? updatedSpreadsheet : s)
        }));
    };

    const handleAddUrl = () => {
        if (!newUrl.trim()) return;
        try {
            new URL(newUrl); // Validate URL format
            updateActiveAgent(agent => ({
                ...agent,
                webPages: [...(agent.webPages || []), newUrl.trim()]
            }));
            setNewUrl('');
        } catch (_) {
            alert("Please enter a valid URL.");
        }
    };

    const handleDeleteUrl = (urlToDelete: string) => {
        updateActiveAgent(agent => ({
            ...agent,
            webPages: (agent.webPages || []).filter(url => url !== urlToDelete)
        }));
    };

  return (
    <>
    <div className="flex h-screen bg-gray-100 pt-16">
      <aside className="w-72 bg-white border-r border-gray-200 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">My Agents</h2>
            <div className="flex space-x-2">
                <button onClick={() => setIsAiBuilderOpen(true)} title="Build with AI" className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors">
                    <span className="material-symbols-outlined">auto_awesome</span>
                </button>
                <button onClick={handleAddAgent} title="Add New Agent" className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                    <span className="material-symbols-outlined">add</span>
                </button>
            </div>
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
            <div>
                <input 
                    type="text" 
                    value={activeAgent?.name || ''} 
                    onChange={(e) => updateActiveAgent(agent => ({ ...agent, name: e.target.value }))}
                    className="text-2xl font-bold text-gray-900 bg-transparent outline-none focus:ring-1 focus:ring-blue-500 rounded-md -ml-2 px-2"
                    placeholder="Agent Name"
                    disabled={!activeAgent}
                />
                <div className="flex items-center space-x-4 mt-2">
                     <button onClick={() => setActiveView('workflow')} className={`px-3 py-1 text-sm font-semibold rounded-full ${activeView === 'workflow' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-200'}`}>Workflow</button>
                     <button onClick={() => setActiveView('data')} className={`px-3 py-1 text-sm font-semibold rounded-full ${activeView === 'data' ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-200'}`}>Data</button>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={() => setIsTestViewOpen(true)} disabled={!activeAgent} className="px-4 py-2 text-sm bg-gray-200 rounded-full font-semibold hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">Test</button>
                <button disabled={!activeAgent} className="px-4 py-2 text-sm bg-black text-white rounded-full font-semibold hover:bg-zinc-800 disabled:bg-gray-400 disabled:cursor-not-allowed">Publish</button>
            </div>
         </div>
         <div className="flex-1 flex overflow-hidden">
            {activeView === 'workflow' ? (
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
            ) : ( // Data View
                <div className="flex-1 p-4 overflow-y-auto">
                    {activeAgent && !selectedSpreadsheetId && (
                        <div className="max-w-4xl mx-auto space-y-8">
                             <div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">Training Instructions</h3>
                                <p className="text-sm text-gray-500 mb-2">Provide background information, FAQs, or specific instructions for the agent to use as context.</p>
                                <textarea 
                                    value={activeAgent.trainingData || ''}
                                    onChange={e => updateActiveAgent(agent => ({ ...agent, trainingData: e.target.value }))}
                                    rows={8}
                                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="e.g., You are a helpful assistant. If the user asks for a refund, direct them to the refund policy page..."
                                />
                             </div>
                             <div>
                                <h3 className="text-lg font-bold text-gray-800 mb-2">Web Pages</h3>
                                <p className="text-sm text-gray-500 mb-2">Add website URLs or Minecraft server status APIs for the agent to use as a knowledge source.</p>
                                <div className="flex space-x-2 mb-2">
                                    <input 
                                        type="url"
                                        value={newUrl}
                                        onChange={(e) => setNewUrl(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddUrl()}
                                        placeholder="https://your-website.com"
                                        className="w-full p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                    <button onClick={handleAddUrl} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700">Add</button>
                                </div>
                                <div className="space-y-2">
                                    {(activeAgent.webPages || []).map((url) => (
                                        <div key={url} className="group bg-white p-2 rounded-lg border border-gray-200 flex justify-between items-center">
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 truncate flex-1 mr-2">{url}</a>
                                            <button onClick={() => handleDeleteUrl(url)} className="p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="material-symbols-outlined text-base">delete</span>
                                            </button>
                                        </div>
                                    ))}
                                    {(activeAgent.webPages?.length || 0) === 0 && <p className="text-center text-gray-500 py-4 text-sm">No web pages added yet.</p>}
                                </div>
                             </div>
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800">Spreadsheets</h3>
                                        <p className="text-sm text-gray-500">Manage structured data like product lists or customer information.</p>
                                    </div>
                                    <button onClick={handleAddSpreadsheet} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700">+ New Sheet</button>
                                </div>
                                <div className="space-y-2">
                                    {(activeAgent.spreadsheets || []).map(sheet => (
                                        <div key={sheet.id} className="group bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                                            <div onClick={() => setSelectedSpreadsheetId(sheet.id)} className="cursor-pointer flex-1">
                                                <p className="font-semibold">{sheet.name}</p>
                                                <p className="text-xs text-gray-500">{sheet.rows.length} rows &bull; {sheet.columns.length} columns</p>
                                            </div>
                                             <button onClick={() => handleDeleteSpreadsheet(sheet.id)} className="p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="material-symbols-outlined text-base">delete</span>
                                            </button>
                                        </div>
                                    ))}
                                    {(activeAgent.spreadsheets?.length || 0) === 0 && <p className="text-center text-gray-500 py-4 text-sm">No spreadsheets created yet.</p>}
                                </div>
                             </div>
                        </div>
                    )}
                    {activeAgent && selectedSpreadsheetId && (
                        <SpreadsheetEditor 
                            spreadsheet={(activeAgent.spreadsheets || []).find(s => s.id === selectedSpreadsheetId)!}
                            onUpdate={handleUpdateSpreadsheet}
                            onBack={() => setSelectedSpreadsheetId(null)}
                        />
                    )}
                    {!activeAgent && (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <p>Select an agent to manage its data.</p>
                        </div>
                    )}
                </div>
            )}
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
    <AIBuilderModal
        isOpen={isAiBuilderOpen}
        onClose={() => setIsAiBuilderOpen(false)}
        onGenerate={handleGenerateAgentWithAI}
        isLoading={isGenerating}
        error={generationError}
    />
    <TestAgentModal 
        agent={activeAgent}
        isOpen={isTestViewOpen} 
        onClose={() => setIsTestViewOpen(false)} 
    />
    </>
  );
};
