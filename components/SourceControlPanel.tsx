import React, { useState, useMemo } from 'react';
import type { Project, Commit, ProjectFile } from '../App';

const getChanges = (currentFiles: ProjectFile[], latestCommit: Commit | undefined): { path: string, status: 'new' | 'modified' | 'deleted' }[] => {
    if (!latestCommit) {
        return currentFiles.map(f => ({ path: f.path, status: 'new' as const }));
    }

    const changes: { path: string, status: 'new' | 'modified' | 'deleted' }[] = [];
    const latestCommitFilesMap = new Map(latestCommit.files.map(f => [f.path, f.code]));
    const currentFilesMap = new Map(currentFiles.map(f => [f.path, f.code]));

    // Check for new and modified files
    for (const [path, code] of currentFilesMap.entries()) {
        if (!latestCommitFilesMap.has(path)) {
            changes.push({ path, status: 'new' });
        } else if (latestCommitFilesMap.get(path) !== code) {
            changes.push({ path, status: 'modified' });
        }
    }

    // Check for deleted files
    for (const path of latestCommitFilesMap.keys()) {
        if (!currentFilesMap.has(path)) {
            changes.push({ path, status: 'deleted' });
        }
    }
    return changes.sort((a, b) => a.path.localeCompare(b.path));
};


interface SourceControlPanelProps {
  project: Project;
  onCommit: (message: string) => void;
  onInitiateGitHubSave: () => void;
  onExportProject: () => void;
}

export const SourceControlPanel: React.FC<SourceControlPanelProps> = ({ project, onCommit, onInitiateGitHubSave, onExportProject }) => {
    const [commitMessage, setCommitMessage] = useState('');
    const isGitHubLinked = !!project.githubRepo;

    const latestCommit = useMemo(() => {
        if (!project.commits || project.commits.length === 0) return undefined;
        return project.commits[project.commits.length - 1];
    }, [project.commits]);

    const changes = useMemo(() => getChanges(project.files, latestCommit), [project.files, latestCommit]);

    const handleCommitClick = () => {
        if (commitMessage.trim() && changes.length > 0) {
            onCommit(commitMessage);
            setCommitMessage('');
        }
    };

    return (
        <div className="flex h-full text-black bg-transparent">
            <div className="w-[400px] max-w-sm flex flex-col border-r border-gray-200">
                <div className="p-4 border-b border-gray-200">
                     {!isGitHubLinked ? (
                        <div className="mb-4 text-center p-4 bg-gray-100 border border-dashed border-gray-300 rounded-lg">
                            <p className="text-sm text-gray-600 mb-3">Save your project to GitHub to track versions and collaborate.</p>
                            <button
                                onClick={onInitiateGitHubSave}
                                className="w-full py-2 bg-white border border-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-sm"
                            >
                                Connect to GitHub
                            </button>
                        </div>
                    ) : (
                        <div className="mb-4 text-sm text-gray-600">
                            Connected to: <a href={`https://github.com/${project.githubRepo}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{project.githubRepo}</a>
                        </div>
                    )}
                    <h2 className="text-lg font-semibold mb-4 text-gray-900">Commit Changes</h2>
                    <textarea
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        placeholder="Commit message..."
                        className="w-full h-24 p-2 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm resize-none"
                    />
                    <button
                        onClick={handleCommitClick}
                        disabled={!commitMessage.trim() || changes.length === 0}
                        className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                    >
                        {isGitHubLinked ? 'Commit & Push' : 'Commit'} ({changes.length} file{changes.length !== 1 ? 's' : ''})
                    </button>
                     <div className="mt-4 pt-4 border-t border-gray-200">
                        <button
                            onClick={onExportProject}
                            className="w-full flex items-center justify-center space-x-2 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-sm"
                        >
                            <span className="material-symbols-outlined text-base">download</span>
                            <span>Download Project for EAS</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="text-md font-semibold mb-2 text-gray-800">Changes</h3>
                     {changes.length === 0 ? (
                        <p className="text-sm text-gray-500 mt-4">No changes since last commit.</p>
                    ) : (
                        <ul className="space-y-1">
                            {changes.map(change => (
                                <li key={change.path} className="flex items-center space-x-2 text-sm p-1 rounded hover:bg-gray-100">
                                    <span className={`w-14 text-center px-1.5 py-0.5 rounded text-xs font-mono
                                        ${change.status === 'new' && 'bg-green-100 text-green-800'}
                                        ${change.status === 'modified' && 'bg-yellow-100 text-yellow-800'}
                                        ${change.status === 'deleted' && 'bg-red-100 text-red-800'}
                                    `}>
                                        {change.status}
                                    </span>
                                    <span className="text-gray-700 truncate">{change.path}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                <h2 className="text-lg font-semibold mb-4 text-gray-900">History</h2>
                {(!project.commits || project.commits.length === 0) ? (
                    <div className="flex items-center justify-center h-full text-center text-gray-500">
                        <p>No commits yet. Make your first commit!</p>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {[...project.commits].reverse().map(commit => (
                            <li key={commit.id} className="bg-white border border-gray-200 rounded-lg p-3">
                                <p className="font-semibold text-gray-800">{commit.message}</p>
                                <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                                    <span>Commit {commit.id.substring(0, 7)}</span>
                                    <span>{new Date(commit.timestamp).toLocaleString()}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};