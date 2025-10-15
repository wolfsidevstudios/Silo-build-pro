
import React, { useState } from 'react';

export type PublishState = {
  status: 'idle' | 'packaging' | 'creating_site' | 'uploading' | 'building' | 'success' | 'error';
  url?: string;
  error?: string;
};

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: () => void;
  publishState: PublishState;
  projectName: string;
  isRedeploy?: boolean;
  existingUrl?: string;
}

const statusMessages: Record<PublishState['status'], string> = {
  idle: 'Ready to publish your project to the web.',
  packaging: 'Packaging project files for deployment...',
  creating_site: 'Creating a new site on Netlify...',
  uploading: 'Uploading files to Netlify...',
  building: 'Netlify is building your site. This might take a moment...',
  success: 'Your project is live!',
  error: 'An error occurred during publishing.',
};

const Spinner: React.FC = () => (
    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
);

export const PublishModal: React.FC<PublishModalProps> = ({ isOpen, onClose, onPublish, publishState, projectName, isRedeploy, existingUrl }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (publishState.url) {
      navigator.clipboard.writeText(publishState.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderContent = () => {
    switch (publishState.status) {
      case 'success':
        return (
          <>
            <div className="text-center">
              <span className="material-symbols-outlined text-6xl text-green-400">task_alt</span>
              <h2 className="text-2xl font-bold mt-4">Published Successfully!</h2>
              <p className="text-gray-400 mt-2">{statusMessages[publishState.status]}</p>
            </div>
            <div className="mt-6 w-full">
              <label className="text-xs text-gray-500">Your live URL:</label>
              <div className="flex items-center space-x-2 mt-1">
                <input
                  type="text"
                  readOnly
                  value={publishState.url}
                  className="w-full p-2 bg-zinc-800 border border-gray-700 rounded-lg text-sm truncate"
                />
                <button
                  onClick={handleCopy}
                  className="p-2 bg-zinc-700 rounded-lg hover:bg-zinc-600 transition-colors"
                >
                  <span className="material-symbols-outlined">{copied ? 'check' : 'content_copy'}</span>
                </button>
              </div>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full">
              <a
                href={publishState.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 text-center bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Visit Site
              </a>
              <button onClick={onClose} className="w-full py-3 text-center bg-zinc-800 rounded-lg font-semibold hover:bg-zinc-700 transition-colors">
                Close
              </button>
            </div>
          </>
        );
      case 'error':
        return (
           <>
            <div className="text-center">
              <span className="material-symbols-outlined text-6xl text-red-400">error</span>
              <h2 className="text-2xl font-bold mt-4">Publishing Failed</h2>
            </div>
            <div className="mt-4 w-full bg-red-900/50 border border-red-500/50 rounded-lg p-3 max-h-40 overflow-y-auto">
              <p className="text-red-200 font-mono text-xs whitespace-pre-wrap">{publishState.error}</p>
            </div>
            <div className="mt-8 flex space-x-4 w-full">
              <button onClick={onPublish} className="w-full py-3 text-center bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors">
                Try Again
              </button>
              <button onClick={onClose} className="w-full py-3 text-center bg-zinc-800 rounded-lg font-semibold hover:bg-zinc-700 transition-colors">
                Close
              </button>
            </div>
          </>
        );
      case 'idle':
        if (isRedeploy) {
            return (
                <>
                    <div className="text-center">
                        <span className="material-symbols-outlined text-6xl text-blue-400">upload</span>
                        <h2 className="text-2xl font-bold mt-4">Redeploy Project</h2>
                        <p className="text-gray-400 mt-2 truncate">"{projectName}"</p>
                    </div>
                    {existingUrl && (
                        <div className="mt-4 w-full text-center">
                            <label className="text-xs text-gray-500">Live URL:</label>
                            <a href={existingUrl} target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-400 hover:underline truncate mt-1">
                                {existingUrl}
                            </a>
                        </div>
                    )}
                    <p className="text-sm text-gray-500 mt-4 text-center">This will update your existing Netlify site with the latest changes.</p>
                    <div className="mt-8 flex space-x-4 w-full">
                        <button onClick={onClose} className="w-full py-3 text-center bg-zinc-800 rounded-lg font-semibold hover:bg-zinc-700 transition-colors">
                            Cancel
                        </button>
                        <button onClick={onPublish} className="w-full py-3 text-center bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                            Update Site
                        </button>
                    </div>
                </>
            );
        }
         return (
          <>
            <div className="text-center">
                <span className="material-symbols-outlined text-6xl text-blue-400">publish</span>
                <h2 className="text-2xl font-bold mt-4">Publish Project</h2>
                <p className="text-gray-400 mt-2 truncate">"{projectName}"</p>
            </div>
             <p className="text-sm text-gray-500 mt-4 text-center">This will deploy your project to Netlify, making it available on a public URL. This action may create a new site in your Netlify account.</p>
             <div className="mt-8 flex space-x-4 w-full">
                <button onClick={onClose} className="w-full py-3 text-center bg-zinc-800 rounded-lg font-semibold hover:bg-zinc-700 transition-colors">
                    Cancel
                </button>
                <button onClick={onPublish} className="w-full py-3 text-center bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                    Publish Now
                </button>
            </div>
          </>
        );
      default:
        return (
          <>
            <Spinner />
            <h2 className="text-xl font-bold mt-6">Publishing in Progress...</h2>
            <p className="text-gray-400 mt-2 text-center">{statusMessages[publishState.status]}</p>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md relative text-white flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
        {renderContent()}
      </div>
    </div>
  );
};
