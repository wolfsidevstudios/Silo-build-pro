import React from 'react';
import type { UserProfile } from '../App';

interface TopNavBarProps {
  userProfile: UserProfile;
}

const NavLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
    <a href={href} className="text-gray-800 hover:text-black transition-colors text-sm font-medium">
        {children}
    </a>
);

export const TopNavBar: React.FC<TopNavBarProps> = ({ userProfile }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 z-50">
      <div className="flex items-center justify-between h-full px-8 mx-auto max-w-7xl">
        <div className="flex items-center space-x-8">
            <a href="#/home" className="flex-shrink-0">
                <h1
                    className="text-black text-xl"
                    style={{ fontFamily: "'Press Start 2P', system-ui" }}
                >
                    Silo
                </h1>
            </a>
            <div className="hidden md:flex items-center space-x-6">
                <NavLink href="#">Community</NavLink>
                <NavLink href="#">Pricing</NavLink>
                <NavLink href="#">Docs</NavLink>
            </div>
        </div>

        <div className="flex items-center space-x-4">
            <a href="#/settings" title="Settings" className="text-gray-800 hover:text-black transition-colors">
                <span className="material-symbols-outlined">settings</span>
            </a>
             <a href="#/profile" title="Profile" className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden border-2 border-transparent hover:border-blue-500 transition-colors">
                {userProfile.profilePicture ? (
                    <img src={userProfile.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <span className="material-symbols-outlined text-lg text-gray-800">person</span>
                )}
            </a>
        </div>
      </div>
    </nav>
  );
};