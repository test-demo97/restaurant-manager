/**
 * License Verification Context
 *
 * Verifica la validità della licenza del software.
 * La licenza viene controllata dal server centrale (Supabase di Andrea Fabbri).
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// Configurazione del server licenze (Supabase di Andrea Fabbri)
const LICENSE_SERVER_URL = 'https://jhyidrhckhoavlmmmlwq.supabase.co';
const LICENSE_SERVER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoeWlkcmhja2hvYXZsbW1tbHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5ODkzMzIsImV4cCI6MjA4MTU2NTMzMn0.8l7i5EJiF_xJZSO__y83S7kw-bDq2PVH24sl4f5ESyM';

// ID del client - viene configurato durante il setup del fork
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || 'kebab-san-marino';

interface LicenseStatus {
  valid: boolean;
  reason?: string;
  message?: string;
  plan?: string;
  expiryDate?: string;
}

interface AdminSettings {
  blocked_title: string;
  blocked_message: string;
  blocked_contact_email: string;
  blocked_contact_phone: string;
}

interface LicenseContextType {
  isLicenseValid: boolean;
  licenseStatus: LicenseStatus | null;
  adminSettings: AdminSettings | null;
  isChecking: boolean;
  recheckLicense: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextType | null>(null);

// Impostazioni di default se non si riesce a caricarle
const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  blocked_title: 'Licenza Non Valida',
  blocked_message: 'La tua licenza è scaduta o è stata sospesa. Per continuare ad utilizzare il software, contatta il supporto.',
  blocked_contact_email: 'support@example.com',
  blocked_contact_phone: '+39 333 1234567',
};

// Intervallo di controllo licenza (2 minuti per rilevamento rapido sospensioni)
const LICENSE_CHECK_INTERVAL = 2 * 60 * 1000;

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Carica le impostazioni admin dal server licenze
  const fetchAdminSettings = useCallback(async () => {
    try {
      const response = await fetch(`${LICENSE_SERVER_URL}/rest/v1/admin_settings?select=*&limit=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': LICENSE_SERVER_KEY,
          'Authorization': `Bearer ${LICENSE_SERVER_KEY}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setAdminSettings(data[0]);
          return;
        }
      }
      // Fallback ai default
      setAdminSettings(DEFAULT_ADMIN_SETTINGS);
    } catch (error) {
      console.warn('Failed to fetch admin settings:', error);
      setAdminSettings(DEFAULT_ADMIN_SETTINGS);
    }
  }, []);

  const checkLicense = useCallback(async () => {
    setIsChecking(true);
    try {
      // Chiamata RPC al server licenze
      const response = await fetch(`${LICENSE_SERVER_URL}/rest/v1/rpc/check_license`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': LICENSE_SERVER_KEY,
          'Authorization': `Bearer ${LICENSE_SERVER_KEY}`,
        },
        body: JSON.stringify({ p_client_id: CLIENT_ID }),
      });

      if (!response.ok) {
        // Se il server non risponde, permetti l'uso (grace period)
        console.warn('License server unreachable, using grace period');
        setLicenseStatus({ valid: true, reason: 'grace_period' });
        return;
      }

      const result = await response.json();
      setLicenseStatus(result);

      // Se la licenza non è valida, carica le impostazioni admin
      if (!result.valid) {
        await fetchAdminSettings();
      }
    } catch (error) {
      // In caso di errore di rete, permetti l'uso temporaneo
      console.warn('License check failed, using grace period:', error);
      setLicenseStatus({ valid: true, reason: 'grace_period' });
    } finally {
      setIsChecking(false);
    }
  }, [fetchAdminSettings]);

  useEffect(() => {
    checkLicense();

    // Ricontrolla ogni 2 minuti per rilevare sospensioni rapidamente
    const interval = setInterval(checkLicense, LICENSE_CHECK_INTERVAL);

    // Ricontrolla quando l'utente torna sulla tab/finestra
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkLicense();
      }
    };

    // Ricontrolla quando la finestra ottiene il focus
    const handleFocus = () => {
      checkLicense();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkLicense]);

  const isLicenseValid = licenseStatus?.valid ?? true; // Default true durante il check

  return (
    <LicenseContext.Provider value={{
      isLicenseValid,
      licenseStatus,
      adminSettings,
      isChecking,
      recheckLicense: checkLicense
    }}>
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
}
