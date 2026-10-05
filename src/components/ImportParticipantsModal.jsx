import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  Upload,
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  FileSpreadsheet,
  HelpCircle,
  Hash
} from 'lucide-react';
import { getStoredAdminToken } from '../services/adminService';

export default function ImportParticipantsModal({ isOpen, onClose, onSuccess }) {
  const [csvText, setCsvText] = useState('');
  const [parsedParticipants, setParsedParticipants] = useState([]);
  const [duplicatesCount, setDuplicatesCount] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [parseError, setParseError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  // Analiza y mapea el texto CSV ingresado
  const handleParseCsv = (text) => {
    setParseError('');
    setSuccessMessage('');
    setCsvText(text);

    if (!text || !text.trim()) {
      setParsedParticipants([]);
      setDuplicatesCount(0);
      setTotalRows(0);
      return;
    }

    try {
      const firstLine = text.split('\n')[0] || '';
      const delimiter = firstLine.includes(';') ? ';' : ',';

      const result = Papa.parse(text, {
        header: true,
        delimiter,
        skipEmptyLines: true
      });

      if (!result.data || result.data.length === 0) {
        setParseError('No se encontraron filas con datos en el texto proporcionado.');
        return;
      }

      const list = [];
      const seenLegajos = new Set();
      let duplicates = 0;

      result.data.forEach((row) => {
        const rawLegajo = row['Leg'] || row['legajo'] || row['LEGAJO'] || row['Legajo'] || '';
        const legajo = String(rawLegajo).trim();
        if (!legajo) return;

        if (seenLegajos.has(legajo)) {
          duplicates++;
          return;
        }
        seenLegajos.add(legajo);

        const fullNombre = String(row['Apellido y Nombre'] || row['apellido_y_nombre'] || '').trim();
        let apellido = '';
        let nombre = '';

        if (fullNombre.includes(',')) {
          const parts = fullNombre.split(',');
          apellido = parts[0].trim();
          nombre = parts.slice(1).join(',').trim();
        } else {
          apellido = String(row['apellido'] || fullNombre).trim();
          nombre = String(row['nombre'] || '').trim();
        }

        const documento = String(row['Nro. de Documento'] || row['documento'] || row['DNI'] || row['dni'] || '').trim();
        const sector = String(row['Sector'] || row['sector'] || '').trim();
        const telefono = String(row['Telefono'] || row['telefono'] || '').trim();
        const email = String(row['E-mail'] || row['email'] || row['EMAIL'] || '').trim();

        list.push({
          legajo,
          apellido,
          nombre,
          documento,
          sector,
          telefono,
          email
        });
      });

      setParsedParticipants(list);
      setDuplicatesCount(duplicates);
      setTotalRows(result.data.length);
    } catch (err) {
      setParseError(`Error al procesar el archivo CSV: ${err.message}`);
    }
  };

  // Manejador de carga de archivo .csv desde el disco
  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      handleParseCsv(content);
    };
    reader.readAsText(file, 'utf-8');
  };

  // Envío al backend / Netlify Function para impactar en Google Sheets
  const handleExecuteImport = async () => {
    if (parsedParticipants.length === 0) {
      setParseError('No hay participantes válidos para importar.');
      return;
    }

    setIsImporting(true);
    setParseError('');
    setSuccessMessage('');

    const token = getStoredAdminToken();

    try {
      const res = await fetch('/api/import-participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          participantes: parsedParticipants,
          modo: 'REPLACE'
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage(`¡Importación exitosa! Se cargaron ${data.totalImportados} participantes en la pestaña "Participantes" de Google Sheets.`);
        if (onSuccess) onSuccess(data);
      } else {
        setParseError(data.error || 'Ocurrió un error al procesar la importación en el servidor.');
      }
    } catch (err) {
      setParseError(`Error de conexión con el servidor: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-casual-in overflow-y-auto">
      <div className="casual-card w-full max-w-4xl p-6 sm:p-8 rounded-3xl border-2 border-slate-200 shadow-2xl relative my-auto max-h-[90vh] flex flex-col overflow-hidden bg-white text-slate-900">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                Importar Nómina de Participantes
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1.5">
                <FileSpreadsheet size={14} className="text-emerald-600" />
                Actualiza masivamente la pestaña <strong>"Participantes"</strong> en Google Sheets
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido Scrolleable */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          {/* Mensajes de Estado */}
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-800 text-sm font-bold flex items-center gap-3 shadow-sm animate-casual-in">
              <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {parseError && (
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-sm font-bold flex items-center gap-3 shadow-sm">
              <AlertCircle size={22} className="text-rose-600 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Opciones de Carga: Archivo o Textarea */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Upload size={14} className="text-slate-600" />
                1. Pegar Contenido CSV o Seleccionar Archivo
              </label>

              {/* Botón File Picker */}
              <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer transition-colors shadow-sm">
                <Upload size={14} className="text-slate-600" />
                <span>Cargar archivo .csv</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => handleParseCsv(e.target.value)}
              placeholder="Pega aquí el contenido de legajos.csv (delimitado por ; o ,)&#10;Ejemplo:&#10;Leg;Apellido y Nombre;Nro. de Documento;Sector;Telefono;E-mail&#10;1;MINGUEZ , VICTOR;23398678;GCIA.OPER-EXPEDICION; ;victorminguez@live.com"
              className="w-full p-3 rounded-xl bg-white border-2 border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-red-600 transition-colors shadow-inner"
            />

            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
              <span>Soporta delimitadores <code>;</code> o <code>,</code> y separa automáticamente apellido y nombre.</span>
              {totalRows > 0 && (
                <span className="font-bold text-slate-700">
                  {totalRows} filas detectadas • {parsedParticipants.length} válidas • {duplicatesCount} duplicados
                </span>
              )}
            </div>
          </div>

          {/* Vista Previa de Mapeo */}
          {parsedParticipants.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-slate-600" />
                  2. Vista Previa de Registros a Insertar ({parsedParticipants.length} colaboradores)
                </h4>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Sin Duplicados por Legajo
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead className="bg-slate-900 text-white font-black text-[11px] uppercase sticky top-0">
                      <tr>
                        <th className="p-2.5 text-center">Legajo</th>
                        <th className="p-2.5">Apellido</th>
                        <th className="p-2.5">Nombre</th>
                        <th className="p-2.5">Documento</th>
                        <th className="p-2.5">Sector</th>
                        <th className="p-2.5">Teléfono</th>
                        <th className="p-2.5">E-mail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {parsedParticipants.slice(0, 15).map((p, idx) => (
                        <tr key={p.legajo} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                          <td className="p-2 text-center font-black text-slate-950">{p.legajo}</td>
                          <td className="p-2 font-bold">{p.apellido}</td>
                          <td className="p-2">{p.nombre}</td>
                          <td className="p-2 font-mono text-slate-600">{p.documento || '-'}</td>
                          <td className="p-2 text-[11px] text-slate-600">{p.sector}</td>
                          <td className="p-2 text-[11px] text-slate-600">{p.telefono || '-'}</td>
                          <td className="p-2 text-[11px] text-slate-600 truncate max-w-[150px]">{p.email || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {parsedParticipants.length > 15 && (
                  <div className="p-2 bg-slate-100 text-center text-[11px] text-slate-500 font-semibold border-t border-slate-200">
                    Mostrando los primeros 15 registros de {parsedParticipants.length} totales.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal con Botones */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            type="button"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleExecuteImport}
            disabled={isImporting || parsedParticipants.length === 0}
            type="button"
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-red-600/30 flex items-center justify-center gap-2.5 cursor-pointer transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isImporting ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Importando a Google Sheets...</span>
              </>
            ) : (
              <>
                <Users size={18} />
                <span>Importar {parsedParticipants.length} Colaboradores</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
