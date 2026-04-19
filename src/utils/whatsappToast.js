import { toast } from 'sonner';

const DEFAULT_MS = 3000;

/**
 * Sonner pauses auto-dismiss when the tab is hidden (e.g. after window.open WhatsApp).
 * This still dismisses after a wall-clock delay so toasts do not stack.
 */
export function toastAfterWhatsAppOpen(message, ms = DEFAULT_MS) {
  const id = toast.success(message, { duration: ms });
  window.setTimeout(() => {
    toast.dismiss(id);
  }, ms);
}
