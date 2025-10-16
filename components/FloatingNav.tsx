

import React, { useState } from 'react';

interface FloatingNavProps {
  currentPath: string;
  user: any | null;
  onSignIn: () => void;
  onSignOut: () => void;
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

export const FloatingNav: React.FC<FloatingNavProps> = ({ currentPath, user, onSignIn, onSignOut }) => {
  const path = currentPath.startsWith('/') ? currentPath : `/${currentPath}`;
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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

      <div className="relative">
        <button
          onClick={user ? () => setIsProfileOpen(!isProfileOpen) : onSignIn}
          className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-gray-300 hover:bg-zinc-700 transition-colors"
          title={user ? "Profile" : "Sign In"}
        >
          {user ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover"/>
          ) : (
            <span className="material-symbols-outlined">person</span>
          )}
        </button>
        {user && isProfileOpen && (
          <div className="absolute bottom-0 left-20 mb-2 w-56 bg-zinc-900 border border-gray-800 rounded-lg shadow-lg p-2 z-50">
            <div className="px-2 py-1 border-b border-gray-800 mb-2">
                <p className="text-sm font-semibold text-gray-200 truncate">{user.displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button
                onClick={() => { onSignOut(); setIsProfileOpen(false); }}
                className="w-full text-left flex items-center space-x-2 px-2 py-1.5 text-sm text-red-400 hover:bg-white/10 rounded"
            >
                <span className="material-symbols-outlined text-base">logout</span>
                <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};