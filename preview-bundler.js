
// In-browser bundler and transpiler using Babel, running in a Web Worker.

self.importScripts('https://unpkg.com/@babel/standalone@7.24.0/babel.min.js');

if (!self.Babel) {
    console.error("Babel not loaded in worker!");
    self.postMessage({ type: 'ERROR', error: 'Babel library failed to load in the preview worker.' });
}

const CDN_URL = 'https://esm.sh/';

const transpile = (file) => {
    const { path, code } = file;
    try {
        let transformedCode = self.Babel.transform(code, {
            presets: ['typescript', ['react', { runtime: 'automatic' }]],
            filename: path,
        }).code;

        transformedCode = transformedCode.replace(/(import .* from\s+['"]\..*)\.(tsx|ts|jsx)(['"])/g, '$1.js$3');
        return transformedCode;
    } catch (e) {
        e.message = `Babel Error in ${path}: ${e.message}`;
        self.postMessage({ type: 'ERROR', error: e.message });
        return null;
    }
};

self.onmessage = (event) => {
    const { type, files } = event.data;

    if (type === 'BUNDLE') {
        try {
            const entryPointPath = files.find(f => f.path === 'src/App.tsx') 
                ? 'src/App.tsx'
                : (files.find(f => f.path === 'index.html') ? 'script.js' : 'index.js');
            
            const fileBlobs = {};
            const importMap = { imports: {} };
            
            for (const file of files) {
                let code = file.code;
                let mimeType = 'text/plain';

                if (/\.(tsx|ts|jsx|js)$/.test(file.path)) {
                    code = transpile(file);
                    if (code === null) return; // Error was already posted
                    mimeType = 'application/javascript';
                } else if (file.path.endsWith('.css')) {
                    mimeType = 'text/css';
                }

                const blob = new Blob([code], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const absolutePath = `/${file.path.replace(/\.(tsx|ts|jsx)$/, '.js')}`;
                
                fileBlobs[file.path] = url;
                importMap.imports[absolutePath] = url;
            }

            const loaderScript = `
                import React from 'react';
                import ReactDOM from 'react-dom/client';
                import '/src/App.js';
                
                try {
                    const AppContainer = await import('/src/App.js');
                    if (!AppContainer || typeof AppContainer.default === 'undefined') {
                        throw new Error('The entry point "src/App.tsx" must have a default export.');
                    }
                    const App = AppContainer.default;
                    const rootElement = document.getElementById('preview-root');
                    const root = ReactDOM.createRoot(rootElement);
                    root.render(React.createElement(App));
                } catch (err) {
                    console.error("Preview Execution Error:", err);
                }
            `;
            
            const entryBlob = new Blob([loaderScript], { type: 'application/javascript' });
            const entryPointUrl = URL.createObjectURL(entryBlob);
            fileBlobs['entry.js'] = entryPointUrl;


            self.postMessage({
                type: 'SUCCESS',
                entryPointUrl: entryPointUrl,
                importMap: {
                    ...importMap,
                    imports: {
                        ...importMap.imports,
                        'react': `${CDN_URL}react@18.2.0`,
                        'react/jsx-runtime': `${CDN_URL}react@18.2.0/jsx-runtime`,
                        'react-dom/client': `${CDN_URL}react-dom@18.2.0/client`,
                    }
                },
                files: fileBlobs
            });

        } catch (e) {
            self.postMessage({ type: 'ERROR', error: e.message });
        }
    }
};
