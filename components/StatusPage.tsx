import React from 'react';

// This is a mock. In a real app, you'd fetch this from a status API.
const services = [
  { name: 'Main Application & UI', status: 'Operational', description: 'All systems normal.' },
  { name: 'Gemini API (Code Generation)', status: 'Operational', description: 'AI services are responding correctly.' },
  { name: 'Live Preview Service', status: 'Operational', description: 'Previews are rendering as expected.' },
  { name: 'Netlify Deployments', status: 'Operational', description: 'Deployments to Netlify are functioning.' },
  { name: 'Vercel Deployments', status: 'Operational', description: 'Deployments to Vercel are functioning.' },
  { name: 'Community App Database', status: 'Operational', description: 'Database for community apps is online.' },
];

const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  const baseClasses = "w-3 h-3 rounded-full";
  if (status === 'Operational') {
    return <div className={`${baseClasses} bg-green-500`}></div>;
  }
  if (status === 'Degraded Performance') {
    return <div className={`${baseClasses} bg-yellow-500`}></div>;
  }
  return <div className={`${baseClasses} bg-red-500`}></div>;
};

export const StatusPage: React.FC = () => {
  return (
    <div className="flex flex-col h-full p-8 pt-28 overflow-y-auto bg-gray-50 text-black">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-black mb-2">System Status</h1>
          <p className="text-lg text-gray-600">
            Current status of Silo Build services. All systems are currently operational.
          </p>
        </header>

        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <div className="space-y-4">
            {services.map((service, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg bg-gray-50/50 border border-gray-100"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">{service.name}</h2>
                  <p className="text-sm text-gray-500">{service.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusIndicator status={service.status} />
                  <span className="font-semibold text-green-700 text-sm">{service.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer className="text-center mt-12 text-gray-500 text-sm">
            <p>If you are experiencing issues, please check here first. For further assistance, contact support.</p>
        </footer>
      </div>
    </div>
  );
};
