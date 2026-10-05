import React, { useState, useMemo } from 'react';
import { Search, Trophy, Medal, Clock, CheckCircle2, Award, UserCheck, Flame } from 'lucide-react';

export default function ClassificationTable({
  participants = [],
  topCount = 30,
  showPodiumInList = false
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // ALL | QUALIFIED | REST

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // Filtrado de participantes
  const filteredList = useMemo(() => {
    let list = participants;
    if (!showPodiumInList) {
      list = list.filter(p => p.rank > 3);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(p =>
        String(p.legajo || '').toLowerCase().includes(term) ||
        String(p.nombre || '').toLowerCase().includes(term) ||
        String(p.apellido || '').toLowerCase().includes(term)
      );
    }

    if (filterMode === 'QUALIFIED') {
      list = list.filter(p => p.rank <= topCount);
    } else if (filterMode === 'REST') {
      list = list.filter(p => p.rank > topCount);
    }

    return list;
  }, [participants, searchTerm, filterMode, topCount, showPodiumInList]);

  return (
    <div className="w-full max-w-4xl mx-auto py-6 sm:py-8 px-2 sm:px-4">
      {/* Barra de Filtros y Búsqueda */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl mb-8 border border-white/20 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Buscador */}
        <div className="relative w-full sm:w-80">
          <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por legajo o nombre..."
            className="w-full pl-11 pr-4 py-3.5 sm:py-4 rounded-xl bg-slate-900/60 border border-slate-700 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors shadow-inner"
          />
        </div>

        {/* Tabs de Filtro */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-4 sm:px-5 py-3 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterMode === 'ALL'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            Todos ({participants.length})
          </button>
          <button
            onClick={() => setFilterMode('QUALIFIED')}
            className={`px-4 sm:px-5 py-3 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              filterMode === 'QUALIFIED'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            <Flame size={15} className="text-yellow-300" />
            <span>Top {topCount} Clasificados</span>
          </button>
          <button
            onClick={() => setFilterMode('REST')}
            className={`px-4 sm:px-5 py-3 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterMode === 'REST'
                ? 'bg-slate-700 text-white shadow-md'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            Restantes
          </button>
        </div>
      </div>

      {/* Contenedor de la Lista Gamer */}
      <div className="glass-card rounded-2xl border border-white/20 shadow-2xl overflow-hidden backdrop-blur-md">
        {/* Cabecera de la Tabla */}
        <div className="grid grid-cols-12 gap-2 px-5 sm:px-8 py-4 sm:py-5 bg-slate-900/90 border-b border-white/10 text-xs sm:text-sm font-black text-slate-300 uppercase tracking-wider text-left">
          <div className="col-span-2 sm:col-span-1 text-center">Pos.</div>
          <div className="col-span-6 sm:col-span-6">Colaborador / Legajo</div>
          <div className="col-span-2 sm:col-span-3 text-right">Puntaje</div>
          <div className="col-span-2 sm:col-span-2 text-right">Tiempo</div>
        </div>

        {/* Filas de Participantes */}
        <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto">
          {filteredList.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm font-medium">
              No se encontraron participantes que coincidan con la búsqueda.
            </div>
          ) : (
            filteredList.map((p, idx) => {
              const isTopQualified = p.rank <= topCount;
              const isBoundary = p.rank === topCount;

              return (
                <React.Fragment key={p.legajo || idx}>
                  <div
                    className={`grid grid-cols-12 gap-2 px-5 sm:px-8 py-4 sm:py-5 items-center text-xs sm:text-sm transition-colors ${
                      isTopQualified
                        ? 'hover:bg-white/10 bg-slate-900/30'
                        : 'hover:bg-white/5 bg-slate-950/40 opacity-75'
                    }`}
                  >
                    {/* Posición / Rank con Badge Gamer */}
                    <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                      <span
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm ${
                          p.rank === 1
                            ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/30'
                            : p.rank === 2
                            ? 'bg-slate-300 text-slate-950 shadow-md shadow-slate-300/30'
                            : p.rank === 3
                            ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                            : isTopQualified
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        #{p.rank}
                      </span>
                    </div>

                    {/* Colaborador / Legajo */}
                    <div className="col-span-6 sm:col-span-6 flex flex-col justify-center min-w-0 pr-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-bold text-white truncate text-xs sm:text-base">
                          {p.nombre} {p.apellido}
                        </span>
                        {isTopQualified && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase hidden sm:inline-block">
                            Clasificado
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] sm:text-xs text-slate-400 font-mono mt-0.5">
                        Legajo: {p.legajo}
                      </span>
                    </div>

                    {/* Puntaje */}
                    <div className="col-span-2 sm:col-span-3 text-right">
                      <span className="font-black text-yellow-300 text-sm sm:text-lg">
                        {p.score || 0}
                      </span>
                      <span className="text-[10px] sm:text-xs text-slate-400 block font-normal">
                        pts
                      </span>
                    </div>

                    {/* Tiempo */}
                    <div className="col-span-2 sm:col-span-2 text-right">
                      <span className="font-semibold text-slate-200 text-xs sm:text-sm flex items-center justify-end gap-1.5">
                        <Clock size={13} className="text-slate-400 hidden sm:inline" />
                        {formatTime(p.totalTime)}
                      </span>
                      <span className="text-[11px] sm:text-xs text-emerald-400 block mt-0.5 font-medium">
                        {p.correctCount || 0} aciertos
                      </span>
                    </div>
                  </div>

                  {/* Línea Divisoria de Corte de Clasificación */}
                  {isBoundary && filterMode === 'ALL' && (
                    <div className="bg-gradient-to-r from-red-600 via-amber-500 to-red-600 px-6 py-2.5 text-center text-white text-xs sm:text-sm font-black tracking-wide flex items-center justify-center gap-2.5 shadow-inner">
                      <Flame size={16} className="animate-bounce" />
                      <span>⚡ LÍNEA DE CORTE: TOP {topCount} CLASIFICADOS OFICIALES ⚡</span>
                      <Flame size={16} className="animate-bounce" />
                    </div>
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
