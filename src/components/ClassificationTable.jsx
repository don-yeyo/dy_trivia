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
            placeholder="Buscar participante..."
            className="w-full pl-11 pr-4 py-3.5 sm:py-4 rounded-xl bg-slate-900/60 border border-slate-700 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-colors shadow-inner"
          />
        </div>

        {/* Tabs de Filtro */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`flex-1 sm:flex-none px-3 sm:px-5 py-2.5 sm:py-3 min-h-[40px] sm:min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap text-center ${
              filterMode === 'ALL'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            Todos ({participants.length})
          </button>
          <button
            onClick={() => setFilterMode('QUALIFIED')}
            className={`flex-1 sm:flex-none px-3 sm:px-5 py-2.5 sm:py-3 min-h-[40px] sm:min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              filterMode === 'QUALIFIED'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            <Flame size={14} className="text-yellow-300" />
            <span className="hidden sm:inline">Top {topCount} Clasificados</span>
            <span className="sm:hidden">Top {topCount}</span>
          </button>
          <button
            onClick={() => setFilterMode('REST')}
            className={`flex-1 sm:flex-none px-3 sm:px-5 py-2.5 sm:py-3 min-h-[40px] sm:min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap text-center ${
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
        {/* Cabecera de la Tabla (EXCLUSIVA DESKTOP) */}
        <div className="hidden sm:grid sm:grid-cols-12 sm:gap-2 px-8 py-5 bg-slate-900/90 border-b border-white/10 text-sm font-black text-slate-300 uppercase tracking-wider text-left">
          <div className="sm:col-span-1 text-center">Pos.</div>
          <div className="sm:col-span-6">Colaborador</div>
          <div className="sm:col-span-3 text-right">Puntaje</div>
          <div className="sm:col-span-2 text-right">Tiempo</div>
        </div>

        {/* Filas de Participantes */}
        <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto">
          {filteredList.length === 0 ? (
            <div className="p-8 sm:p-10 text-center text-slate-400 text-xs sm:text-sm font-medium">
              No se encontraron participantes que coincidan con la búsqueda.
            </div>
          ) : (
            filteredList.map((p, idx) => {
              const isTopQualified = p.rank <= topCount;

              return (
                <React.Fragment key={p.legajo || idx}>
                  {/* ========================================================= */}
                  {/* VISTA MOBILE: Fila Flex Compacta, Clara y Sin Desbordes   */}
                  {/* ========================================================= */}
                  <div
                    className={`sm:hidden p-3.5 flex items-center justify-between gap-2.5 transition-colors ${
                      isTopQualified
                        ? 'bg-slate-900/40 hover:bg-white/10'
                        : 'bg-slate-950/40 hover:bg-white/5 opacity-80'
                    }`}
                  >
                    {/* Posición con Badge */}
                    <div className="shrink-0">
                      <span
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
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

                    {/* Nombre y Sector */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-xs truncate">
                          {p.nombre} {p.apellido}
                        </span>
                        {isTopQualified && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-black uppercase">
                            Top
                          </span>
                        )}
                        {p.isPartial && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[9px] font-black uppercase">
                            Parcial {p.answersCount ? `(${p.answersCount}/${p.totalQuestions || 10})` : ''}
                          </span>
                        )}
                        {!p.hasPlayed && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[9px] font-bold uppercase">
                            Sin jugar
                          </span>
                        )}
                      </div>
                      {p.sector && (
                        <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                          {p.sector}
                        </span>
                      )}
                    </div>

                    {/* Puntaje y Tiempo */}
                    <div className="text-right shrink-0">
                      <div className="font-black text-yellow-300 text-xs">
                        {p.hasPlayed ? (
                          <>{p.score || 0} <span className="text-[9px] font-bold text-yellow-400/70">pts</span></>
                        ) : (
                          <span className="text-slate-500 font-normal">-</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-300 font-mono flex items-center justify-end gap-1 mt-0.5">
                        {p.hasPlayed ? (
                          <>
                            <Clock size={10} className="text-slate-400" />
                            <span>{formatTime(p.totalTime)}</span>
                          </>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ========================================================= */}
                  {/* VISTA DESKTOP: Grid de 12 Columnas [100% INTACTA]        */}
                  {/* ========================================================= */}
                  <div
                    className={`hidden sm:grid sm:grid-cols-12 sm:gap-2 px-8 py-5 items-center text-sm transition-colors ${
                      isTopQualified
                        ? 'hover:bg-white/10 bg-slate-900/30'
                        : 'hover:bg-white/5 bg-slate-950/40 opacity-75'
                    }`}
                  >
                    {/* Posición / Rank con Badge Gamer */}
                    <div className="sm:col-span-1 flex items-center justify-center">
                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                          p.rank === 1 && p.hasPlayed
                            ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/30'
                            : p.rank === 2 && p.hasPlayed
                            ? 'bg-slate-300 text-slate-950 shadow-md shadow-slate-300/30'
                            : p.rank === 3 && p.hasPlayed
                            ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                            : isTopQualified
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        #{p.rank}
                      </span>
                    </div>

                    {/* Colaborador */}
                    <div className="sm:col-span-6 flex flex-col justify-center min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white truncate text-base">
                          {p.nombre} {p.apellido}
                        </span>
                        {isTopQualified && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase inline-block">
                            Clasificado
                          </span>
                        )}
                        {p.isPartial && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase inline-block">
                            Parcial {p.answersCount ? `(${p.answersCount}/${p.totalQuestions || 10})` : ''}
                          </span>
                        )}
                        {!p.hasPlayed && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold uppercase inline-block">
                            Sin jugar
                          </span>
                        )}
                      </div>
                      {p.sector && (
                        <span className="text-xs text-slate-400 mt-0.5 truncate">
                          {p.sector}
                        </span>
                      )}
                    </div>

                    {/* Puntaje */}
                    <div className="sm:col-span-3 text-right">
                      {p.hasPlayed ? (
                        <>
                          <span className="font-black text-yellow-300 text-lg">
                            {p.score || 0}
                          </span>
                          <span className="text-xs text-slate-400 block font-normal">
                            pts
                          </span>
                        </>
                      ) : (
                        <span className="font-semibold text-slate-500 text-base">
                          -
                        </span>
                      )}
                    </div>

                    {/* Tiempo */}
                    <div className="sm:col-span-2 text-right">
                      {p.hasPlayed ? (
                        <>
                          <span className="font-semibold text-slate-200 text-sm flex items-center justify-end gap-1.5">
                            <Clock size={13} className="text-slate-400 inline" />
                            {formatTime(p.totalTime)}
                          </span>
                          <span className="text-xs text-emerald-400 block mt-0.5 font-medium">
                            {p.correctCount || 0} aciertos
                          </span>
                        </>
                      ) : (
                        <span className="font-semibold text-slate-500 text-sm">
                          -
                        </span>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
