import React from 'react';
import type { Page } from '../App';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const NavButton: React.FC<{
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-colors ${
      isActive
        ? 'bg-gray-800 text-white'
        : 'text-gray-400 hover:bg-gray-900 hover:text-white'
    }`}
  >
    <span className="material-symbols-outlined">{icon}</span>
    <span>{label}</span>
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  return (
    <nav className="w-64 bg-black border-r border-gray-900 p-4 flex flex-col">
      <div className="mb-10 px-2">
        <h1
          className="text-white text-2xl"
          style={{ fontFamily: "'Press Start 2P', system-ui" }}
        >
          Silo Build
        </h1>
      </div>
      <div className="flex flex-col space-y-2">
        <NavButton
          icon="home"
          label="Home"
          isActive={currentPage === 'home'}
          onClick={() => onNavigate('home')}
        />
        <NavButton
          icon="folder"
          label="Projects"
          isActive={currentPage === 'projects'}
          onClick={() => onNavigate('projects')}
        />
        <NavButton
          icon="settings"
          label="Settings"
          isActive={currentPage === 'settings'}
          onClick={() => onNavigate('settings')}
        />
      </div>
    </nav>
  );
};