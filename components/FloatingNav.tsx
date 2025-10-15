import React from 'react';
import type { Page } from '../App';

interface FloatingNavProps {
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
    title={label}
    aria-label={label}
    className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ease-in-out group ${
      isActive
        ? 'bg-white text-black shadow-lg'
        : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700 hover:text-white'
    }`}
  >
    <span className="material-symbols-outlined">{icon}</span>
  </button>
);

export const FloatingNav: React.FC<FloatingNavProps> = ({ currentPage, onNavigate }) => {
  return (
    <nav className="fixed top-0 left-0 h-full w-20 bg-black flex flex-col items-center z-40 py-8">
      <div className="flex-shrink-0">
        <h1
          className="text-white text-lg tracking-widest"
          style={{
            fontFamily: "'Press Start 2P', system-ui",
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
          }}
        >
          Silo Build
        </h1>
      </div>

      <div className="flex flex-col space-y-4 flex-shrink-0 mt-20">
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

      <div className="flex-grow" />
    </nav>
  );
};