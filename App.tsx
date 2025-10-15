import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { ErrorDisplay } from './components/ErrorDisplay';
import { useDebounce } from './hooks/useDebounce';
import { DEFAULT_CODE } from './constants';
import { ChatPanel } from './components/ChatPanel';
import { Workspace } from './components/Workspace';
import { FloatingNav } from './components/FloatingNav';
import { HomePage } from './components/HomePage';
import { ProjectsPage } from './components/ProjectsPage';
import { SettingsPage } from './components/SettingsPage';


declare const Babel: any;

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (url: string, anonKey: string) => void;
}

const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose, onConnect }) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');

  if (!isOpen) return null;

  const handleConnect = () => {
    if (url.trim() && anonKey.trim()) {
      onConnect(url, anonKey);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-zinc-900 border border-gray-800 rounded-2xl p-8 w-full max-w-lg relative text-white" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">Connect to Supabase</h2>
          <p className="text-gray-400 mt-2">Enter your project details to enable backend features.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="supabase-url" className="block text-sm font-medium text-gray-400 mb-2">
              Project URL
            </label>
            <input
              id="supabase-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-project-ref.supabase.co"
              className="w-full p-3 bg-zinc-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label htmlFor="supabase-key" className="block text-sm font-medium text-gray-400 mb-2">
              Anon Public Key
            </label>
            <input
              id="supabase-key"
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="ey..."
              className="w-full p-3 bg-zinc-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              You can find these in your Supabase project's API settings.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleConnect}
            disabled={!url.trim() || !anonKey.trim()}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Connect Project
          </button>
        </div>
      </div>
    </div>
  );
};


export type Page = 'home' | 'builder' | 'projects' | 'settings';
export type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';

export interface Message {
  actor: 'user' | 'ai' | 'system';
  text: string;
  plan?: string[];
}

export interface Project {
  id: string;
  name: string;
  code: string;
  messages: Message[];
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

const App: React.FC = () => {
  const [transpiledCode, setTranspiledCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [model, setModel] = useState<GeminiModel>('gemini-2.5-flash');
  const [progress, setProgress] = useState<number | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  
  // State to trigger the build effect for a new project
  const [projectToBuild, setProjectToBuild] = useState<{projectId: string, prompt: string} | null>(null);


  const activeProject = projects.find(p => p.id === activeProjectId);
  const debouncedCode = useDebounce(activeProject?.code ?? '', 500);

  // Load projects from local storage on initial render
  useEffect(() => {
    try {
      const savedProjects = localStorage.getItem('silo_projects');
      if (savedProjects) {
        setProjects(JSON.parse(savedProjects));
      }
    } catch (e) {
      console.error("Failed to load projects from local storage", e);
    }
  }, []);

  // Save projects to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('silo_projects', JSON.stringify(projects));
  }, [projects]);


  useEffect(() => {
    if (!debouncedCode) {
      setTranspiledCode('');
      return;
    };
    try {
      const transformedCode = Babel.transform(debouncedCode, {
        presets: ['typescript', ['react', { runtime: 'classic' }]],
        plugins: ['transform-modules-commonjs'],
        filename: 'Component.tsx',
      }).code;
      setTranspiledCode(transformedCode);
      setError(null);
    } catch (err: any) {
      setTranspiledCode('');
      setError(`Babel Transpilation Error: ${err.message}`);
    }
  }, [debouncedCode]);
  
  useEffect(() => {
    const savedModel = localStorage.getItem('gemini_model') as GeminiModel;
    if (savedModel && (savedModel === 'gemini-2.5-flash' || savedModel === 'gemini-2.5-pro')) {
      setModel(savedModel);
    }
  }, []);
  
  // This effect runs the build process for a new project AFTER the state has been updated.
  useEffect(() => {
    const build = async () => {
      if (projectToBuild) {
        const { projectId, prompt } = projectToBuild;
        setProjectToBuild(null); // Reset trigger

        try {
          await runBuildProcess(prompt, DEFAULT_CODE, projectId);
        } catch (err: any) {
          const errorMessage = `AI Error: ${err.message}`;
          setError(errorMessage);
          addMessageToProject(projectId, { actor: 'system', text: `Sorry, I encountered an error starting the build. ${err.message}` });
          setIsLoading(false);
          setProgress(null);
        }
      }
    };
    build();
  }, [projectToBuild]);


  const handleRuntimeError = useCallback((message: string) => {
    setError(`Runtime Error: ${message}`);
  }, []);

  const extractCode = (responseText: string): string | null => {
    const codeBlockRegex = /```(?:tsx|typescript|javascript|jsx)\n([\s\S]*?)\n```/;
    const match = responseText.match(codeBlockRegex);
    return match ? match[1].trim() : null;
  };
  
  const getAiClient = () => {
    const userApiKey = localStorage.getItem('gemini_api_key');
    const apiKey = userApiKey || process.env.API_KEY as string;
    
    if (!apiKey) {
      throw new Error("Gemini API key is not set. Please add it in Settings.");
    }
    return new GoogleGenAI({ apiKey });
  }

