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
import { AuthorizedPage } from './components/AuthorizedPage';
import DebugAssistPanel from './components/DebugAssistPanel';
import { PublishModal, PublishState } from './components/PublishModal';
import { GitHubSaveModal } from './components/GitHubSaveModal';
import { AppStorePublishModal, AppStorePublishState, AppStoreSubmissionData } from './components/AppStorePublishModal';


declare const Babel: any;
declare const JSZip: any;
declare global {
  interface Window {
    firebase: any;
  }
}

export type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';
export type ProjectType = 'single' | 'multi';
export type PreviewMode = 'iframe' | 'service-worker';

export interface Message {
  actor: 'user' | 'ai' | 'system';
  text: string;
  plan?: string[];
}

export interface ProjectFile {
    path: string;
    code: string;
}

export interface Commit {
  id: string;
  message: string;
  timestamp: number;
  files: ProjectFile[];
}

export interface AppStoreSubmission {
  status: 'Not Submitted' | 'Submitted' | 'In Review' | 'Approved' | 'Rejected';
  version: string;
  submissionDate?: number;
  url?: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  files: ProjectFile[];
  messages: Message[];
  supabaseSql?: string;
  projectType: ProjectType;
  netlifySiteId?: string;
  netlifyUrl?: string;
  vercelProjectId?: string;
  vercelUrl?: string;
  githubRepo?: string;
  commits?: Commit[];
  appStoreSubmission?: AppStoreSubmission;
}


