import dotenv from 'dotenv';
dotenv.config();

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { handler as adminAuthHandler } from './netlify/functions/admin-auth.js';
import { handler as authHandler } from './netlify/functions/auth.js';
import { handler as classificationHandler } from './netlify/functions/classification.js';
import { handler as configHandler } from './netlify/functions/config.js';
import { handler as importParticipantsHandler } from './netlify/functions/import-participants.js';
import { handler as questionsHandler } from './netlify/functions/questions.js';
import { handler as submitAnswerHandler } from './netlify/functions/submit-answer.js';
import { handler as triviaApiHandler } from './netlify/functions/trivia-api.js';
import { handler as participantsHandler } from './netlify/functions/participants.js';

const apiHandlers = {
  'admin-auth': adminAuthHandler,
  'auth': authHandler,
  'classification': classificationHandler,
  'config': configHandler,
  'import-participants': importParticipantsHandler,
  'participants': participantsHandler,
  'questions': questionsHandler,
  'submit-answer': submitAnswerHandler,
  'trivia-api': triviaApiHandler
};

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Poblar process.env para que las serverless functions y adaptadores (Supabase / Sheets) lean las variables
  Object.assign(process.env, env);

  const devAdminUser = env.ADMIN_USER || env.VITE_ADMIN_USER || 'inocuadmin';
  const devAdminPass = env.ADMIN_PASSWORD || env.VITE_ADMIN_PASSWORD || 'superpassword123';

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'vite-dev-api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith('/api/')) {
              const parsedUrl = new URL(req.url, 'http://localhost:3000');
              const endpoint = parsedUrl.pathname.replace(/^\/api\//, '').split('/')[0];
              const handler = apiHandlers[endpoint];

              if (handler) {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', async () => {
                  try {
                    const event = {
                      httpMethod: req.method,
                      headers: req.headers,
                      queryStringParameters: Object.fromEntries(parsedUrl.searchParams.entries()),
                      body: body || null
                    };
                    const response = await handler(event, {});
                    if (response.headers) {
                      for (const [k, v] of Object.entries(response.headers)) {
                        res.setHeader(k, v);
                      }
                    }
                    res.statusCode = response.statusCode || 200;
                    res.end(response.body || '');
                  } catch (err) {
                    console.error(`[Vite Dev API] Error en /api/${endpoint}:`, err);
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: err.message }));
                  }
                });
                return;
              }
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