  const generatePlan = async (prompt: string, selectedModel: GeminiModel): Promise<string[]> => {
    const ai = getAiClient();
    const activeProjectForPrompt = projects.find(p => p.id === activeProjectId);
    const supabaseContext = activeProjectForPrompt?.supabaseUrl ? `The project is connected to Supabase, so for any data persistence requirements, plan to use Supabase client.` : ``;

    const planPrompt = `
      You are a senior software architect. Based on the user's request, create a concise, step-by-step plan for building the React component. The plan should be a list of key features to be implemented.
      ${supabaseContext}
      If you plan to use Supabase for data storage, include a step that describes the necessary SQL table structure. For example: "Create a 'todos' table in Supabase with columns: id (int, primary key), created_at (timestamp), task (text), is_complete (boolean)."

      Respond ONLY with a JSON array of strings. Do not include any other text, explanations, or markdown.
      
      User Request: "${prompt}"

      Example response for "a simple counter app":
      ["Create a main container div.", "Add a state variable for the count, initialized to 0.", "Display the current count in an h1 tag.", "Add a button to increment the count.", "Add a button to decrement the count."]
    `;
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: planPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    if (!response.text || response.promptFeedback?.blockReason) {
        throw new Error(`The AI response for planning was blocked. Reason: ${response.promptFeedback?.blockReason || 'No content returned'}. Please modify your prompt.`);
    }

    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse plan:", e);
      // Fallback if the AI doesn't return perfect JSON
      return ["Could not generate a plan, proceeding with build.", "I will try my best to match your request."];
    }
  };

  const generateCode = async (prompt: string, codeToUpdate: string, plan: string[], selectedModel: GeminiModel) => {
    const ai = getAiClient();
    const activeProjectForPrompt = projects.find(p => p.id === activeProjectId);
    const supabaseIntegrationPrompt = activeProjectForPrompt?.supabaseUrl && activeProjectForPrompt?.supabaseAnonKey ? `
      **Supabase Integration:**
      - This project is connected to a Supabase backend.
      - Supabase Project URL: "${activeProjectForPrompt.supabaseUrl}"
      - Supabase Anon Key: "${activeProjectForPrompt.supabaseAnonKey}"
      - You MUST use the '@supabase/supabase-js' library. The library is already loaded in the environment. You can access it via the global \`supabase\` object.
      - Initialize the client within your component like this: \`const supabaseClient = supabase.createClient("${activeProjectForPrompt.supabaseUrl}", "${activeProjectForPrompt.supabaseAnonKey}");\`
      - For any features requiring a backend (e.g., data storage, authentication, real-time updates), you MUST use this Supabase client.
      - If you need to create database tables, you must have included the SQL schema for them in your plan. The user is responsible for running the SQL.
    ` : '';
    
    const fullPrompt = `
      You are an expert React developer with a keen eye for modern UI/UX design. 
      Based on the current code, the user's request, and the provided plan, create the updated and complete React component code.
      You MUST follow the plan.
      
      ${supabaseIntegrationPrompt}

      **Theme Selection:**
      - Analyze the user's prompt for keywords like "dark theme", "dark mode", "black background", etc.
      - If a dark theme is requested, you MUST follow the "Dark Theme Guidelines".
      - Otherwise, you MUST default to the "Light Theme Guidelines".

      **Light Theme Guidelines (Default):**
      - **Background:** White background (\`#FFFFFF\` or \`bg-white\`).
      - **Text:** Black or dark gray text.
      - **Buttons:** Pill-shaped (fully rounded). Solid black with white text, or black outline with black text.

      **Dark Theme Guidelines:**
      - **Background:** Black or very dark gray background (\`#000000\` or \`bg-black\`).
      - **Text:** White or light gray text.
      - **Buttons:** Pill-shaped (fully rounded). Solid white with black text, or white outline with white text.
      
      **General Rules:**
      - **Styling:** Use Tailwind CSS classes.
      - **Font:** Use a modern, sans-serif font (like system-ui or Inter).

      The user's original request is: "${prompt}".

      The agreed upon plan is:
      - ${plan.join('\n- ')}

      The current code is:
      \`\`\`tsx
      ${codeToUpdate}
      \`\`\`

      Your response must contain only the full, updated code inside a single \`\`\`tsx markdown block. 
      Do not include any other explanations, text, or boilerplate.
      The component must be the default export.
    `;

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: fullPrompt
    });

    if (!response.text || response.promptFeedback?.blockReason) {
        throw new Error(`The AI response was blocked. Reason: ${response.promptFeedback?.blockReason || 'No content returned'}. Please modify your prompt and try again.`);
    }

    const newCode = extractCode(response.text);

    if (newCode === null) {
        throw new Error("The AI did not return a valid code block. It might be helpful to ask it to provide the code again.");
    }

    return newCode;
  };
  
  const updateProjectState = (projectId: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));
  };
  
  // Safely adds a message to a project using the functional update form of setState
  const addMessageToProject = (projectId: string, message: Message) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, messages: [...p.messages, message] } : p
    ));
  };

  const runBuildProcess = async (prompt: string, baseCode: string, projectId: string) => {
    setIsLoading(true);
    setError(null);

    const plan = await generatePlan(prompt, model);
    addMessageToProject(projectId, { actor: 'ai', text: "Here's the plan:", plan });

    setProgress(0);
    const codePromise = generateCode(prompt, baseCode, plan, model);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev === null) return null;
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        const increment = prev < 70 ? 5 : 2;
        return Math.min(prev + increment, 95);
      });
    }, 400);

    const newCode = await codePromise;
    clearInterval(interval);
    setProgress(100);

    updateProjectState(projectId, { code: newCode });
    addMessageToProject(projectId, { actor: 'ai', text: 'I have created the code for you. Check it out and let me know what to do next!' });
    
    setTimeout(() => {
      setProgress(null);
      setIsLoading(false);
    }, 500);
  };

  const createNewProject = (prompt: string) => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    const newProject: Project = {
        id: Date.now().toString(),
        name: prompt.length > 40 ? prompt.substring(0, 37) + '...' : prompt,
        code: DEFAULT_CODE,
        messages: [{ actor: 'user', text: prompt }],
    };
    
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    setCurrentPage('builder');
    
    // Trigger the useEffect to run the build process
    setProjectToBuild({ projectId: newProject.id, prompt });
  };
  
  const handleSend = async () => {
    if (!userInput.trim() || isLoading || !activeProject) return;

    const currentInput = userInput;
    addMessageToProject(activeProject.id, { actor: 'user', text: currentInput });
    setUserInput('');

    try {
      await runBuildProcess(currentInput, activeProject.code, activeProject.id);
    } catch (err: any) {
      const errorMessage = `AI Error: ${err.message}`;
      setError(errorMessage);
      addMessageToProject(activeProject.id, { actor: 'system', text: `Sorry, I encountered an error. ${err.message}` });
      setIsLoading(false);
      setProgress(null);
    }
  };
  
  const handleCodeChange = (newCode: string) => {
    if (activeProjectId) {
      updateProjectState(activeProjectId, { code: newCode });
    }
  };

  const handleModelChange = (newModel: GeminiModel) => {
    setModel(newModel);
    localStorage.setItem('gemini_model', newModel);
  };
  
  const handleNavigate = (page: Page) => {
    if (page === 'home') {
      setActiveProjectId(null);
    }
    setCurrentPage(page);
  };

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setCurrentPage('builder');
  };
  
  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (activeProjectId === projectId) {
      setActiveProjectId(null);
      setCurrentPage('home');
    }
  };

  const handleSupabaseConnect = (url: string, anonKey: string) => {
    if (activeProjectId) {
      updateProjectState(activeProjectId, { supabaseUrl: url, supabaseAnonKey: anonKey });
      addMessageToProject(activeProjectId, { actor: 'system', text: 'Supabase connected! I can now use it for backend features.' });
      setIsSupabaseModalOpen(false);
    }
  };


  return (
    <div className="flex h-screen bg-black text-white font-sans">
      <FloatingNav currentPage={currentPage} onNavigate={handleNavigate} />
      <div className="flex-1 flex flex-col overflow-hidden ml-20">
        {currentPage === 'home' && <HomePage onStartBuild={createNewProject} isLoading={isLoading} />}
        
        {currentPage === 'builder' && activeProject && (
          <>
            <main className="flex flex-1 overflow-hidden">
              <div className="w-1/3 flex flex-col border-r border-gray-900">
                <ChatPanel
                  messages={activeProject.messages}
                  userInput={userInput}
                  onUserInput={setUserInput}
                  onSend={handleSend}
                  isLoading={isLoading}
                  progress={progress}
                />
              </div>
              <div className="w-2/3 flex flex-col">
                <Workspace
                  code={activeProject.code}
                  transpiledCode={transpiledCode}
                  onCodeChange={handleCodeChange}
                  onRuntimeError={handleRuntimeError}
                  isSupabaseConnected={!!activeProject.supabaseUrl}
                  onConnectSupabaseClick={() => setIsSupabaseModalOpen(true)}
                />
              </div>
            </main>
            <ErrorDisplay error={error} onClose={() => setError(null)} />
          </>
        )}
        
        {!activeProject && currentPage === 'builder' && (
             <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <h1 className="text-4xl font-bold text-gray-400">No Project Selected</h1>
                <p className="text-gray-500 mt-2">Go to the Home page to start a new project or select one from your Projects.</p>
            </div>
        )}

        {currentPage === 'projects' && <ProjectsPage projects={projects} onSelectProject={handleSelectProject} onDeleteProject={handleDeleteProject} />}
        {currentPage === 'settings' && <SettingsPage selectedModel={model} onModelChange={handleModelChange} />}
      </div>
       <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConnect={handleSupabaseConnect}
      />
    </div>
  );
};

export default App;