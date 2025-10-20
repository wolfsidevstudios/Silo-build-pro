import React, { useState, useEffect, useRef } from 'react';
import type { Project, Message } from '../App';

interface PlanningPageProps {
  project: Project;
  isLoading: boolean;
  onApprove: () => void;
  onRequestChanges: (prompt: string) => void;
}

const SectionCard: React.FC<{ title: string, icon: string, children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-white/50 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-lg animate-fade-in">
        <div className="p-4 border-b border-gray-200/80 flex items-center space-x-3">
            <span className="material-symbols-outlined text-blue-600">{icon}</span>
            <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="p-4">
            {children}
        </div>
    </div>
);

export const PlanningPage: React.FC<PlanningPageProps> = ({ project, isLoading, onApprove, onRequestChanges }) => {
    const [userInput, setUserInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastUserMessage = [...project.messages].reverse().find(m => m.actor === 'user');
    const lastAiPlan = [...project.messages].reverse().find(m => m.actor === 'ai' && m.plan);

     useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [project.messages]);

    const handleSend = () => {
        if (!userInput.trim()) return;
        onRequestChanges(userInput);
        setUserInput('');
    }

    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            <main className="flex-1 flex flex-col items-center p-6 pt-24 overflow-y-auto">
                <div className="w-full max-w-3xl space-y-8">
                     {lastUserMessage && (
                        <div className="bg-blue-600/10 border border-blue-200 p-4 rounded-xl shadow-inner">
                             <p className="text-sm font-semibold text-blue-800 mb-2">Your Request</p>
                            <blockquote className="text-blue-900 italic">"{lastUserMessage.text}"</blockquote>
                        </div>
                    )}
                    
                    {isLoading && !lastAiPlan && (
                         <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-600 mt-4">AI is generating a plan for your app...</p>
                        </div>
                    )}

                    {lastAiPlan && (
                        <>
                            <SectionCard title="Color Palette" icon="palette">
                                <div className="flex space-x-3">
                                    {(lastAiPlan.color_palette || []).map((color, i) => (
                                        <div key={i} className="flex flex-col items-center">
                                            <div 
                                                className="w-12 h-12 rounded-full border border-gray-300 shadow-md"
                                                style={{ backgroundColor: color }}
                                            ></div>
                                            <p className="text-xs text-gray-500 mt-2 font-mono">{color}</p>
                                        </div>
                                    ))}
                                </div>
                            </SectionCard>

                             <SectionCard title="Implementation Plan" icon="checklist">
                                <ul className="space-y-2 text-gray-700">
                                    {(lastAiPlan.plan || []).map((step, i) => (
                                        <li key={i} className="flex items-start">
                                            <span className="text-blue-600 font-bold mr-3">{i + 1}.</span>
                                            <span>{step}</span>
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>

                            <SectionCard title="File Structure" icon="folder_open">
                               <ul className="space-y-2.5 text-sm">
                                    {(lastAiPlan.files_to_generate || []).map((file, i) => (
                                        <li key={i} className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <span className="material-symbols-outlined text-base mr-2 text-gray-500">description</span>
                                                <span className="font-mono text-gray-700">{file.path}</span>
                                            </div>
                                             <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                file.status === 'added' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {file.status}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </SectionCard>
                        </>
                    )}
                </div>
                <div ref={messagesEndRef} />
            </main>
            <footer className="w-full max-w-3xl mx-auto p-4 sticky bottom-0">
                 <div className="relative bg-white/70 backdrop-blur-lg border border-gray-200/50 rounded-3xl shadow-xl p-2 flex items-center">
                    <textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Request changes to the plan..."
                        className="flex-1 bg-transparent text-black placeholder-gray-500 border-none outline-none resize-none p-3"
                        rows={1}
                        disabled={isLoading}
                    />
                     <button
                        onClick={handleSend}
                        disabled={isLoading || !userInput.trim()}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mr-2"
                        aria-label="Send message"
                    >
                        <span className="material-symbols-outlined text-xl">send</span>
                    </button>
                    <button
                        onClick={onApprove}
                        disabled={isLoading || !lastAiPlan}
                        className="px-6 py-2.5 bg-black text-white rounded-full font-semibold hover:bg-zinc-800 transition-colors disabled:bg-gray-400"
                    >
                        Approve & Build
                    </button>
                </div>
            </footer>
        </div>
    );
};
