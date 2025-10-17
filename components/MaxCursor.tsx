import React from 'react';

interface MaxCursorProps {
  position: { x: number; y: number } | null;
}

export const MaxCursor: React.FC<MaxCursorProps> = ({ position }) => {
  if (!position) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[9999] pointer-events-none transition-transform duration-100 ease-linear"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
            <g id="Line_Duotone/Essentional_UI/Cursor">
                <path id="Vector" stroke="#737373" stroke-linecap="round" stroke-linejoin="round" d="m12.6357 15.2618 3.9383 3.9383c0.4078 0.4078 0.6117 0.6116 0.8391 0.7059 0.3033 0.1256 0.644 0.1256 0.9473 0 0.2275 -0.0943 0.4313 -0.2982 0.8391 -0.7059 0.4078 -0.4078 0.6117 -0.6117 0.7059 -0.8392 0.1256 -0.3032 0.1256 -0.644 0 -0.9472 -0.0942 -0.2275 -0.2981 -0.4314 -0.7059 -0.8392l-3.9383 -3.9383" stroke-width="1.5"></path>
                <path id="Vector_2" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" d="m12.6361 15.2616 -1.2027 1.2027c-1.2312 1.2312 -1.84684 1.8468 -2.50851 1.7015 -0.66167 -0.1454 -0.96264 -0.9623 -1.56459 -2.5962l-2.0076 -5.4491c-1.20083 -3.25944 -1.80124 -4.88914 -0.96129 -5.72909s2.46965 -0.23954 5.72909 0.9613l5.4491 2.00759c1.6339 0.60195 2.4508 0.90292 2.5962 1.56459 0.1453 0.66167 -0.4703 1.27731 -1.7015 2.50851l-1.2027 1.2027" stroke-width="1.5"></path>
            </g>
        </svg>
    </div>
  );
};
