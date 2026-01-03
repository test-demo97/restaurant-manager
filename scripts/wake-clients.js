#!/usr/bin/env node
const fetch = require('node-fetch');
const ADMIN_SUPABASE_URL = process.env.ADMIN_SUPABASE_URL;
const ADMIN_SUPABASE_ANON_KEY = process.env.ADMIN_SUPABASE_ANON_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPOSITORY; // owner/repo

if (!ADMIN_SUPABASE_URL || !ADMIN_SUPABASE_ANON_KEY) {
  console.error('Missing ADMIN_SUPABASE_URL or ADMIN_SUPABASE_ANON_KEY');
  process.exit(1);
}

async function fetchLicenses() {
  const url = `${ADMIN_SUPABASE_URL.replace(/\/$/, '')}/rest/v1/licenses?status=active`;
  const res = await fetch(url, {
    headers: {
      apikey: ADMIN_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${ADMIN_SUPABASE_ANON_KEY}`
    }
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function pingClient(supabaseUrl, anonKey) {
  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
  try {
    const res = await fetch(url, { method: 'GET', headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }, timeout: 15000 });
    return { ok: res.ok, status: res.status, statusText: res.statusText };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function createIssue(title, body) {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    console.log('GITHUB_TOKEN or GITHUB_REPOSITORY not available - skipping issue creation');
    return;
  }
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/issues`;
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body })
  });
  if (!res.ok) console.error('Failed to create GitHub issue:', res.status, res.statusText);
  else console.log('Created GitHub issue');
}

async function main() {
  try {
    const licenses = await fetchLicenses();
    console.log(`Found ${licenses.length} licenses`);
    for (const lic of licenses) {
      if (!lic.github_repo || lic.status !== 'active') continue;
      // Expect license to have fields with supabase URL and anon key stored in license metadata
      const supabaseUrl = lic.supabase_url || lic.client_supabase_url || lic.supabase_url;
      const anonKey = lic.supabase_anon_key || lic.client_anon_key || lic.anon_key;
      if (!supabaseUrl || !anonKey) {
        console.log(`Skipping ${lic.client_id} - missing supabase data`);
        continue;
      }
      console.log(`Pinging ${lic.client_id} -> ${supabaseUrl}`);
      const result = await pingClient(supabaseUrl, anonKey);
      if (!result.ok) {
        console.warn(`${lic.client_id} ping failed: ${JSON.stringify(result)}`);
        await createIssue(`Supabase ping failed for ${lic.client_id}`, `Ping to ${supabaseUrl} failed with: ${JSON.stringify(result)}`);
      } else {
        console.log(`${lic.client_id} ok: ${result.status}`);
      }
    }
  } catch (err) {
    console.error('Wake clients error', err);
    process.exit(1);
  }
}

main();
