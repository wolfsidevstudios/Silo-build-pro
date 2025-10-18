import React, { useState, useEffect, useMemo } from 'react';
import { Preview } from './Preview';
import { CodeEditor } from './CodeEditor';
import { DatabasePanel } from './DatabasePanel';
import { FileExplorer } from './FileExplorer';
import { FeatureSlideshow } from './FeatureSlideshow';
import type { Project, PreviewMode } from '../App';
import { INTEGRATION_DEFINITIONS, BROWSER_API_DEFINITIONS, Integration } from '../integrations';
import { TokenInput, GITHUB_TOKEN_STORAGE_KEY } from './SettingsPage';


// Fix: Add declaration for the global Babel object to resolve TS error.
declare const Babel: any;

type ActiveTab = 'preview' | 'code' | 'database' | 'settings';
type Language = 'tsx' | 'sql' | 'html' | 'css' | 'javascript';


interface WorkspaceProps {
  project: Project;
  onRuntimeError: (message: string) => void;
  isSupabaseConnected: boolean;
  previewMode: PreviewMode;
  onPublish: () => void;
  onInitiateGitHubSave: () => void;
  onPushToGitHub: (message: string) => void;
  onExportProject: () => void;
  isLoading: boolean;
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
        ? 'bg-black text-white shadow-md'
        : 'bg-white/60 backdrop-blur-md border border-gray-200/60 text-gray-600 hover:bg-white/90 shadow-sm'
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
            if (path === 'react-router-dom') return window.ReactRouterDOM;
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
          <script src="https://unpkg.com/react-router-dom@6/umd/react-router-dom.development.js"></script>
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

const SettingCard: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        {children}
    </div>
);

interface ProjectSettingsPanelProps {
  project: Project;
  onInitiateGitHubSave: () => void;
  onPushToGitHub: (message: string) => void;
  onExportProject: () => void;
  isLoading: boolean;
  isSupabaseConnected: boolean;
}

