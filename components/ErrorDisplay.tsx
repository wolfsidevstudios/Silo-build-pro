
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
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl bg-red-900 bg-opacity-80 backdrop-blur-sm text-red-100 p-3 mb-4 rounded-lg shadow-2xl z-30 flex items-start justify-between mx-auto">
      <div>
        <div className="flex items-center mb-2">
          <span className="material-symbols-outlined mr-2 text-red-300">error</span>
          <h3 className="font-bold text-red-200">Error</h3>
        </div>
        <pre className="whitespace-pre-wrap font-mono text-sm max-h-32 overflow-y-auto">{error}</pre>
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
