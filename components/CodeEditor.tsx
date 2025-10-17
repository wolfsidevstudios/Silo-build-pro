import React from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, readOnly = false }) => {
  return (
    <div className="relative h-full bg-gray-50">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck="false"
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        readOnly={readOnly}
        className="w-full h-full p-4 bg-transparent text-gray-900 font-mono text-sm leading-relaxed resize-none border-none outline-none"
        placeholder="Write your React TSX code here..."
      />
    </div>
  );
};