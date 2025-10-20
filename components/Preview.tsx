
import React, { useEffect, useState, useRef } from 'react';
import type { ProjectFile, PreviewMode, ProjectType } from '../App';

declare const JSZip: any;

// NEW HTML TEMPLATE FOR THE IFRAME
const NEW_PREVIEW_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Silo Build Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
    <style>
        body { background-color: #ffffff; color: #111827; margin: 0; font-family: sans-serif; }
        #error-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(20, 2, 2, 0.95);
            color: white;
            font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace;
            padding: 2rem;
            z-index: 9999;
            display: none;
            overflow-y: auto;
            border-top: 5px solid #ef4444;
        }
        #error-overlay h3 { color: #f87171; font-size: 1.5rem; margin-bottom: 1rem; font-weight: bold; }
        #error-overlay pre { white-space: pre-wrap; word-break: break-word; color: #fca5a5; font-size: 0.9rem; line-height: 1.6; }
    </style>
</head>
<body>
    <div id="preview-root"></div>
    <div id="error-overlay">
        <h3>Runtime Error</h3>
        <pre id="error-message"></pre>
    </div>
    <script type="module">
        // --- CONSOLE PROXY ---
        const originalConsole = { ...window.console };
        const serializeArg = (arg) => {
            if (arg instanceof Error) {
                return arg.stack || arg.message;
            }
            if (typeof arg === 'function') {
                return 'ƒ ' + (arg.name || '(anonymous)') + '()';
            }
             if (typeof arg === 'object' && arg !== null) {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                     return String(arg);
                }
            }
            return String(arg);
        };
        ['log', 'warn', 'error', 'info'].forEach(level => {
            window.console[level] = (...args) => {
                originalConsole[level](...args);
                try {
                    window.parent.postMessage({ type: 'console', level, args: args.map(serializeArg) }, '*');
                } catch (e) { /* ignore */ }
            };
        });

        // --- ERROR HANDLING & OVERLAY ---
        const showErrorOverlay = (error) => {
            const overlay = document.getElementById('error-overlay');
            const messageEl = document.getElementById('error-message');
            if (overlay && messageEl) {
                messageEl.textContent = error.stack || error.message;
                overlay.style.display = 'block';
            }
             window.parent.postMessage({ type: 'error', message: error?.message || 'An unknown error occurred.' }, '*');
        };

        window.addEventListener('error', (event) => {
            event.preventDefault();
            showErrorOverlay(event.error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            event.preventDefault();
            showErrorOverlay(event.reason);
        });
        
        // --- CODE EXECUTION LISTENER ---
        window.addEventListener('message', async (event) => {
            if (event.data && event.data.type === 'EXECUTE') {
                const { entryPointUrl, importMap, files } = event.data;
                
                // Clear previous state
                const rootEl = document.getElementById('preview-root');
                if (rootEl) rootEl.innerHTML = '';
                const overlay = document.getElementById('error-overlay');
                if(overlay) overlay.style.display = 'none';

                // Find and remove old importmap/entrypoint if they exist
                document.getElementById('silo-importmap')?.remove();
                document.getElementById('silo-entrypoint')?.remove();
                
                // Revoke old blob URLs to prevent memory leaks
                if (window.siloBlobUrls) {
                    Object.values(window.siloBlobUrls).forEach(url => URL.revokeObjectURL(url));
                }
                window.siloBlobUrls = files;

                // Add import map
                const importMapScript = document.createElement('script');
                importMapScript.id = 'silo-importmap';
                importMapScript.type = 'importmap';
                importMapScript.textContent = JSON.stringify(importMap);
                document.head.appendChild(importMapScript);

                // Dynamically import the entry point
                const entryScript = document.createElement('script');
                entryScript.id = 'silo-entrypoint';
                entryScript.type = 'module';
                entryScript.innerHTML = \`import('\${entryPointUrl}').catch(e => console.error(e));\`;
                document.body.appendChild(entryScript);
            }
        });
    </script>
</body>
</html>
`;

const createHtmlSrcDoc = (files: ProjectFile[]): [string, () => void] => {
    let htmlFile = files.find(f => f.path === 'index.html');
    if (!htmlFile) return ['<h1>index.html not found</h1>', () => {}];
    
    let content = htmlFile.code;
    const blobUrls: Record<string, string> = {};

    files.forEach(file => {
        if (file.path.endsWith('.css') || file.path.endsWith('.js')) {
            const mimeType = file.path.endsWith('.css') ? 'text/css' : 'application/javascript';
            const blob = new Blob([file.code], { type: mimeType });
            blobUrls[file.path] = URL.createObjectURL(blob);
        }
    });

    content = content.replace(/(href|src)=["'](?!https?:\/\/)([^"']+)["']/g, (match, attr, path) => {
        const cleanPath = path.startsWith('./') ? path.substring(2) : path;
        if (blobUrls[cleanPath]) {
            return `${attr}="${blobUrls[cleanPath]}"`;
        }
        return match;
    });

    const cleanup = () => {
        Object.values(blobUrls).forEach(url => URL.revokeObjectURL(url));
    };

    return [content, cleanup];
};


interface PreviewProps {
  files: ProjectFile[];
  onRuntimeError: (message: string) => void;
  previewMode: PreviewMode;
  projectType: ProjectType;
  projectName: string;
  iframeRef: React.RefObject<HTMLIFrameElement>;
}

const createExpoAppPackage = async (files: ProjectFile[], projectName: string): Promise<Blob> => {
    const zip = new JSZip();
    const cleanProjectName = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    files.forEach(file => {
        zip.file(file.path, file.code);
    });
    
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
    
    const appJson = {
        "expo": {
            "name": projectName,
            "slug": cleanProjectName,
            "version": "1.0.0",
            "main": "index.js",
            "platforms": ["ios", "android"],
            "ios": { "supportsTablet": true },
        }
    };
    zip.file('app.json', JSON.stringify(appJson, null, 2));

    const indexJsContent = `
import { registerRootComponent } from 'expo';
import App from './src/App.tsx';
registerRootComponent(App);
    `;
    zip.file('index.js', indexJsContent);

    return zip.generateAsync({ type: 'blob' });
};

// Main Preview Component
export const Preview: React.FC<PreviewProps> = ({ files, onRuntimeError, previewMode, projectType, projectName, iframeRef }) => {
    const workerRef = useRef<Worker | null>(null);
    const [appetizePublicKey, setAppetizePublicKey] = useState<string | null>(null);
    const [isUploadingToAppetize, setIsUploadingToAppetize] = useState(false);

    // Initialize worker
    useEffect(() => {
        workerRef.current = new Worker('/preview-bundler.js');

        const messageHandler = (event: MessageEvent) => {
            const { type, error, entryPointUrl, importMap, files: blobFiles } = event.data;
            if (type === 'ERROR') {
                onRuntimeError(`Bundler Error: ${error}`);
            } else if (type === 'SUCCESS') {
                iframeRef.current?.contentWindow?.postMessage({
                    type: 'EXECUTE',
                    entryPointUrl,
                    importMap,
                    files: blobFiles
                }, '*');
            }
        };

        workerRef.current.addEventListener('message', messageHandler);

        return () => {
            workerRef.current?.removeEventListener('message', messageHandler);
            workerRef.current?.terminate();
        };
    }, [onRuntimeError]);


    useEffect(() => {
        let isMounted = true;
        let htmlCleanup: (() => void) | null = null;
    
        const uploadToAppetize = async () => {
            if (!isMounted) return;
            setIsUploadingToAppetize(true);
            setAppetizePublicKey(null);
            
            try {
                const apiToken = 'tok_32w24mhn7v4bmu6v27aylqjd5e'; // This should ideally be an env variable
                const zipBlob = await createExpoAppPackage(files, projectName);
                const formData = new FormData();
                formData.append('file', zipBlob, `${projectName}.zip`);
                formData.append('platform', 'ios');
    
                const response = await fetch('https://api.appetize.io/v1/apps', {
                    method: 'POST',
                    headers: { 'Authorization': `Basic ${btoa(apiToken + ':')}` },
                    body: formData,
                });
    
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || errorData.error || 'Failed to upload to Appetize.io');
                }
    
                const data = await response.json();
                if (data.publicKey && isMounted) {
                    setAppetizePublicKey(data.publicKey);
                } else {
                    throw new Error('No public key returned from Appetize.io');
                }
    
            } catch (err: any) {
                onRuntimeError(`Appetize Error: ${err.message}`);
            } finally {
                if (isMounted) setIsUploadingToAppetize(false);
            }
        };

        const update = () => {
            if (!isMounted) return;

            if (previewMode === 'appetize') {
                uploadToAppetize();
                return;
            }

            if (projectType === 'html') {
                const [srcDoc, cleanup] = createHtmlSrcDoc(files);
                if (iframeRef.current) iframeRef.current.srcdoc = srcDoc;
                htmlCleanup = cleanup;
                return;
            }

            if (workerRef.current) {
                workerRef.current.postMessage({ type: 'BUNDLE', files });
            }
        };

        const timeoutId = setTimeout(update, 300);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            if (htmlCleanup) htmlCleanup();
        };
    }, [files, previewMode, projectType, projectName, onRuntimeError]);
    
    useEffect(() => {
      const handler = (event: MessageEvent) => {
        if (event.source !== iframeRef.current?.contentWindow) return;
        if (event.data && event.data.type === 'error') {
          onRuntimeError(event.data.message);
        }
        if (event.data && event.data.type === 'console') {
            window.parent.postMessage(event.data, '*');
        }
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }, [onRuntimeError]);


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
    
    return (
        <div className="w-full h-full bg-white">
            <iframe
                ref={iframeRef}
                srcDoc={projectType === 'html' ? '' : NEW_PREVIEW_HTML}
                title="Live Preview"
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-same-origin"
                key={projectType} 
            />
        </div>
    );
};
