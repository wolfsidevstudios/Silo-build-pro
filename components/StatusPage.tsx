import React from 'react';

// --- Mock Data ---
// In a real app, you'd fetch this from a status API.
// We're generating some mock history data for demonstration.

type Status = 'Operational' | 'Degraded Performance' | 'Outage';

interface ServiceStatus {
  name: string;
  status: Status;
  description: string;
  history: { date: string; status: Status }[];
}

const generateHistory = (days: number, incidentDays: { day: number; status: Status }[] = []): { date: string; status: Status }[] => {
  const history: { date: string; status: Status }[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const incident = incidentDays.find(inc => inc.day === (days - 1 - i));
    history.push({
      date: date.toISOString().split('T')[0],
      status: incident ? incident.status : 'Operational',
    });
  }
  return history;
};

const services: ServiceStatus[] = [
  { 
    name: 'Main Application & UI',
    description: 'Core infrastructure for the web application.',
    history: generateHistory(30),
    status: 'Operational',
  },
  { 
    name: 'Gemini API (Code Generation)',
    description: 'AI services for code planning and generation.',
    history: generateHistory(30, [{ day: 5, status: 'Degraded Performance' }]),
    status: 'Operational',
  },
  { 
    name: 'Live Preview Service',
    description: 'Service for rendering live code previews.',
    history: generateHistory(30),
    status: 'Operational',
  },
  { 
    name: 'Netlify Deployments',
    description: 'Integration for deploying projects to Netlify.',
    history: generateHistory(30),
    status: 'Operational',
  },
  { 
    name: 'Vercel Deployments',
    description: 'Integration for deploying projects to Vercel.',
    history: generateHistory(30, [{ day: 12, status: 'Outage' }]),
    status: 'Operational',
  },
  { 
    name: 'Community App Database',
    description: 'Database for community-shared applications.',
    history: generateHistory(30),
    status: 'Operational',
  },
];

// Update current status from the last history entry
services.forEach(service => {
  service.status = service.history[service.history.length - 1].status;
});

// --- Components ---

const StatusIndicator: React.FC<{ status: Status }> = ({ status }) => {
  const colorClasses = {
    'Operational': 'bg-green-500',
    'Degraded Performance': 'bg-yellow-500',
    'Outage': 'bg-red-500',
  };
  return <div className={`w-3 h-3 rounded-full ${colorClasses[status]}`}></div>;
};

const StatusHistoryBar: React.FC<{ history: { date: string; status: Status }[] }> = ({ history }) => {
  const getBarColor = (status: Status) => {
    switch (status) {
      case 'Operational': return 'bg-green-500';
      case 'Degraded Performance': return 'bg-yellow-500';
      case 'Outage': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="flex items-center justify-between mt-2">
      <span className="text-xs text-gray-400">30 days ago</span>
      <div className="flex items-center space-x-px">
        {history.map((day, index) => (
          <div
            key={index}
            className={`w-1.5 h-6 rounded-sm ${getBarColor(day.status)}`}
            title={`${day.date}: ${day.status}`}
          ></div>
        ))}
      </div>
      <span className="text-xs text-gray-400">Today</span>
    </div>
  );
};


export const StatusPage: React.FC = () => {
  const isAllOperational = services.every(s => s.status === 'Operational');

  return (
    <div className="flex flex-col h-full p-8 pt-28 overflow-y-auto bg-gray-50 text-black">
      <div className="w-full max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-5xl font-bold text-black mb-2 text-center">System Status</h1>
          <div className={`mt-4 p-4 rounded-lg text-center ${isAllOperational ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            <p className="font-semibold">
              {isAllOperational ? 'All systems operational.' : 'Some systems are experiencing issues.'}
            </p>
          </div>
        </header>

        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
          <div className="space-y-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">{service.name}</h2>
                    <p className="text-sm text-gray-500">{service.description}</p>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                    <StatusIndicator status={service.status} />
                    <span className={`font-semibold text-sm ${
                      service.status === 'Operational' ? 'text-green-700' :
                      service.status === 'Degraded Performance' ? 'text-yellow-700' : 'text-red-700'
                    }`}>
                      {service.status}
                    </span>
                  </div>
                </div>
                <StatusHistoryBar history={service.history} />
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
