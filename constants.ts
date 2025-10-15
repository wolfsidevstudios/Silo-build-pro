export const DEFAULT_CODE = `
import React from 'react';

// The rendered component must be the default export
const App = () => {
  return (
    // White background and modern font
    <div style={{ 
      backgroundColor: '#FFFFFF', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      color: '#111827',
    }}>
      {/* Bold black title */}
      <h1 style={{ 
        fontSize: '2.5rem', 
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: '1rem',
        textAlign: 'center',
      }}>
        My Modern App
      </h1>
      <p style={{ color: '#374151', marginBottom: '2rem', textAlign: 'center' }}>
        Start building your app by giving me instructions.
      </p>
      {/* Pill-shaped black button */}
      <button style={{
        backgroundColor: '#000000',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '9999px',
        padding: '0.75rem 1.5rem',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: '0 4px 14px 0 rgb(0 0 0 / 10%)',
        transition: 'background-color 0.2s ease-in-out',
      }}>
        Get Started
      </button>
    </div>
  );
};

export default App;
`;
