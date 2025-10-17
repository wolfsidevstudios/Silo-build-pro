import React from 'react';

export interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: number;
  read: boolean;
}

interface NotificationsPanelProps {
  isOpen: boolean;
  notifications: Notification[];
  onClose: () => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, notifications, onClose }) => {
  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40" onClick={onClose}></div>}
      <div
        className={`absolute top-16 right-8 w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden transform transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'
        }`}
        style={{ transformOrigin: 'top right' }}
      >
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">What's New</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500 text-center p-8">No new notifications.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map(notification => (
                <li key={notification.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <p className="font-semibold text-sm text-gray-900">{notification.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{notification.description}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(notification.timestamp).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};