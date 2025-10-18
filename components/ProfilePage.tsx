import React, { useState, useRef } from 'react';
import type { Project, UserProfile } from '../App';

interface ProfilePageProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  userProfile: UserProfile;
  onProfileUpdate: (profile: UserProfile) => void;
  onLogout: () => void;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

// Mock data for badges. In a real app, this would come from user data.
const userBadges: Badge[] = [
  { id: 'first-project', name: 'First Project', description: 'Awarded for creating your first project.', icon: 'rocket_launch', earned: true },
  { id: 'bug-squasher', name: 'Bug Squasher', description: 'Awarded for using the Debug Assist to fix an error.', icon: 'bug_report', earned: true },
  { id: 'deployer', name: 'Deployer', description: 'How to earn: Publish a project to the web.', icon: 'dns', earned: false },
  { id: 'community-sharer', name: 'Community Sharer', description: 'How to earn: Publish an app to the community showcase.', icon: 'group', earned: false },
  { id: 'github-sync', name: 'Git Initiated', description: 'Awarded for connecting a project to a GitHub repository.', icon: 'code', earned: true },
  { id: 'prolific-builder', name: 'Prolific Builder', description: 'How to earn: Create 5 projects.', icon: 'construction', earned: false },
  { id: 'max-collaborator', name: 'Max Collaborator', description: 'How to earn: Use the Max AI Agent to build a feature.', icon: 'smart_toy', earned: false },
  { id: 'integration-master', name: 'Integration Master', description: 'How to earn: Use an integration from the marketplace.', icon: 'hub', earned: false },
];


const ProfileModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    userProfile: UserProfile;
    onSave: (profile: UserProfile) => void;
}> = ({ isOpen, onClose, userProfile, onSave }) => {
    const [name, setName] = useState(userProfile.name);
    const [username, setUsername] = useState(userProfile.username);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({ ...userProfile, name, username });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-zinc-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md relative text-white" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-400">Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 p-2 bg-zinc-800 rounded-lg border border-gray-700" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400">Username</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full mt-1 p-2 bg-zinc-800 rounded-lg border border-gray-700" />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-zinc-700 rounded-lg">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
                </div>
            </div>
        </div>
    );
};

export const ProfilePage: React.FC<ProfilePageProps> = ({ projects, onSelectProject, onDeleteProject, userProfile, onProfileUpdate, onLogout }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onProfileUpdate({ ...userProfile, profilePicture: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex flex-col h-full p-8 pt-28 overflow-y-auto bg-black text-white">
            <div className="w-full max-w-4xl mx-auto">
                <header className="flex items-center space-x-6 md:space-x-10">
                    <div className="relative">
                        <button onClick={() => fileInputRef.current?.click()} className="group w-28 h-28 md:w-36 md:h-36 bg-zinc-800 rounded-full flex items-center justify-center cursor-pointer overflow-hidden border-2 border-zinc-700">
                            {userProfile.profilePicture ? (
                                <img src={userProfile.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="material-symbols-outlined text-6xl text-gray-500">person</span>
                            )}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-outlined text-white">edit</span>
                            </div>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleProfilePicChange} accept="image/*" className="hidden" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl md:text-3xl font-bold">{userProfile.name}</h1>
                        <p className="text-gray-400">@{userProfile.username}</p>
                        {userProfile.email && <p className="text-sm text-gray-500">{userProfile.email}</p>}
                        <div className="pt-2 flex space-x-2">
                            <button onClick={() => setIsModalOpen(true)} className="px-4 py-1.5 bg-zinc-800 text-sm rounded-lg hover:bg-zinc-700 transition-colors">Edit Profile</button>
                            {userProfile.email && <button onClick={onLogout} className="px-4 py-1.5 bg-zinc-800 text-sm rounded-lg hover:bg-zinc-700 transition-colors">Sign Out</button>}
                        </div>
                    </div>
                </header>
                
                <div className="mt-12 pt-8 border-t border-gray-800">
                    <h2 className="text-xl font-semibold mb-6">Awards & Badges</h2>
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6">
                        {userBadges.map(badge => (
                            <div key={badge.id} className="group relative flex flex-col items-center text-center" title={badge.description}>
                                <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${badge.earned ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20' : 'bg-zinc-800 border-2 border-dashed border-zinc-700'}`}>
                                    <span className={`material-symbols-outlined text-4xl transition-colors ${badge.earned ? 'text-white' : 'text-zinc-600'}`}>
                                        {badge.icon}
                                    </span>
                                    {!badge.earned && (
                                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-zinc-400">lock</span>
                                        </div>
                                    )}
                                </div>
                                <p className={`mt-2 text-xs font-semibold truncate w-full transition-colors ${badge.earned ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {badge.name}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-800">
                    <h2 className="text-xl font-semibold mb-6">My Projects</h2>
                    {projects.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <p>No projects yet.</p>
                            <a href="#/home" className="text-blue-400 hover:underline">Start building your first project!</a>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            </div>
            <ProfileModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} userProfile={userProfile} onSave={onProfileUpdate} />
        </div>
    );
};