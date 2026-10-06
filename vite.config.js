import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devAdminUser = env.ADMIN_USER || env.VITE_ADMIN_USER || 'admin';
  const devAdminPass = env.ADMIN_PASSWORD || env.VITE_ADMIN_PASSWORD || 'admin';
  const appsScriptEndpoint = env.GOOGLE_APPS_SCRIPT_ENDPOINT || env.VITE_GOOGLE_APPS_SCRIPT_ENDPOINT || '';

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'vite-dev-api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            // Manejador en desarrollo para POST /api/admin-auth
            if (req.url === '/api/admin-auth' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                try {
                  const data = JSON.parse(body || '{}');
                  const username = String(data.username || '').trim();
                  const password = String(data.password || '').trim();

                  const isValid =
                    (username === devAdminUser && password === devAdminPass) ||
                    (username === 'admin' && (password === 'admin' || password === 'dev'));

                  res.setHeader('Content-Type', 'application/json');
                  if (isValid) {
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      success: true,
                      token: `dev_token_${Date.now()}`,
                      username: username
                    }));
                  } else {
                    res.statusCode = 401;
                    res.end(JSON.stringify({
                      error: 'Usuario o contraseña incorrectos'
                    }));
                  }
                } catch (e) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Formato JSON inválido' }));
                }
              });
              return;
            }

            // Manejador en desarrollo para POST /api/config
            if (req.url === '/api/config' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const data = JSON.parse(body || '{}');
                  const sheetUpdates = {};
                  if (data.activePhase !== undefined) sheetUpdates['FASE_ACTIVA'] = String(data.activePhase);
                  if (data.isPhaseClosed !== undefined) sheetUpdates['FASE_CERRADA'] = data.isPhaseClosed ? 'TRUE' : 'FALSE';
                  if (data.isClassificationPublished !== undefined) {
                    sheetUpdates['CLASIFICACION_PUBLICADA'] = data.isClassificationPublished ? 'TRUE' : 'FALSE';
                    sheetUpdates['FECHA_PUBLICACION_CLASIFICACION'] = data.isClassificationPublished ? new Date().toISOString() : '';
                  }
                  if (data.classificationTopCount !== undefined) sheetUpdates['CLASIFICACION_TOP_COUNT'] = String(data.classificationTopCount);
                  if (data.timePerQuestion !== undefined) sheetUpdates['TIEMPO_POR_PREGUNTA'] = String(data.timePerQuestion);
                  if (data.shuffleQuestions !== undefined) sheetUpdates['MEZCLAR_PREGUNTAS'] = data.shuffleQuestions ? 'TRUE' : 'FALSE';
                  if (data.showPartialInTable !== undefined) sheetUpdates['MOSTRAR_PARCIALES_EN_TABLA'] = data.showPartialInTable ? 'TRUE' : 'FALSE';
                  if (data.showUnansweredInTable !== undefined) sheetUpdates['MOSTRAR_NO_RESPONDIDOS_EN_TABLA'] = data.showUnansweredInTable ? 'TRUE' : 'FALSE';
                  if (data.hideSummaryAnswered !== undefined) sheetUpdates['OCULTAR_RESUMEN_RESPONDIDAS'] = data.hideSummaryAnswered ? 'TRUE' : 'FALSE';
                  if (data.hideSummaryTime !== undefined) sheetUpdates['OCULTAR_RESUMEN_TIEMPO'] = data.hideSummaryTime ? 'TRUE' : 'FALSE';

                  let synced = false;
                  if (appsScriptEndpoint && Object.keys(sheetUpdates).length > 0) {
                    try {
                      await fetch(appsScriptEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'UPDATE_CONFIG', updates: sheetUpdates })
                      });
                      synced = true;
                    } catch (syncErr) {
                      console.warn('[Vite Dev API] Error sincronizando con Google Apps Script:', syncErr.message);
                    }
                  }

                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 200;
                  res.end(JSON.stringify({
                    success: true,
                    syncedWithSheet: synced,
                    config: data
                  }));
                } catch (e) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Error procesando configuración en modo dev' }));
                }
              });
              return;
            }

            next();
          });
        }
      }
    ],
    define: {
      __DEV_ADMIN_USER__: command === 'serve' ? JSON.stringify(devAdminUser) : '""',
      __DEV_ADMIN_PASS__: command === 'serve' ? JSON.stringify(devAdminPass) : '""'
    },
    server: {
      port: 3000,
      open: false
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            excel: ['xlsx'],
            icons: ['lucide-react']
          }
        }
      }
    }
  };
});

