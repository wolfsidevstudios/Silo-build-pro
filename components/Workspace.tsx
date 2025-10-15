import React, { useState } from 'react';
import { Preview } from './Preview';
import { CodeEditor } from './CodeEditor';

type ActiveTab = 'preview' | 'code';

interface WorkspaceProps {
  code: string;
  transpiledCode: string;
  onCodeChange: (code: string) => void;
  onRuntimeError: (message: string) => void;
}

const TabButton: React.FC<{
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  title: string;
}> = ({ icon, isActive, onClick, title }) => (
  <button
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ease-in-out ${
      isActive
        ? 'bg-white text-black shadow-lg'
        : 'text-gray-300 hover:bg-white/20'
    }`}
  >
    {icon}
  </button>
);

const createNewTabContent = (transpiledCode: string): string => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>App Preview</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
      <style>
        body { background-color: #ffffff; color: #111827; padding: 1rem; font-family: sans-serif; }
      </style>
    </head>
    <body>
      <div id="preview-root"></div>
      <script type="module">
        const require = (name) => {
          if (name === 'react') return window.React;
          if (name === 'react-dom/client') return window.ReactDOM;
          throw new Error(\`Cannot find module '\${name}'\`);
        };
        const handleError = (err) => {
           const root = document.getElementById('preview-root');
           root.innerHTML = \`<div style="color: red; padding: 1rem; font-family: monospace;"><h4>Runtime Error</h4><pre>\${err.stack || err.message}</pre></div>\`;
           console.error(err);
        };
        window.addEventListener('error', (event) => {
          event.preventDefault();
          handleError(event.error);
        });
        try {
          const exports = {};
          const module = { exports };
          ${transpiledCode}
          const Component = module.exports.default;
          if (typeof Component !== 'function') {
            throw new Error('The code must have a default export of a React component.');
          }
          const rootElement = document.getElementById('preview-root');
          const root = ReactDOM.createRoot(rootElement);
          root.render(React.createElement(Component));
        } catch (err) {
          handleError(err);
        }
      </script>
    </body>
  </html>
`;


export const Workspace: React.FC<WorkspaceProps> = ({ code, transpiledCode, onCodeChange, onRuntimeError }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('preview');

  const handleOpenInNewTab = () => {
    if (!transpiledCode) return;
    const htmlContent = createNewTabContent(transpiledCode);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="flex items-center justify-between p-2">
        <div className="flex space-x-1 bg-black/30 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-lg">
          <TabButton
            title="Preview"
            icon={<span className="material-symbols-outlined">visibility</span>}
            isActive={activeTab === 'preview'}
            onClick={() => setActiveTab('preview')}
          />
          <TabButton
            title="Code"
            icon={<span className="material-symbols-outlined">code</span>}
            isActive={activeTab === 'code'}
            onClick={() => setActiveTab('code')}
          />
        </div>
        <button
          onClick={handleOpenInNewTab}
          title="Open preview in a new tab"
          className="p-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Open preview in new tab"
        >
          <span className="material-symbols-outlined">open_in_new</span>
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'preview' ? (
          <div className="w-full h-full rounded-3xl overflow-hidden">
            <Preview code={transpiledCode} onRuntimeError={onRuntimeError} />
          </div>
        ) : (
          <div className="w-full h-full rounded-3xl overflow-hidden">
            <CodeEditor value={code} onChange={onCodeChange} readOnly />
          </div>
        )}
      </div>
    </div>
  );
};
