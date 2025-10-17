import React from 'react';

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="flex flex-col h-full p-8 pt-28 overflow-y-auto bg-gray-50 text-black">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-black mb-2">Terms of Service</h1>
          <p className="text-lg text-gray-600">Effective Date: October 16, 2025</p>
        </header>

        <div className="text-gray-700 space-y-6 bg-white border border-gray-200 p-8 rounded-2xl shadow-sm leading-relaxed">
            <h2 className="text-2xl font-semibold text-black">1. Terms</h2>
            <p>By accessing the website at Silo Build, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms, you are prohibited from using or accessing this site. The materials contained in this website are protected by applicable copyright and trademark law.</p>
            
            <h2 className="text-2xl font-semibold text-black">2. Use License</h2>
            <p>Permission is granted to temporarily download one copy of the materials (information or software) on Silo Build's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not: modify or copy the materials; use the materials for any commercial purpose, or for any public display (commercial or non-commercial); attempt to decompile or reverse engineer any software contained on Silo Build's website; remove any copyright or other proprietary notations from the materials; or transfer the materials to another person or "mirror" the materials on any other server. This license shall automatically terminate if you violate any of these restrictions and may be terminated by Silo Build at any time.</p>
            
            <h2 className="text-2xl font-semibold text-black">3. Disclaimer</h2>
            <p>The materials on Silo Build's website are provided on an 'as is' basis. Silo Build makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
        </div>
      </div>
    </div>
  );
};
