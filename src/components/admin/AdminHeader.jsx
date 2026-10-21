// ==============================================================================
// HEADER DEL PANEL DE ADMINISTRACIÓN (ESTÁNDAR DON YEYO S.A.)
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import React, { useState } from 'react';
import {
  Menu,
  Users,
  Trophy,
  Sliders,
  Tv,
  LogOut,
  User,
  ArrowLeft,
  Sparkles,
  Database,
  ExternalLink
} from 'lucide-react';
import packageJson from '../../../package.json';

export default function AdminHeader({
  adminUsername = 'admin',
  activeSection = 'PARTICIPANTS',
  onSelectSection,
  onOpenDrawer,
  onToggleDrawer,
  onLogout,
  onBackToGame,
  isPublished = false,
  activePhase = 1
}) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const brandName = import.meta.env.VITE_ADMIN_BRAND_NAME || 'DY-TRIVIA';
  const handleToggle = onOpenDrawer || onToggleDrawer;

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur-md border-b border-white/10 shadow-xl transition-all">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Izquierda: Botón Menú + Marca Corporativa */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <button
            type="button"
            onClick={handleToggle}
            className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-200 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="Abrir menú de navegación"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>

          {/* Logo Don Yeyo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0">
              <img src="/logo-donyeyo.svg" alt="Don Yeyo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-white text-sm sm:text-base tracking-tight">
                  {brandName}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-red-600/90 text-white font-mono text-[10px] font-black uppercase tracking-wider shadow-sm">
                  Admin
                </span>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  <Database size={10} />
                  <span>Supabase</span>
                </span>
              </div>
              <p className="text-[10px] font-mono font-medium text-slate-400 leading-tight">
                v{packageJson.version}
              </p>
            </div>
          </div>
        </div>

        {/* Derecha: Perfil Admin */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Usuario / Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-white border border-white/10 transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-amber-600 text-white font-black text-xs flex items-center justify-center shadow">
                {adminUsername ? adminUsername[0].toUpperCase() : 'A'}
              </div>
              <div className="hidden md:block text-left">
                <span className="block text-xs font-bold leading-tight">@{adminUsername}</span>
                <span className="block text-[10px] text-yellow-300 font-semibold leading-tight">Administrador</span>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-slate-900 border border-white/15 shadow-2xl overflow-hidden py-1.5 z-50 animate-casual-in">
                <div className="px-4 py-2.5 border-b border-white/10">
                  <p className="text-xs font-bold text-white">Sesión Activa</p>
                  <p className="text-[11px] text-slate-400 truncate">@{adminUsername}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onSelectSection('DASHBOARD');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2"
                >
                  <span>Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onSelectSection('QUESTIONS');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2"
                >
                  <span>Preguntas</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onSelectSection('PARTICIPANTS');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2"
                >
                  <span>Participantes</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onSelectSection('CLASSIFICATION');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2"
                >
                  <span>Participación</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onSelectSection('MAILING');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2"
                >
                  <span>Mailing</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onSelectSection('CONFIG');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2"
                >
                  <span>Configuración</span>
                </button>

                <div className="my-1 border-t border-white/10" />

                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onLogout();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 font-bold flex items-center gap-2"
                >
                  <LogOut size={14} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
