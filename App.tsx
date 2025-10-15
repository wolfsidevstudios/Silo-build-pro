import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
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

export type Page = 'home' | 'builder' | 'projects' | 'settings';
export type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';

export interface Message {
  actor: 'user' | 'ai' | 'system';
  text: string;
}

const App: React.FC = () => {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [transpiledCode, setTranspiledCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const debouncedCode = useDebounce(code, 500);

  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [model, setModel] = useState<GeminiModel>('gemini-2.5-flash');


  useEffect(() => {
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

  const handleRuntimeError = useCallback((message: string) => {
    setError(`Runtime Error: ${message}`);
  }, []);

  const extractCode = (responseText: string): string => {
    const codeBlockRegex = /```(?:tsx|typescript|javascript)\n([\s\S]*?)\n```/;
    const match = responseText.match(codeBlockRegex);
    return match ? match[1].trim() : responseText;
  };

  const callGemini = async (prompt: string, codeToUpdate: string, selectedModel: GeminiModel) => {
    const userApiKey = localStorage.getItem('gemini_api_key');
    const apiKey = userApiKey || process.env.API_KEY as string;
    
    if (!apiKey) {
      throw new Error("Gemini API key is not set. Please add it in Settings.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const fullPrompt = `
      You are an expert React developer with a keen eye for modern UI/UX design. 
      Based on the current code and the user's request, provide the updated and complete React component code.

      **Design Guidelines (Strictly Follow):**
      - **Overall Style:** Modern, clean, and minimalist.
      - **Background:** Always use a white background (e.g., \`#FFFFFF\` or \`bg-white\`).
      - **Typography:** Use a modern, sans-serif font (like system-ui or Inter). For headers and titles, use bold, black text. A subtle black-to-gray gradient text is a plus if easily achievable.
      - **Buttons:** Buttons must be pill-shaped (fully rounded). They can be either solid black with white text, or have a black outline with black text and a transparent background.
      - **Containers/Taskbars:** Top bars or main containers should be styled as pill-shaped, floating, and transparent or semi-transparent where appropriate.
      - **Styling:** Use inline styles or Tailwind CSS classes. Prioritize Tailwind CSS if it's already present in the code.

      The user's request is: "${prompt}".

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

    return extractCode(response.text);
  };

  const startBuild = async (prompt: string) => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setCurrentPage('builder');
    setMessages([{ actor: 'user', text: prompt }]);
    setError(null);

    try {
      const newCode = await callGemini(prompt, DEFAULT_CODE, model);
      setCode(newCode);
      setMessages((prev) => [
        ...prev,
        { actor: 'ai', text: 'I have created the initial code for you. Check it out and let me know what to do next!' }
      ]);
    } catch (err: any) {
      const errorMessage = `AI Error: ${err.message}`;
      setError(errorMessage);
      setMessages((prev) => [
        ...prev,
        { actor: 'system', text: `Sorry, I encountered an error starting the build. ${err.message}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSend = async () => {
    if (!userInput.trim() || isLoading) return;

    const newMessages: Message[] = [...messages, { actor: 'user', text: userInput }];
    setMessages(newMessages);
    const currentInput = userInput;
    setUserInput('');
    setIsLoading(true);
    setError(null);

    try {
      const newCode = await callGemini(currentInput, code, model);
      setCode(newCode);

      setMessages((prev) => [
        ...prev,
        { actor: 'ai', text: 'I have updated the code based on your request. Check out the changes in the Code and Preview tabs.' }
      ]);
    } catch (err: any) {
      const errorMessage = `AI Error: ${err.message}`;
      setError(errorMessage);
      setMessages((prev) => [
        ...prev,
        { actor: 'system', text: `Sorry, I encountered an error. ${err.message}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleModelChange = (newModel: GeminiModel) => {
    setModel(newModel);
    localStorage.setItem('gemini_model', newModel);
  };


  return (
    <div className="flex h-screen bg-black text-white font-sans">
      <FloatingNav currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden ml-20"> {/* Add margin to offset for the floating nav */}
        {currentPage === 'home' && <HomePage onStartBuild={startBuild} isLoading={isLoading} />}
        
        {currentPage === 'builder' && (
          <>
            <main className="flex flex-1 overflow-hidden">
              <div className="w-1/3 flex flex-col border-r border-gray-900">
                <ChatPanel
                  messages={messages}
                  userInput={userInput}
                  onUserInput={setUserInput}
                  onSend={handleSend}
                  isLoading={isLoading}
                />
              </div>
              <div className="w-2/3 flex flex-col">
                <Workspace
                  code={code}
                  transpiledCode={transpiledCode}
                  onCodeChange={setCode}
                  onRuntimeError={handleRuntimeError}
                />
              </div>
            </main>
            <ErrorDisplay error={error} onClose={() => setError(null)} />
          </>
        )}

        {currentPage === 'projects' && <ProjectsPage />}
        {currentPage === 'settings' && <SettingsPage selectedModel={model} onModelChange={handleModelChange} />}
      </div>
    </div>
  );
};

export default App;