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
  CreditCard,
  Crown,
  Phone,
  Mail,
} from 'lucide-react';
import { getSettings, updateSettings } from '../lib/database';
import { isSupabaseConfigured } from '../lib/supabase';
import { showToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { useLanguage } from '../context/LanguageContext';
import { useSmac } from '../context/SmacContext';
import { useLicense } from '../context/LicenseContext';
import { usePlanFeatures } from '../hooks/usePlanFeatures';
import { useDemoGuard } from '../hooks/useDemoGuard';
import type { Settings as SettingsType } from '../types';

export function Settings() {
  const { t, language, setLanguage } = useLanguage();
  const { smacEnabled, setSmacEnabled } = useSmac();
  const { licenseStatus, adminSettings } = useLicense();
  const { planType, isPremium } = usePlanFeatures();
  const { checkCanWrite } = useDemoGuard();
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSchemaModal, setShowSchemaModal] = useState(false);

  // State locali per lingua e SMAC (si salvano solo con il pulsante Salva)
  const [localLanguage, setLocalLanguage] = useState(language);
  const [localSmacEnabled, setLocalSmacEnabled] = useState(smacEnabled);

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronizza gli state locali quando i context cambiano (es. al caricamento)
  useEffect(() => {
    setLocalLanguage(language);
  }, [language]);

  useEffect(() => {
    setLocalSmacEnabled(smacEnabled);
  }, [smacEnabled]);

  async function loadSettings() {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      showToast(t('settings.errorLoading'), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    // Blocca in modalità demo
    if (!checkCanWrite()) return;

    if (!settings) return;

    setSaving(true);
    try {
      // Salva tutte le impostazioni del database
      await updateSettings(settings);

      // Salva lingua (se cambiata)
      if (localLanguage !== language) {
        setLanguage(localLanguage);
      }

      // Salva SMAC (se cambiato)
      if (localSmacEnabled !== smacEnabled) {
        await setSmacEnabled(localSmacEnabled);
      }

      // Ricarica le impostazioni dal database per confermare il salvataggio
      const savedSettings = await getSettings();
      setSettings(savedSettings);
      showToast(t('settings.saved'), 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast(t('settings.errorSaving'), 'error');
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
      a.download = `restaurant_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showToast(t('settings.backupExported'), 'success');
    } catch (error) {
      console.error('Error exporting data:', error);
      showToast(t('settings.backupError'), 'error');
    }
  }

  function openSchemaFile() {
    // Apri il link al file schema su GitHub
    window.open('https://github.com/andreafabbri97/restaurant-manager/blob/main/supabase-schema.sql', '_blank');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{t('settings.title')}</h1>
          <p className="text-dark-400 mt-1 text-sm sm:text-base">{t('settings.subtitle')}</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm sm:text-base w-full sm:w-auto justify-center">
          {saving ? (
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-dark-900" />
          ) : (
            <>
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              {t('common.save')}
            </>
          )}
        </button>
      </div>

      {/* Database Status */}
      <div className={`card p-3 sm:p-4 ${isSupabaseConfigured ? 'border-emerald-500/50' : 'border-amber-500/50'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isSupabaseConfigured ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
            <Database className={`w-5 h-5 sm:w-6 sm:h-6 ${isSupabaseConfigured ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-white text-sm sm:text-base">{t('settings.database')}</h3>
              {isSupabaseConfigured ? (
                <span className="badge-success text-xs">
                  <Check className="w-3 h-3 mr-1" />
                  {t('settings.databaseConnected')}
                </span>
              ) : (
                <span className="badge-warning text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {t('settings.databaseDemo')}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-dark-400 mt-1">
              {isSupabaseConfigured
                ? t('settings.databaseCloudDesc')
                : t('settings.databaseLocalDesc')}
            </p>
          </div>
          {!isSupabaseConfigured && (
            <button onClick={() => setShowSchemaModal(true)} className="btn-secondary text-xs sm:text-sm w-full sm:w-auto justify-center">
              <ExternalLink className="w-4 h-4" />
              {t('settings.configureSupabase')}
            </button>
          )}
        </div>
      </div>

      {/* General Settings */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Store className="w-4 h-4 sm:w-5 sm:h-5" />
          <h2 className="font-semibold text-white text-sm sm:text-base">{t('settings.shopInfo')}</h2>
        </div>
        <div className="card-body space-y-3 sm:space-y-4">
          <div>
            <label className="label text-xs sm:text-sm">{t('settings.shopName')}</label>
            <input
              type="text"
              value={settings?.shop_name || ''}
              onChange={(e) => setSettings(s => s ? { ...s, shop_name: e.target.value } : null)}
              className="input text-sm sm:text-base"
              placeholder={t('settings.shopNamePlaceholder')}
            />
          </div>

          <div>
            <label className="label text-xs sm:text-sm">{t('settings.menuSlogan')}</label>
            <input
              type="text"
              value={settings?.menu_slogan || ''}
              onChange={(e) => setSettings(s => s ? { ...s, menu_slogan: e.target.value } : null)}
              className="input text-sm sm:text-base"
              placeholder={t('settings.menuSloganPlaceholder')}
            />
            <p className="text-xs text-dark-500 mt-1">{t('settings.menuSloganHint')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="label text-xs sm:text-sm">{t('settings.address')}</label>
              <input
                type="text"
                value={settings?.address || ''}
                onChange={(e) => setSettings(s => s ? { ...s, address: e.target.value } : null)}
                className="input text-sm sm:text-base"
                placeholder={t('settings.addressPlaceholder')}
              />
            </div>
            <div>
              <label className="label text-xs sm:text-sm">{t('settings.phone')}</label>
              <input
                type="tel"
                value={settings?.phone || ''}
                onChange={(e) => setSettings(s => s ? { ...s, phone: e.target.value } : null)}
                className="input text-sm sm:text-base"
                placeholder={t('settings.phonePlaceholder')}
              />
            </div>
          </div>

          <div>
            <label className="label text-xs sm:text-sm">{t('settings.email')}</label>
            <input
              type="email"
              value={settings?.email || ''}
              onChange={(e) => setSettings(s => s ? { ...s, email: e.target.value } : null)}
              className="input text-sm sm:text-base"
              placeholder={t('settings.emailPlaceholder')}
            />
          </div>
        </div>
      </div>

      {/* Financial Settings */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
          <h2 className="font-semibold text-white text-sm sm:text-base">{t('settings.financialSettings')}</h2>
        </div>
        <div className="card-body space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="label text-xs sm:text-sm">{t('settings.currency')}</label>
              <select
                value={settings?.currency || '€'}
                onChange={(e) => setSettings(s => s ? { ...s, currency: e.target.value } : null)}
                className="select text-sm sm:text-base"
              >
                <option value="€">{t('settings.currencyEuro')}</option>
                <option value="$">{t('settings.currencyDollar')}</option>
                <option value="£">{t('settings.currencyPound')}</option>
              </select>
            </div>
            <div>
              <label className="label text-xs sm:text-sm">{t('settings.vatRate')}</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={settings?.iva_rate ?? 17}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Permetti solo numeri e punto decimale
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setSettings(s => s ? { ...s, iva_rate: val === '' ? 0 : parseFloat(val) || 0 } : null);
                    }
                  }}
                  className="input text-sm sm:text-base pr-8"
                  placeholder="17"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400">%</span>
              </div>
            </div>
            <div>
              <label className="label text-xs sm:text-sm">Soglia Scorta Default</label>
              <input
                type="text"
                inputMode="numeric"
                value={settings?.default_threshold ?? 10}
                onChange={(e) => {
                  const val = e.target.value;
                  // Permetti solo numeri interi
                  if (val === '' || /^\d*$/.test(val)) {
                    setSettings(s => s ? { ...s, default_threshold: val === '' ? 0 : parseInt(val) || 0 } : null);
                  }
                }}
                className="input text-sm sm:text-base"
                placeholder="10"
              />
              <p className="text-xs text-dark-500 mt-1">
                Soglia iniziale assegnata ai nuovi ingredienti. Con l'uso, verrà ricalcolata automaticamente tramite EOQ.
              </p>
            </div>
          </div>

          {/* IVA Mode Toggle */}
          <div className="pt-3 border-t border-dark-700">
            <label className="label text-xs sm:text-sm mb-2">Modalità IVA</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setSettings(s => s ? { ...s, iva_included: true } : null)}
                className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  settings?.iva_included !== false
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-dark-700 bg-dark-800 hover:border-dark-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  settings?.iva_included !== false ? 'border-primary-500' : 'border-dark-500'
                }`}>
                  {settings?.iva_included !== false && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                </div>
                <div className="text-left">
                  <p className="font-medium text-white text-sm">IVA inclusa nei prezzi</p>
                  <p className="text-xs text-dark-400">I prezzi del menu sono già comprensivi di IVA (consigliato)</p>
                </div>
              </button>
              <button
                onClick={() => setSettings(s => s ? { ...s, iva_included: false } : null)}
                className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  settings?.iva_included === false
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-dark-700 bg-dark-800 hover:border-dark-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  settings?.iva_included === false ? 'border-primary-500' : 'border-dark-500'
                }`}>
                  {settings?.iva_included === false && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                </div>
                <div className="text-left">
                  <p className="font-medium text-white text-sm">IVA esclusa dai prezzi</p>
                  <p className="text-xs text-dark-400">L'IVA viene aggiunta al totale dell'ordine</p>
                </div>
              </button>
            </div>
            <p className="text-xs text-dark-500 mt-2">
              {settings?.iva_included !== false
                ? `Esempio: Un prodotto a €10 include già €${(10 - 10 / (1 + (settings?.iva_rate || 17) / 100)).toFixed(2)} di IVA. Il cliente paga €10.`
                : `Esempio: Un prodotto a €10 + IVA (${settings?.iva_rate || 17}%) = €${(10 * (1 + (settings?.iva_rate || 17) / 100)).toFixed(2)}. L'IVA viene aggiunta.`
              }
            </p>
          </div>

          {/* Coperto */}
          <div className="pt-3 border-t border-dark-700">
            <label className="label text-xs sm:text-sm mb-2">Coperto (per persona)</label>
            <div className="flex items-center gap-2">
              <span className="text-dark-400">{settings?.currency || '€'}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings?.cover_charge ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSettings(s => s ? { ...s, cover_charge: val === '' ? 0 : parseFloat(val) || 0 } : null);
                }}
                className="input text-sm sm:text-base w-24"
                placeholder="0.00"
              />
              <span className="text-dark-400 text-sm">a persona</span>
            </div>
            <p className="text-xs text-dark-500 mt-2">
              {(settings?.cover_charge ?? 0) > 0
                ? `Il coperto verrà aggiunto automaticamente agli ordini al tavolo in base al numero di ospiti.`
                : `Imposta un valore maggiore di 0 per abilitare il coperto automatico per gli ordini al tavolo.`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Language Settings */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
          <h2 className="font-semibold text-white text-sm sm:text-base">{t('settings.languageSection')}</h2>
        </div>
        <div className="card-body">
          <div>
            <label className="label text-xs sm:text-sm">{t('settings.language')}</label>
            <select
              value={localLanguage}
              onChange={(e) => setLocalLanguage(e.target.value as 'it' | 'en')}
              className="select max-w-xs text-sm sm:text-base"
            >
              <option value="it">{t('settings.italian')}</option>
              <option value="en">{t('settings.english')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* SMAC Settings */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
          <h2 className="font-semibold text-white text-sm sm:text-base">{t('settings.smacSection')}</h2>
        </div>
        <div className="card-body space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white text-sm sm:text-base">{t('settings.smacEnabled')}</p>
              <p className="text-xs sm:text-sm text-dark-400">{t('settings.smacEnabledDesc')}</p>
            </div>
            <button
              onClick={() => setLocalSmacEnabled(!localSmacEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localSmacEnabled ? 'bg-primary-500' : 'bg-dark-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localSmacEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-blue-400">
              <strong>{t('settings.smacNote')}:</strong> {t('settings.smacNoteDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* Backup */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Download className="w-4 h-4 sm:w-5 sm:h-5" />
          <h2 className="font-semibold text-white text-sm sm:text-base">{t('settings.backup')}</h2>
        </div>
        <div className="card-body space-y-3 sm:space-y-4">
          <p className="text-dark-400 text-xs sm:text-sm">
            {t('settings.backupDesc')}
          </p>
          <div className="flex items-center gap-3">
            <button onClick={exportData} className="btn-secondary text-sm sm:text-base">
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              {t('settings.exportBackup')}
            </button>
          </div>
        </div>
      </div>

      {/* Piano Licenza */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
          <h2 className="font-semibold text-white text-sm sm:text-base">Piano Licenza</h2>
        </div>
        <div className="card-body space-y-4">
          {/* Badge Piano */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white text-sm sm:text-base">Piano attivo</p>
              <p className="text-xs sm:text-sm text-dark-400">Il tuo piano licenza attuale</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${
              planType === 'premium'
                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                : planType === 'standard'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
            }`}>
              {planType.toUpperCase()}
            </span>
          </div>

          {/* Data scadenza */}
          {licenseStatus?.expiryDate && (
            <div className="flex items-center justify-between py-3 border-t border-dark-700">
              <div>
                <p className="font-medium text-white text-sm sm:text-base">Scadenza licenza</p>
                <p className="text-xs sm:text-sm text-dark-400">Data di rinnovo</p>
              </div>
              <span className="text-white font-medium">
                {licenseStatus.expiryDate.split('-').reverse().join('/')}
              </span>
            </div>
          )}

          {/* Lista funzionalità */}
          <div className="py-3 border-t border-dark-700">
            <p className="font-medium text-white text-sm sm:text-base mb-3">Funzionalità incluse</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-dark-300">
                <Check className="w-4 h-4 text-green-400" />
                <span>Dashboard</span>
              </div>
              <div className="flex items-center gap-2 text-dark-300">
                <Check className="w-4 h-4 text-green-400" />
                <span>Gestione Ordini</span>
              </div>
              <div className="flex items-center gap-2 text-dark-300">
                <Check className="w-4 h-4 text-green-400" />
                <span>Gestione Tavoli</span>
              </div>
              <div className="flex items-center gap-2 text-dark-300">
                <Check className="w-4 h-4 text-green-400" />
                <span>Gestione Menu</span>
              </div>
              {planType !== 'demo' && (
                <div className="flex items-center gap-2 text-dark-300">
                  <Check className="w-4 h-4 text-green-400" />
                  <span>Gestione Utenti</span>
                </div>
              )}
              {isPremium && (
                <>
                  <div className="flex items-center gap-2 text-dark-300">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Report e Statistiche</span>
                  </div>
                  <div className="flex items-center gap-2 text-dark-300">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>SMAC Card</span>
                  </div>
                  <div className="flex items-center gap-2 text-dark-300">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Inventario</span>
                  </div>
                  <div className="flex items-center gap-2 text-dark-300">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Ricette e Costi</span>
                  </div>
                  <div className="flex items-center gap-2 text-dark-300">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Gestione Personale</span>
                  </div>
                  <div className="flex items-center gap-2 text-dark-300">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Chiusura Cassa</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Contatti per upgrade (solo se non premium) */}
          {!isPremium && (
            <div className="py-3 border-t border-dark-700">
              <p className="font-medium text-white text-sm sm:text-base mb-3">Vuoi fare l'upgrade?</p>
              <div className="bg-dark-900 rounded-xl p-4 space-y-2">
                {(adminSettings?.blocked_contact_phone || adminSettings?.blocked_contact_email) ? (
                  <>
                    {adminSettings?.blocked_contact_phone && (
                      <a
                        href={`tel:${adminSettings.blocked_contact_phone.replace(/\s/g, '')}`}
                        className="flex items-center gap-2 text-primary-400 hover:text-primary-300 text-sm"
                      >
                        <Phone className="w-4 h-4" />
                        <span>{adminSettings.blocked_contact_phone}</span>
                      </a>
                    )}
                    {adminSettings?.blocked_contact_email && (
                      <a
                        href={`mailto:${adminSettings.blocked_contact_email}?subject=Richiesta upgrade piano`}
                        className="flex items-center gap-2 text-primary-400 hover:text-primary-300 text-sm"
                      >
                        <Mail className="w-4 h-4" />
                        <span>{adminSettings.blocked_contact_email}</span>
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-dark-400 text-sm">
                    Contatta il fornitore del software per informazioni sull'upgrade.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* About */}
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          <h2 className="font-semibold text-white text-sm sm:text-base">{t('settings.about')}</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-center">
            <div className="p-3 sm:p-4 bg-dark-900 rounded-xl">
              <p className="text-lg sm:text-2xl font-bold text-primary-400">3.0</p>
              <p className="text-xs sm:text-sm text-dark-400">{t('settings.version')}</p>
            </div>
            <div className="p-3 sm:p-4 bg-dark-900 rounded-xl">
              <p className="text-lg sm:text-2xl font-bold text-blue-400">React</p>
              <p className="text-xs sm:text-sm text-dark-400">{t('settings.frontend')}</p>
            </div>
            <div className="p-3 sm:p-4 bg-dark-900 rounded-xl">
              <p className="text-lg sm:text-2xl font-bold text-emerald-400">Supabase</p>
              <p className="text-xs sm:text-sm text-dark-400">{t('settings.databaseType')}</p>
            </div>
            <div className="p-3 sm:p-4 bg-dark-900 rounded-xl">
              <p className="text-lg sm:text-2xl font-bold text-purple-400">TS</p>
              <p className="text-xs sm:text-sm text-dark-400">{t('settings.languageType')}</p>
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
