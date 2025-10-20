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
  iframeRef: React.RefObject<HTMLIFrameElement>;
}

const getDevToolsScript = () => `
  const originalConsole = { ...window.console };
  const serializeArg = (arg) => {
    if (arg instanceof HTMLElement) {
      return \`<$\{arg.tagName.toLowerCase()\} \$\{arg.className ? 'class="'+arg.className+'"' : ''\} \$\{arg.id ? 'id="'+arg.id+'"' : ''\} />\`;
    }
    if (typeof arg === 'function') {
      return 'ƒ ' + (arg.name || '(anonymous)') + '()';
    }
    if (typeof arg === 'undefined') {
      return 'undefined';
    }
    if (typeof arg === 'symbol') {
        return String(arg);
    }
    if (typeof arg === 'bigint') {
        return String(arg) + 'n';
    }
    try {
      // Use a replacer to handle circular structures
      const seen = new WeakSet();
      return JSON.stringify(arg, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      }, 2);
    } catch (e) {
      return String(arg);
    }
  };

  const overrideConsole = (level) => {
    window.console[level] = (...args) => {
      originalConsole[level](...args);
      try {
        window.parent.postMessage({
          type: 'console',
          level,
          args: args.map(serializeArg),
        }, '*');
      } catch (e) {
        originalConsole.error('Failed to post console message to parent:', e);
      }
    };
  };

  ['log', 'warn', 'error', 'info'].forEach(overrideConsole);

  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'execute_code') {
      try {
        eval(event.data.code);
      } catch (e) {
        console.error(e);
      }
    }
  });
`;

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


const createHotUpdateCode = (transpiledFiles: Record<string, string>): string => {
  const logic = `
    const handleError = (err) => {
        console.error("Preview Error:", err);
        try {
            window.parent.postMessage({ type: 'error', message: err.message }, '*');
        } catch (e) {
            console.error('Failed to post error message to parent:', e);
        }
    };

    if (!window.SiloErrorListenersAttached) {
        window.addEventListener('error', (event) => {
          event.preventDefault();
          handleError(event.error);
        });
        window.addEventListener('unhandledrejection', (event) => {
            event.preventDefault();
            handleError(event.reason);
        });
        window.SiloErrorListenersAttached = true;
    }
    
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
        
        if (window.SiloPreviewRoot) {
            window.SiloPreviewRoot.unmount();
        }

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
        window.SiloPreviewRoot = root;
        root.render(React.createElement(App));

    } catch (err) {
        handleError(err);
    }
  `;
  return logic;
};


export const Preview: React.FC<PreviewProps> = ({ files, onRuntimeError, previewMode, projectType, projectName, iframeRef }) => {
  const [htmlSrcDoc, setHtmlSrcDoc] = useState('');
  const [appetizePublicKey, setAppetizePublicKey] = useState<string | null>(null);
  const [isUploadingToAppetize, setIsUploadingToAppetize] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

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
                  setHtmlSrcDoc('<h1>index.html not found</h1>');
                  return;
              }
              
              let content = htmlFile.code;
              if (cssFile) {
                  content = content.replace('</head>', `<style>${cssFile.code}</style></head>`);
              }
              if (jsFile) {
                  content = content.replace('</body>', `<script>${jsFile.code}</script></body>`);
              }
              setHtmlSrcDoc(content);
          }
          return;
      }

      // React project logic
      try {
        const transpiledFiles: Record<string, string> = {};
        files.forEach(file => {
             if ((file.path.endsWith('.tsx') || file.path.endsWith('.ts') || file.path.endsWith('.js') || file.path.endsWith('.jsx')) && !file.path.endsWith('.config.js')) {
                const plugins = previewMode === 'iframe' ? ['transform-modules-commonjs'] : [];

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

        if (previewMode === 'service-worker') {
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
        } else { // iframe mode for React
            if (isIframeLoaded && iframeRef.current?.contentWindow) {
                const codeToExecute = createHotUpdateCode(transpiledFiles);
                iframeRef.current.contentWindow.postMessage({
                    type: 'EXECUTE_CODE',
                    code: codeToExecute
                }, '*');
            }
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

  }, [files, onRuntimeError, previewMode, projectType, projectName, isIframeLoaded, iframeRef]);

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

  // For HTML projects in iframe mode, we still use srcDoc
  if (projectType === 'html' && previewMode === 'iframe') {
      return (
          <div className="w-full h-full bg-white">
              <iframe
                  ref={iframeRef}
                  srcDoc={htmlSrcDoc}
                  title="Live Preview"
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-same-origin"
                  key={htmlSrcDoc}
              />
          </div>
      );
  }

  // For all React projects, and HTML in SW mode, use the static src iframe
  const initialSrc = (projectType === 'html' && previewMode === 'service-worker') ? '/index.html' : '/preview.html';
  return (
      <div className="w-full h-full bg-white">
        <iframe
          ref={iframeRef}
          src={initialSrc}
          title={previewMode === 'service-worker' ? "Live Preview (Service Worker)" : "Live Preview (Iframe)"}
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-same-origin"
          onLoad={() => setIsIframeLoaded(true)}
        />
      </div>
  );
};