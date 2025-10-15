
import React from 'react';

export const AuthorizedPage: React.FC = () => {
  const returnPath = sessionStorage.getItem('silo_authorized_return_path');

  const handleReturn = () => {
    sessionStorage.removeItem('silo_authorized_return_path'); // Clean up
    if (returnPath) {
      window.location.hash = returnPath;
    } else {
      window.location.hash = '/projects'; // Fallback to projects list
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-black text-white p-8">
      <h1 className="text-5xl font-bold mb-8">Authorized</h1>
      <button
        onClick={handleReturn}
        className="px-8 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors"
      >
        Return to Settings
      </button>
    </div>
  );
};
