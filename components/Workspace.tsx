
import React, { useState, useEffect } from 'react';
import { Preview } from './Preview';
import { CodeEditor } from './CodeEditor';
import { DatabasePanel } from './DatabasePanel';
import { FileExplorer } from './FileExplorer';
import type { ProjectFile } from '../App';

// Fix: Add declaration for the global Babel object to resolve TS error.
declare const Babel: any;

type ActiveTab = 'preview' | 'code' | 'database';

interface WorkspaceProps {
  files: ProjectFile[];
  onRuntimeError: (message: string) => void;
  isSupabaseConnected: boolean;
  supabaseSql?: string;
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

const createNewTabContent = (transpiledFiles: Record<string, string>): string => {
    const iframeLogic = `
        const transpiledModules = ${JSON.stringify(transpiledFiles)};
        const moduleCache = {};
        
        const resolvePath = (currentPath, requiredPath) => {
            if (!requiredPath.startsWith('.')) {
                return requiredPath; // Is a package or absolute path
            }
            const pathParts = currentPath.split('/');
            pathParts.pop(); // remove filename -> directory
            const requiredParts = requiredPath.split('/');
            for (const part of requiredParts) {
                if (part === '.') continue;
                if (part === '..') {
                    if (pathParts.length > 0) { // prevent popping from empty array
                       pathParts.pop();
                    }
                }
                else pathParts.push(part);
            }
            return pathParts.join('/');
        }

        const customRequire = (path, currentPath) => {
            if (path === 'react') return window.React;
            if (path === 'react-dom/client') return window.ReactDOM;
            
            const resolvedPath = currentPath ? resolvePath(currentPath, path) : path;
            
            if (moduleCache[resolvedPath]) {
                return moduleCache[resolvedPath].exports;
            }

            const code = transpiledModules[resolvedPath];
            if (code === undefined) {
                throw new Error(\`Module not found: "\${resolvedPath}" required from "\${currentPath}". Available modules: \${Object.keys(transpiledModules).join(', ')}\`);
            }

            const exports = {};
            const module = { exports };
            const factory = new Function('require', 'module', 'exports', code);
            
            const requireForModule = (p) => customRequire(p, resolvedPath);

            factory(requireForModule, module, exports);
            moduleCache[resolvedPath] = module;
            return module.exports;
        };

        try {
            const entryPoint = 'src/App.tsx';
            const App = customRequire(entryPoint).default;
            if (typeof App !== 'function' && typeof App !== 'object') {
                throw new Error('The entry point "src/App.tsx" must have a default export of a React component.');
            }
            const rootElement = document.getElementById('preview-root');
            const root = ReactDOM.createRoot(rootElement);
            root.render(React.createElement(App));
        } catch (err) {
            handleError(err);
        }
    `;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>App Preview</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
          <style> body { background-color: #ffffff; color: #111827; padding: 0; margin: 0; font-family: sans-serif; } </style>
        </head>
        <body>
          <div id="preview-root"></div>
          <script type="module">
            const handleError = (err) => {
               const root = document.getElementById('preview-root');
               root.innerHTML = \`<div style="color: red; padding: 1rem; font-family: monospace;"><h4>Runtime Error</h4><pre>\${err.stack || err.message}</pre></div>\`;
               console.error(err);
            };
            window.addEventListener('error', (event) => {
              event.preventDefault();
              handleError(event.error);
            });
            ${iframeLogic}
          </script>
        </body>
      </html>
    `;
};


export const Workspace: React.FC<WorkspaceProps> = ({ files, onRuntimeError, isSupabaseConnected, supabaseSql }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('preview');
  const [activeFilePath, setActiveFilePath] = useState<string>('src/App.tsx');
  
  useEffect(() => {
    // If the active file is deleted, reset to the entry point
    if (!files.find(f => f.path === activeFilePath)) {
        setActiveFilePath('src/App.tsx');
    }
  }, [files, activeFilePath]);

  const activeFile = files.find(f => f.path === activeFilePath);

  const handleOpenInNewTab = () => {
    try {
        const transpiledFiles: Record<string, string> = {};
        files.forEach(file => {
             if (file.path.endsWith('.tsx') || file.path.endsWith('.ts') || file.path.endsWith('.js') || file.path.endsWith('.jsx')) {
                const transformedCode = Babel.transform(file.code, {
                    presets: ['typescript', ['react', { runtime: 'classic' }]],
                    plugins: ['transform-modules-commonjs'],
                    filename: file.path,
                }).code;
                transpiledFiles[file.path] = transformedCode;
             }
        });
        const htmlContent = createNewTabContent(transpiledFiles);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    } catch (e: any) {
        onRuntimeError(`Babel Transpilation Error: ${e.message}`);
    }
  };


  return (
    <div className="flex h-full bg-black">
        <div className="w-64 border-r border-gray-900 bg-zinc-900/50 p-2">
            <FileExplorer 
                files={files}
                activeFilePath={activeFilePath}
                onFileSelect={setActiveFilePath}
            />
        </div>

        <div className="flex-1 flex flex-col">
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
                {supabaseSql && (
                    <TabButton
                    title="Database"
                    icon={<span className="material-symbols-outlined">dataset</span>}
                    isActive={activeTab === 'database'}
                    onClick={() => setActiveTab('database')}
                    />
                )}
                </div>
                <div className="flex items-center space-x-2">
                {isSupabaseConnected && (
                    <div className="flex items-center space-x-2 bg-green-500/20 text-green-300 px-3 py-1.5 rounded-full text-sm font-medium">
                    <span className="material-symbols-outlined text-base">cloud_done</span>
                    <span>Supabase Connected</span>
                    </div>
                )}

                <button
                    onClick={handleOpenInNewTab}
                    title="Open preview in a new tab"
                    className="p-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                    aria-label="Open preview in new tab"
                >
                    <span className="material-symbols-outlined">open_in_new</span>
                </button>
                </div>
            </div>
            <div className="flex-1 overflow-auto p-4 pt-0">
                {activeTab === 'preview' && (
                <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
                    <Preview files={files} onRuntimeError={onRuntimeError} />
                </div>
                )}
                {activeTab === 'code' && (
                <div className="w-full h-full rounded-3xl overflow-hidden">
                    <CodeEditor value={activeFile?.code ?? ''} onChange={() => {}} readOnly />
                </div>
                )}
                {activeTab === 'database' && (
                <div className="w-full h-full">
                    <DatabasePanel sql={supabaseSql || ''} />
                </div>
                )}
            </div>
        </div>
    </div>
  );
};
