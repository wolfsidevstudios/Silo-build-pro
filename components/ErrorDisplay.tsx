import React from 'react';

interface ErrorDisplayProps {
  error: string | null;
  onClose: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onClose }) => {
  if (!error) {
    return null;
  }

  return (
    <div className="bg-red-900 bg-opacity-70 text-red-100 p-3 max-h-48 overflow-y-auto flex items-start justify-between">
      <div>
        <div className="flex items-center mb-2">
          <span className="material-symbols-outlined mr-2 text-red-300">error</span>
          <h3 className="font-bold text-red-200">Error</h3>
        </div>
        <pre className="whitespace-pre-wrap font-mono text-sm">{error}</pre>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded-full text-red-200 hover:bg-red-800 transition-colors flex-shrink-0"
        aria-label="Close error message"
      >
        <span className="material-symbols-outlined">close</span>
      </button>
    </div>
  );
};
