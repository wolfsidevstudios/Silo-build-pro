import React, { useState, useRef, useEffect } from 'react';

export interface ConsoleMessage {
    level: 'log' | 'warn' | 'error' | 'info';
    args: string[];
    timestamp: number;
}

interface DevToolsPanelProps {
    style: React.CSSProperties;
    messages: ConsoleMessage[];
    onExecuteCode: (code: string) => void;
    onClear: () => void;
    onClose: () => void;
}

const ConsoleRow: React.FC<{ message: ConsoleMessage }> = ({ message }) => {
    const levelStyles = {
        log: { icon: '>', iconColor: 'text-gray-500', bgColor: 'hover:bg-gray-50', textColor: 'text-black' },
        info: { icon: 'info', iconColor: 'text-blue-500', bgColor: 'hover:bg-blue-50', textColor: 'text-black' },
        warn: { icon: 'warning', iconColor: 'text-yellow-500', bgColor: 'bg-yellow-50 hover:bg-yellow-100', textColor: 'text-yellow-800', border: 'border-l-2 border-yellow-400' },
        error: { icon: 'error', iconColor: 'text-red-500', bgColor: 'bg-red-50 hover:bg-red-100', textColor: 'text-red-800', border: 'border-l-2 border-red-400' },
    };
    const style = levelStyles[message.level];

    return (
        <div className={`flex items-start space-x-2 p-2 font-mono text-sm border-b border-gray-200 ${style.bgColor} ${style.border || ''}`}>
            <span className={`material-symbols-outlined text-base mt-0.5 ${style.iconColor}`}>{style.icon}</span>
            <div className={`flex-1 whitespace-pre-wrap break-words ${style.textColor}`}>
                {message.args.join(' ')}
            </div>
        </div>
    );
};

const ConsolePanel: React.FC<Omit<DevToolsPanelProps, 'style' | 'onClose'>> = ({ messages, onExecuteCode, onClear }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [messages]);

    const handleExecute = () => {
        if (!input.trim()) return;
        onExecuteCode(input);
        setInput('');
    };
    
    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto">
                {messages.map((msg, index) => <ConsoleRow key={`${msg.timestamp}-${index}`} message={msg} />)}
                <div ref={messagesEndRef} />
            </div>
            <div className="flex-shrink-0 flex items-center p-1 border-t border-gray-200 bg-gray-50">
                <span className="material-symbols-outlined text-gray-500 mx-2">chevron_right</span>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleExecute(); }}
                    placeholder="Run JavaScript in the preview context..."
                    className="w-full bg-transparent outline-none font-mono text-sm"
                />
            </div>
        </div>
    );
};


export const DevToolsPanel: React.FC<DevToolsPanelProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'console' | 'elements'>('console');

    return (
        <div 
            className="bg-white border-x border-b border-gray-200 rounded-b-3xl shadow-inner flex flex-col"
            style={props.style}
        >
            <header className="flex-shrink-0 flex items-center justify-between p-2 border-b border-gray-200">
                <div className="flex items-center space-x-1">
                    <button 
                        onClick={() => setActiveTab('console')}
                        className={`px-3 py-1 text-sm font-semibold rounded-md ${activeTab === 'console' ? 'bg-gray-200 text-black' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        Console
                    </button>
                     <button 
                        onClick={() => setActiveTab('elements')}
                        className={`px-3 py-1 text-sm font-semibold rounded-md text-gray-400 cursor-not-allowed`}
                        disabled
                     >
                        Elements
                    </button>
                </div>
                <div className="flex items-center space-x-1">
                    <button onClick={props.onClear} title="Clear console" className="p-1.5 text-gray-500 rounded-md hover:bg-gray-200">
                        <span className="material-symbols-outlined text-base">cleaning_services</span>
                    </button>
                    <button onClick={props.onClose} title="Close DevTools" className="p-1.5 text-gray-500 rounded-md hover:bg-gray-200">
                        <span className="material-symbols-outlined text-base">close</span>
                    </button>
                </div>
            </header>
            <div className="flex-1 overflow-hidden">
                {activeTab === 'console' && <ConsolePanel {...props} />}
                {activeTab === 'elements' && (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        Element Inspector coming soon...
                    </div>
                )}
            </div>
        </div>
    );
};
