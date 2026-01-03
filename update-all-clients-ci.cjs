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

    // IMPORTANTE: Salva i file del cliente che NON devono essere sovrascritti
    const envPath = path.join(clientFolder, '.env');
    const gitignorePath = path.join(clientFolder, '.gitignore');
    let clientEnvContent = null;
    let clientGitignoreContent = null;

    if (fs.existsSync(envPath)) {
      log('   💾 Salvataggio .env del cliente...');
      clientEnvContent = fs.readFileSync(envPath, 'utf8');
    }
    if (fs.existsSync(gitignorePath)) {
      clientGitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    }

    log('[4/5] Merge upstream/main...');
    const mergeResult = runCommand('git merge upstream/main --no-edit -X theirs', clientFolder, true);
    if (!mergeResult.success) {
      log('⚠️ Conflitti, risoluzione automatica...');
      runCommand('git checkout --theirs .', clientFolder, true);
      runCommand('git add .', clientFolder, true);
      runCommand('git commit -m "Merge upstream (auto-resolved)"', clientFolder, true);
    }

    // Ripristina i file del cliente dopo il merge
    let needsCommit = false;
    if (clientEnvContent !== null) {
      log('   ♻️ Ripristino .env del cliente...');
      fs.writeFileSync(envPath, clientEnvContent);
      needsCommit = true;
    }
    if (clientGitignoreContent !== null && clientGitignoreContent.includes('# .env')) {
      log('   ♻️ Ripristino .gitignore del cliente...');
      fs.writeFileSync(gitignorePath, clientGitignoreContent);
      needsCommit = true;
    }

    // Committa i file ripristinati se necessario
    if (needsCommit) {
      runCommand('git add .env .gitignore 2>/dev/null || true', clientFolder, true);
      const statusResult = runCommand('git status --porcelain', clientFolder, true);
      if (statusResult.output && statusResult.output.trim()) {
        runCommand('git commit -m "Preserve client .env and .gitignore"', clientFolder, true);
        log('   ✓ File del cliente preservati');
      }
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

    // =========================
    // Run DB migrations on client
    // =========================
    try {
      if (clientEnvContent) {
        log('\n🔁 Applicazione migrazioni sul DB del client...');
        // Parse .env for SUPABASE URL and ANON KEY
        const envLines = clientEnvContent.split(/\r?\n/);
        const envMap = {};
        for (const line of envLines) {
          const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
          if (m) envMap[m[1]] = m[2];
        }

        const supabaseUrl = envMap['VITE_SUPABASE_URL'];
        const anonKey = envMap['VITE_SUPABASE_ANON_KEY'];

        if (supabaseUrl && anonKey) {
          // Read migrations from main repo migrations/ folder
          const migrationsDir = path.join(__dirname, 'migrations');
          if (fs.existsSync(migrationsDir)) {
            const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
            for (const file of files.sort()) {
              try {
                const filePath = path.join(migrationsDir, file);
                const sql = fs.readFileSync(filePath, 'utf8');

                // infer version and name from filename or content
                const versionMatch = file.match(/^(\d{3})/);
                const version = versionMatch ? versionMatch[1] : file;
                let name = '';
                const nameMatch = sql.match(/--\s*Migration:\s*(.*)/i);
                if (nameMatch) name = nameMatch[1].trim();
                else name = file.replace(/\.sql$/, '');

                log(`   -> Eseguo migrazione ${version}: ${name}`);

                // Call RPC run_migration on client
                // Use PostgREST RPC endpoint
                const rpcUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/run_migration`;
                const body = {
                  migration_sql: sql,
                  migration_version: version,
                  migration_name: name
                };

                try {
                  // Diagnostic: log trimmed rpcUrl and masked anonKey
                  const maskedKey = anonKey ? anonKey.substring(0, 6) + '...' + anonKey.slice(-6) : 'MISSING';
                  log(`   → RPC URL: ${rpcUrl}`);
                  log(`   → anonKey: ${maskedKey}`);

                  // Health check: simple GET to rest/v1 to see if endpoint reachable
                    const pingUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
                    // Wait and retry logic for paused dbs
                    const HEALTH_CHECK_ATTEMPTS = parseInt(process.env.HEALTH_CHECK_ATTEMPTS || '') || 12;
                    const HEALTH_CHECK_DELAY_MS = parseInt(process.env.HEALTH_CHECK_DELAY_MS || '') || 15000;
                    const FORCE_MIGRATIONS = (process.env.FORCE_MIGRATIONS || 'false').toLowerCase() === 'true';

                    async function waitForUp(attempts = HEALTH_CHECK_ATTEMPTS, delayMs = HEALTH_CHECK_DELAY_MS) {
                      let lastStatus = null;
                      for (let i = 0; i < attempts; i++) {
                        try {
                          const pingRes = await fetch(pingUrl, { method: 'GET', headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` } });
                          log(`   → health check ${pingUrl}: ${pingRes.status} ${pingRes.statusText}`);
                          lastStatus = { status: pingRes.status, statusText: pingRes.statusText };
                          // Consider the endpoint "up" if it returns 200 OK or auth-related statuses (401/403)
                          if (pingRes.ok || pingRes.status === 401 || pingRes.status === 403) {
                            if (!pingRes.ok) log('   → Endpoint reachable but returned 401/403 (authorization failed) — treating as reachable');
                            return { up: true, lastStatus };
                          }

                          // If 404, the service may be initializing; log and retry
                          if (pingRes.status === 404) {
                            log('   → Received 404 (service may be initializing) — retrying');
                          }

                        } catch (e) {
                          log(`   → health check attempt ${i + 1} failed: ${e.message}`);
                        }
                        await new Promise(r => setTimeout(r, delayMs));
                      }
                      return { up: false, lastStatus };
                    }

                    const upResult = await waitForUp();
                    if (!upResult.up) {
                      const lastStatus = upResult.lastStatus || { status: 'no response', statusText: '' };
                      log(`   ✗ Host still down after retries. Last status: ${lastStatus.status} ${lastStatus.statusText}`);

                      if (FORCE_MIGRATIONS) {
                        log('   ⚠️ FORCE_MIGRATIONS=true — proceeding with migrations despite health check failure');
                      } else {
                        log(`   ✗ Host still down after retries. Creating GitHub issue.`);
                        // Create issue if GITHUB_TOKEN provided
                        try {
                          if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
                            const issueRes = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/issues`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                title: `Supabase unreachable for client ${clientId}`,
                                body: `Tried to ping ${pingUrl} on update for ${clientId} and it remained unreachable after multiple attempts. Last status: ${lastStatus.status} ${lastStatus.statusText}. Please check Supabase project status.`
                              })
                            });
                            if (issueRes.ok) log('   ✓ GitHub issue created');
                            else log(`   ✗ Failed to create issue: ${issueRes.status} ${issueRes.statusText}`);
                          }
                        } catch (e) {
                          log(`   ✗ Error creating issue: ${e.message}`);
                        }
                        // skip running migration for this client
                        log(`   ✗ Skipping migrations for ${clientId} due to unreachable DB`);
                        continue;
                      }
                    }

                  const res = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: {
                      'apikey': anonKey,
                      'Authorization': `Bearer ${anonKey}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body),
                    timeout: 30000
                  });

                  if (!res.ok) {
                    const text = await res.text();
                    log(`   ✗ Errore migrazione ${version} (${file}): ${res.status} ${res.statusText} - ${text}`);
                  } else {
                    // Attempt to read json to detect any RPC error payload
                    try {
                      const json = await res.json();
                      // If the RPC returns an error object, show it
                      if (json && json.error) {
                        log(`   ✗ Migrazione ${version} (${file}) risposta con errore: ${JSON.stringify(json)}`);
                      } else {
                        log(`   ✓ Migrazione ${version} (${file}) invocata con successo`);
                      }
                    } catch (e) {
                      log(`   ✓ Migrazione ${version} (${file}) invocata (no JSON payload)`);
                    }
                  }
                } catch (err) {
                  log(`   ✗ Errore durante applicazione migrazione ${file}: ${err.message}`);
                  if (err && err.stack) log(`   Stack: ${err.stack}`);
                }

              } catch (err) {
                log(`   ✗ Errore durante applicazione migrazione ${file}: ${err.message}`);
              }
            }
          } else {
            log('   ⚠️ Cartella migrations non trovata sul repo principale');
          }
        } else {
          log('   ⚠️ .env del cliente non contiene VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY - salto migrazioni');
        }
      } else {
        log('   ⚠️ .env non trovato per questo cliente - salto migrazioni');
      }
    } catch (err) {
      log(`   ✗ Errore generico esecuzione migrazioni: ${err.message}`);
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
