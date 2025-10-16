
import React, { useState } from 'react';

interface GitHubSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (repoName: string, description: string, isPrivate: boolean) => void;
  isLoading: boolean;
  projectName: string;
}

export const GitHubSaveModal: React.FC<GitHubSaveModalProps> = ({ isOpen, onClose, onSave, isLoading, projectName }) => {
  const [repoName, setRepoName] = useState(projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
  const [description, setDescription] = useState(`Project "${projectName}" created with Silo Build.`);
  const [isPrivate, setIsPrivate] = useState(true);

  if (!isOpen) return null;

  const handleSave = () => {
    if (repoName.trim()) {
      onSave(repoName.trim(), description.trim(), isPrivate);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-zinc-900 border border-gray-800 rounded-2xl p-8 w-full max-w-lg relative text-white" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">Save to GitHub</h2>
          <p className="text-gray-400 mt-2">Create a new GitHub repository for this project.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="repo-name" className="block text-sm font-medium text-gray-400 mb-2">Repository Name</label>
            <input
              id="repo-name"
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              className="w-full p-3 bg-zinc-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
           <div>
            <label htmlFor="repo-desc" className="block text-sm font-medium text-gray-400 mb-2">Description (Optional)</label>
            <textarea
              id="repo-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full p-3 bg-zinc-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex items-center justify-center space-x-2 bg-zinc-800 border border-gray-700 rounded-full p-1">
            <button onClick={() => setIsPrivate(false)} className={`w-1/2 py-2 rounded-full text-sm font-semibold transition-colors ${!isPrivate ? 'bg-white text-black' : 'text-gray-300'}`}>Public</button>
            <button onClick={() => setIsPrivate(true)} className={`w-1/2 py-2 rounded-full text-sm font-semibold transition-colors ${isPrivate ? 'bg-white text-black' : 'text-gray-300'}`}>Private</button>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleSave}
            disabled={!repoName.trim() || isLoading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? 'Creating...' : 'Create and Push'}
          </button>
        </div>
      </div>
    </div>
  );
};
