
import React, { useState, useEffect } from 'react';
import { Preview } from './Preview';
import { CodeEditor } from './CodeEditor';
import { DatabasePanel } from './DatabasePanel';
import { FileExplorer } from './FileExplorer';
import { SourceControlPanel } from './SourceControlPanel';
import type { Project, PreviewMode } from '../App';

// Fix: Add declaration for the global Babel object to resolve TS error.
declare const Babel: any;

type ActiveTab = 'preview' | 'code' | 'database' | 'source-control';

interface WorkspaceProps {
  project: Project;
  onRuntimeError: (message: string) => void;
  isSupabaseConnected: boolean;
  previewMode: PreviewMode;
  onPublish: () => void;
  onCommit: (message: string) => void;
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
        const handleError = (err) => {
            console.error("Preview Error:", err);
            try {
                const root = document.getElementById('preview-root');
                if (root) {
                    const errorHtml = \`<div style="color: red; padding: 1rem; font-family: monospace; white-space: pre-wrap; word-break: break-word;"><h4>Runtime Error</h4><pre>\${err.stack || err.message}</pre></div>\`;
                    root.innerHTML = errorHtml;
                }
                // This will fail silently in a new tab, which is acceptable.
                window.parent.postMessage({ type: 'error', message: err.message }, '*');
            } catch (e) {
                console.error('Failed to display error in preview:', e);
            }
        };

        window.addEventListener('error', (event) => {
          event.preventDefault();
          handleError(event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            event.preventDefault();
            handleError(event.reason);
        });

        const transpiledModules = ${JSON.stringify(transpiledFiles)};
        const moduleCache = {};

        const resolveModulePath = (currentPath, requiredPath) => {
            if (!requiredPath.startsWith('.')) return requiredPath;
            const pathParts = currentPath.split('/');
            pathParts.pop();
            requiredPath.split('/').forEach(part => {
                if (part === '.') return;
                if (part === '..') {
                    if (pathParts.length > 0) pathParts.pop();
                } else {
                    pathParts.push(part);
                }
            });
            const basePath = pathParts.join('/');
            if (transpiledModules.hasOwnProperty(basePath)) return basePath;
            const extensions = ['.tsx', '.ts', '.jsx', '.js'];
            for (const ext of extensions) {
                const pathWithExt = basePath + ext;
                if (transpiledModules.hasOwnProperty(pathWithExt)) return pathWithExt;
                const indexPath = basePath + '/index' + ext;
                if (transpiledModules.hasOwnProperty(indexPath)) return indexPath;
            }
            return basePath;
        };
        
        const customRequire = (path, currentPath) => {
            if (path === 'react') return window.React;
            if (path === 'react-dom/client') return window.ReactDOM;
            const resolvedPath = currentPath ? resolveModulePath(currentPath, path) : path;
            if (moduleCache[resolvedPath]) return moduleCache[resolvedPath].exports;
            const code = transpiledModules[resolvedPath];
            if (code === undefined) throw new Error(\`Module not found: Could not resolve "\${path}" from "\${currentPath || 'entry point'}". Attempted to load "\${resolvedPath}".\`);
            const exports = {};
            const module = { exports };
            const factory = new Function('require', 'module', 'exports', code);
            factory(p => customRequire(p, resolvedPath), module, exports);
            moduleCache[resolvedPath] = module;
            return module.exports;
        };

        try {
            const rootElement = document.getElementById('preview-root');
            if (!rootElement) throw new Error("Preview failed: root element '#preview-root' not found.");
            
            const entryPoint = 'src/App.tsx';
            if (!transpiledModules[entryPoint]) throw new Error('Entry point "src/App.tsx" not found.');

            const AppContainer = customRequire(entryPoint);
            if (!AppContainer || typeof AppContainer.default === 'undefined') {
                throw new Error('The entry point "src/App.tsx" must have a default export.');
            }
            const App = AppContainer.default;
            if (typeof App !== 'function' && (typeof App !== 'object' || App === null)) {
                throw new Error('The default export of "src/App.tsx" must be a React component.');
            }
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
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
          <style> body { background-color: #ffffff; color: #111827; padding: 0; margin: 0; font-family: sans-serif; } </style>
        </head>
        <body>
          <div id="preview-root"></div>
          <script type="module">${iframeLogic}</script>
        </body>
      </html>
    `;
};


export const Workspace: React.FC<WorkspaceProps> = ({ project, onRuntimeError, isSupabaseConnected, previewMode, onPublish, onCommit }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('preview');
  const [activeFilePath, setActiveFilePath] = useState<string>('src/App.tsx');
  const { files, supabaseSql } = project;
  const isDeployed = !!(project.netlifyUrl || project.vercelUrl);
  
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
             if ((file.path.endsWith('.tsx') || file.path.endsWith('.ts') || file.path.endsWith('.js') || file.path.endsWith('.jsx')) && !file.path.endsWith('.config.js')) {
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
    <div className="flex flex-col h-full bg-black">
      <div className="flex items-center justify-between p-2 flex-shrink-0">
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
          <TabButton
            title="Source Control"
            icon={<span className="material-symbols-outlined">history</span>}
            isActive={activeTab === 'source-control'}
            onClick={() => setActiveTab('source-control')}
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
            onClick={onPublish}
            title={isDeployed ? "Deployment Settings" : "Publish Project"}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isDeployed 
              ? 'bg-zinc-800 text-gray-200 hover:bg-zinc-700' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <span className="material-symbols-outlined text-base">{isDeployed ? 'dns' : 'publish'}</span>
            <span>{isDeployed ? 'Deployment' : 'Publish'}</span>
          </button>
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
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'preview' && (
          <div className="flex-1 overflow-auto p-4 pt-0">
            <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
              <Preview files={files} onRuntimeError={onRuntimeError} previewMode={previewMode} />
            </div>
          </div>
        )}
        {activeTab === 'code' && (
           <div className="flex flex-1 overflow-hidden">
            <div className="w-64 border-r border-gray-900 bg-zinc-900/50 p-2 flex-shrink-0">
              <FileExplorer
                files={files}
                activeFilePath={activeFilePath}
                onFileSelect={setActiveFilePath}
              />
            </div>
            <div className="flex-1 overflow-auto p-4 pt-0">
              <div className="w-full h-full rounded-3xl overflow-hidden">
                <CodeEditor value={activeFile?.code ?? ''} onChange={() => {}} readOnly />
              </div>
            </div>
          </div>
        )}
        {activeTab === 'source-control' && (
            <div className="flex-1 overflow-auto">
                <SourceControlPanel project={project} onCommit={onCommit} />
            </div>
        )}
        {activeTab === 'database' && (
          <div className="flex-1 overflow-auto p-4 pt-0">
            <div className="w-full h-full">
              <DatabasePanel sql={supabaseSql || ''} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
