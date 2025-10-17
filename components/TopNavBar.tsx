import React from 'react';
import type { UserProfile } from '../App';

interface TopNavBarProps {
  userProfile: UserProfile;
  isLoggedIn: boolean;
  theme: 'light' | 'dark';
  unreadCount: number;
  onToggleNotifications: () => void;
}

const NavLink: React.FC<{ href: string; children: React.ReactNode; theme: 'light' | 'dark' }> = ({ href, children, theme }) => (
    <a href={href} className={`transition-colors text-sm font-medium ${
        theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-800 hover:text-black'
    }`}>
        {children}
    </a>
);

export const TopNavBar: React.FC<TopNavBarProps> = ({ userProfile, isLoggedIn, theme, unreadCount, onToggleNotifications }) => {
    const textColor = theme === 'dark' ? 'text-white' : 'text-black';
    const iconColor = theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-800 hover:text-black';

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
                <NavLink href="#/community" theme={theme}>Community</NavLink>
                <NavLink href="#/integrations" theme={theme}>Integrations</NavLink>
                <NavLink href="#/pricing" theme={theme}>Pricing</NavLink>
            </div>
        </div>

        <div className="flex items-center space-x-4">
            <button onClick={onToggleNotifications} title="Notifications" className={`${iconColor} transition-colors relative`}>
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                )}
            </button>
            <a href="#/settings" title="Settings" className={`${iconColor} transition-colors`}>
                <span className="material-symbols-outlined">settings</span>
            </a>
             {isLoggedIn ? (
                <a 
                    href="#/profile" 
                    title="Profile" 
                    className={`flex items-center space-x-2 pl-1 pr-4 py-1 rounded-full transition-colors ${
                        theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                >
                    <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden">
                        {userProfile.profilePicture ? (
                            <img src={userProfile.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className={`material-symbols-outlined text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>person</span>
                        )}
                    </div>
                    <span className={`text-sm font-medium truncate ${textColor}`}>{userProfile.name}</span>
                </a>
             ) : (
                <div id="googleSignInContainer"></div>
             )}
        </div>
      </div>
    </nav>
  );
};