/**
 * Permissions and System Capabilities Manager for GKD Messenger
 * Handles Browser Notifications, Camera, Microphone, Contacts Agenda, Persistent Memory & Storage, Clipboard, and Geolocation.
 */

export interface PermissionItem {
  id: 'notifications' | 'camera' | 'microphone' | 'contacts' | 'storage' | 'clipboard' | 'geolocation';
  title: string;
  description: string;
  status: 'granted' | 'denied' | 'prompt' | 'unsupported';
  icon: string;
  actionLabel: string;
  details?: string;
}

// 1. NOTIFICATIONS
export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as 'granted' | 'denied' | 'prompt';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.warn('Erro ao solicitar permissão de notificação:', err);
    return false;
  }
}

export function sendBrowserNotification(title: string, options?: NotificationOptions): Notification | null {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }
  if (Notification.permission !== 'granted') {
    return null;
  }
  try {
    const defaultOptions: NotificationOptions = {
      icon: 'https://api.iconify.design/lucide:message-square.svg?color=%23d4af37',
      badge: 'https://api.iconify.design/lucide:bell.svg?color=%23d4af37',
      silent: false,
      ...options,
    };
    const notification = new Notification(title, defaultOptions);
    
    // Auto close after 10s if not clicked
    setTimeout(() => {
      try {
        notification.close();
      } catch (_) {}
    }, 10000);

    return notification;
  } catch (err) {
    console.warn('Erro ao disparar notificação do navegador:', err);
    return null;
  }
}

// 2. VIBRATION
export function triggerVibration(pattern: number[] = [200, 100, 200, 100, 300]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (_) {}
}

// 3. CAMERA
export async function getCameraPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return 'unsupported';
  }
  try {
    if (navigator.permissions?.query) {
      const result = await navigator.permissions.query({ name: 'camera' as any });
      return result.state as 'granted' | 'denied' | 'prompt';
    }
  } catch (_) {}
  return 'prompt';
}

export async function requestCameraPermission(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    // Stop tracks immediately after granting
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (err) {
    console.warn('Permissão de câmera negada:', err);
    return false;
  }
}

// 4. MICROPHONE
export async function getMicrophonePermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return 'unsupported';
  }
  try {
    if (navigator.permissions?.query) {
      const result = await navigator.permissions.query({ name: 'microphone' as any });
      return result.state as 'granted' | 'denied' | 'prompt';
    }
  } catch (_) {}
  return 'prompt';
}

export async function requestMicrophonePermission(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (err) {
    console.warn('Permissão de microfone negada:', err);
    return false;
  }
}

// 5. CONTACTS AGENDAS (Native Contacts API / VCF support)
export async function getContactsPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
    return 'granted';
  }
  return 'prompt'; // Web VCF import is always supported
}

export async function requestNativeContacts(): Promise<{ name: string; tel?: string; email?: string }[]> {
  if (typeof navigator !== 'undefined' && 'contacts' in navigator && (navigator as any).contacts?.select) {
    try {
      const props = ['name', 'tel', 'email'];
      const contacts = await (navigator as any).contacts.select(props, { multiple: true });
      if (Array.isArray(contacts)) {
        return contacts.map((c: any) => ({
          name: (c.name && c.name[0]) || 'Sem Nome',
          tel: (c.tel && c.tel[0]) || '',
          email: (c.email && c.email[0]) || '',
        }));
      }
    } catch (err) {
      console.warn('Seleção nativa de contatos cancelada ou não suportada:', err);
    }
  }
  return [];
}

// 6. PERSISTENT STORAGE (Memória anti-limpeza)
export async function getStoragePersistenceStatus(): Promise<{ persisted: boolean; usageMb: number; quotaMb: number }> {
  let persisted = false;
  let usageMb = 0;
  let quotaMb = 0;

  try {
    if (typeof navigator !== 'undefined' && navigator.storage) {
      if (navigator.storage.persisted) {
        persisted = await navigator.storage.persisted();
      }
      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        usageMb = Math.round(((estimate.usage || 0) / (1024 * 1024)) * 10) / 10;
        quotaMb = Math.round(((estimate.quota || 0) / (1024 * 1024)) * 10) / 10;
      }
    }
  } catch (err) {
    console.warn('Erro ao consultar persistência de memória:', err);
  }

  return { persisted, usageMb, quotaMb };
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    }
  } catch (err) {
    console.warn('Erro ao solicitar armazenamento persistente:', err);
  }
  return false;
}

// 7. CLIPBOARD (Área de Transferência)
export async function getClipboardPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return 'unsupported';
  }
  try {
    if (navigator.permissions?.query) {
      const result = await navigator.permissions.query({ name: 'clipboard-read' as any });
      return result.state as 'granted' | 'denied' | 'prompt';
    }
  } catch (_) {}
  return 'granted';
}

// 8. GEOLOCATION
export async function getGeolocationPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return 'unsupported';
  }
  try {
    if (navigator.permissions?.query) {
      const result = await navigator.permissions.query({ name: 'geolocation' as any });
      return result.state as 'granted' | 'denied' | 'prompt';
    }
  } catch (_) {}
  return 'prompt';
}

export async function requestGeolocationPermission(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return false;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { timeout: 8000 }
    );
  });
}

// REQUEST ALL PERMISSIONS IN BATCH
export async function requestAllPermissions(): Promise<{
  notifications: boolean;
  camera: boolean;
  microphone: boolean;
  storage: boolean;
  geolocation: boolean;
}> {
  const notif = await requestNotificationPermission();
  const cam = await requestCameraPermission();
  const mic = await requestMicrophonePermission();
  const storage = await requestPersistentStorage();
  const geo = await requestGeolocationPermission();

  return {
    notifications: notif,
    camera: cam,
    microphone: mic,
    storage: storage,
    geolocation: geo,
  };
}
