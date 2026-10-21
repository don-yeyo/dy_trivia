// ==============================================================================
// MENÚ LATERAL DRAWER PARA EL PANEL DE ADMINISTRACIÓN (ESTÁNDAR DON YEYO S.A.)
// Don Yeyo S.A. | Trivia Inocuidad 2026 | Referencia dy_shigma
// ==============================================================================
import React, { useEffect } from 'react';
import {
  X,
  LayoutDashboard,
  HelpCircle,
  Users,
  Trophy,
  Sliders,
  Tv,
  LogOut,
  Gamepad2,
  ExternalLink,
  ShieldCheck,
  Share2,
  Database,
  Mail,
  FileSpreadsheet
} from 'lucide-react';
import packageJson from '../../../package.json';

export default function AdminDrawer({
  isOpen = false,
  onClose,
  activeSection = 'DASHBOARD',
  onSelectSection,
  onLogout,
  onBackToGame,
  adminUsername = 'admin',
  isPublished = false,
  activePhase = 1
}) {
  const brandName = import.meta.env.VITE_ADMIN_BRAND_NAME || 'DY-TRIVIA';

  // Cerrar Drawer al presionar Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevenir scroll en el fondo cuando el drawer está abierto en móviles
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNavClick = (section) => {
    onSelectSection(section);
    onClose();
  };

  return (
    <>
      {/* Overlay Backdrop Blur */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        aria-hidden="true"
      />

      {/* Drawer Lateral Deslizable */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-80 max-w-[85vw] bg-slate-900 border-r border-white/10 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Encabezado del Drawer */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-2 shadow-md flex items-center justify-center shrink-0">
              <img src="/logo-donyeyo.svg" alt="Don Yeyo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-black text-white text-base tracking-tight">
                  {brandName}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-mono text-[9px] font-black uppercase">
                  v{packageJson.version}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Administración Central</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido / Opciones de Navegación */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* SECCIÓN 1: Módulos de Gestión */}
          <div>
            <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Módulos del Sistema
            </p>
            <div className="space-y-1">
              {/* 1. Dashboard */}
              <button
                type="button"
                onClick={() => handleNavClick('DASHBOARD')}
                className={`w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-xs font-bold transition-all text-left cursor-pointer ${activeSection === 'DASHBOARD'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
              >
                <LayoutDashboard size={18} className={activeSection === 'DASHBOARD' ? 'text-white' : 'text-amber-400'} />
                <div className="flex-1">
                  <span>Dashboard</span>
                  <span className="block text-[10px] font-normal opacity-70">
                    Métricas clave, KPIs y resumen ejecutivo
                  </span>
                </div>
              </button>

              {/* 2. Preguntas */}
              <button
                type="button"
                onClick={() => handleNavClick('QUESTIONS')}
                className={`w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-xs font-bold transition-all text-left cursor-pointer ${activeSection === 'QUESTIONS'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
              >
                <HelpCircle size={18} className={activeSection === 'QUESTIONS' ? 'text-white' : 'text-blue-400'} />
                <div className="flex-1">
                  <span>Preguntas</span>
                  <span className="block text-[10px] font-normal opacity-70">
                    CRUD, opciones, fases y explicaciones
                  </span>
                </div>
              </button>

              {/* 3. Participantes */}
              <button
                type="button"
                onClick={() => handleNavClick('PARTICIPANTS')}
                className={`w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-xs font-bold transition-all text-left cursor-pointer ${activeSection === 'PARTICIPANTS'
                  ? 'bg-red-600 text-white shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Users size={18} className={activeSection === 'PARTICIPANTS' ? 'text-white' : 'text-red-400'} />
                <div className="flex-1">
                  <span>Participantes</span>
                  <span className="block text-[10px] font-normal opacity-70">
                    Nómina, hashes, mailing y resets
                  </span>
                </div>
              </button>

              {/* 4. Participación */}
              <button
                type="button"
                onClick={() => handleNavClick('CLASSIFICATION')}
                className={`w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-xs font-bold transition-all text-left cursor-pointer ${activeSection === 'CLASSIFICATION'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Trophy size={18} className={activeSection === 'CLASSIFICATION' ? 'text-slate-950' : 'text-amber-400'} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span>Participación</span>
                    {isPublished && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black">
                        Publicada
                      </span>
                    )}
                  </div>
                  <span className="block text-[10px] font-normal opacity-70">
                    Resultados, podio 3D y auditoría
                  </span>
                </div>
              </button>

              {/* 5. Mailing */}
              <button
                type="button"
                onClick={() => handleNavClick('MAILING')}
                className={`w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-xs font-bold transition-all text-left cursor-pointer ${activeSection === 'MAILING'
                  ? 'bg-purple-600 text-white shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Mail size={18} className={activeSection === 'MAILING' ? 'text-white' : 'text-purple-400'} />
                <div className="flex-1">
                  <span>Mailing</span>
                  <span className="block text-[10px] font-normal opacity-70">
                    Invitaciones y devoluciones pedagógicas
                  </span>
                </div>
              </button>

              {/* 6. Configuración */}
              <button
                type="button"
                onClick={() => handleNavClick('CONFIG')}
                className={`w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-xs font-bold transition-all text-left cursor-pointer ${activeSection === 'CONFIG'
                  ? 'bg-indigo-600 text-white shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Sliders size={18} className={activeSection === 'CONFIG' ? 'text-white' : 'text-indigo-400'} />
                <div className="flex-1">
                  <span>Configuración</span>
                  <span className="block text-[10px] font-normal opacity-70">
                    Fases, tiempos y parámetros de juego
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* SECCIÓN 2: Motor y Estado Técnico */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Database size={13} className="text-emerald-400" />
                <span>Motor Activo</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                Supabase
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              PostgreSQL de alta velocidad con concurrencia sin límites.
            </p>
          </div>
        </div>

        {/* Pie del Drawer: Usuario y Cerrar Sesión */}
        <div className="p-4 border-t border-white/10 bg-slate-950/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center">
                {adminUsername ? adminUsername[0].toUpperCase() : 'A'}
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">@{adminUsername}</p>
                <p className="text-[10px] text-slate-400 leading-tight">Administrador General</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>

          <div className="pt-2 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-500 font-medium">
              Don Yeyo S.A. © 2026 | Inocuidad y Calidad
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
