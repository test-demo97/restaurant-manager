import { useContext } from 'react';
import { SmacContext } from '../context/SmacContext';

export function useSmac() {
  const context = useContext(SmacContext);
  if (!context) {
    throw new Error('useSmac must be used within a SmacProvider');
  }
  return context;
}
