
import React, { useState } from 'react';

interface DebugAssistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  errors: string[];
  onFixError: (error: string) => void;
  isLoading: boolean;
}

const DebugAssistPanel: React.FC<DebugAssistPanelProps> = ({ isOpen, onClose, errors, onFixError, isLoading }) => {
  const [chatInput, setChatInput] = useState('');

  const handleChatSend = () => {
    // This functionality is a placeholder for future implementation
    console.log("Debug chat:", chatInput);
    setChatInput('');
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-full max-w-md z-50 transform transition-transform duration-500 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className={`absolute inset-0 bg-black/50 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
      <div className="relative w-full h-full bg-zinc-900/80 backdrop-blur-xl border-l border-gray-700 rounded-l-3xl shadow-2xl flex flex-col p-6 text-white">
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" height="24" width="24">
                <defs>
                    <linearGradient id="paint0_linear_14402_15643_debug" x1="2.288" x2="13.596" y1="2.692" y2="8.957" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#ffd600"></stop>
                    <stop offset="1" stop-color="#00d078"></stop>
                    </linearGradient>
                </defs>
                <path fill="url(#paint0_linear_14402_15643_debug)" fill-rule="evenodd" d="M9.56049.6564C9.74797-.214503 10.9808-.220724 11.176.649356l.0252.112754c.2386 1.06349 1.0796 1.87059 2.1254 2.0556.8979.15883.8979 1.45575 0 1.61458-1.0458.18501-1.8868.99211-2.1254 2.0556l-.0252.11276c-.1952.87008-1.42803.86385-1.61551-.00705l-.02083-.09675c-.22983-1.06762-1.06995-1.88082-2.1176-2.06615-.89608-.15853-.89608-1.45287 0-1.61139 1.04765-.18534 1.88777-.99854 2.1176-2.066158L9.56049.6564ZM11.5 8.18049V12.25c0 .1381-.1119.25-.25.25h-9.5c-.13807 0-.25-.1119-.25-.25V6h6.38531c-.19048-.17448-.42601-.2933-.681-.33841C5.30951 5.32639 4.99463 2.99769 6.25976 2H1.75C.783502 2 0 2.7835 0 3.75v8.5C0 13.2165.783501 14 1.75 14h9.5c.9665 0 1.75-.7835 1.75-1.75V5.88959c-.2829.19769-.4962.50254-.5791.87189l-.0253.11275c-.1354.60388-.4711 1.03901-.8956 1.30626Zm-7.54414-.66174c-.24408-.24408-.63981-.24408-.88389 0-.24407.24408-.24407.63981 0 .88389l1.05806 1.05805-1.05806 1.05811c-.24407.244-.24407.6398 0 .8838.24408.2441.63981.2441.88389 0l1.5-1.49996c.24408-.24408.24408-.63981 0-.88389l-1.5-1.5Zm2.55806 2.81695c-.34518 0-.625.2798-.625.625s.27982.625.625.625h1.5c.34517 0 .625-.2798.625-.625s-.27983-.625-.625-.625h-1.5Z" clip-rule="evenodd"></path>
            </svg>
            <h2 className="text-xl font-bold">Debug Assist</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {errors.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <span className="material-symbols-outlined text-5xl">task_alt</span>
              <p className="mt-2">No errors detected. Looking good!</p>
            </div>
          ) : (
            errors.map((error, index) => (
              <div key={index} className="bg-red-900/40 border border-red-500/50 rounded-lg p-3">
                <pre className="text-red-200 whitespace-pre-wrap font-mono text-xs mb-3">{error}</pre>
                <button 
                  onClick={() => onFixError(error)}
                  disabled={isLoading}
                  className="w-full text-center px-4 py-1.5 bg-white text-black rounded-full text-xs font-semibold hover:bg-gray-300 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Fixing...' : '✨ Fix it for me'}
                </button>
              </div>
            ))
          )}
        </div>
        
        <div className="mt-4 border-t border-gray-700 pt-4 flex-shrink-0">
          <div className="relative">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
              placeholder="Ask for help..."
              className="w-full bg-zinc-800 border border-gray-700 rounded-full py-2 pl-4 pr-12 text-sm"
            />
            <button
              onClick={handleChatSend}
              disabled={!chatInput.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-blue-600 text-white disabled:bg-gray-600"
            >
              <span className="material-symbols-outlined text-base">arrow_upward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugAssistPanel;
