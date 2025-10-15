
import React, { useState } from 'react';

interface SupabaseConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthorize: () => void;
  onManualConnect: (url: string, anonKey: string) => void;
  isLoading: boolean;
}

export const SupabaseConnectModal: React.FC<SupabaseConnectModalProps> = ({
  isOpen,
  onClose,
  onAuthorize,
  onManualConnect,
  isLoading,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');

  if (!isOpen) return null;

  const handleManualSubmit = () => {
    if (url.trim() && anonKey.trim()) {
      onManualConnect(url.trim(), anonKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-zinc-900 border border-gray-800 rounded-2xl p-8 w-full max-w-lg relative text-white" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">Connect to Supabase</h2>
          <p className="text-gray-400 mt-2">Choose your preferred method to connect your project.</p>
        </div>
        
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-2 bg-black border border-gray-700 rounded-full p-1">
            <button
              onClick={() => setActiveTab('auto')}
              className={`w-32 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeTab === 'auto'
                  ? 'bg-white text-black'
                  : 'text-gray-300 hover:bg-zinc-800'
              }`}
            >
              Authorize
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`w-32 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeTab === 'manual'
                  ? 'bg-white text-black'
                  : 'text-gray-300 hover:bg-zinc-800'
              }`}
            >
              Manual
            </button>
          </div>
        </div>

        {activeTab === 'auto' && (
           <div className="text-center p-6 bg-zinc-800/50 rounded-lg">
             <h3 className="text-lg font-semibold mb-2">Authorize with Supabase</h3>
             <p className="text-gray-400 mb-6 text-sm">
                The recommended and most secure method. You'll be redirected to Supabase to grant access.
             </p>
             <button
                onClick={onAuthorize}
                className="w-full max-w-xs mx-auto py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Connect with Supabase
             </button>
           </div>
        )}

        {activeTab === 'manual' && (
           <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-2 text-center">Enter Keys Manually</h3>
             <div>
              <label htmlFor="supabase-url" className="block text-sm font-medium text-gray-400 mb-2">
                Project URL
              </label>
              <input
                id="supabase-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-project-ref.supabase.co"
                className="w-full p-3 bg-zinc-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
             <div>
              <label htmlFor="supabase-key" className="block text-sm font-medium text-gray-400 mb-2">
                Anon (Public) Key
              </label>
              <input
                id="supabase-key"
                type="text"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="ey..."
                className="w-full p-3 bg-zinc-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
             <p className="text-xs text-gray-500 text-center">
              You can find these in your Supabase project's API Settings page.
            </p>
             <button
              onClick={handleManualSubmit}
              disabled={!url.trim() || !anonKey.trim() || isLoading}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Connecting...' : 'Connect'}
            </button>
           </div>
        )}
      </div>
    </div>
  );
};
