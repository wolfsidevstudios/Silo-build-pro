import React, { useState } from 'react';

export type CommunityPublishState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  url?: string;
  error?: string;
};

interface PublishToCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (appName: string, description: string) => void;
  publishState: CommunityPublishState;
  projectName: string;
}

const Spinner: React.FC = () => (
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
);

export const PublishToCommunityModal: React.FC<PublishToCommunityModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  publishState,
  projectName,
}) => {
  const [appName, setAppName] = useState(projectName);
  const [description, setDescription] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (appName.trim()) {
      onSubmit(appName.trim(), description.trim());
    }
  };
  
  const handleCopy = () => {
    if (publishState.url) {
      navigator.clipboard.writeText(publishState.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderContent = () => {
    switch (publishState.status) {
        case 'loading':
            return (
                <div className="flex flex-col items-center justify-center text-center">
                    <Spinner />
                    <h2 className="text-xl font-semibold mt-4">Publishing to Community...</h2>
                    <p className="text-gray-500 mt-1">Your app will be live shortly.</p>
                </div>
            );
        case 'success':
            return (
                <div className="text-center">
                    <span className="material-symbols-outlined text-5xl text-green-500">task_alt</span>
                    <h2 className="text-2xl font-bold mt-4">Published to Community!</h2>
                    <p className="text-gray-500 mt-2">Your app is now discoverable by others.</p>
                    <div className="mt-6 w-full">
                        <label className="text-xs text-gray-500">Your shareable URL:</label>
                        <div className="flex items-center space-x-2 mt-1">
                            <input
                                type="text"
                                readOnly
                                value={publishState.url}
                                className="w-full p-2 bg-gray-100 border border-gray-300 rounded-lg text-sm truncate"
                            />
                            <button onClick={handleCopy} className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">
                                <span className="material-symbols-outlined">{copied ? 'check' : 'content_copy'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        case 'error':
             return (
                <div className="text-center">
                    <span className="material-symbols-outlined text-5xl text-red-500">error</span>
                    <h2 className="text-2xl font-bold mt-4">Publishing Failed</h2>
                    <p className="text-red-600 mt-2 text-sm">{publishState.error}</p>
                    <button onClick={handleSubmit} className="mt-6 w-full py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors">
                        Try Again
                    </button>
                </div>
            );
        default: // idle
            return (
                <>
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold">Publish to Community</h2>
                        <p className="text-gray-500 mt-1">Share your creation with the world.</p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="app-name" className="block text-sm font-medium text-gray-600 mb-1">App Name</label>
                            <input
                                id="app-name"
                                type="text"
                                value={appName}
                                onChange={(e) => setAppName(e.target.value)}
                                className="w-full p-2 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="app-desc" className="block text-sm font-medium text-gray-600 mb-1">Description (Optional)</label>
                            <textarea
                                id="app-desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full p-2 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>
                    </div>
                    <div className="mt-6">
                        <button
                            onClick={handleSubmit}
                            disabled={!appName.trim()}
                            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            Publish
                        </button>
                    </div>
                </>
            );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-8 w-full max-w-md relative text-black flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
        {renderContent()}
      </div>
    </div>
  );
};
