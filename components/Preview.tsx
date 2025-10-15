
import React, { useEffect, useState, useMemo } from 'react';
import type { ProjectFile } from '../App';

declare const Babel: any;

interface PreviewProps {
  files: ProjectFile[];
  onRuntimeError: (message: string) => void;
}

const createIframeContent = (transpiledFiles: Record<string, string>): string => {
    const iframeLogic = `
        const transpiledModules = ${JSON.stringify(transpiledFiles)};
        const moduleCache = {};

        const resolveModulePath = (currentPath, requiredPath) => {
            if (!requiredPath.startsWith('.')) {
                return requiredPath; // Not a relative path, assume it's a package.
            }
            
            const pathParts = currentPath.split('/');
            pathParts.pop(); // Go from file path to directory path.
            const requiredParts = requiredPath.split('/');
            
            for (const part of requiredParts) {
                if (part === '.') continue;
                if (part === '..') {
                    if (pathParts.length > 0) pathParts.pop();
                } else {
                    pathParts.push(part);
                }
            }
            
            const basePath = pathParts.join('/');

            // 1. Direct match
            if (transpiledModules.hasOwnProperty(basePath)) {
                return basePath;
            }

            // 2. Try with extensions
            const extensions = ['.tsx', '.ts', '.jsx', '.js'];
            for (const ext of extensions) {
                const pathWithExt = basePath + ext;
                if (transpiledModules.hasOwnProperty(pathWithExt)) {
                    return pathWithExt;
                }
            }

            // 3. Try as a directory with index file
            for (const ext of extensions) {
                const indexPath = basePath + '/index' + ext;
                if (transpiledModules.hasOwnProperty(indexPath)) {
                    return indexPath;
                }
            }
            
            // If nothing is found, return the originally resolved path to let the caller handle the error.
            return basePath;
        };

        const customRequire = (path, currentPath) => {
            // Handle external packages
            if (path === 'react') return window.React;
            if (path === 'react-dom/client') return window.ReactDOM;

            const resolvedPath = currentPath ? resolveModulePath(currentPath, path) : path;
            
            if (moduleCache[resolvedPath]) {
                return moduleCache[resolvedPath].exports;
            }

            const code = transpiledModules[resolvedPath];
            if (code === undefined) {
                 throw new Error(\`Module not found: Could not resolve "\${path}" from "\${currentPath || 'entry point'}". Attempted to load "\${resolvedPath}". Available modules: [\${Object.keys(transpiledModules).join(', ')}]\`);
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
            if (!transpiledModules[entryPoint]) {
                 throw new Error('Entry point "src/App.tsx" not found. Please make sure this file exists.');
            }
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
               window.parent.postMessage({ type: 'error', message: err.message }, '*');
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

export const Preview: React.FC<PreviewProps> = ({ files, onRuntimeError }) => {
  const [iframeContent, setIframeContent] = useState('');

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
    try {
        const transpiledFiles: Record<string, string> = {};
        files.forEach(file => {
             // Only transpile JS/TS files
             if (file.path.endsWith('.tsx') || file.path.endsWith('.ts') || file.path.endsWith('.js') || file.path.endsWith('.jsx')) {
                const transformedCode = Babel.transform(file.code, {
                    presets: ['typescript', ['react', { runtime: 'classic' }]],
                    plugins: ['transform-modules-commonjs'],
                    filename: file.path,
                }).code;
                transpiledFiles[file.path] = transformedCode;
             }
        });
        const content = createIframeContent(transpiledFiles);
        setIframeContent(content);
    } catch (e: any) {
        onRuntimeError(`Babel Transpilation Error: ${e.message}`);
    }
  }, [files, onRuntimeError]);

  return (
    <div className="w-full h-full bg-white">
      <iframe
        srcDoc={iframeContent}
        title="Live Preview"
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-same-origin"
        // Key is important to force iframe remount on content change
        key={iframeContent}
      />
    </div>
  );
};