const App: React.FC = () => {
  const [errors, setErrors] = useState<string[]>([]);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState(window.location.hash.replace(/^#/, '') || '/home');
  const [model, setModel] = useState<GeminiModel>('gemini-2.5-flash');
  const [progress, setProgress] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('iframe');
  
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [isDebugAssistOpen, setIsDebugAssistOpen] = useState(false);
  
  const [projectToBuild, setProjectToBuild] = useState<{projectId: string, prompt: string, projectType: ProjectType} | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishState, setPublishState] = useState<PublishState>({ status: 'idle' });
  const [isGitHubSaveModalOpen, setIsGitHubSaveModalOpen] = useState(false);
  const [isAppStorePublishModalOpen, setIsAppStorePublishModalOpen] = useState(false);
  const [appStorePublishState, setAppStorePublishState] = useState<AppStorePublishState>({ status: 'idle' });


  const activeProject = projects.find(p => p.id === activeProjectId);

  useEffect(() => {
    const unsubscribe = window.firebase.onAuthStateChanged(window.firebase.auth, (user: any) => {
        setCurrentUser(user);
        setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
        const fetchProjects = async () => {
            setIsLoading(true);
            try {
                const projectsCol = window.firebase.collection(window.firebase.firestore, 'projects');
                const q = window.firebase.query(projectsCol, window.firebase.where('userId', '==', currentUser.uid));
                const projectsSnapshot = await window.firebase.getDocs(q);
                const projectsList = projectsSnapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id }));
                setProjects(projectsList as Project[]);
            } catch (err: any) {
                setErrors(prev => [`Failed to load projects: ${err.message}`, ...prev]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProjects();
    } else {
        setProjects([]);
        setActiveProjectId(null);
    }
  }, [currentUser]);


  useEffect(() => {
    try {
      const savedPreviewMode = localStorage.getItem('silo_preview_mode') as PreviewMode;
      if (savedPreviewMode) {
        setPreviewMode(savedPreviewMode);
      }
    } catch (e) {
      console.error("Failed to load data from local storage", e);
    }
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      setLocation(window.location.hash.replace(/^#/, '') || '/home');
    };
    window.addEventListener('hashchange', handleHashChange);
    
    const path = window.location.hash.replace(/^#/, '');
    const projectMatch = path.match(/^\/project\/([\w-]+)$/);
    if (projectMatch) {
        setActiveProjectId(projectMatch[1]);
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const projectMatch = location.match(/^\/project\/([\w-]+)$/);
    if (projectMatch) {
      const projectId = projectMatch[1];
      if (projectId !== activeProjectId) {
        setActiveProjectId(projectId);
      }
    } else {
      if (activeProjectId !== null) {
        setActiveProjectId(null);
      }
    }
  }, [location, activeProjectId]);

  
  useEffect(() => {
    const savedModel = localStorage.getItem('gemini_model') as GeminiModel;
    if (savedModel && (savedModel === 'gemini-2.5-flash' || savedModel === 'gemini-2.5-pro')) {
      setModel(savedModel);
    }
  }, []);
  
  useEffect(() => {
    const build = async () => {
      if (projectToBuild) {
        const { projectId, prompt, projectType } = projectToBuild;
        setProjectToBuild(null);

        try {
          await runBuildProcess(prompt, [{ path: 'src/App.tsx', code: DEFAULT_CODE }], projectId, projectType);
        } catch (err: any) {
          const errorMessage = `AI Error: ${err.message}`;
          setErrors(prev => [errorMessage, ...prev]);
          addMessageToProject(projectId, { actor: 'system', text: `Sorry, I encountered an error starting the build. ${err.message}` });
          setIsLoading(false);
          setProgress(null);
        }
      }
    };
    build();
  }, [projectToBuild]);


  const handleRuntimeError = useCallback((message: string) => {
    setErrors(prev => {
      const filtered = prev.filter(e => e !== message);
      return [message, ...filtered];
    });
    setIsDebugAssistOpen(true);
  }, []);
  
  const getAiClient = () => {
    const userApiKey = localStorage.getItem('gemini_api_key');
    const apiKey = userApiKey || process.env.API_KEY as string;
    
    if (!apiKey) {
      throw new Error("Gemini API key is not set. Please add it in Settings.");
    }
    return new GoogleGenAI({ apiKey });
  }

  const generatePlan = async (prompt: string, selectedModel: GeminiModel): Promise<{plan: string[], sql: string}> => {
    const ai = getAiClient();
    
    const planPrompt = `
      You are a senior software architect. Based on the user's request, create a concise, step-by-step plan for building the React application. 
      This plan should include a list of all the files you intend to create or modify.
      If you need to use a database table (with Supabase), provide the SQL code to create it. If no database is needed, the "sql" field should be an empty string.

      Respond ONLY with a JSON object matching this schema:
      {
        "plan": ["A list of steps for the implementation, including file creation."],
        "sql": "The SQL code to create tables, if needed. Use 'CREATE TABLE IF NOT EXISTS' syntax."
      }
      
      User Request: "${prompt}"
    `;
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: planPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plan: { type: Type.ARRAY, items: { type: Type.STRING } },
            sql: { type: Type.STRING }
          }
        }
      }
    });

    if (!response.text || response.promptFeedback?.blockReason) {
        throw new Error(`The AI response for planning was blocked. Reason: ${response.promptFeedback?.blockReason || 'No content returned'}. Please modify your prompt.`);
    }

    try {
      const parsed = JSON.parse(response.text);
      return {
          plan: parsed.plan || [],
          sql: parsed.sql || ''
      };
    } catch (e) {
      console.error("Failed to parse plan and SQL:", e);
      return {
          plan: ["Could not generate a plan, proceeding with build.", "I will try my best to match your request."],
          sql: ""
      };
    }
  };

  const generateCode = async (prompt: string, currentFiles: ProjectFile[], plan: string[], selectedModel: GeminiModel, projectType: ProjectType) => {
    const ai = getAiClient();
    
    const projectTypeInstructions = projectType === 'single'
    ? `
        **Project Type:** Single File
        **Constraint:** You MUST generate all code within a single file: 'src/App.tsx'. Do not create any other files or components. All logic, components, and styles must be contained within this one file. The final output MUST have only one file object in the "files" array.
    `
    : `
        **Project Type:** Multi-File
        **Guideline:** You MUST break down the application into logical, reusable components, each in its own file (e.g., 'src/components/Button.tsx'). Follow a clean, modular file structure. Do not put everything in a single file unless it is a very simple component.
    `;

    const fullPrompt = `
      You are an expert React developer. Based on the user's request, the plan, and the current file structure, generate the complete code for ALL necessary files.

      ${projectTypeInstructions}

      **Design System & UI Guidelines:**
      - **Overall Style:** Create modern, clean, and aesthetically pleasing interfaces.
      - **Background:** The main application background MUST be white.
      - **Buttons:** All buttons MUST be pill-shaped (fully rounded corners). Primary call-to-action buttons should be solid black with white text. Secondary buttons should be outlined with a thin border.
      - **Icons:** You MUST use icons from the Google Material Symbols library (the 'outlined' style). The library is already available. Example: \`<span className="material-symbols-outlined">icon_name</span>\`.
      - **Navigation Bars:** If a navigation bar or header is requested or necessary for the application's functionality, it should be pill-shaped, floating, and have a frosted glass effect (using Tailwind CSS for backdrop blur and semi-transparent backgrounds, e.g., \`bg-white/50 backdrop-blur-md\`). Do not add a navigation bar unless it is explicitly requested or is essential for the app's core features.
      - **Styling:** You MUST use Tailwind CSS for all styling. Do not generate a \`tailwind.config.js\` file; all necessary classes are available via the CDN.

      **File Generation Rules:**
      - Your output MUST be a JSON object containing a single key "files", which is an array of file objects.
      - Each file object must have two keys: "path" (e.g., "src/App.tsx", "src/components/Button.tsx") and "code" (the full file content as a string).
      - You MUST provide the full code for ALL necessary files for the application to work. Do not omit files.
      - The main application component that should be rendered MUST be the default export of "src/App.tsx".
      - Use ES Modules for imports/exports. Crucially, you MUST include the full file extension in your import paths (e.g., \`import Button from './components/Button.tsx'\`). This is required for the in-browser module resolver to work.
      
      **The user's request is:** "${prompt}".
      **The plan is:**
      - ${plan.join('\n- ')}
      **The current files are:**
      ${JSON.stringify(currentFiles, null, 2)}

      Your response MUST contain ONLY the JSON object, with no other text or markdown formatting.
    `;

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: fullPrompt,
      config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  files: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              path: { type: Type.STRING },
                              code: { type: Type.STRING },
                          },
                          required: ['path', 'code']
                      }
                  }
              },
              required: ['files']
          },
      }
    });

    if (!response.text || response.promptFeedback?.blockReason) {
        throw new Error(`The AI response was blocked. Reason: ${response.promptFeedback?.blockReason || 'No content returned'}. Please modify your prompt and try again.`);
    }

    try {
        const parsed = JSON.parse(response.text);
        if (!parsed.files || !Array.isArray(parsed.files)) {
            throw new Error("AI response is missing the 'files' array.");
        }
        return parsed.files;
    } catch (e) {
        console.error("Failed to parse AI code response:", response.text);
        throw new Error("The AI did not return valid JSON for the file structure. Please try again.");
    }
  };
  
  const updateProjectState = async (projectId: string, updates: Partial<Project>) => {
    const projectToUpdate = projects.find(p => p.id === projectId);
    if (!projectToUpdate) return;

    const updatedProject = { ...projectToUpdate, ...updates };
    const projectRef = window.firebase.doc(window.firebase.firestore, 'projects', projectId);
    await window.firebase.setDoc(projectRef, updatedProject); // Persist the full updated object

    setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
  };
  
  const addMessageToProject = (projectId: string, message: Message) => {
    setProjects(prev => {
        const newProjects = prev.map(p => {
            if (p.id === projectId) {
                const updatedProject = { ...p, messages: [...p.messages, message] };
                // Persist the full project state after adding a message
                const projectRef = window.firebase.doc(window.firebase.firestore, 'projects', updatedProject.id);
                window.firebase.setDoc(projectRef, updatedProject);
                return updatedProject;
            }
            return p;
        });
        return newProjects;
    });
  };

  const runBuildProcess = async (prompt: string, baseFiles: ProjectFile[], projectId: string, projectTypeOverride?: ProjectType) => {
    setIsLoading(true);
    setErrors([]);

    addMessageToProject(projectId, { actor: 'user', text: prompt });
    
    const project = projects.find(p => p.id === projectId);
    const projectType = projectTypeOverride || project?.projectType || 'multi';

    const { plan, sql } = await generatePlan(prompt, model);
    addMessageToProject(projectId, { actor: 'ai', text: "Here's the plan:", plan });
    
    if (sql) {
      await updateProjectState(projectId, { supabaseSql: sql });
    }

    setProgress(0);
    const codePromise = generateCode(prompt, baseFiles, plan, model, projectType);

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

    const newFiles = await codePromise;
    clearInterval(interval);
    setProgress(100);

    await updateProjectState(projectId, { files: newFiles });
    addMessageToProject(projectId, { actor: 'ai', text: 'I have created the code for you. Check it out and let me know what to do next!' });
    
    setTimeout(() => {
      setProgress(null);
      setIsLoading(false);
    }, 500);
  };

  const createNewProject = async (prompt: string, projectType: ProjectType) => {
    if (!prompt.trim() || !currentUser) return;
    
    const projectData: Omit<Project, 'id'> = {
        userId: currentUser.uid,
        name: prompt.length > 40 ? prompt.substring(0, 37) + '...' : prompt,
        files: [{ path: 'src/App.tsx', code: DEFAULT_CODE }],
        messages: [],
        projectType,
        commits: [],
    };
    
    const docRef = await window.firebase.addDoc(window.firebase.collection(window.firebase.firestore, 'projects'), projectData);
    const newProject = { ...projectData, id: docRef.id };
    
    setProjects(prev => [...prev, newProject]);
    
    setProjectToBuild({ projectId: newProject.id, prompt, projectType });
    window.location.hash = `/project/${newProject.id}`;
  };
  
  const handleSend = async () => {
    if (!userInput.trim() || isLoading || !activeProject) return;
    const currentInput = userInput;
    setUserInput('');
    try {
      await runBuildProcess(currentInput, activeProject.files, activeProject.id);
    } catch (err: any) {
      const errorMessage = `AI Error: ${err.message}`;
      setErrors(prev => [errorMessage, ...prev]);
      addMessageToProject(activeProject.id, { actor: 'system', text: `Sorry, I encountered an error. ${err.message}` });
      setIsLoading(false);
      setProgress(null);
    }
  };

  const pushFilesToGitHub = async (token: string, repo: string, files: ProjectFile[], message: string, branch: string = 'main', isInitialCommit: boolean = false) => {
    const apiBase = 'https://api.github.com';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    };

    let parentCommitSha: string | undefined;
    let baseTreeSha: string | undefined;

    if (!isInitialCommit) {
        const branchRes = await fetch(`${apiBase}/repos/${repo}/branches/${branch}`, { headers });
        if (!branchRes.ok) {
            if (branchRes.status === 404) {
                 throw new Error(`Branch '${branch}' not found in repository. Initial commit may not have been pushed correctly.`);
            }
            throw new Error(`Failed to get branch info (Status: ${branchRes.status}).`);
        }
        const branchData = await branchRes.json();
        parentCommitSha = branchData.commit.sha;
        baseTreeSha = branchData.commit.commit.tree.sha;
    }

    const filesWithReadme = [
        ...files,
        { path: 'README.md', code: `# ${activeProject?.name || 'Silo Build Project'}\n\nBuilt with Silo Build.`},
        { path: '.gitignore', code: 'node_modules\ndist\n.DS_Store' }
    ];

    const blobCreationPromises = filesWithReadme.map(async file => {
        const blobRes = await fetch(`${apiBase}/repos/${repo}/git/blobs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ content: file.code, encoding: 'utf-8' }),
        });
        if (!blobRes.ok) throw new Error(`Failed to create blob for ${file.path}`);
        const blobData = await blobRes.json();
        return { path: file.path, mode: '100644', type: 'blob', sha: blobData.sha };
    });

    const tree = await Promise.all(blobCreationPromises);

    const treePayload: { tree: any[], base_tree?: string } = { tree };
    if (baseTreeSha) {
        treePayload.base_tree = baseTreeSha;
    }

    const treeRes = await fetch(`${apiBase}/repos/${repo}/git/trees`, {
        method: 'POST',
        headers,
        body: JSON.stringify(treePayload),
    });
    if (!treeRes.ok) throw new Error('Failed to create git tree.');
    const treeData = await treeRes.json();
    const newTreeSha = treeData.sha;

    const commitPayload: { message: string, tree: string, parents?: string[] } = {
        message,
        tree: newTreeSha,
    };
    if (parentCommitSha) {
        commitPayload.parents = [parentCommitSha];
    }

    const commitRes = await fetch(`${apiBase}/repos/${repo}/git/commits`, {
        method: 'POST',
        headers,
        body: JSON.stringify(commitPayload),
    });
    if (!commitRes.ok) throw new Error('Failed to create commit.');
    const commitData = await commitRes.json();
    const newCommitSha = commitData.sha;

    if (isInitialCommit) {
        const refRes = await fetch(`${apiBase}/repos/${repo}/git/refs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: newCommitSha }),
        });
        if (!refRes.ok) throw new Error('Failed to create new branch reference.');
    } else {
        const refRes = await fetch(`${apiBase}/repos/${repo}/git/refs/heads/${branch}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ sha: newCommitSha }),
        });
        if (!refRes.ok) throw new Error('Failed to update branch reference.');
    }
  };

  const handleCommit = async (commitMessage: string) => {
    if (!activeProject || !commitMessage.trim()) return;

    setIsLoading(true);
    
    const newCommit: Commit = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        message: commitMessage.trim(),
        timestamp: Date.now(),
        files: JSON.parse(JSON.stringify(activeProject.files)), // Deep copy
    };
    const updatedCommits = [...(activeProject.commits || []), newCommit];
    await updateProjectState(activeProject.id, { commits: updatedCommits });

    if (activeProject.githubRepo) {
        const token = localStorage.getItem('silo_github_token');
        if (!token) {
            setErrors(prev => ['GitHub token not found. Please add it in Settings.', ...prev]);
            setIsLoading(false);
            return;
        }
        
        try {
            await pushFilesToGitHub(token, activeProject.githubRepo, activeProject.files, commitMessage);
            addMessageToProject(activeProject.id, { actor: 'system', text: `Successfully pushed changes to ${activeProject.githubRepo}.` });
        } catch (err: any) {
            const errorMessage = `GitHub Push Error: ${err.message}`;
            setErrors(prev => [errorMessage, ...prev]);
            addMessageToProject(activeProject.id, { actor: 'system', text: `Failed to push changes to GitHub. ${err.message}` });
        }
    }
    setIsLoading(false);
  };

  const handleCreateRepoAndPush = async (repoName: string, description: string, isPrivate: boolean) => {
    if (!activeProject) return;
    const token = localStorage.getItem('silo_github_token');
    if (!token) {
        setErrors(prev => ['GitHub token not found. Please add it in Settings.', ...prev]);
        setIsGitHubSaveModalOpen(false);
        return;
    }

    setIsLoading(true);
    
    try {
        const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' };
        
        const userResponse = await fetch('https://api.github.com/user', { headers });
        if (!userResponse.ok) throw new Error(`Failed to get GitHub user. Status: ${userResponse.status}`);
        const { login } = await userResponse.json();

        const repoResponse = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: repoName, description, private: isPrivate }),
        });
        if (!repoResponse.ok) {
             const errorData = await repoResponse.json();
             throw new Error(`Failed to create repository. ${errorData.message}`);
        }
        const repoData = await repoResponse.json();
        const repoFullName = repoData.full_name;

        await pushFilesToGitHub(token, repoFullName, activeProject.files, 'Initial commit from Silo Build', 'main', true);

        await updateProjectState(activeProject.id, { githubRepo: repoFullName });
        addMessageToProject(activeProject.id, { actor: 'system', text: `Successfully created and connected to GitHub repository: ${repoFullName}` });
        setIsGitHubSaveModalOpen(false);
        
        handleCommit('Initial commit');

    } catch (err: any) {
        const errorMessage = `GitHub Error: ${err.message}`;
        setErrors(prev => [errorMessage, ...prev]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleFixError = async (errorToFix: string) => {
    if (!activeProject) return;

    setIsLoading(true);
    setProgress(0);
    
    const fixPrompt = `
      An error occurred in the application: "${errorToFix}". 
      Please analyze the existing files and fix the bug that is causing this error.
      Provide the complete, corrected code for ALL necessary files.
    `;

    try {
      const plan = [`Identify the cause of the error: "${errorToFix}"`, "Correct the code in the appropriate file(s).", "Ensure the application still meets the original requirements."];
      
      const interval = setInterval(() => {
        setProgress(prev => Math.min((prev ?? 0) + 5, 95));
      }, 400);

      const newFiles = await generateCode(fixPrompt, activeProject.files, plan, model, activeProject.projectType);
      
      clearInterval(interval);
      setProgress(100);

      await updateProjectState(activeProject.id, { files: newFiles });
      setErrors(prev => prev.filter(e => e !== errorToFix)); 
      
      addMessageToProject(activeProject.id, { actor: 'system', text: `I've attempted a fix for the error: "${errorToFix.substring(0, 100)}...". Please check the preview.` });

    } catch (err: any) {
      const errorMessage = `AI Error during fix attempt: ${err.message}`;
      setErrors(prev => [errorMessage, ...prev]);
      addMessageToProject(activeProject.id, { actor: 'system', text: `Sorry, I encountered an error while trying to apply a fix.` });
    } finally {
      setTimeout(() => {
        setProgress(null);
        setIsLoading(false);
      }, 500);
    }
  };


  const handleModelChange = (newModel: GeminiModel) => {
    setModel(newModel);
    localStorage.setItem('gemini_model', newModel);
  };
  
  const handlePreviewModeChange = (mode: PreviewMode) => {
    setPreviewMode(mode);
    localStorage.setItem('silo_preview_mode', mode);
  };

  const handleSelectProject = (projectId: string) => {
    window.location.hash = `/project/${projectId}`;
  };
  
  const handleDeleteProject = async (projectId: string) => {
    await window.firebase.deleteDoc(window.firebase.doc(window.firebase.firestore, 'projects', projectId));
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (activeProjectId === projectId) {
      window.location.hash = '/home';
    }
  };
    
  const createNetlifyDeploymentPackage = async (files: ProjectFile[]): Promise<Blob> => {
    const zip = new JSZip();

    // Transpile TSX/JS files to JS with ES modules and update import paths
    const transpiledFiles: ProjectFile[] = [];
    for (const file of files) {
      if (file.path.match(/\.(tsx|ts|jsx|js)$/)) {
        try {
          // Keep ES modules, don't transform to commonjs
          const transformedCode = Babel.transform(file.code, {
            presets: ['typescript', ['react', { runtime: 'classic' }]],
            filename: file.path,
          }).code;

          // Replace .tsx, .ts, .jsx extensions in relative imports with .js
          const codeWithJsImports = transformedCode.replace(
            /(from\s+['"]\..+)\.(tsx|ts|jsx)(['"])/g,
            '$1.js$3'
          );
          
          transpiledFiles.push({
            path: file.path.replace(/\.(tsx|ts|jsx)$/, '.js'),
            code: codeWithJsImports,
          });

        } catch (e: any) {
          console.error(`Babel compilation failed for ${file.path}:`, e);
          throw new Error(`Failed to transpile ${file.path}. Error: ${e.message}. Please check for syntax errors in your code.`);
        }
      } else {
        // Add other files (like CSS, images, etc.) to the package as-is
        transpiledFiles.push(file);
      }
    }

    const productionHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Silo Build App</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
          <style> body { background-color: #ffffff; } </style>
          <script type="importmap">
          {
            "imports": {
              "react": "https://esm.sh/react@18.2.0",
              "react-dom/client": "https://esm.sh/react-dom@18.2.0/client"
            }
          }
          </script>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" src="/src/App.js"></script>
        </body>
      </html>
    `;
    zip.file('index.html', productionHtml);

    transpiledFiles.forEach(file => {
      zip.file(file.path, file.code);
    });

    return zip.generateAsync({ type: 'blob' });
  };

  const createVercelDeploymentPackage = (projectName: string, files: ProjectFile[]): { file: string, data: string }[] => {
    const deploymentFiles: { file: string, data: string }[] = [];

    // 1. Add user's source files
    files.forEach(file => {
        deploymentFiles.push({ file: file.path, data: file.code });
    });

    // 2. Add package.json
    const packageJson = {
      name: projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      version: "1.0.0",
      private: true,
      dependencies: {
        "react": "^18.2.0",
        "react-dom": "^18.2.0"
      },
      devDependencies: {
        "@babel/cli": "^7.24.1",
        "@babel/core": "^7.24.4",
        "@babel/preset-env": "^7.24.4",
        "@babel/preset-react": "^7.24.1",
        "@babel/preset-typescript": "^7.24.1",
        "babel-plugin-add-import-extension": "^1.6.0"
      },
      scripts: {
        "build": "babel src --out-dir dist/src --extensions '.ts,.tsx,.js,.jsx' --copy-files && cp index.html dist/index.html"
      }
    };
    deploymentFiles.push({ file: 'package.json', data: JSON.stringify(packageJson, null, 2) });
    
    // 3. Add .babelrc.json
    const babelrc = {
        "presets": [
            "@babel/preset-env",
            ["@babel/preset-react", { "runtime": "classic" }],
            "@babel/preset-typescript"
        ],
        "plugins": [
            ["babel-plugin-add-import-extension", { "extension": "js" }]
        ]
    };
    deploymentFiles.push({ file: '.babelrc.json', data: JSON.stringify(babelrc, null, 2) });

    // 4. Add vercel.json
    const vercelConfig = {
      "builds": [
        {
          "src": "package.json",
          "use": "@vercel/static-build",
          "config": { "distDir": "dist" }
        }
      ],
      "routes": [{ "src": "/(.*)", "dest": "/index.html" }]
    };
    deploymentFiles.push({ file: 'vercel.json', data: JSON.stringify(vercelConfig, null, 2) });

    // 5. Add index.html (the build target)
    const productionHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${projectName}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
          <style> body { background-color: #ffffff; } </style>
          <script type="importmap">
          {
            "imports": {
              "react": "https://esm.sh/react@18.2.0",
              "react-dom/client": "https://esm.sh/react-dom@18.2.0/client"
            }
          }
          </script>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" src="/src/App.js"></script>
        </body>
      </html>
    `;
    deploymentFiles.push({ file: 'index.html', data: productionHtml });

    return deploymentFiles;
};
  
  const handleNetlifyPublish = async () => {
    if (!activeProject) return;

    const token = localStorage.getItem('silo_netlify_token');
    if (!token) {
      setPublishState({ status: 'error', error: 'Netlify token not found. Please add it on the Settings page.' });
      return;
    }

    try {
      setPublishState({ status: 'packaging', platform: 'netlify' });
      const zipBlob = await createNetlifyDeploymentPackage(activeProject.files);

      let siteId = activeProject.netlifySiteId;

      if (!siteId) {
        setPublishState({ status: 'creating_site', platform: 'netlify' });
        const siteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!siteResponse.ok) {
          const errorText = await siteResponse.text();
          throw new Error(`Netlify API Error (Create Site): ${errorText}`);
        }
        const siteData = await siteResponse.json();
        siteId = siteData.id;
        await updateProjectState(activeProject.id, { netlifySiteId: siteId });
      }

      setPublishState({ status: 'uploading', platform: 'netlify' });
      const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/zip' },
        body: zipBlob,
      });
      if (!deployResponse.ok) {
        const errorText = await deployResponse.text();
        throw new Error(`Netlify Deploy Error: ${errorText}`);
      }
      const deployData = await deployResponse.json();
      const deployId = deployData.id;

      setPublishState({ status: 'building', platform: 'netlify' });
      const pollDeploy = async (): Promise<string> => {
        const statusResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys/${deployId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!statusResponse.ok) throw new Error('Failed to poll deploy status.');
        const statusData = await statusResponse.json();
        
        if (statusData.state === 'ready') {
          return statusData.ssl_url || statusData.url;
        } else if (statusData.state === 'error') {
          throw new Error(`Netlify build failed: ${statusData.error_message || 'Unknown error'}`);
        } else {
          await new Promise(resolve => setTimeout(resolve, 3000));
          return pollDeploy();
        }
      };

      const finalUrl = await pollDeploy();
      setPublishState({ status: 'success', url: finalUrl, platform: 'netlify' });
      await updateProjectState(activeProject.id, { netlifyUrl: finalUrl });
    } catch (err: any) {
      console.error("Publishing error:", err);
      setPublishState({ status: 'error', error: err.message, platform: 'netlify' });
    }
  };

  const handleVercelPublish = async () => {
    if (!activeProject) return;
    const token = localStorage.getItem('silo_vercel_token');
    if (!token) {
        setPublishState({ status: 'error', error: 'Vercel token not found. Please add it on the Settings page.', platform: 'vercel' });
        return;
    }

    try {
        setPublishState({ status: 'packaging', platform: 'vercel' });
        const deploymentFiles = createVercelDeploymentPackage(activeProject.name, activeProject.files);

        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        const deployPayload: any = {
            name: activeProject.name.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 100),
            files: deploymentFiles,
            target: 'production',
            projectId: activeProject.vercelProjectId,
        };

        setPublishState({ status: 'uploading', platform: 'vercel' });
        
        let apiUrl = 'https://api.vercel.com/v13/deployments';
        if (!activeProject.vercelProjectId) {
            apiUrl += '?skipAutoDetectionConfirmation=1';
        }
        
        const deployResponse = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(deployPayload),
        });

        if (!deployResponse.ok) {
            const errorData = await deployResponse.json();
            throw new Error(`Vercel API Error: ${errorData.error.message}`);
        }
        const deployData = await deployResponse.json();

        if (!activeProject.vercelProjectId && deployData.projectId) {
            await updateProjectState(activeProject.id, { vercelProjectId: deployData.projectId });
        }

        setPublishState({ status: 'building', platform: 'vercel' });
        const pollDeploy = async (): Promise<string> => {
            const statusResponse = await fetch(`https://api.vercel.com/v13/deployments/${deployData.id}`, { headers });
            if (!statusResponse.ok) throw new Error('Failed to poll Vercel deploy status.');
            const statusData = await statusResponse.json();

            if (statusData.readyState === 'READY') return `https://${statusData.url}`;
            if (['ERROR', 'CANCELED'].includes(statusData.readyState)) throw new Error(`Vercel build failed: ${statusData.errorMessage || 'Unknown error'}`);
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            return pollDeploy();
        };

        const finalUrl = await pollDeploy();
        setPublishState({ status: 'success', url: finalUrl, platform: 'vercel' });
        await updateProjectState(activeProject.id, { vercelUrl: finalUrl });
    } catch (err: any) {
        console.error("Vercel publishing error:", err);
        setPublishState({ status: 'error', error: err.message, platform: 'vercel' });
    }
  };

  const handlePublish = (platform: 'netlify' | 'vercel') => {
      if (platform === 'netlify') {
        handleNetlifyPublish();
      } else {
        handleVercelPublish();
      }
  };

  const handleAppStoreSubmit = async (data: AppStoreSubmissionData) => {
    if (!activeProject || !currentUser) return;
    console.log("Queueing App Store Submission with data:", data);

    setAppStorePublishState({ status: 'submitting' });

    const submissionRequest = {
        userId: currentUser.uid,
        projectId: activeProject.id,
        projectName: activeProject.name,
        status: 'Submitted',
        createdAt: window.firebase.serverTimestamp(),
        appleId: data.appleId,
        appName: data.appName,
        version: data.version,
        category: data.category,
        ageRating: data.ageRating,
    };

    try {
        await window.firebase.addDoc(window.firebase.collection(window.firebase.firestore, 'submissions'), submissionRequest);
        
        const newSubmission: AppStoreSubmission = {
            status: 'Submitted',
            version: data.version,
            submissionDate: Date.now(),
            url: '#', // Placeholder URL
        };
        
        await updateProjectState(activeProject.id, { appStoreSubmission: newSubmission });

        setAppStorePublishState({ status: 'success', url: '#' });

        addMessageToProject(activeProject.id, { 
            actor: 'system', 
            text: 'Your App Store submission has been queued. A backend service (like a Firebase Cloud Function) would now take over to build and submit your app using EAS. This process can take some time.' 
        });

    } catch (err: any) {
        console.error("Failed to create submission request:", err);
        setAppStorePublishState({ status: 'error', error: `Failed to queue submission: ${err.message}` });
    }
  };


  const handleExportProject = async () => {
    if (!activeProject) return;

    try {
        const zip = new JSZip();
        const projectName = activeProject.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        activeProject.files.forEach(file => {
            zip.file(file.path, file.code);
        });
        
        const packageJson = {
            name: projectName,
            version: "1.0.0",
            main: "index.js",
            scripts: {
                "start": "expo start",
                "android": "expo start --android",
                "ios": "expo start --ios",
                "web": "expo start --web",
                "submit": "eas submit -p ios"
            },
            dependencies: {
                "expo": "~51.0.8",
                "expo-status-bar": "~1.12.1",
                "react": "18.2.0",
                "react-native": "0.74.1"
            },
            devDependencies: {
                "@babel/core": "^7.20.0"
            },
            private: true
        };
        zip.file('package.json', JSON.stringify(packageJson, null, 2));
        
        const appJson = {
            "expo": {
                "name": activeProject.name,
                "slug": projectName,
                "version": "1.0.0",
                "orientation": "portrait",
                "icon": "./assets/icon.png",
                "userInterfaceStyle": "light",
                "splash": {
                    "image": "./assets/splash.png",
                    "resizeMode": "contain",
                    "backgroundColor": "#ffffff"
                },
                "ios": {
                    "supportsTablet": true
                },
                "android": {
                    "adaptiveIcon": {
                        "foregroundImage": "./assets/adaptive-icon.png",
                        "backgroundColor": "#ffffff"
                    }
                },
                "web": {
                    "favicon": "./assets/favicon.png"
                }
            }
        };
        zip.file('app.json', JSON.stringify(appJson, null, 2));

        const readmeContent = `
# ${activeProject.name}

This project was generated by Silo Build. It's a React Native application configured for submission to the App Store using Expo Application Services (EAS).

## How to Submit to the App Store

Follow these steps to build your app and submit it for review.

### Prerequisites

1.  **Node.js & npm:** Make sure you have Node.js (LTS version) and npm installed. [Download here](https://nodejs.org/).
2.  **EAS CLI:** Install the Expo Application Services command-line tool.
    \`\`\`bash
    npm install -g eas-cli
    \`\`\`
3.  **Apple Developer Account:** You need an active membership in the [Apple Developer Program](https://developer.apple.com/programs/enroll/).
4.  **Expo Account:** Create a free account at [expo.dev](https://expo.dev/).

### Setup & Submission

1.  **Unzip & Install Dependencies:**
    Unzip this project folder and navigate into it with your terminal. Then, install the required packages.
    \`\`\`bash
    cd ${projectName}
    npm install
    \`\`\`

2.  **Log in to your accounts:**
    Log in to your Expo account and your Apple Developer account.
    \`\`\`bash
    eas login
    # You will be prompted for your Expo username/password.
    
    eas device:create
    # Follow prompts to register your physical device if needed for testing.
    \`\`\`

3.  **Start the Submission Process:**
    Run the EAS submit command. This will build your app on Expo's servers, and then guide you through the submission to App Store Connect.
    \`\`\`bash
    eas submit -p ios
    \`\`\`
    The CLI will ask for your Apple ID and password. It may also ask if you want EAS to handle creating certificates and provisioning profiles. It's recommended to let EAS manage this for you.

4.  **Wait for the Build:**
    The build process can take some time. You can monitor its progress in the link provided in your terminal.

5.  **Complete Submission in App Store Connect:**
    Once the build is complete, EAS will upload it to App Store Connect. You may need to visit the [App Store Connect website](https://appstoreconnect.apple.com/) to add screenshots, descriptions, and other metadata before you can finally "Submit for Review".

Good luck!
`;
        zip.file('README.md', readmeContent);

        const blob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${projectName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err: any) {
        console.error("Failed to export project:", err);
        setErrors(prev => [`Failed to create project ZIP. ${err.message}`, ...prev]);
    }
  };

  const handleSignIn = async () => {
      const provider = new window.firebase.GoogleAuthProvider();
      try {
          await window.firebase.signInWithPopup(window.firebase.auth, provider);
      } catch (error: any) {
          console.error("Authentication Error:", error);
          setErrors(prev => [`Authentication failed. ${error.message}`, ...prev]);
      }
  };

  const handleSignOut = async () => {
      try {
          await window.firebase.signOut(window.firebase.auth);
      } catch (error: any) {
          console.error("Sign Out Error:", error);
          setErrors(prev => [`Sign out failed. ${error.message}`, ...prev]);
      }
  };

  const renderContent = () => {
    const path = location.startsWith('/') ? location : `/${location}`;

    if (path === '/home') {
      return <HomePage onStartBuild={createNewProject} isLoading={isLoading} />;
    }
    if (path === '/projects') {
      return <ProjectsPage projects={projects} onSelectProject={handleSelectProject} onDeleteProject={handleDeleteProject} />;
    }
    if (path === '/settings') {
      return (
        <SettingsPage 
          selectedModel={model} 
          onModelChange={handleModelChange}
          isLoading={isLoading}
          previewMode={previewMode}
          onPreviewModeChange={handlePreviewModeChange}
        />
      );
    }
     if (path === '/authorized') {
      return <AuthorizedPage />;
    }

    const projectMatch = path.match(/^\/project\/([\w-]+)$/);
    if (projectMatch && activeProject) {
      return (
        <>
          <main className="flex flex-1 overflow-hidden">
            <div className="w-1/3 max-w-md flex flex-col border-r border-gray-900">
              <ChatPanel
                messages={activeProject.messages}
                userInput={userInput}
                onUserInput={setUserInput}
                onSend={handleSend}
                isLoading={isLoading}
                progress={progress}
              />
            </div>
            <div className="flex-1 flex flex-col">
              <Workspace
                project={activeProject}
                onRuntimeError={handleRuntimeError}
                previewMode={previewMode}
                onPublish={() => {
                    setPublishState({ status: 'idle' });
                    setIsPublishModalOpen(true)
                }}
                onCommit={handleCommit}
                onInitiateGitHubSave={() => setIsGitHubSaveModalOpen(true)}
                onExportProject={handleExportProject}
              />
            </div>
          </main>
          <ErrorDisplay error={errors[0] || null} onClose={() => setErrors(prev => prev.slice(1))} />
           <button
            onClick={() => setIsDebugAssistOpen(true)}
            title="Open Debug Assist"
            className="fixed bottom-8 right-8 w-14 h-14 z-40 bg-white text-black rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" height="24" width="24">
                <defs>
                <linearGradient id="paint0_linear_14402_15643_fab" x1="2.288" x2="13.596" y1="2.692" y2="8.957" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#8425cc"></stop>
                    <stop offset="1" stop-color="#2599cc"></stop>
                </linearGradient>
                </defs>
                <path fill="url(#paint0_linear_14402_15643_fab)" fill-rule="evenodd" d="M9.56049.6564C9.74797-.214503 10.9808-.220724 11.176.649356l.0252.112754c.2386 1.06349 1.0796 1.87059 2.1254 2.0556.8979.15883.8979 1.45575 0 1.61458-1.0458.18501-1.8868.99211-2.1254 2.0556l-.0252.11276c-.1952.87008-1.42803.86385-1.61551-.00705l-.02083-.09675c-.22983-1.06762-1.06995-1.88082-2.1176-2.06615-.89608-.15853-.89608-1.45287 0-1.61139 1.04765-.18534 1.88777-.99854 2.1176-2.066158L9.56049.6564ZM11.5 8.18049V12.25c0 .1381-.1119.25-.25.25h-9.5c-.13807 0-.25-.1119-.25-.25V6h6.38531c-.19048-.17448-.42601-.2933-.681-.33841C5.30951 5.32639 4.99463 2.99769 6.25976 2H1.75C.783502 2 0 2.7835 0 3.75v8.5C0 13.2165.783501 14 1.75 14h9.5c.9665 0 1.75-.7835 1.75-1.75V5.88959c-.2829.19769-.4962.50254-.5791.87189l-.0253.11275c-.1354.60388-.4711 1.03901-.8956 1.30626Zm-7.54414-.66174c-.24408-.24408-.63981-.24408-.88389 0-.24407.24408-.24407.63981 0 .88389l1.05806 1.05805-1.05806 1.05811c-.24407.244-.24407.6398 0 .8838.24408.2441.63981.2441.88389 0l1.5-1.49996c.24408-.24408.24408-.63981 0-.88389l-1.5-1.5Zm2.55806 2.81695c-.34518 0-.625.2798-.625.625s.27982.625.625.625h1.5c.34517 0 .625-.2798.625-.625s-.27983-.625-.625-.625h-1.5Z" clip-rule="evenodd"></path>
            </svg>
            </button>

            <DebugAssistPanel
                isOpen={isDebugAssistOpen}
                onClose={() => setIsDebugAssistOpen(false)}
                errors={errors}
                onFixError={handleFixError}
                isLoading={isLoading}
            />
        </>
      );
    }
     if (projectMatch && !activeProject && projects.length > 0) {
       return (
           <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <h1 className="text-4xl font-bold text-gray-400">Loading Project...</h1>
              <p className="text-gray-500 mt-2">If this takes too long, the project might not exist.</p>
          </div>
      );
    }

    return <HomePage onStartBuild={createNewProject} isLoading={isLoading} />;
  };

  const LoginOverlay = () => (
    <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center text-center backdrop-blur-sm">
        <h1 className="text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-br from-white via-gray-300 to-gray-600" style={{ fontFamily: "'Press Start 2P', system-ui" }}>
          Silo Build
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          Sign in to build, manage, and deploy your projects.
        </p>
        <button
            onClick={handleSignIn}
            className="flex items-center space-x-3 px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-transform hover:scale-105"
        >
            <img src="https://www.google.com/favicon.ico" alt="Google icon" className="w-6 h-6"/>
            <span>Sign in with Google</span>
        </button>
    </div>
  );

  const isNetlifyConfigured = !!(typeof window !== 'undefined' && localStorage.getItem('silo_netlify_token'));
  const isVercelConfigured = !!(typeof window !== 'undefined' && localStorage.getItem('silo_vercel_token'));

  return (
    <div className="flex h-screen bg-black text-white font-sans">
      <FloatingNav currentPath={location} user={currentUser} onSignOut={handleSignOut} onSignIn={handleSignIn} />
      <div className="flex-1 flex flex-col overflow-hidden ml-20 relative">
        {isAuthLoading ? (
          <div className="flex items-center justify-center h-full text-gray-400">Loading user...</div>
        ) : !currentUser ? (
          <>
            <HomePage onStartBuild={() => {}} isLoading={true} />
            <LoginOverlay />
          </>
        ) : (
          renderContent()
        )}
      </div>
      <PublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onPublishToWeb={handlePublish}
        onInitiateAppStorePublish={() => {
            setIsPublishModalOpen(false);
            setAppStorePublishState({ status: 'idle' });
            setIsAppStorePublishModalOpen(true);
        }}
        publishState={publishState}
        projectName={activeProject?.name || ''}
        isRedeploy={!!activeProject?.netlifySiteId || !!activeProject?.vercelProjectId}
        isNetlifyConfigured={isNetlifyConfigured}
        isVercelConfigured={isVercelConfigured}
        projectUrls={{
            netlify: activeProject?.netlifyUrl,
            vercel: activeProject?.vercelUrl,
        }}
        appStoreStatus={activeProject?.appStoreSubmission?.status}
      />
      <GitHubSaveModal
        isOpen={isGitHubSaveModalOpen}
        onClose={() => setIsGitHubSaveModalOpen(false)}
        onSave={handleCreateRepoAndPush}
        isLoading={isLoading}
        projectName={activeProject?.name || ''}
      />
      {activeProject && (
        <AppStorePublishModal
            isOpen={isAppStorePublishModalOpen}
            onClose={() => setIsAppStorePublishModalOpen(false)}
            onSubmit={handleAppStoreSubmit}
            publishState={appStorePublishState}
            projectName={activeProject.name}
        />
      )}
    </div>
  );
};

export default App;