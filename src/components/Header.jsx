import React from 'react';

export default function Header() {
  return (
    <header className="app-header">
      {/* Logo Oficial Don Yeyo */}
      <div className="flex items-center">
        <img 
          src="/logo-donyeyo.svg" 
          alt="Don Yeyo" 
          className="h-10 sm:h-12 w-auto object-contain filter drop-shadow-md animate-logo-heartbeat" 
        />
      </div>
    </header>
  );
}
