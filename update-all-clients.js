#!/usr/bin/env node

/**
 * Script per aggiornare automaticamente tutti i repo dei clienti
 *
 * Uso: node update-all-clients.js
 *
 * Requisiti:
 * - Node.js
 * - Git installato
 * - Le licenze devono avere github_repo e github_token configurati
 *
 * Cosa fa:
 * 1. Legge tutte le licenze dal Supabase admin
 * 2. Per ogni cliente attivo con repo configurato:
 *    - Clona il repo se non esiste localmente
 *    - Configura upstream al repo principale
 *    - Fetch upstream, merge, push
 *    - Esegue npm install e deploy
 */

const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// ============================================
// CONFIGURAZIONE
// ============================================
const ADMIN_SUPABASE_URL = 'https://jhyidrhckhoavlmmmlwq.supabase.co';
const ADMIN_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoeWlkcmhja2hvYXZsbW1tbHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODkzMzIsImV4cCI6MjA4MTU2NTMzMn0.8l7i5EJiF_xJZSO__y83S7kw-bDq2PVH24sl4f5ESyM';
const UPSTREAM_REPO = 'https://github.com/andreafabbri97/restaurant-manager.git';
const CLIENTS_FOLDER = path.join(__dirname, '..', 'clients'); // Cartella dove clonare i repo clienti (fuori dal repo)
// ============================================

// Colori per console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`${colors.cyan}[${step}]${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

// Esegue comando e ritorna output
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

// Fetch licenze dal Supabase admin
async function fetchLicenses() {
  log('\n📋 Recupero licenze dal pannello admin...', 'blue');

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
  log(`   Trovate ${licenses.length} licenze totali`, 'cyan');

  return licenses;
}

// Filtra clienti aggiornabili
function filterUpdatableClients(licenses) {
  return licenses.filter(license => {
    // Deve essere attivo
    if (license.status !== 'active') {
      logWarning(`${license.client_id}: stato ${license.status}, saltato`);
      return false;
    }

    // Deve avere github_repo
    if (!license.github_repo) {
      logWarning(`${license.client_id}: nessun github_repo configurato, saltato`);
      return false;
    }

    // Deve avere github_token
    if (!license.github_token) {
      logWarning(`${license.client_id}: nessun github_token configurato, saltato`);
      return false;
    }

    return true;
  });
}

// Costruisce URL repo con token per autenticazione
function getAuthenticatedRepoUrl(license) {
  // Se il repo inizia con https://github.com/
  let repoUrl = license.github_repo;
  if (!repoUrl.startsWith('http')) {
    repoUrl = `https://github.com/${repoUrl}`;
  }
  if (!repoUrl.endsWith('.git')) {
    repoUrl += '.git';
  }

  // Inserisci il token nell'URL per autenticazione
  // https://TOKEN@github.com/user/repo.git
  const token = license.github_token;
  const authenticatedUrl = repoUrl.replace('https://', `https://${token}@`);

  return authenticatedUrl;
}

