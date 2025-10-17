
import React from 'react';

interface TopNavBarProps {
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
    className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all duration-200 text-sm font-medium ${
      isActive
        ? 'bg-white text-black shadow-md'
        : 'text-gray-300 hover:bg-white/10'
    }`}
  >
    <span className="material-symbols-outlined text-base">{icon}</span>
    <span className="hidden sm:inline">{label}</span>
  </a>
);

export const TopNavBar: React.FC<TopNavBarProps> = ({ currentPath }) => {
  const path = currentPath.startsWith('/') ? currentPath : `/${currentPath}`;

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black/30 backdrop-blur-lg border border-white/10 rounded-full shadow-lg">
      <div className="flex items-center justify-between px-3 h-16 space-x-2">
        <a href="#/home" className="flex-shrink-0 px-3">
          <h1
            className="text-white text-xl"
            style={{ fontFamily: "'Press Start 2P', system-ui" }}
          >
            Silo
          </h1>
        </a>
        <div className="flex items-center space-x-1 bg-black/20 p-1 rounded-full">
           <NavButton
              icon="home"
              label="Home"
              isActive={path === '/home' || path === '/'}
              href="#/home"
            />
            <NavButton
                icon="person"
                label="Profile"
                isActive={path === '/profile'}
                href="#/profile"
            />
            <NavButton
                icon="settings"
                label="Settings"
                isActive={path === '/settings'}
                href="#/settings"
            />
        </div>
      </div>
    </nav>
  );
};
