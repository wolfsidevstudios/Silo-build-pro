

import React, { useState } from 'react';

export type PublishState = {
  status: 'idle' | 'packaging' | 'creating_site' | 'uploading' | 'building' | 'success' | 'error';
  platform?: 'netlify' | 'vercel';
  url?: string;
  error?: string;
};

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (platform: 'netlify' | 'vercel') => void;
  publishState: PublishState;
  projectName: string;
  isRedeploy: boolean;
  isNetlifyConfigured: boolean;
  isVercelConfigured: boolean;
}

const getStatusMessage = (status: PublishState['status'], platform?: 'netlify' | 'vercel'): string => {
    const platformName = platform === 'netlify' ? 'Netlify' : 'Vercel';
    const messages: Record<PublishState['status'], string> = {
        idle: 'Choose a platform to deploy your project to the web.',
        packaging: 'Packaging project files for deployment...',
        creating_site: `Creating a new site on ${platformName}...`,
        uploading: `Uploading files to ${platformName}...`,
        building: `${platformName} is building your site. This might take a moment...`,
        success: 'Your project is live!',
        error: 'An error occurred during publishing.',
    };
    return messages[status];
};

const Spinner: React.FC = () => (
    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
);

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  onPublish,
  publishState,
  projectName,
  isRedeploy,
  isNetlifyConfigured,
  isVercelConfigured
}) => {
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
              <p className="text-gray-400 mt-2">{getStatusMessage(publishState.status, publishState.platform)}</p>
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
              <button onClick={() => onPublish(publishState.platform!)} className="w-full py-3 text-center bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors">
                Try Again
              </button>
              <button onClick={onClose} className="w-full py-3 text-center bg-zinc-800 rounded-lg font-semibold hover:bg-zinc-700 transition-colors">
                Close
              </button>
            </div>
          </>
        );
      case 'idle':
        if (!isNetlifyConfigured && !isVercelConfigured) {
          return (
             <>
                <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-yellow-400">token</span>
                    <h2 className="text-2xl font-bold mt-4">Deployment Not Configured</h2>
                    <p className="text-gray-400 mt-2">To publish your project, please add a Netlify or Vercel access token in the settings.</p>
                </div>
                <div className="mt-8 flex space-x-4 w-full">
                    <button onClick={onClose} className="w-full py-3 text-center bg-zinc-800 rounded-lg font-semibold hover:bg-zinc-700 transition-colors">
                        Cancel
                    </button>
                    <a href="#/settings" onClick={onClose} className="w-full py-3 text-center bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                        Go to Settings
                    </a>
                </div>
             </>
          );
        }
        return (
          <>
            <div className="text-center">
                <span className="material-symbols-outlined text-6xl text-blue-400">publish</span>
                <h2 className="text-2xl font-bold mt-4">{isRedeploy ? 'Redeploy Project' : 'Publish Project'}</h2>
                <p className="text-gray-400 mt-2 truncate">"{projectName}"</p>
            </div>
             <p className="text-sm text-gray-500 mt-4 text-center">Choose a platform to deploy your project. This will make it available on a public URL.</p>
             <div className="mt-8 flex flex-col space-y-3 w-full">
                {isNetlifyConfigured && (
                    <button onClick={() => onPublish('netlify')} className="w-full py-3 text-center bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors">
                        Deploy with Netlify
                    </button>
                )}
                {isVercelConfigured && (
                    <button onClick={() => onPublish('vercel')} className="w-full py-3 text-center bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors">
                        Deploy with Vercel
                    </button>
                )}
            </div>
             <div className="mt-4 w-full">
                <button onClick={onClose} className="w-full py-2 text-center text-gray-400 rounded-lg font-semibold hover:bg-zinc-800 transition-colors">
                    Cancel
                </button>
            </div>
          </>
        );
      default:
        return (
          <>
            <Spinner />
            <h2 className="text-xl font-bold mt-6">Publishing in Progress...</h2>
            <p className="text-gray-400 mt-2 text-center">{getStatusMessage(publishState.status, publishState.platform)}</p>
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
