import React from 'react';
import type { UserProfile } from '../App';

interface TopNavBarProps {
  userProfile: UserProfile;
  theme: 'light' | 'dark';
}

const NavLink: React.FC<{ href: string; children: React.ReactNode; theme: 'light' | 'dark' }> = ({ href, children, theme }) => (
    <a href={href} className={`transition-colors text-sm font-medium ${
        theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-800 hover:text-black'
    }`}>
        {children}
    </a>
);

export const TopNavBar: React.FC<TopNavBarProps> = ({ userProfile, theme }) => {
    const textColor = theme === 'dark' ? 'text-white' : 'text-black';
    const iconColor = theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-800 hover:text-black';
    const profileIconTextColor = theme === 'dark' ? 'text-gray-300' : 'text-gray-800';

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 z-50">
      <div className="flex items-center justify-between h-full px-8 mx-auto max-w-7xl">
        <div className="flex items-center space-x-8">
            <a href="#/home" className="flex-shrink-0">
                <h1
                    className={`text-xl ${textColor}`}
                    style={{ fontFamily: "'Press Start 2P', system-ui" }}
                >
                    Silo
                </h1>
            </a>
            <div className="hidden md:flex items-center space-x-6">
                <NavLink href="#/home" theme={theme}>Home</NavLink>
                <NavLink href="#/pricing" theme={theme}>Pricing</NavLink>
                <NavLink href="#/docs" theme={theme}>Docs</NavLink>
            </div>
        </div>

        <div className="flex items-center space-x-4">
            <a href="#/settings" title="Settings" className={`${iconColor} transition-colors`}>
                <span className="material-symbols-outlined">settings</span>
            </a>
             <a href="#/profile" title="Profile" className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden border-2 border-transparent hover:border-blue-500 transition-colors">
                {userProfile.profilePicture ? (
                    <img src={userProfile.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <span className={`material-symbols-outlined text-lg ${profileIconTextColor}`}>person</span>
                )}
            </a>
        </div>
      </div>
    </nav>
  );
};
