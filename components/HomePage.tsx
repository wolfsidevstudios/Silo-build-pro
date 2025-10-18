

import React, { useState, useEffect, useRef } from 'react';
import type { ProjectType } from '../App';
import { ProductHuntIcon, PexelsIcon, GoogleGeminiIcon } from './icons';
import type { Integration } from '../integrations';
import { ALL_INTEGRATIONS } from '../integrations';

interface HomePageProps {
  onStartBuild: (prompt: string, projectType: ProjectType, screenshot: string | null, integration: Integration | null) => void;
  isLoading: boolean;
  defaultStack: ProjectType;
}

const BASIC_PROMPTS = [
  'A modern to-do list app',
  'A simple weather dashboard',
  'A pomodoro timer component',
  'A minimalist portfolio page',
];

const ADVANCED_PROMPTS = [
  'A real-time markdown editor with preview',
  'A simple blog with Supabase integration for posts',
  'A Trello-like board with draggable cards',
  'An e-commerce product page with a shopping cart',
  'A data dashboard visualizing sales with charts',
  'A recipe finder that uses a public API'
];


const CompatibilityWarningModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center animate-fade-in">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-lg">
        <span className="material-symbols-outlined text-5xl text-yellow-500">desktop_windows</span>
        <h3 className="text-xl font-bold text-gray-800 mt-4">Desktop Browser Required</h3>
        <p className="text-gray-600 mt-2">
          The screenshot feature is only available on desktop Chromium browsers like Chrome or Edge. Please switch to desktop.
        </p>
        <button
          onClick={onClose}
          className="mt-6 w-full py-2 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );

const ImportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  placeholder: string;
  onImport: (url: string) => void;
}> = ({ isOpen, onClose, title, description, placeholder, onImport }) => {
    const [url, setUrl] = useState('');
    if (!isOpen) return null;

    const handleImport = () => {
      if (url.trim()) {
        onImport(url.trim());
      }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center" onClick={onClose}>
          <div className="bg-zinc-900 border border-gray-800 rounded-2xl p-8 w-full max-w-lg relative text-white" onClick={(e) => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
    
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">{title}</h2>
              <p className="text-gray-400 mt-2">{description}</p>
            </div>
    
            <div className="space-y-6">
              <div>
                <label htmlFor="import-url" className="block text-sm font-medium text-gray-400 mb-2">
                  URL
                </label>
                <input
                  id="import-url"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={placeholder}
                  className="w-full p-3 bg-zinc-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>
    
            <div className="mt-8">
              <button
                onClick={handleImport}
                disabled={!url.trim()}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                Import
              </button>
            </div>
          </div>
        </div>
    );
};

export const HomePage: React.FC<HomePageProps> = ({ onStartBuild, isLoading, defaultStack }) => {
  const [prompt, setPrompt] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCompatibilityWarning, setShowCompatibilityWarning] = useState(false);
  const [isIntegrationsPanelOpen, setIsIntegrationsPanelOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [integrationSearch, setIntegrationSearch] = useState('');
  const [isFigmaModalOpen, setIsFigmaModalOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState<string | null>(null);
  const [githubUrl, setGithubUrl] = useState<string | null>(null);

  useEffect(() => {
    const suggestedPrompt = sessionStorage.getItem('silo_prompt_suggestion');
    if (suggestedPrompt) {
        setPrompt(suggestedPrompt);
        sessionStorage.removeItem('silo_prompt_suggestion');
        textareaRef.current?.focus();
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleCaptureClick = async () => {
    const isChromium = !!(window as any).chrome;
    const isDesktop = window.innerWidth >= 1024;

    if (!isChromium || !isDesktop || !navigator.mediaDevices?.getDisplayMedia) {
      setShowCompatibilityWarning(true);
      return;
    }

    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Wait for the next frame to be painted to ensure the image is drawn correctly.
                requestAnimationFrame(() => {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    setScreenshot(dataUrl);
                    // Stop all tracks on the stream to end the screen sharing session immediately.
                    stream.getTracks().forEach(track => track.stop());
                });
            } else {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    } catch (err) {
        console.error("Error capturing screen:", err);
        // Optionally, inform the user that permission was denied or an error occurred.
    }
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.endsWith('/figma')) {
        setPrompt(value.slice(0, -6));
        setIsFigmaModalOpen(true);
    } else if (value.endsWith('/git')) {
        setPrompt(value.slice(0, -4));
        setIsGitHubModalOpen(true);
    } else if (value.endsWith('/')) {
        setPrompt(value.slice(0, -1));
        setIsIntegrationsPanelOpen(true);
    } else {
        setPrompt(value);
    }
  };

  const handleSelectIntegration = (integration: Integration) => {
    setSelectedIntegration(integration);
    setIsIntegrationsPanelOpen(false);
    setIntegrationSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt && !figmaUrl && !githubUrl) return;

    let finalPrompt = trimmedPrompt;
    if (figmaUrl) {
      finalPrompt = `Build a web application based on this Figma design: ${figmaUrl}. Additional instructions: ${trimmedPrompt}`;
    } else if (githubUrl) {
      finalPrompt = `Analyze this GitHub repository: ${githubUrl} and apply the following instructions: ${trimmedPrompt}`;
    }
    
    // Ensure we have a prompt to send, even if it's just from the import context
    if (finalPrompt.trim()) {
        onStartBuild(finalPrompt.trim(), defaultStack, screenshot, selectedIntegration);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    setSelectedIntegration(null);
    setFigmaUrl(null);
    setGithubUrl(null);
    onStartBuild(suggestion, defaultStack, null, null);
  };

  return (
    <div className="relative flex flex-col items-center justify-start min-h-full p-8 text-center">
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
      {showCompatibilityWarning && <CompatibilityWarningModal onClose={() => setShowCompatibilityWarning(false)} />}
      <ImportModal
        isOpen={isFigmaModalOpen}
        onClose={() => setIsFigmaModalOpen(false)}
        title="Import from Figma"
        description="Paste your Figma file URL to have the AI build the design."
        placeholder="https://www.figma.com/file/..."
        onImport={(url) => {
            setFigmaUrl(url);
            setGithubUrl(null); // Ensure only one import source
            setIsFigmaModalOpen(false);
        }}
    />
    <ImportModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        title="Import from GitHub"
        description="Paste a public GitHub repository URL to use as context."
        placeholder="https://github.com/owner/repo"
        onImport={(url) => {
            setGithubUrl(url);
            setFigmaUrl(null); // Ensure only one import source
            setIsGitHubModalOpen(false);
        }}
    />
      <div className="relative z-10 flex flex-col items-center justify-center w-full pt-20 md:pt-16 flex-grow">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 text-black mt-24">
          If you can type it you can build it
        </h1>
        <p className="text-gray-600 text-lg mb-8 max-w-2xl">
          Create apps and websites by chatting with AI.
        </p>
        
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-6">
          <div className="relative w-full bg-white border border-gray-300 rounded-3xl shadow-lg p-2">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handlePromptChange}
              placeholder="Describe your app, or type '/figma' or '/git'..."
              className="w-full p-3 pl-4 bg-transparent text-black placeholder-gray-500 focus:outline-none transition-all text-lg resize-none"
              rows={4}
              disabled={isLoading}
            />
            <div className="absolute bottom-4 left-4 flex items-center space-x-2">
                 <button
                    type="button"
                    onClick={handleCaptureClick}
                    disabled={isLoading}
                    className="w-12 h-12 flex items-center justify-center text-gray-500 hover:text-black transition-colors disabled:opacity-50 bg-transparent"
                    aria-label="Capture screenshot"
                    title="Capture Screenshot"
                >
                    <span className="material-symbols-outlined text-3xl">photo_camera</span>
                </button>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="w-12 h-12 flex items-center justify-center text-gray-500 hover:text-black transition-colors disabled:opacity-50 bg-transparent"
                    aria-label="Upload image"
                    title="Upload Image or Screenshot"
                >
                    <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                </button>
                {screenshot && (
                  <div className="relative group animate-fade-in">
                    <img src={screenshot} alt="Screenshot preview" className="w-20 h-auto rounded-lg border-2 border-blue-500" />
                    <button
                      type="button"
                      onClick={() => setScreenshot(null)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove screenshot"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                )}
                {figmaUrl && (
                    <div className="flex items-center space-x-2 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full text-sm font-medium animate-fade-in">
                        <span className="material-symbols-outlined text-base">brush</span>
                        <span className="font-semibold truncate max-w-[120px]">{figmaUrl}</span>
                        <button type="button" onClick={() => setFigmaUrl(null)} className="p-1 rounded-full hover:bg-purple-200" aria-label="Remove Figma URL"><span className="material-symbols-outlined text-base">close</span></button>
                    </div>
                )}
                {githubUrl && (
                    <div className="flex items-center space-x-2 bg-gray-200 text-gray-800 px-3 py-1.5 rounded-full text-sm font-medium animate-fade-in">
                        <span className="font-semibold truncate max-w-[120px]">{githubUrl}</span>
                        <button type="button" onClick={() => setGithubUrl(null)} className="p-1 rounded-full hover:bg-gray-300" aria-label="Remove GitHub URL"><span className="material-symbols-outlined text-base">close</span></button>
                    </div>
                )}
                {selectedIntegration && (
                    <div className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-medium animate-fade-in">
                        <div className="w-5 h-5 flex items-center justify-center">{selectedIntegration.icon}</div>
                        <span className="font-semibold">{selectedIntegration.name}</span>
                        <button
                            type="button"
                            onClick={() => setSelectedIntegration(null)}
                            className="p-1 rounded-full hover:bg-blue-200"
                            aria-label={`Remove ${selectedIntegration.name} integration`}
                        >
                            <span className="material-symbols-outlined text-base">close</span>
                        </button>
                    </div>
                )}
            </div>
            <button
              type="submit"
              disabled={isLoading || (!prompt.trim() && !figmaUrl && !githubUrl)}
              className="absolute bottom-4 right-4 w-12 h-12 bg-black text-white rounded-full font-semibold hover:bg-zinc-800 transition-all duration-300 ease-in-out disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:scale-105 active:scale-100"
              aria-label="Start Building"
            >
              {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <span className="material-symbols-outlined text-2xl">arrow_upward</span>
              )}
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-3 my-8">
          {BASIC_PROMPTS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={isLoading}
              className="px-4 py-2 bg-white border border-gray-300 rounded-full text-black hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
          {showAdvanced && ADVANCED_PROMPTS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={isLoading}
              className="px-4 py-2 bg-white border border-gray-300 rounded-full text-black hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
          <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={isLoading}
              className="px-4 py-2 bg-white border border-gray-300 rounded-full text-black hover:bg-gray-200 transition-colors text-sm disabled:opacity-50 flex items-center space-x-2"
            >
              <span className="material-symbols-outlined text-base">
                {showAdvanced ? 'remove' : 'add'}
              </span>
              <span>{showAdvanced ? 'Show less' : 'More examples'}</span>
          </button>
        </div>
      </div>
      
       {isIntegrationsPanelOpen && (
            <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={() => setIsIntegrationsPanelOpen(false)}>
                <div 
                    className="fixed bottom-0 left-0 right-0 h-[60vh] bg-white shadow-2xl rounded-t-3xl p-6 flex flex-col transition-transform duration-300 ease-out"
                    onClick={e => e.stopPropagation()}
                    style={{ transform: isIntegrationsPanelOpen ? 'translateY(0)' : 'translateY(100%)' }}
                >
                    <div className="flex-shrink-0 mb-4">
                        <h2 className="text-2xl font-bold text-black mb-4">Add an Integration</h2>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                            <input
                                type="text"
                                value={integrationSearch}
                                onChange={(e) => setIntegrationSearch(e.target.value)}
                                placeholder="Search integrations..."
                                className="w-full p-2 pl-10 bg-gray-100 border border-gray-300 rounded-full text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {ALL_INTEGRATIONS
                                .filter(integration => integration.name.toLowerCase().includes(integrationSearch.toLowerCase()))
                                .sort((a,b) => a.name.localeCompare(b.name))
                                .map(integration => (
                                <button
                                    key={integration.id}
                                    onClick={() => handleSelectIntegration(integration)}
                                    className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors flex items-center space-x-3"
                                >
                                    <div className="w-8 h-8 flex-shrink-0">{integration.icon}</div>
                                    <div>
                                        <p className="font-semibold text-sm text-black">{integration.name}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}
        <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 py-6 mt-auto border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center text-center">
                <p className="text-sm text-gray-500 mb-4 sm:mb-0">
                    &copy; {new Date().getFullYear() + 1} Silo Build. All rights reserved.
                </p>
                <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-sm text-gray-500">
                    <a href="#/docs" className="hover:text-black transition-colors">Newsroom</a>
                    <a href="#/developer-portal" className="hover:text-black transition-colors">Developers</a>
                    <a href="#/community" className="hover:text-black transition-colors">Community</a>
                    <a href="#/awards" className="hover:text-black transition-colors">Awards</a>
                    <a href="#/status" className="hover:text-black transition-colors">Status</a>
                    <a href="#/privacy" className="hover:text-black transition-colors">Privacy</a>
                    <a href="#/terms" className="hover:text-black transition-colors">Terms</a>
                </div>
            </div>
        </footer>
    </div>
  );
};
