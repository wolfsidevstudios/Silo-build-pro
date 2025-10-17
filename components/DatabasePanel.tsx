import React, { useState } from 'react';
import { CodeEditor } from './CodeEditor';

interface DatabasePanelProps {
  sql: string;
}

export const DatabasePanel: React.FC<DatabasePanelProps> = ({ sql }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  if (!sql) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8 bg-white rounded-3xl border border-gray-200">
        <span className="material-symbols-outlined text-6xl">dataset_linked_off</span>
        <h3 className="mt-4 text-xl font-semibold text-gray-800">No Database Schema Generated</h3>
        <p className="mt-2 max-w-sm">
          The AI did not generate any SQL for this component. If you need a database, try asking the AI to add persistence features or connect to Supabase.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden border border-gray-200">
      <div className="flex-shrink-0 p-3 bg-gray-100 flex items-center justify-between border-b border-gray-200">
        <p className="text-sm font-semibold text-gray-700">SQL Schema</p>
        <button
          onClick={handleCopy}
          className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-xs font-semibold hover:bg-blue-700 transition-all flex items-center space-x-2"
        >
          <span className="material-symbols-outlined text-sm">
            {copyStatus === 'copied' ? 'check' : 'content_copy'}
          </span>
          <span>{copyStatus === 'copied' ? 'Copied!' : 'Copy SQL'}</span>
        </button>
      </div>
      <div className="flex-1 bg-gray-50">
         <CodeEditor value={sql} onChange={() => {}} readOnly />
      </div>
       <div className="p-3 bg-gray-100 border-t border-gray-200 text-xs text-gray-600">
        <p>Run this SQL code in your database to set up the necessary tables. If you've connected Supabase, you can use the SQL Editor in your project dashboard.</p>
      </div>
    </div>
  );
};