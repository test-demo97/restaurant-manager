export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;
export const listeners: Set<(toasts: Toast[]) => void> = new Set();
let toasts: Toast[] = [];

function notifyListeners() {
  listeners.forEach((listener) => listener([...toasts]));
}

// Durata dei toast in ms per tipo
const TOAST_DURATION = {
  success: 1500,  // Veloce per conferme rapide (es. aggiunta prodotto)
  error: 4000,    // Più lungo per errori importanti
  warning: 3000,  // Medio per avvisi
  info: 2000,     // Medio per info generiche
};

// Massimo numero di toast visibili contemporaneamente
const MAX_VISIBLE_TOASTS = 3;

export function showToast(message: string, type: ToastType = 'info') {
  const id = toastId++;

  // Rimuovi i toast più vecchi se superiamo il limite
  while (toasts.length >= MAX_VISIBLE_TOASTS) {
    toasts = toasts.slice(1);
  }

  toasts = [...toasts, { id, message, type }];
  notifyListeners();

  // Auto remove in base al tipo
  setTimeout(() => {
    removeToast(id);
  }, TOAST_DURATION[type]);
}

export function removeToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  notifyListeners();
}
