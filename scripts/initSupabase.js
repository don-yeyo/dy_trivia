#!/usr/bin/env node
// ==============================================================================
// INICIALIZADOR DE ESQUEMA EN SUPABASE (CLI)
// Don Yeyo S.A. | Trivia Inocuidad 2026
// ==============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { checkOrInitSchema } from '../netlify/functions/_db/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const envPath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

console.log('\n🔧 Verificando / Inicializando esquema en Supabase...');
checkOrInitSchema()
  .then(ok => {
    if (ok) {
      console.log('✅ Esquema verificado y listo.');
      process.exit(0);
    } else {
      console.log('⚠️ Verifique la advertencia anterior para crear las tablas en Supabase.');
      process.exit(0);
    }
  })
  .catch(err => {
    console.error('❌ Error verificando esquema:', err);
    process.exit(1);
  });
