import React from 'react';
import { Trophy } from 'lucide-react';

export default function Header({ onOpenClassification, currentView, isGameActive = false }) {
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
