import React from 'react';
import type { Project } from '../App';

interface ProjectsPageProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ projects, onSelectProject, onDeleteProject }) => {
  return (
    <div className="flex flex-col h-full p-8 overflow-y-auto">
      <div className="text-left mb-10">
         <div className="flex items-center space-x-4 mb-4">
            <span className="material-symbols-outlined text-5xl text-gray-400">
            folder
            </span>
            <h1 className="text-4xl font-bold text-gray-200">Projects</h1>
        </div>
        <p className="text-gray-500">
          Here are your saved projects. Click on one to continue building.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <h2 className="text-2xl font-semibold text-gray-500">No projects yet</h2>
            <p className="text-gray-600 mt-2">Go to the Home page to start building your first project.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id}
              className="bg-zinc-900 border border-gray-800 rounded-xl p-5 flex flex-col justify-between group transition-all hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10"
            >
              <div>
                <p className="text-gray-300 font-semibold mb-2 truncate">{project.name}</p>
                <p className="text-xs text-gray-500">ID: {project.id}</p>
              </div>
              <div className="mt-6 flex items-center justify-end space-x-3">
                 <button 
                  onClick={() => onDeleteProject(project.id)}
                  className="p-2 rounded-full text-gray-500 hover:bg-red-900/50 hover:text-red-400 transition-colors"
                  aria-label="Delete project"
                >
                  <span className="material-symbols-outlined text-xl">delete</span>
                </button>
                <button 
                  onClick={() => onSelectProject(project.id)}
                  className="px-5 py-2 bg-zinc-800 text-gray-200 rounded-full font-semibold hover:bg-blue-600 hover:text-white transition-colors text-sm"
                >
                  Open
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};