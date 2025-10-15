


import React, { useState } from 'react';
import type { ProjectFile } from '../App';

interface FileExplorerProps {
  files: ProjectFile[];
  activeFilePath: string;
  onFileSelect: (path: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  children?: { [key: string]: TreeNode };
}

const buildFileTree = (files: ProjectFile[]): TreeNode => {
  const root: TreeNode = { name: 'root', path: '' };
  files.forEach(file => {
    let currentLevel = root;
    const pathParts = file.path.split('/');
    pathParts.forEach((part, index) => {
      if (!currentLevel.children) {
        currentLevel.children = {};
      }
      if (!currentLevel.children[part]) {
        currentLevel.children[part] = {
          name: part,
          path: pathParts.slice(0, index + 1).join('/'),
        };
      }
      currentLevel = currentLevel.children[part];
    });
  });
  return root;
};

const FileNode: React.FC<{ node: TreeNode; activeFilePath: string; onFileSelect: (path: string) => void; level: number }> = ({ node, activeFilePath, onFileSelect, level }) => {
  const isDirectory = !!node.children;
  const [isOpen, setIsOpen] = useState(true);

  const handleToggle = () => {
    if (isDirectory) {
      setIsOpen(!isOpen);
    } else {
      onFileSelect(node.path);
    }
  };

  const isActive = activeFilePath === node.path;

  return (
    <div>
      <div
        onClick={handleToggle}
        className={`flex items-center space-x-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors ${
          isActive ? 'bg-blue-600/30 text-blue-300' : 'text-gray-400 hover:bg-white/10'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        <span className="material-symbols-outlined text-base transition-transform duration-200"
          style={{ transform: isDirectory && isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          {isDirectory ? 'chevron_right' : 'description'}
        </span>
        <span className="text-sm truncate">{node.name}</span>
      </div>
      {isDirectory && isOpen && (
        <div>
          {/* Fix: Explicitly type sort parameters to resolve 'property does not exist on type unknown' errors. */}
          {Object.values(node.children ?? {}).sort((a: TreeNode, b: TreeNode) => {
            // directories first, then files, then alphabetically
            const aIsDir = !!a.children;
            const bIsDir = !!b.children;
            if (aIsDir && !bIsDir) return -1;
            if (!aIsDir && bIsDir) return 1;
            return a.name.localeCompare(b.name);
          }).map(child => (
            <FileNode key={child.path} node={child} activeFilePath={activeFilePath} onFileSelect={onFileSelect} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({ files, activeFilePath, onFileSelect }) => {
  const fileTree = buildFileTree(files);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-2">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Explorer</h2>
      </div>
      <div className="flex-1 mt-2 space-y-1 pr-1">
        {/* Fix: Explicitly type the `node` parameter as `TreeNode` to resolve TypeScript error. */}
        {/* FIX: Explicitly type `node` as `TreeNode` to resolve 'property does not exist on type unknown' error. */}
        {Object.values(fileTree.children ?? {}).map((node: TreeNode) => (
          <FileNode key={node.path} node={node} activeFilePath={activeFilePath} onFileSelect={onFileSelect} level={0} />
        ))}
      </div>
    </div>
  );
};
