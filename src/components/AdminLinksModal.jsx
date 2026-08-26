import React, { useState, useEffect } from 'react';
import { fetchUsersList } from '../services/authService';
import { buildUserAccessUrl } from '../utils/tokenGenerator';
import { X, ExternalLink, Copy, Check, KeyRound } from 'lucide-react';

export default function AdminLinksModal({ isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsersList().then(setUsers);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (url, index) => {
    navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div id="card-admin-modal" className="glass-panel w-full max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-3xl border border-white/20 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <KeyRound size={22} className="text-yellow-400" />
            <h3 className="text-lg font-bold text-white">Generador de Enlaces Únicos (RRHH / Calidad)</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-xs text-gray-300 mb-4">
          Aquí puedes probar la aplicación accediendo con los enlaces únicos generados a partir de la frase semilla y los datos de cada colaborador:
        </p>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {users.map((user, idx) => {
            const url = buildUserAccessUrl(window.location.origin, user.legajo, user.apellido, user.nombre);
            const isCopied = copiedIndex === idx;

            return (
              <div key={user.legajo || idx} className="glass-card p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">
                    {user.nombre} {user.apellido} <span className="text-blue-300 font-normal">({user.legajo})</span>
                  </div>
                  <div className="text-gray-400 truncate font-mono text-[11px] mt-0.5">
                    {url}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopy(url, idx)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Copiar Enlace"
                  >
                    {isCopied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition-colors"
                    title="Abrir en nueva pestaña"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 mt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
