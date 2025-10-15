import React from 'react';

export const ProjectsPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center">
        <span className="material-symbols-outlined text-6xl text-gray-600 mb-4">
          folder
        </span>
        <h1 className="text-4xl font-bold text-gray-300">Projects</h1>
        <p className="text-gray-500 mt-2">This is where your saved projects will appear.</p>
      </div>
    </div>
  );
};