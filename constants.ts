
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

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Web Page</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Welcome to My Web Page</h1>
    <p>Start building by giving me instructions.</p>
    <button id="myButton">Click Me</button>
    <script src="script.js" defer></script>
</body>
</html>`;

const DEFAULT_CSS = `body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    margin: 0;
    background-color: #f0f0f0;
    color: #333;
}

h1 {
    color: #000;
}

button {
    background-color: #000000;
    color: #FFFFFF;
    border: none;
    border-radius: 9999px;
    padding: 0.75rem 1.5rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 14px 0 rgb(0 0 0 / 10%);
    transition: background-color 0.2s ease-in-out;
}

button:hover {
    background-color: #333;
}
`;

const DEFAULT_JS = `console.log("Hello from script.js!");

document.getElementById('myButton').addEventListener('click', () => {
    alert('Button clicked!');
});
`;

export const DEFAULT_HTML_FILES = [
    { path: 'index.html', code: DEFAULT_HTML },
    { path: 'style.css', code: DEFAULT_CSS },
    { path: 'script.js', code: DEFAULT_JS },
];
