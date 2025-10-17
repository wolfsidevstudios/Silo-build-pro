import React, { useEffect, useRef } from 'react';

declare const Prism: any;

type Language = 'tsx' | 'sql' | 'html' | 'css' | 'javascript';

interface CodeEditorProps {
  value: string;
  language: Language;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ value, language }) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current && Prism) {
      Prism.highlightElement(codeRef.current);
    }
  }, [value, language]);

  return (
    <div className="h-full bg-white overflow-auto">
      <pre className="h-full m-0">
        <code ref={codeRef} className={`language-${language}`}>
          {value}
        </code>
      </pre>
    </div>
  );
};