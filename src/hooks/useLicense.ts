import { useContext } from 'react';
import { LicenseContext } from '../context/LicenseContext';

export function useLicense() {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
}
