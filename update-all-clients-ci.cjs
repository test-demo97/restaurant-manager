#!/usr/bin/env node

/**
 * Script per aggiornare automaticamente tutti i repo dei clienti
 * VERSIONE CI - Usa variabili d'ambiente per le credenziali
 *
 * Uso: node update-all-clients-ci.js
 *
 * Variabili d'ambiente richieste:
 * - ADMIN_SUPABASE_URL
 * - ADMIN_SUPABASE_ANON_KEY
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ============================================
// CONFIGURAZIONE (da variabili d'ambiente)
// ============================================
const ADMIN_SUPABASE_URL = process.env.ADMIN_SUPABASE_URL;
const ADMIN_SUPABASE_ANON_KEY = process.env.ADMIN_SUPABASE_ANON_KEY;
const UPSTREAM_REPO = 'https://github.com/andreafabbri97/restaurant-manager.git';
const CLIENTS_FOLDER = path.join(__dirname, 'clients-temp');
// ============================================

function log(message) {
  console.log(message);
}

function runCommand(command, cwd = process.cwd(), silent = false) {
  try {
    const result = execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function fetchLicenses() {
  log('\n📋 Recupero licenze dal pannello admin...');

  const response = await fetch(`${ADMIN_SUPABASE_URL}/rest/v1/licenses?select=*`, {
    headers: {
      'apikey': ADMIN_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${ADMIN_SUPABASE_ANON_KEY}`,
    }
  });

  if (!response.ok) {
    throw new Error(`Errore fetch licenze: ${response.status} ${response.statusText}`);
  }

  const licenses = await response.json();
  log(`   Trovate ${licenses.length} licenze totali`);

  return licenses;
}

function filterUpdatableClients(licenses) {
  return licenses.filter(license => {
    if (license.status !== 'active') {
      log(`⚠️ ${license.client_id}: stato ${license.status}, saltato`);
      return false;
    }
    if (!license.github_repo) {
      log(`⚠️ ${license.client_id}: nessun github_repo configurato, saltato`);
      return false;
    }
    if (!license.github_token) {
      log(`⚠️ ${license.client_id}: nessun github_token configurato, saltato`);
      return false;
    }
    return true;
  });
}

function getAuthenticatedRepoUrl(license) {
  let repoUrl = license.github_repo;
  if (!repoUrl.startsWith('http')) {
    repoUrl = `https://github.com/${repoUrl}`;
  }
  if (!repoUrl.endsWith('.git')) {
    repoUrl += '.git';
  }
  const token = license.github_token;
  return repoUrl.replace('https://', `https://${token}@`);
}

async function updateClient(license) {
  const clientId = license.client_id;
  const clientFolder = path.join(CLIENTS_FOLDER, clientId);

  log(`\n${'='.repeat(50)}`);
  log(`🔄 Aggiornamento: ${license.client_name} (${clientId})`);
  log('='.repeat(50));

  const authenticatedUrl = getAuthenticatedRepoUrl(license);

  try {
    if (!fs.existsSync(CLIENTS_FOLDER)) {
      fs.mkdirSync(CLIENTS_FOLDER, { recursive: true });
    }

    if (!fs.existsSync(clientFolder)) {
      log('[1/5] Clonazione repo...');
      const cloneResult = runCommand(`git clone ${authenticatedUrl} ${clientId}`, CLIENTS_FOLDER, true);
      if (!cloneResult.success) {
        throw new Error(`Clone fallito: ${cloneResult.error}`);
      }
      log('✓ Repo clonato');
    } else {
      log('[1/5] Repo già presente, aggiornamento origin...');
      runCommand(`git remote set-url origin ${authenticatedUrl}`, clientFolder, true);
      log('✓ Origin aggiornato');
    }

    log('[2/5] Configurazione upstream...');
    const remotes = runCommand('git remote -v', clientFolder, true);
    if (!remotes.output?.includes('upstream')) {
      runCommand(`git remote add upstream ${UPSTREAM_REPO}`, clientFolder, true);
    } else {
      runCommand(`git remote set-url upstream ${UPSTREAM_REPO}`, clientFolder, true);
    }
    log('✓ Upstream configurato');

    log('[3/5] Fetch da upstream...');
    const fetchResult = runCommand('git fetch upstream', clientFolder, true);
    if (!fetchResult.success) {
      throw new Error(`Fetch fallito: ${fetchResult.error}`);
    }
    log('✓ Fetch completato');

    log('[4/5] Merge upstream/main...');
    const mergeResult = runCommand('git merge upstream/main --no-edit -X theirs', clientFolder, true);
    if (!mergeResult.success) {
      log('⚠️ Conflitti, risoluzione automatica...');
      runCommand('git checkout --theirs .', clientFolder, true);
      runCommand('git add .', clientFolder, true);
      runCommand('git commit -m "Merge upstream (auto-resolved)"', clientFolder, true);
    }
    log('✓ Merge completato');

    log('[5/5] Push su origin...');
    const pushResult = runCommand('git push origin main', clientFolder, true);
    if (!pushResult.success) {
      throw new Error(`Push fallito: ${pushResult.error}`);
    }
    log('✓ Push completato');

    // Deploy su GitHub Pages
    if (fs.existsSync(path.join(clientFolder, 'package.json'))) {
      log('\n📦 Deploy su GitHub Pages...');
      log('   npm install...');
      runCommand('npm install', clientFolder, true);
      log('   npm run deploy...');
      const deployResult = runCommand('npm run deploy', clientFolder, true);
      if (deployResult.success) {
        log('✓ Deploy completato!');
      } else {
        log('⚠️ Deploy fallito');
      }
    }

    return { success: true, clientId };

  } catch (error) {
    log(`✗ Errore: ${error.message}`);
    return { success: false, clientId, error: error.message };
  }
}

async function main() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════╗');
  log('║  AGGIORNAMENTO AUTOMATICO CLIENTI (CI)                 ║');
  log('╚════════════════════════════════════════════════════════╝');

  try {
    if (!ADMIN_SUPABASE_URL || !ADMIN_SUPABASE_ANON_KEY) {
      log('\n⚠️ ERRORE: Variabili d\'ambiente mancanti!');
      log('   Richieste: ADMIN_SUPABASE_URL, ADMIN_SUPABASE_ANON_KEY');
      process.exit(1);
    }

    const licenses = await fetchLicenses();

    log('\n🔍 Filtro clienti aggiornabili...');
    const updatableClients = filterUpdatableClients(licenses);

    if (updatableClients.length === 0) {
      log('\n⚠️ Nessun cliente da aggiornare.');
      return;
    }

    log(`\n✓ ${updatableClients.length} clienti da aggiornare:`);
    updatableClients.forEach(c => log(`   - ${c.client_name} (${c.client_id})`));

    const results = [];
    for (const client of updatableClients) {
      const result = await updateClient(client);
      results.push(result);
    }

    log('\n\n' + '═'.repeat(50));
    log('📊 RIEPILOGO');
    log('═'.repeat(50));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    log(`\n✓ Aggiornati con successo: ${successful.length}`);
    successful.forEach(r => log(`   - ${r.clientId}`));

    if (failed.length > 0) {
      log(`\n✗ Falliti: ${failed.length}`);
      failed.forEach(r => log(`   - ${r.clientId}: ${r.error}`));
    }

    log('\n✅ Operazione completata!\n');

    // Pulizia
    if (fs.existsSync(CLIENTS_FOLDER)) {
      fs.rmSync(CLIENTS_FOLDER, { recursive: true, force: true });
      log('🧹 File temporanei eliminati');
    }

  } catch (error) {
    log(`\n✗ Errore fatale: ${error.message}`);
    process.exit(1);
  }
}

main();
