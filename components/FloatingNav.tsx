
import React from 'react';

interface FloatingNavProps {
  currentPath: string;
}

const NavButton: React.FC<{
  icon: string;
  label: string;
  isActive: boolean;
  href: string;
}> = ({ icon, label, isActive, href }) => (
  <a
    href={href}
    title={label}
    aria-label={label}
    className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ease-in-out group ${
      isActive
        ? 'bg-white text-black shadow-lg'
        : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700 hover:text-white'
    }`}
  >
    <span className="material-symbols-outlined">{icon}</span>
  </a>
);

export const FloatingNav: React.FC<FloatingNavProps> = ({ currentPath }) => {
  const path = currentPath.startsWith('/') ? currentPath : `/${currentPath}`;

  return (
    <nav className="fixed top-0 left-0 h-full w-20 flex flex-col items-center z-40 py-8">
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
          isActive={path === '/home'}
          href="#/home"
        />
        <NavButton
          icon="folder"
          label="Projects"
          isActive={path === '/projects'}
          href="#/projects"
        />
        <NavButton
          icon="settings"
          label="Settings"
          isActive={path === '/settings'}
          href="#/settings"
        />
      </div>

      <div className="flex-grow" />
    </nav>
  );
};
