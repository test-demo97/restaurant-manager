/**
 * Pagina mostrata quando la licenza non è valida
 * Usa le impostazioni personalizzate dal License Manager
 */

import { useState } from 'react';
import { ShieldX, Phone, Mail, RefreshCw } from 'lucide-react';
import { useLicense } from '../context/LicenseContext';

export function LicenseBlocked() {
  const { licenseStatus, adminSettings, recheckLicense } = useLicense();
  const [isRechecking, setIsRechecking] = useState(false);

  const handleRecheck = async () => {
    setIsRechecking(true);
    await recheckLicense();
    setIsRechecking(false);
  };

  // Usa le impostazioni admin se disponibili, altrimenti fallback
  const settings = adminSettings || {
    blocked_title: 'Licenza Non Valida',
    blocked_message: 'Contatta il supporto per assistenza.',
    blocked_contact_email: 'support@example.com',
    blocked_contact_phone: '+39 333 1234567',
  };

  // Formatta la data da YYYY-MM-DD a DD/MM/YYYY
  const formatDate = (dateStr: string) => dateStr.split('-').reverse().join('/');

  const getSubtitle = () => {
    switch (licenseStatus?.reason) {
      case 'expired':
        return `La tua licenza è scaduta${licenseStatus.expiryDate ? ` il ${formatDate(licenseStatus.expiryDate)}` : ''}`;
      case 'suspended':
        return 'Il tuo account è stato temporaneamente sospeso';
      case 'cancelled':
        return 'Il contratto è stato terminato';
      case 'not_found':
        return 'Questa installazione non è registrata';
      default:
        return licenseStatus?.message || 'Si è verificato un problema con la licenza';
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-dark-800 rounded-xl shadow-2xl p-8 text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-10 h-10 text-red-500" />
        </div>

        {/* Title - dal License Manager */}
        <h1 className="text-2xl font-bold text-white mb-2">{settings.blocked_title}</h1>
        <p className="text-red-400 mb-4">{getSubtitle()}</p>
        <p className="text-dark-300 mb-8">{settings.blocked_message}</p>

        {/* Contact Info - dal License Manager */}
        <div className="bg-dark-700 rounded-lg p-4 mb-6">
          <p className="text-sm text-dark-400 mb-3">Contatta il supporto:</p>
          <div className="space-y-2">
            {settings.blocked_contact_phone && (
              <a
                href={`tel:${settings.blocked_contact_phone.replace(/\s/g, '')}`}
                className="flex items-center justify-center gap-2 text-primary-400 hover:text-primary-300"
              >
                <Phone className="w-4 h-4" />
                <span>{settings.blocked_contact_phone}</span>
              </a>
            )}
            {settings.blocked_contact_email && (
              <a
                href={`mailto:${settings.blocked_contact_email}`}
                className="flex items-center justify-center gap-2 text-primary-400 hover:text-primary-300"
              >
                <Mail className="w-4 h-4" />
                <span>{settings.blocked_contact_email}</span>
              </a>
            )}
          </div>
        </div>

        {/* Retry Button */}
        <button
          onClick={handleRecheck}
          disabled={isRechecking}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRechecking ? 'animate-spin' : ''}`} />
          {isRechecking ? 'Verifica in corso...' : 'Ricontrolla Licenza'}
        </button>

        {/* Version */}
        <p className="text-xs text-dark-500 mt-6">
          Restaurant Manager v3.0 - Powered by Andrea Fabbri
        </p>
      </div>
    </div>
  );
}
