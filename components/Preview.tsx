import React, { useEffect, useState, useRef } from 'react';
import type { ProjectFile, PreviewMode, ProjectType } from '../App';

declare const Babel: any;
declare const window: any;
declare const JSZip: any;

interface PreviewProps {
  files: ProjectFile[];
  onRuntimeError: (message: string) => void;
  previewMode: PreviewMode;
  projectType: ProjectType;
  projectName: string;
}

const createExpoAppPackage = async (files: ProjectFile[], projectName: string): Promise<Blob> => {
    const zip = new JSZip();
    const cleanProjectName = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // 1. Add user's source files
    files.forEach(file => {
        zip.file(file.path, file.code);
    });
    
    // 2. Add package.json
    const packageJson = {
        name: cleanProjectName,
        version: "1.0.0",
        main: "index.js",
        scripts: { "start": "expo start" },
        dependencies: {
            "expo": "~51.0.8",
            "react": "18.2.0",
            "react-native": "0.74.1"
        },
        private: true
    };
    zip.file('package.json', JSON.stringify(packageJson, null, 2));
    
    // 3. Add app.json (Expo Config)
    const appJson = {
        "expo": {
            "name": projectName,
            "slug": cleanProjectName,
            "version": "1.0.0",
            "main": "index.js", // Expo entry point
            "platforms": ["ios", "android"],
            "ios": { "supportsTablet": true },
        }
    };
    zip.file('app.json', JSON.stringify(appJson, null, 2));

    // 4. Add index.js (Expo entry file)
    const indexJsContent = `
import { registerRootComponent } from 'expo';
import App from './src/App.tsx'; // Import from the existing file path
registerRootComponent(App);
    `;
    zip.file('index.js', indexJsContent);

    return zip.generateAsync({ type: 'blob' });
};


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
            if (path === 'clsx') return window.clsx;
            if (path === 'tailwind-merge') return { twMerge: window.twMerge };
            if (path === 'class-variance-authority') return window.cva;
            if (path === '@radix-ui/react-slot') return window.RadixSlot;

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
          <script src="https://esm.sh/clsx?globalName=clsx"></script>
          <script src="https://esm.sh/tailwind-merge?globalName=twMerge"></script>
          <script src="https://esm.sh/class-variance-authority?globalName=cva"></script>
          <script src="https://esm.sh/@radix-ui/react-slot?globalName=RadixSlot"></script>
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

export const Preview: React.FC<PreviewProps> = ({ files, onRuntimeError, previewMode, projectType, projectName }) => {
  const [iframeContent, setIframeContent] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [appetizePublicKey, setAppetizePublicKey] = useState<string | null>(null);
  const [isUploadingToAppetize, setIsUploadingToAppetize] = useState(false);

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
    
    const uploadToAppetize = async () => {
        if (!isMounted) return;
        setIsUploadingToAppetize(true);
        setAppetizePublicKey(null);
        
        try {
            const apiToken = 'tok_32w24mhn7v4bmu6v27aylqjd5e';
            if (!apiToken) {
                throw new Error('The Appetize.io API token is not configured in the application.');
            }

            const zipBlob = await createExpoAppPackage(files, projectName);

            const formData = new FormData();
            formData.append('file', zipBlob, `${projectName}.zip`);
            formData.append('platform', 'ios');

            const response = await fetch('https://api.appetize.io/v1/apps', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${btoa(apiToken + ':')}`
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || 'Failed to upload to Appetize.io');
            }

            const data = await response.json();
            if (data.publicKey) {
                if (isMounted) {
                    setAppetizePublicKey(data.publicKey);
                }
            } else {
                throw new Error('No public key returned from Appetize.io');
            }

        } catch (err: any) {
            onRuntimeError(`Appetize Error: ${err.message}`);
        } finally {
            if (isMounted) {
                setIsUploadingToAppetize(false);
            }
        }
    };

    const transpileAndLoad = async () => {
      if (projectType === 'html') {
          if (previewMode === 'service-worker') {
              const projectFiles: Record<string, string> = {};
              files.forEach(file => {
                  projectFiles[file.path] = file.code;
              });

              await navigator.serviceWorker.ready;
              if (navigator.serviceWorker.controller) {
                  navigator.serviceWorker.controller.postMessage({
                      type: 'UPDATE_FILES',
                      files: projectFiles,
                  });
                  if (iframeRef.current) {
                      const newSrc = '/index.html';
                      if (iframeRef.current.getAttribute('src') !== newSrc) {
                          iframeRef.current.src = newSrc;
                      } else {
                          iframeRef.current.contentWindow?.location.reload();
                      }
                  }
              } else {
                  onRuntimeError("Service Worker is not active. Please reload the page to activate the preview.");
              }
          } else { // Iframe mode for HTML
              const htmlFile = files.find(f => f.path === 'index.html');
              const cssFile = files.find(f => f.path === 'style.css');
              const jsFile = files.find(f => f.path === 'script.js');

              if (!htmlFile) {
                  setIframeContent('<h1>index.html not found</h1>');
                  return;
              }
              
              let content = htmlFile.code;
              if (cssFile) {
                  content = content.replace('</head>', `<style>${cssFile.code}</style></head>`);
              }
              if (jsFile) {
                  content = content.replace('</body>', `<script>${jsFile.code}</script></body>`);
              }
              setIframeContent(content);
          }
          return;
      }

      // Existing React project logic
      try {
        const isServiceWorkerMode = previewMode === 'service-worker';
        const plugins = isServiceWorkerMode ? [] : ['transform-modules-commonjs'];
        
        const transpiledFiles: Record<string, string> = {};
        files.forEach(file => {
             if ((file.path.endsWith('.tsx') || file.path.endsWith('.ts') || file.path.endsWith('.js') || file.path.endsWith('.jsx')) && !file.path.endsWith('.config.js')) {
                let transformedCode = Babel.transform(file.code, {
                    presets: ['typescript', ['react', { runtime: 'classic' }]],
                    plugins: plugins,
                    filename: file.path,
                }).code;
                
                transformedCode = transformedCode.replace(/import\s+['"]\.\/.*\.css['"];?/g, '');
                
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
    
    if (previewMode === 'appetize') {
        uploadToAppetize();
    } else {
        transpileAndLoad();
    }

    return () => { isMounted = false; };

  }, [files, onRuntimeError, previewMode, projectType, projectName]);

  if (previewMode === 'appetize') {
    if (isUploadingToAppetize) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-white text-black">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600">Uploading to Appetize.io...</p>
                <p className="text-sm text-gray-500">This may take a moment.</p>
            </div>
        );
    }
    if (appetizePublicKey) {
        const appetizeUrl = `https://appetize.io/embed/${appetizePublicKey}?device=iphone13pro&scale=75&autoplay=true&orientation=portrait&deviceColor=black`;
        return (
            <iframe
                src={appetizeUrl}
                title="Appetize.io Preview"
                className="w-full h-full border-none"
                allow="fullscreen"
            />
        );
    }
    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-center p-4">
            <h3 className="font-semibold text-gray-700">Preparing Appetize.io Preview</h3>
            <p className="text-sm text-gray-500 mt-1">Please wait, or check the error panel if it fails.</p>
        </div>
    );
  }


  if (previewMode === 'service-worker') {
    const initialSrc = projectType === 'html' ? '/index.html' : '/preview.html';
    return (
        <div className="w-full h-full bg-white">
          <iframe
            ref={iframeRef}
            src={initialSrc}
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