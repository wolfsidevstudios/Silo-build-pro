
import React, { useEffect, useState, useRef } from 'react';
import type { ProjectFile, PreviewMode } from '../App';

declare const Babel: any;

interface PreviewProps {
  files: ProjectFile[];
  onRuntimeError: (message: string) => void;
  previewMode: PreviewMode;
}

const createIframeContent = (transpiledFiles: Record<string, string>): string => {
    const iframeLogic = `
        const handleError = (err) => {
            console.error("Preview Error:", err);
            try {
                const root = document.getElementById('preview-root');
                if (root) {
                    const errorHtml = \`<div style="color: red; padding: 1rem; font-family: monospace; white-space: pre-wrap; word-break: break-word;"><h4>Runtime Error</h4><pre>\${err.stack || err.message}</pre></div>\`;
                    root.innerHTML = errorHtml;
                }
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

export const Preview: React.FC<PreviewProps> = ({ files, onRuntimeError, previewMode }) => {
  const [iframeContent, setIframeContent] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Register the service worker once, only when in service-worker mode.
  useEffect(() => {
    if (previewMode === 'service-worker') {
      navigator.serviceWorker.register('/preview-sw.js')
        .then(registration => {
          console.log('Silo Build: Service Worker registered.', registration.scope);
        })
        .catch(error => {
          console.error('Silo Build: Service Worker registration failed:', error);
          onRuntimeError('Could not register the Service Worker. Preview may not work correctly.');
        });
    }
  }, [previewMode, onRuntimeError]);


  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data && event.data.type === 'error') {
        onRuntimeError(event.data.message);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onRuntimeError]);

  useEffect(() => {
    let isMounted = true;
    const transpileAndLoad = async () => {
      try {
        const isServiceWorkerMode = previewMode === 'service-worker';
        const plugins = isServiceWorkerMode ? [] : ['transform-modules-commonjs'];
        
        const transpiledFiles: Record<string, string> = {};
        files.forEach(file => {
             if ((file.path.endsWith('.tsx') || file.path.endsWith('.ts') || file.path.endsWith('.js') || file.path.endsWith('.jsx')) && !file.path.endsWith('.config.js')) {
                const transformedCode = Babel.transform(file.code, {
                    presets: ['typescript', ['react', { runtime: 'classic' }]],
                    plugins: plugins,
                    filename: file.path,
                }).code;
                transpiledFiles[file.path] = transformedCode;
             }
        });
        
        if (!isMounted) return;

        if (isServiceWorkerMode) {
            await navigator.serviceWorker.ready;
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'UPDATE_FILES',
                    files: transpiledFiles,
                });

                if (iframeRef.current) {
                  iframeRef.current.contentWindow?.location.reload();
                }
            } else {
              onRuntimeError("Service Worker is not active. Please reload the page to activate the preview.");
            }
        } else {
            const content = createIframeContent(transpiledFiles);
            setIframeContent(content);
        }
      } catch (e: any) {
          onRuntimeError(`Babel Transpilation Error: ${e.message}`);
      }
    };

    transpileAndLoad();
    
    return () => { isMounted = false; };

  }, [files, onRuntimeError, previewMode]);

  if (previewMode === 'service-worker') {
    return (
        <div className="w-full h-full bg-white">
          <iframe
            ref={iframeRef}
            src="/preview.html"
            title="Live Preview (Service Worker)"
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
    );
  }

  return (
    <div className="w-full h-full bg-white">
      <iframe
        srcDoc={iframeContent}
        title="Live Preview"
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-same-origin"
        key={iframeContent}
      />
    </div>
  );
};
