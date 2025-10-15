
import React, { useEffect, useRef } from 'react';

interface PreviewProps {
  code: string;
  onRuntimeError: (message: string) => void;
}

const createIframeContent = (transpiledCode: string): string => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
      <style>
        body { background-color: #ffffff; color: #111827; padding: 1rem; font-family: sans-serif; }
      </style>
    </head>
    <body>
      <div id="preview-root"></div>
      <script type="module">
        // Shim for CommonJS 'require' used by Babel's output
        const require = (name) => {
          if (name === 'react') return window.parent.React;
          if (name === 'react-dom/client') return window.parent.ReactDOM;
          throw new Error(\`Cannot find module '\${name}'\`);
        };

        const handleError = (err) => {
           const root = document.getElementById('preview-root');
           root.innerHTML = \`<div style="color: red;"><h4>Runtime Error</h4>\${err.message}</div>\`;
           console.error(err);
           window.parent.postMessage({ type: 'error', message: err.message }, '*');
        };

        window.addEventListener('error', (event) => {
          event.preventDefault();
          handleError(event.error);
        });

        try {
          const exports = {};
          const module = { exports };
          
          // --- INJECT TRANSPILED CODE ---
          ${transpiledCode}
          // --- END INJECTED CODE ---

          const Component = module.exports.default;

          if (typeof Component !== 'function') {
            throw new Error('The code must have a default export of a React component.');
          }

          const rootElement = document.getElementById('preview-root');
          const root = window.parent.ReactDOM.createRoot(rootElement);
          root.render(window.parent.React.createElement(Component));

        } catch (err) {
          handleError(err);
        }
      </script>
    </body>
  </html>
`;

export const Preview: React.FC<PreviewProps> = ({ code, onRuntimeError }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data && event.data.type === 'error') {
        onRuntimeError(event.data.message);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onRuntimeError]);

  return (
    <div className="w-full h-full bg-white">
      <iframe
        ref={iframeRef}
        srcDoc={createIframeContent(code)}
        title="Live Preview"
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};