// Aggiorna singolo cliente
async function updateClient(license) {
  const clientId = license.client_id;
  const clientFolder = path.join(CLIENTS_FOLDER, clientId);

  log(`\n${'='.repeat(50)}`, 'blue');
  log(`🔄 Aggiornamento: ${license.client_name} (${clientId})`, 'blue');
  log('='.repeat(50), 'blue');

  const authenticatedUrl = getAuthenticatedRepoUrl(license);
  const displayUrl = license.github_repo; // Per log senza token

  try {
    // Crea cartella clients se non esiste
    if (!fs.existsSync(CLIENTS_FOLDER)) {
      fs.mkdirSync(CLIENTS_FOLDER, { recursive: true });
    }

    // Se la cartella del cliente non esiste, clona
    if (!fs.existsSync(clientFolder)) {
      logStep('1/6', `Clonazione repo ${displayUrl}...`);
      const cloneResult = runCommand(`git clone ${authenticatedUrl} ${clientId}`, CLIENTS_FOLDER, true);
      if (!cloneResult.success) {
        throw new Error(`Clone fallito: ${cloneResult.error}`);
      }
      logSuccess('Repo clonato');
    } else {
      logStep('1/6', 'Repo già presente, aggiornamento origin...');
      // Aggiorna l'URL origin con il token corrente
      runCommand(`git remote set-url origin ${authenticatedUrl}`, clientFolder, true);
      logSuccess('Origin aggiornato');
    }

    // Configura upstream se non esiste
    logStep('2/6', 'Configurazione upstream...');
    const remotes = runCommand('git remote -v', clientFolder, true);
    if (!remotes.output?.includes('upstream')) {
      runCommand(`git remote add upstream ${UPSTREAM_REPO}`, clientFolder, true);
      logSuccess('Upstream aggiunto');
    } else {
      runCommand(`git remote set-url upstream ${UPSTREAM_REPO}`, clientFolder, true);
      logSuccess('Upstream già configurato');
    }

    // Stash eventuali modifiche locali
    logStep('3/6', 'Salvataggio modifiche locali...');
    runCommand('git stash', clientFolder, true);

    // Fetch upstream
    logStep('4/6', 'Fetch da upstream...');
    const fetchResult = runCommand('git fetch upstream', clientFolder, true);
    if (!fetchResult.success) {
      throw new Error(`Fetch fallito: ${fetchResult.error}`);
    }
    logSuccess('Fetch completato');

    // Merge upstream/main
    logStep('5/6', 'Merge upstream/main...');
    const mergeResult = runCommand('git merge upstream/main --no-edit -X theirs', clientFolder, true);
    if (!mergeResult.success) {
      // Prova a risolvere automaticamente
      logWarning('Conflitti rilevati, tentativo risoluzione automatica...');
      runCommand('git checkout --theirs .', clientFolder, true);
      runCommand('git add .', clientFolder, true);
      runCommand('git commit -m "Merge upstream (auto-resolved)"', clientFolder, true);
    }
    logSuccess('Merge completato');

    // Ripristina stash
    runCommand('git stash pop', clientFolder, true);

    // Push
    logStep('6/6', 'Push su origin...');
    const pushResult = runCommand('git push origin main', clientFolder, true);
    if (!pushResult.success) {
      throw new Error(`Push fallito: ${pushResult.error}`);
    }
    logSuccess('Push completato');

    // Deploy (opzionale)
    if (fs.existsSync(path.join(clientFolder, 'package.json'))) {
      log('\n📦 Esecuzione deploy...', 'cyan');

      // npm install se node_modules non esiste
      if (!fs.existsSync(path.join(clientFolder, 'node_modules'))) {
        logStep('Deploy', 'npm install...');
        runCommand('npm install', clientFolder);
      }

      // npm run deploy
      logStep('Deploy', 'npm run deploy...');
      const deployResult = runCommand('npm run deploy', clientFolder);
      if (deployResult.success) {
        logSuccess('Deploy completato!');
      } else {
        logWarning('Deploy fallito, potrebbe richiedere intervento manuale');
      }
    }

    return { success: true, clientId };

  } catch (error) {
    logError(`Errore: ${error.message}`);
    return { success: false, clientId, error: error.message };
  }
}

// Main
async function main() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════╗', 'blue');
  log('║     AGGIORNAMENTO AUTOMATICO CLIENTI RESTAURANT       ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝', 'blue');

  try {
    // Verifica configurazione
    if (!ADMIN_SUPABASE_URL || !ADMIN_SUPABASE_ANON_KEY) {
      logError('\n⚠️  ATTENZIONE: Configurazione Supabase mancante');
      process.exit(1);
    }

    // Fetch licenze
    const licenses = await fetchLicenses();

    // Filtra clienti aggiornabili
    log('\n🔍 Filtro clienti aggiornabili...', 'blue');
    const updatableClients = filterUpdatableClients(licenses);

    if (updatableClients.length === 0) {
      logWarning('\nNessun cliente da aggiornare.');
      logWarning('Verifica che i clienti abbiano github_repo e github_token configurati.');
      return;
    }

    log(`\n✓ ${updatableClients.length} clienti da aggiornare:`, 'green');
    updatableClients.forEach(c => log(`   - ${c.client_name} (${c.client_id})`, 'cyan'));

    // Aggiorna ogni cliente
    const results = [];
    for (const client of updatableClients) {
      const result = await updateClient(client);
      results.push(result);
    }

    // Riepilogo
    log('\n\n' + '═'.repeat(50), 'blue');
    log('📊 RIEPILOGO', 'blue');
    log('═'.repeat(50), 'blue');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    log(`\n✓ Aggiornati con successo: ${successful.length}`, 'green');
    successful.forEach(r => log(`   - ${r.clientId}`, 'green'));

    if (failed.length > 0) {
      log(`\n✗ Falliti: ${failed.length}`, 'red');
      failed.forEach(r => log(`   - ${r.clientId}: ${r.error}`, 'red'));
    }

    log('\n✅ Operazione completata!\n', 'green');

    // Pulizia cartella clients (file temporanei)
    log('🧹 Pulizia file temporanei...', 'cyan');
    if (fs.existsSync(CLIENTS_FOLDER)) {
      fs.rmSync(CLIENTS_FOLDER, { recursive: true, force: true });
      log('   Cartella clients svuotata', 'green');
    }

  } catch (error) {
    logError(`\nErrore fatale: ${error.message}`);
    process.exit(1);
  }
}

main();
