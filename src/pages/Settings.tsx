import { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Database,
  Download,
  Globe,
  DollarSign,
  Store,
  AlertTriangle,
  Check,
  ExternalLink,
} from 'lucide-react';
import { getSettings, updateSettings } from '../lib/database';
import { isSupabaseConfigured } from '../lib/supabase';
import { showToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import type { Settings as SettingsType } from '../types';

export function Settings() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSchemaModal, setShowSchemaModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      showToast('Errore nel caricamento impostazioni', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!settings) return;

    setSaving(true);
    try {
      await updateSettings(settings);
      showToast('Impostazioni salvate', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Errore nel salvataggio', 'error');
    } finally {
      setSaving(false);
    }
  }

  function exportData() {
    try {
      const data: Record<string, unknown> = {};
      const keys = [
        'categories',
        'menu_items',
        'tables',
        'ingredients',
        'inventory',
        'orders',
        'order_items',
        'employees',
        'work_shifts',
        'reservations',
        'expenses',
        'settings',
      ];

      keys.forEach((key) => {
        const item = localStorage.getItem(`kebab_${key}`);
        if (item) {
          data[key] = JSON.parse(item);
        }
      });

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kebab_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('Backup esportato', 'success');
    } catch (error) {
      console.error('Error exporting data:', error);
      showToast('Errore nell\'esportazione', 'error');
    }
  }

  function openSchemaFile() {
    // Apri il link al file schema su GitHub
    window.open('https://github.com/Raf-Dee/kebab-restaurant-app/blob/main/supabase-schema.sql', '_blank');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Impostazioni</h1>
          <p className="text-dark-400 mt-1">Configura il tuo ristorante</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? (
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-dark-900" />
          ) : (
            <>
              <Save className="w-5 h-5" />
              Salva
            </>
          )}
        </button>
      </div>

      {/* Database Status */}
      <div className={`card p-4 ${isSupabaseConfigured ? 'border-emerald-500/50' : 'border-amber-500/50'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSupabaseConfigured ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
            <Database className={`w-6 h-6 ${isSupabaseConfigured ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">Database</h3>
              {isSupabaseConfigured ? (
                <span className="badge-success">
                  <Check className="w-3 h-3 mr-1" />
                  Supabase Connesso
                </span>
              ) : (
                <span className="badge-warning">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Modalità Demo
                </span>
              )}
            </div>
            <p className="text-sm text-dark-400 mt-1">
              {isSupabaseConfigured
                ? 'I dati sono salvati nel cloud su Supabase'
                : 'I dati sono salvati localmente nel browser. Configura Supabase per il cloud.'}
            </p>
          </div>
          {!isSupabaseConfigured && (
            <button onClick={() => setShowSchemaModal(true)} className="btn-secondary">
              <ExternalLink className="w-4 h-4" />
              Configura Supabase
            </button>
          )}
        </div>
      </div>

      {/* General Settings */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Store className="w-5 h-5" />
          <h2 className="font-semibold text-white">Informazioni Negozio</h2>
        </div>
        <div className="card-body space-y-4">
          <div>
            <label className="label">Nome Negozio</label>
            <input
              type="text"
              value={settings?.shop_name || ''}
              onChange={(e) => setSettings(s => s ? { ...s, shop_name: e.target.value } : null)}
              className="input"
              placeholder="Nome del tuo ristorante"
            />
          </div>

          <div>
            <label className="label">Slogan Menu (per PDF)</label>
            <input
              type="text"
              value={settings?.menu_slogan || ''}
              onChange={(e) => setSettings(s => s ? { ...s, menu_slogan: e.target.value } : null)}
              className="input"
              placeholder="Es: Autentica cucina mediterranea"
            />
            <p className="text-xs text-dark-500 mt-1">Questo testo verrà mostrato sotto il nome nel menu PDF</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Indirizzo</label>
              <input
                type="text"
                value={settings?.address || ''}
                onChange={(e) => setSettings(s => s ? { ...s, address: e.target.value } : null)}
                className="input"
                placeholder="Via Example 123, San Marino"
              />
            </div>
            <div>
              <label className="label">Telefono</label>
              <input
                type="tel"
                value={settings?.phone || ''}
                onChange={(e) => setSettings(s => s ? { ...s, phone: e.target.value } : null)}
                className="input"
                placeholder="+378 0549 123456"
              />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={settings?.email || ''}
              onChange={(e) => setSettings(s => s ? { ...s, email: e.target.value } : null)}
              className="input"
              placeholder="info@tuoristorante.sm"
            />
          </div>
        </div>
      </div>

      {/* Financial Settings */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          <h2 className="font-semibold text-white">Impostazioni Finanziarie</h2>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Valuta</label>
              <select
                value={settings?.currency || '€'}
                onChange={(e) => setSettings(s => s ? { ...s, currency: e.target.value } : null)}
                className="select"
              >
                <option value="€">Euro (€)</option>
                <option value="$">Dollaro ($)</option>
                <option value="£">Sterlina (£)</option>
              </select>
            </div>
            <div>
              <label className="label">Aliquota IVA (%)</label>
              <input
                type="number"
                value={settings?.iva_rate || 17}
                onChange={(e) => setSettings(s => s ? { ...s, iva_rate: parseFloat(e.target.value) || 0 } : null)}
                className="input"
                placeholder="17"
              />
            </div>
            <div>
              <label className="label">Soglia Scorte Predefinita</label>
              <input
                type="number"
                value={settings?.default_threshold || 10}
                onChange={(e) => setSettings(s => s ? { ...s, default_threshold: parseFloat(e.target.value) || 10 } : null)}
                className="input"
                placeholder="10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Language Settings */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Globe className="w-5 h-5" />
          <h2 className="font-semibold text-white">Lingua e Regione</h2>
        </div>
        <div className="card-body">
          <div>
            <label className="label">Lingua</label>
            <select
              value={settings?.language || 'it'}
              onChange={(e) => setSettings(s => s ? { ...s, language: e.target.value } : null)}
              className="select max-w-xs"
            >
              <option value="it">Italiano</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Backup */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Download className="w-5 h-5" />
          <h2 className="font-semibold text-white">Backup & Ripristino</h2>
        </div>
        <div className="card-body space-y-4">
          <p className="text-dark-400">
            Esporta tutti i dati del ristorante in un file JSON per backup o migrazione.
          </p>
          <div className="flex items-center gap-3">
            <button onClick={exportData} className="btn-secondary">
              <Download className="w-5 h-5" />
              Esporta Backup (JSON)
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <SettingsIcon className="w-5 h-5" />
          <h2 className="font-semibold text-white">Informazioni</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-dark-900 rounded-xl">
              <p className="text-2xl font-bold text-primary-400">2.0</p>
              <p className="text-sm text-dark-400">Versione</p>
            </div>
            <div className="p-4 bg-dark-900 rounded-xl">
              <p className="text-2xl font-bold text-blue-400">React</p>
              <p className="text-sm text-dark-400">Frontend</p>
            </div>
            <div className="p-4 bg-dark-900 rounded-xl">
              <p className="text-2xl font-bold text-emerald-400">Supabase</p>
              <p className="text-sm text-dark-400">Database</p>
            </div>
            <div className="p-4 bg-dark-900 rounded-xl">
              <p className="text-2xl font-bold text-purple-400">TypeScript</p>
              <p className="text-sm text-dark-400">Linguaggio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Supabase Schema Modal */}
      <Modal
        isOpen={showSchemaModal}
        onClose={() => setShowSchemaModal(false)}
        title="Configura Supabase"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <h3 className="font-semibold text-blue-400 mb-2">Come configurare Supabase:</h3>
            <ol className="text-sm text-dark-300 space-y-2 list-decimal list-inside">
              <li>Vai su <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary-400 underline">supabase.com</a> e crea un account gratuito</li>
              <li>Crea un nuovo progetto</li>
              <li>Vai su <strong>SQL Editor</strong> e incolla lo schema SQL</li>
              <li>Vai su <strong>Settings → API</strong> e copia URL e anon key</li>
              <li>Crea un file <code className="bg-dark-700 px-1 rounded">.env</code> nella root del progetto con:
                <pre className="mt-2 p-2 bg-dark-900 rounded text-xs overflow-x-auto">
{`VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key`}
                </pre>
              </li>
              <li>Riavvia l'applicazione</li>
            </ol>
          </div>

          <div className="bg-dark-900 rounded-xl p-4">
            <p className="text-dark-300 mb-3">
              Lo schema SQL completo si trova nel file <code className="bg-dark-700 px-1 rounded">supabase-schema.sql</code> nella root del progetto.
            </p>
            <button onClick={openSchemaFile} className="btn-secondary w-full">
              <ExternalLink className="w-4 h-4" />
              Apri Schema SQL su GitHub
            </button>
          </div>

          <button onClick={() => setShowSchemaModal(false)} className="btn-primary w-full">
            Ho capito
          </button>
        </div>
      </Modal>
    </div>
  );
}
