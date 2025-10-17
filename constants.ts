
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
    color: '#FFFFFF',
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

// --- shadcn/ui Defaults ---

export const DEFAULT_SHADCN_CN_UTIL = `
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`;

export const DEFAULT_SHADCN_BUTTON_COMPONENT = `
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils.ts"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-black text-white hover:bg-black/90",
        destructive:
          "bg-red-500 text-white hover:bg-red-500/90",
        outline:
          "border border-gray-200 bg-transparent hover:bg-gray-100",
        secondary:
          "bg-gray-100 text-black hover:bg-gray-100/80",
        ghost: "hover:bg-gray-100",
        link: "text-black underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
`;

export const DEFAULT_SHADCN_APP_TSX = `
import React from 'react';
import { Button } from './components/ui/button.tsx';

const App = () => {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Welcome to your shadcn/ui App
        </h1>
        <p className="text-gray-600 mb-8">
          Start by telling me what to build. I can generate more shadcn components for you.
        </p>
        <Button>Get Started</Button>
      </div>
    </div>
  );
};

export default App;
`;

export const DEFAULT_SHADCN_FILES = [
  { path: 'src/App.tsx', code: DEFAULT_SHADCN_APP_TSX },
  { path: 'src/lib/utils.ts', code: DEFAULT_SHADCN_CN_UTIL },
  { path: 'src/components/ui/button.tsx', code: DEFAULT_SHADCN_BUTTON_COMPONENT },
];