const ProjectSettingsPanel: React.FC<ProjectSettingsPanelProps> = ({ project, onInitiateGitHubSave, onPushToGitHub, onExportProject, isLoading, isSupabaseConnected }) => {
    const [commitMessage, setCommitMessage] = useState('');
    const [customDomain, setCustomDomain] = useState('');

    const connectedIntegrations = useMemo(() => {
        const integrations = new Set<Integration>();
        // Check for integrations connected via settings
        INTEGRATION_DEFINITIONS.forEach(integration => {
            if (integration.storageKey && typeof window !== 'undefined' && localStorage.getItem(integration.storageKey)) {
                integrations.add(integration);
            }
        });
        if (isSupabaseConnected) {
             const supabaseIntegration = {
                id: 'supabase',
                name: 'Supabase',
                icon: <span className="material-symbols-outlined text-green-500">cloud_done</span>,
                description: 'Connected via main settings.'
             } as Integration;
             integrations.add(supabaseIntegration);
        }
        return Array.from(integrations);
    }, [isSupabaseConnected]);

    const handlePush = () => {
        onPushToGitHub(commitMessage || `Update from Silo Build`);
        setCommitMessage('');
    };
    
    return (
        <div className="h-full overflow-y-auto p-8 bg-gray-50/50">
            <div className="max-w-2xl mx-auto space-y-6">
                 <h2 className="text-2xl font-bold text-gray-900">Project Settings</h2>

                 <SettingCard title="GitHub Authentication" description="Add your GitHub Personal Access Token to connect repositories.">
                    <TokenInput
                        id="github-token-workspace"
                        placeholder="Enter your GitHub token"
                        storageKey={GITHUB_TOKEN_STORAGE_KEY}
                        helpText="Required to create and push to GitHub repositories."
                        helpLink={{ href: 'https://github.com/settings/tokens', text: 'Create a token' }}
                    />
                </SettingCard>

                <SettingCard title="GitHub Repository" description="Connect and push your project code to a GitHub repository.">
                    {project.githubRepo ? (
                        <div className="space-y-3">
                             <p className="text-sm text-gray-700">Connected to: <a href={`https://github.com/${project.githubRepo}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline">{project.githubRepo}</a></p>
                             <input
                                type="text"
                                value={commitMessage}
                                onChange={e => setCommitMessage(e.target.value)}
                                placeholder="Commit message (optional)"
                                className="w-full p-2 bg-white border border-gray-300 rounded-lg text-sm"
                            />
                            <button
                                onClick={handlePush}
                                disabled={isLoading}
                                className="w-full py-2 bg-black text-white rounded-lg font-semibold hover:bg-zinc-800 transition-colors disabled:bg-gray-400"
                            >
                                {isLoading ? 'Pushing...' : 'Push to GitHub'}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onInitiateGitHubSave}
                            className="w-full py-2 bg-black text-white rounded-lg font-semibold hover:bg-zinc-800 transition-colors"
                        >
                            Connect to GitHub
                        </button>
                    )}
                </SettingCard>
                
                 <SettingCard title="Connected Integrations" description="Services and APIs detected or configured for this project.">
                    {connectedIntegrations.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {connectedIntegrations.map(int => (
                                <div key={int.id} className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
                                    <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">{int.icon}</div>
                                    <span className="text-sm font-medium truncate">{int.name}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No connected integrations found.</p>
                    )}
                     <a href="#/integrations" className="mt-4 inline-block text-sm text-blue-600 hover:underline">Manage Integrations &rarr;</a>
                </SettingCard>

                <SettingCard title="Custom Domain" description="Connect a custom domain to your project. (Coming Soon)">
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={customDomain}
                            onChange={e => setCustomDomain(e.target.value)}
                            placeholder="your-domain.com"
                            className="w-full p-2 bg-white border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                            disabled
                        />
                        <button
                            disabled
                            className="px-6 py-2 bg-gray-300 text-gray-500 rounded-lg font-semibold cursor-not-allowed"
                        >
                            Connect
                        </button>
                    </div>
                </SettingCard>
                
                 <SettingCard title="Export" description="Download your project files as a zip archive.">
                    <button
                        onClick={onExportProject}
                        className="w-full flex items-center justify-center space-x-2 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-sm"
                    >
                        <span className="material-symbols-outlined text-base">download</span>
                        <span>Download Project Code</span>
                    </button>
                </SettingCard>
            </div>
        </div>
    );
};


export const Workspace: React.FC<WorkspaceProps> = ({ project, onRuntimeError, isSupabaseConnected, previewMode, onPublish, onInitiateGitHubSave, onPushToGitHub, onExportProject, isLoading }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('preview');
  const [activeFilePath, setActiveFilePath] = useState<string>(project.projectType === 'html' ? 'index.html' : 'src/App.tsx');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const { files } = project;
  const sqlFile = files.find(f => f.path === 'app.sql');
  const isDeployed = !!(project.netlifyUrl || project.vercelUrl);
  const isAppetizeMode = previewMode === 'appetize';
  
  useEffect(() => {
    const defaultFile = project.projectType === 'html' ? 'index.html' : 'src/App.tsx';
    if (!files.find(f => f.path === activeFilePath)) {
        setActiveFilePath(defaultFile);
    }
    // Reset to preview tab when project changes
    setActiveTab('preview');
  }, [project.id]);

  useEffect(() => {
    // If the active file is deleted, reset to the entry point
    const defaultFile = project.projectType === 'html' ? 'index.html' : 'src/App.tsx';
    if (!files.find(f => f.path === activeFilePath)) {
        setActiveFilePath(defaultFile);
    }
  }, [files, activeFilePath, project.projectType]);

  const activeFile = files.find(f => f.path === activeFilePath);

  const getLanguage = (filePath: string): Language => {
    if (filePath.endsWith('.sql')) return 'sql';
    if (filePath.endsWith('.html')) return 'html';
    if (filePath.endsWith('.css')) return 'css';
    if (filePath.endsWith('.js')) return 'javascript';
    // Default to tsx for ts, tsx, jsx
    return 'tsx';
  };

  const handleOpenInNewTab = () => {
    if (project.projectType === 'html') {
        const htmlFile = files.find(f => f.path === 'index.html');
        const cssFile = files.find(f => f.path === 'style.css');
        const jsFile = files.find(f => f.path === 'script.js');

        if (!htmlFile) {
            onRuntimeError("Cannot open in new tab: index.html not found.");
            return;
        }

        let htmlContent = htmlFile.code;
        if (cssFile) {
            htmlContent = htmlContent.replace('</head>', `<style>${cssFile.code}</style></head>`);
        }
        if (jsFile) {
            htmlContent = htmlContent.replace('</body>', `<script>${jsFile.code}</script></body>`);
        }
        
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        return;
    }

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
    <div className="flex flex-col h-full bg-transparent text-black">
      <div className="flex items-center justify-between p-4 flex-shrink-0">
        <div className="flex space-x-2">
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
            title="Project Settings"
            icon={<span className="material-symbols-outlined">settings</span>}
            isActive={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          />
          {sqlFile && (
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
            <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm font-medium">
              <span className="material-symbols-outlined text-base">cloud_done</span>
              <span>Supabase Connected</span>
            </div>
          )}
           <button
            onClick={onPublish}
            title={isDeployed ? "Deployment Settings" : "Publish Project"}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isDeployed 
              ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <span className="material-symbols-outlined text-base">{isDeployed ? 'dns' : 'publish'}</span>
            <span>{isDeployed ? 'Deployment' : 'Publish'}</span>
          </button>
          <button
            onClick={handleOpenInNewTab}
            title="Open preview in a new tab"
            className="p-2 rounded-full text-gray-600 hover:bg-black/10 hover:text-black transition-colors"
            aria-label="Open preview in new tab"
          >
            <span className="material-symbols-outlined">open_in_new</span>
          </button>
           {!isAppetizeMode && (
            <div className="flex items-center space-x-2">
                <button
                onClick={() => setPreviewDevice('desktop')}
                title="Desktop Preview"
                aria-label="Desktop Preview"
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ease-in-out ${
                    previewDevice === 'desktop'
                    ? 'bg-black text-white shadow-md'
                    : 'bg-white/60 backdrop-blur-md border border-gray-200/60 text-gray-600 hover:bg-white/90 shadow-sm'
                }`}
                >
                <span className="material-symbols-outlined text-xl">desktop_windows</span>
                </button>
                <button
                onClick={() => setPreviewDevice('mobile')}
                title="Mobile Preview"
                aria-label="Mobile Preview"
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ease-in-out ${
                    previewDevice === 'mobile'
                    ? 'bg-black text-white shadow-md'
                    : 'bg-white/60 backdrop-blur-md border border-gray-200/60 text-gray-600 hover:bg-white/90 shadow-sm'
                }`}
                >
                <span className="material-symbols-outlined text-xl">smartphone</span>
                </button>
            </div>
           )}
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'preview' && (
           (previewDevice === 'desktop' && !isAppetizeMode) ? (
            <div className="flex-1 overflow-auto p-4 pt-0">
              <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl shadow-gray-400/30 border border-gray-200">
                {isLoading ? (
                  <FeatureSlideshow />
                ) : (
                  <Preview files={files} onRuntimeError={onRuntimeError} previewMode={previewMode} projectType={project.projectType} projectName={project.name} />
                )}
              </div>
            </div>
          ) : (
            // Mobile View or Appetize View
            <div className="flex-1 overflow-auto p-4 pt-0 flex items-center justify-center">
              <div style={{ transform: 'scale(0.8)', transformOrigin: 'center' }}>
                <div
                  className="rounded-[60px] shadow-2xl shadow-gray-500/40 p-[1px] bg-gray-400"
                  style={{ width: '390px', height: '780px', flexShrink: 0 }}
                >
                    <div
                        className="w-full h-full bg-gray-900 rounded-[calc(60px-1px)] p-[5px]"
                    >
                        <div className="relative w-full h-full bg-white overflow-hidden rounded-[calc(60px-6px)]">
                            {!isAppetizeMode && <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-black rounded-full z-10"></div>}
                            {isLoading ? (
                                <FeatureSlideshow />
                            ) : (
                                <Preview files={files} onRuntimeError={onRuntimeError} previewMode={previewMode} projectType={project.projectType} projectName={project.name} />
                            )}
                        </div>
                    </div>
                </div>
              </div>
            </div>
          )
        )}
        {activeTab === 'code' && (
           <div className="flex flex-1 overflow-hidden">
            <div className="w-64 border-r border-gray-200 bg-gray-50/50 backdrop-blur-md p-2 flex-shrink-0">
              <FileExplorer
                files={files}
                activeFilePath={activeFilePath}
                onFileSelect={setActiveFilePath}
              />
            </div>
            <div className="flex-1 overflow-auto p-4 pt-0">
              <div className="w-full h-full rounded-3xl overflow-hidden border border-gray-200">
                <CodeEditor value={activeFile?.code ?? ''} language={getLanguage(activeFile?.path ?? '')} />
              </div>
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
            <ProjectSettingsPanel
                project={project}
                onInitiateGitHubSave={onInitiateGitHubSave}
                onPushToGitHub={onPushToGitHub}
                onExportProject={onExportProject}
                isLoading={isLoading}
                isSupabaseConnected={isSupabaseConnected}
            />
        )}
        {activeTab === 'database' && (
          <div className="flex-1 overflow-auto p-4 pt-0">
            <div className="w-full h-full">
              <DatabasePanel sql={sqlFile?.code || ''} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};