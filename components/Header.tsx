import React from 'react';

export const Header: React.FC = () => (
  // The logo container is absolutely positioned to float over the main content.
  // A high z-index ensures it stays on top. It is positioned relative to the main app container.
  <div className="absolute top-8 left-8 z-30 pointer-events-none">
    <h1
      className="text-white text-3xl"
      style={{ fontFamily: "'Press Start 2P', system-ui" }}
    >
      Silo Build
    </h1>
  </div>
);