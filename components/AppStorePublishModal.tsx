
import React, { useState, useEffect } from 'react';

export type AppStorePublishState = {
  status: 'idle' | 'submitting' | 'success' | 'error';
  url?: string;
  error?: string;
};

export interface AppStoreSubmissionData {
    appleId: string;
    appName: string;
    appIcon: File | null;
    version: string;
    category: string;
    ageRating: string;
}

interface AppStorePublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AppStoreSubmissionData) => void;
  publishState: AppStorePublishState;
  projectName: string;
}

const ProgressBar: React.FC<{ step: number, totalSteps: number }> = ({ step, totalSteps }) => (
    <div className="flex items-center space-x-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`w-full h-1 rounded-full transition-colors ${i < step ? 'bg-indigo-500' : 'bg-gray-700'}`}></div>
        ))}
    </div>
);

export const AppStorePublishModal: React.FC<AppStorePublishModalProps> = ({ isOpen, onClose, onSubmit, publishState, projectName }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<AppStoreSubmissionData>({
        appleId: '',
        appName: projectName,
        appIcon: null,
        version: '1.0.0',
        category: 'Utilities',
        ageRating: '4+',
    });
    const [appIconPreview, setAppIconPreview] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Reset state when modal opens
            setCurrentStep(1);
            setFormData(prev => ({ ...prev, appName: projectName, version: '1.0.0' }));
            setAppIconPreview(null);
        }
    }, [isOpen, projectName]);

    useEffect(() => {
        if (publishState.status === 'success' || publishState.status === 'error') {
            setCurrentStep(4); // Move to the final status step
        }
    }, [publishState.status]);

    if (!isOpen) return null;
    
    const handleNext = () => setCurrentStep(s => s + 1);
    const handleBack = () => setCurrentStep(s => s - 1);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({ ...prev, appIcon: file }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setAppIconPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = () => {
        onSubmit(formData);
    };

    const renderContent = () => {
        if (currentStep === 4) { // Status page
             switch (publishState.status) {
                case 'submitting':
                    return (
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <h2 className="text-2xl font-bold mt-4">Submitting to App Store...</h2>
                            <p className="text-gray-400 mt-2">This may take a few moments. Please don't close this window.</p>
                        </div>
                    );
                case 'success':
                    return (
                        <div className="text-center">
                            <span className="material-symbols-outlined text-6xl text-green-400">task_alt</span>
                            <h2 className="text-2xl font-bold mt-4">Submitted Successfully!</h2>
                            <p className="text-gray-400 mt-2">Your app is now submitted for review by Apple.</p>
                            <a href={publishState.url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block w-full py-3 text-center bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors">
                                View in App Store Connect
                            </a>
                        </div>
                    );
                case 'error':
                     return (
                        <div className="text-center">
                            <span className="material-symbols-outlined text-6xl text-red-400">error</span>
                            <h2 className="text-2xl font-bold mt-4">Submission Failed</h2>
                            <p className="text-red-300 mt-2">{publishState.error || 'An unknown error occurred.'}</p>
                            <button onClick={handleBack} className="mt-6 w-full py-3 text-center bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors">
                                Go Back & Edit
                            </button>
                        </div>
                     );
             }
        }
        
        return (
            <>
                <div className="mb-6">
                    <ProgressBar step={currentStep} totalSteps={3} />
                </div>
                {currentStep === 1 && (
                    <div>
                        <h3 className="text-xl font-semibold mb-2">Connect Apple Developer Account</h3>
                        <p className="text-sm text-gray-500 mb-4">Provide your credentials to allow submission via Expo Application Services (EAS).</p>
                        <div className="space-y-4">
                            <input type="email" name="appleId" value={formData.appleId} onChange={handleInputChange} placeholder="Apple ID" className="w-full p-3 bg-zinc-800 border border-gray-700 rounded-lg" />
                            <input type="password" placeholder="App-Specific Password" className="w-full p-3 bg-zinc-800 border border-gray-700 rounded-lg" />
                        </div>
                        <div className="p-3 bg-yellow-900/50 border border-yellow-500/50 rounded-lg text-yellow-200 text-xs mt-4">
                            <strong>Note:</strong> This is a UI prototype. Credentials are not saved or used. In a real application, these would be securely handled by the EAS build service and not stored on our servers.
                        </div>
                    </div>
                )}
                {currentStep === 2 && (
                    <div>
                        <h3 className="text-xl font-semibold mb-2">App Store Metadata</h3>
                        <p className="text-sm text-gray-500 mb-4">Enter the information that will appear on your App Store listing.</p>
                        <div className="space-y-4">
                            <input type="text" name="appName" value={formData.appName} onChange={handleInputChange} placeholder="App Name" className="w-full p-3 bg-zinc-800 border border-gray-700 rounded-lg" />
                            <div>
                                <label className="text-sm text-gray-400 block mb-2">App Icon (1024x1024)</label>
                                <div className="flex items-center space-x-4">
                                    <div className="w-20 h-20 bg-zinc-800 rounded-lg flex items-center justify-center border border-gray-700">
                                        {appIconPreview ? <img src={appIconPreview} alt="Icon Preview" className="w-full h-full object-cover rounded-lg" /> : <span className="material-symbols-outlined text-4xl text-gray-500">photo</span>}
                                    </div>
                                    <input type="file" accept="image/png" onChange={handleIconChange} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer" />
                                </div>
                            </div>
                            <input type="text" name="version" value={formData.version} onChange={handleInputChange} placeholder="Version (e.g., 1.0.0)" className="w-full p-3 bg-zinc-800 border border-gray-700 rounded-lg" />
                             <select name="category" value={formData.category} onChange={handleInputChange} className="w-full p-3 bg-zinc-800 border border-gray-700 rounded-lg">
                                <option>Utilities</option><option>Productivity</option><option>Entertainment</option><option>Games</option><option>Finance</option>
                            </select>
                            <select name="ageRating" value={formData.ageRating} onChange={handleInputChange} className="w-full p-3 bg-zinc-800 border border-gray-700 rounded-lg">
                                <option>4+</option><option>9+</option><option>12+</option><option>17+</option>
                            </select>
                        </div>
                    </div>
                )}
                {currentStep === 3 && (
                     <div>
                        <h3 className="text-xl font-semibold mb-2">Review & Submit</h3>
                        <p className="text-sm text-gray-500 mb-4">Confirm the details below before submitting to Apple for review.</p>
                        <div className="bg-zinc-800/50 p-4 rounded-lg space-y-2 text-sm">
                            <p><strong>Apple ID:</strong> {formData.appleId}</p>
                            <p><strong>App Name:</strong> {formData.appName}</p>
                            <p><strong>Version:</strong> {formData.version}</p>
                            <p><strong>Category:</strong> {formData.category}</p>
                            <p><strong>Age Rating:</strong> {formData.ageRating}</p>
                        </div>
                    </div>
                )}

                <div className="mt-8 flex space-x-4">
                    {currentStep > 1 && <button onClick={handleBack} className="w-1/2 py-3 text-center bg-zinc-700 rounded-lg font-semibold hover:bg-zinc-600 transition-colors">Back</button>}
                    {currentStep < 3 && <button onClick={handleNext} className="w-full py-3 text-center bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">Next</button>}
                    {currentStep === 3 && <button onClick={handleSubmit} className="w-full py-3 text-center bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors">Submit for Review</button>}
                </div>
            </>
        );
    }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-gray-800 rounded-2xl p-8 w-full max-w-lg relative text-white flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold">Publish to App Store</h2>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};
