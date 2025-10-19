import React from 'react';

const Node: React.FC<{ data: any; children?: React.ReactNode }> = ({ data, children }) => {
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
            className={`absolute ${style.bg} ${style.border} border rounded-2xl shadow-lg flex flex-col transition-all duration-300 ease-in-out`}
            style={{ left: data.x, top: data.y, minWidth: 180 }}
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
                <div key={input.id} id={input.id} className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full hover:bg-blue-400"></div>
            ))}
            
            {data.outputs?.map((output: any) => (
                <div key={output.id} id={output.id} className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full hover:bg-blue-400"
                    style={data.outputs.length > 1 ? { top: `${output.pos}%` } : {}}>
                </div>
            ))}
        </div>
    );
};

const Edge: React.FC<{ fromNode: any; toNode: any; fromPort: string; toPort: string }> = ({ fromNode, toNode, fromPort, toPort }) => {
    const startX = fromNode.x + 180;
    const endX = toNode.x;
    
    let startY: number, endY: number;

    const fromOutput = fromNode.outputs.find((o:any) => o.id === fromPort);
    const toInput = toNode.inputs.find((i:any) => i.id === toPort);

    startY = fromNode.y + ((fromOutput.pos / 100) * fromNode.height);
    endY = toNode.y + ((toInput.pos / 100) * toNode.height);

    const controlX1 = startX + (endX - startX) / 2;
    const controlY1 = startY;
    const controlX2 = endX - (endX - startX) / 2;
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

const nodesData = [
    { id: 'start', type: 'start', label: 'Start', x: 50, y: 230, height: 72, inputs: [], outputs: [{ id: 'start-out', pos: 50 }] },
    { id: 'guardrail', type: 'guardrail', label: 'Jailbreak guardrail', x: 280, y: 150, height: 110, inputs: [{ id: 'guardrail-in', pos: 50 }], outputs: [{ id: 'guardrail-pass', pos: 35 }, { id: 'guardrail-fail', pos: 75 }] },
    { id: 'end-1', type: 'end', label: 'End', x: 510, y: 260, height: 72, inputs: [{ id: 'end-1-in', pos: 50 }], outputs: [] },
    { id: 'classifier', type: 'agent', label: 'Classification agent', sublabel: 'Agent', x: 510, y: 150, height: 72, inputs: [{ id: 'classifier-in', pos: 50 }], outputs: [{ id: 'classifier-out', pos: 50 }] },
    { id: 'if-else', type: 'conditional', label: 'If / else', x: 740, y: 80, height: 212, inputs: [{ id: 'if-else-in', pos: 50 }], outputs: [{ id: 'if-return', pos: 15 }, { id: 'if-cancel', pos: 38 }, { id: 'if-info', pos: 62 }, { id: 'if-else-out', pos: 85 }] },
    { id: 'return-agent', type: 'agent', label: 'Return agent', sublabel: 'Agent', x: 1020, y: 40, height: 72, inputs: [{ id: 'return-agent-in', pos: 50 }], outputs: [{ id: 'return-agent-out', pos: 50 }] },
    { id: 'retention-agent', type: 'agent', label: 'Retention Agent', sublabel: 'Agent', x: 1020, y: 125, height: 72, inputs: [{ id: 'retention-agent-in', pos: 50 }], outputs: [{ id: 'retention-agent-out', pos: 50 }] },
    { id: 'info-agent', type: 'agent', label: 'Information agent', sublabel: 'Agent', x: 1020, y: 210, height: 72, inputs: [{ id: 'info-agent-in', pos: 50 }], outputs: [{ id: 'info-agent-out', pos: 50 }] },
    { id: 'end-2', type: 'end', label: 'End', x: 1020, y: 295, height: 72, inputs: [{ id: 'end-2-in', pos: 50 }], outputs: [] },
];

const edgesData = [
    { from: 'start', fromPort: 'start-out', to: 'guardrail', toPort: 'guardrail-in' },
    { from: 'guardrail', fromPort: 'guardrail-pass', to: 'classifier', toPort: 'classifier-in' },
    { from: 'guardrail', fromPort: 'guardrail-fail', to: 'end-1', toPort: 'end-1-in' },
    { from: 'classifier', fromPort: 'classifier-out', to: 'if-else', toPort: 'if-else-in' },
    { from: 'if-else', fromPort: 'if-return', to: 'return-agent', toPort: 'return-agent-in' },
    { from: 'if-else', fromPort: 'if-cancel', to: 'retention-agent', toPort: 'retention-agent-in' },
    { from: 'if-else', fromPort: 'if-info', to: 'info-agent', toPort: 'info-agent-in' },
    { from: 'if-else', fromPort: 'if-else-out', to: 'end-2', toPort: 'end-2-in' },
];

export const AgentBuilderPage: React.FC = () => {
  const nodesMap = new Map(nodesData.map(n => [n.id, n]));

  return (
    <div className="flex h-screen bg-gray-100 pt-16">
      <aside className="w-72 bg-white border-r border-gray-200 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">My Agents</h2>
            <button className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                <span className="material-symbols-outlined">add</span>
            </button>
        </div>
        <div className="space-y-2">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="font-semibold text-blue-800">Customer Service Bot</p>
                <p className="text-xs text-blue-600">Active</p>
            </div>
             <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:bg-gray-100">
                <p className="font-semibold text-gray-700">Internal Docs Q&A</p>
                <p className="text-xs text-gray-500">Inactive</p>
            </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col">
         <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Customer Service Bot</h1>
            <div className="flex items-center space-x-2">
                <button className="px-4 py-2 text-sm bg-gray-200 rounded-full font-semibold hover:bg-gray-300">Test</button>
                <button className="px-4 py-2 text-sm bg-black text-white rounded-full font-semibold hover:bg-zinc-800">Publish</button>
            </div>
         </div>
         <div className="flex-1 relative overflow-auto" style={{
            backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)',
            backgroundSize: '20px 20px',
         }}>
             <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                {edgesData.map(edge => {
                    const fromNode = nodesMap.get(edge.from);
                    const toNode = nodesMap.get(edge.to);
                    if (!fromNode || !toNode) return null;
                    return <Edge key={`${edge.from}-${edge.to}`} fromNode={fromNode} toNode={toNode} fromPort={edge.fromPort} toPort={edge.toPort} />;
                })}
            </svg>

            {nodesData.map(node => (
                <Node key={node.id} data={node}>
                    {node.id === 'guardrail' && (
                        <>
                            <div className="flex items-center justify-between p-2 rounded-lg relative">
                                <p className="text-sm text-gray-700">Pass</p>
                                <div id="guardrail-pass" className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full" style={{top: '35%'}}></div>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg relative">
                                <p className="text-sm text-gray-700">Fail</p>
                                <div id="guardrail-fail" className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full" style={{top: '75%'}}></div>
                            </div>
                        </>
                    )}
                     {node.id === 'if-else' && (
                        <>
                            <div className="flex items-center justify-between p-2 rounded-lg relative">
                                <p className="text-sm font-mono text-gray-700">return_item</p>
                                <div id="if-return" className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full" style={{top: '15%'}}></div>
                            </div>
                             <div className="flex items-center justify-between p-2 rounded-lg relative">
                                <p className="text-sm font-mono text-gray-700">cancel_subscription</p>
                                <div id="if-cancel" className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full" style={{top: '38%'}}></div>
                            </div>
                             <div className="flex items-center justify-between p-2 rounded-lg relative">
                                <p className="text-sm font-mono text-gray-700">get_information</p>
                                <div id="if-info" className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full" style={{top: '62%'}}></div>
                            </div>
                             <div className="flex items-center justify-between p-2 rounded-lg relative">
                                <p className="text-sm text-gray-700">Else</p>
                                <div id="if-else-out" className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full" style={{top: '85%'}}></div>
                            </div>
                        </>
                    )}
                </Node>
            ))}
         </div>
      </main>
    </div>
  );
};