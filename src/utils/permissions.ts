/**
 * Permissions and System Capabilities Manager for GKD Messenger
 * Handles Browser Notifications, Camera, Microphone, Contacts Agenda, Persistent Memory & Storage, Clipboard, and Geolocation.
 * Enhanced with Capacitor Native support for Android/iOS (Local and Push Notifications).
 */
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

export interface PermissionItem {
  id: 'notifications' | 'camera' | 'microphone' | 'contacts' | 'storage' | 'clipboard' | 'geolocation';
  title: string;
  description: string;
  status: 'granted' | 'denied' | 'prompt' | 'unsupported';
  icon: string;
  actionLabel: string;
  details?: string;
}

// 1. NOTIFICATIONS (Local & Push)
export async function ensureNotificationChannel(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.createChannel({
        id: 'gkd_campaigns',
        name: 'Alertas de Disparos e Campanhas',
        description: 'Notificações prioritárias para início e término de disparos',
        importance: 5, // IMPORTANCE_HIGH (5) ativa heads-up banner no Android
        visibility: 1, // VISIBILITY_PUBLIC (1) exibe na tela de bloqueio
        vibration: true,
        lights: true,
        lightColor: '#D4AF37',
      });
    } catch (err) {
      console.warn('Erro ao configurar canal de notificação:', err);
    }
  }
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return 'granted';
      if (status.display === 'denied') return 'denied';
      return 'prompt';
    } catch (err) {
      console.warn('Erro ao verificar permissão nativa:', err);
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as 'granted' | 'denied' | 'prompt';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureNotificationChannel();
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } catch (err) {
      console.warn('Erro ao solicitar permissão nativa:', err);
      return false;
    }
  }

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

export async function sendBrowserNotification(title: string, options?: NotificationOptions): Promise<any> {
  // Native logic (Local on Android/iOS via Capacitor)
  if (Capacitor.isNativePlatform()) {
    try {
      const isGranted = await requestNotificationPermission();
      if (!isGranted) return null;

      await ensureNotificationChannel();

      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: options?.body || 'Nova notificação do GKD Messenger',
            id: Math.floor(Math.random() * 1000000) + 1,
            smallIcon: 'ic_stat_icon',
            sound: 'default'
          }
        ]
      });
      return true;
    } catch (err) {
      console.warn('Erro ao disparar notificação nativa:', err);
      return null;
    }
  }

  // Browser / PWA logic
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }
  if (Notification.permission !== 'granted') {
    return null;
  }
  try {
    const defaultOptions: NotificationOptions = {
      icon: '/logo.png',
      badge: '/favicon.ico',
      silent: false,
      tag: options?.tag || `gkd-alert-${Date.now()}`,
      ...options,
    };

    // On Android Chrome & mobile PWA, 'new Notification()' throws TypeError (Illegal constructor).
    // ServiceWorkerRegistration.showNotification MUST be used!
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(title, defaultOptions);
          return true;
        }
      } catch (swErr) {
        console.warn('ServiceWorker showNotification fallback:', swErr);
      }
    }

    // Desktop browser fallback
    try {
      const notification = new Notification(title, defaultOptions);
      setTimeout(() => {
        try {
          notification.close();
        } catch (_) {}
      }, 10000);
      return notification;
    } catch (ctorErr) {
      console.warn('Erro ao instanciar Notification diretamente:', ctorErr);
      return null;
    }
  } catch (err) {
    console.warn('Erro ao disparar notificação do navegador:', err);
    return null;
  }
}

// Push Registration Logic
// Push Registration Logic
export async function initializePushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Add listeners
    await PushNotifications.addListener('registration', token => {
      console.info('Push registration success, token: ' + token.value);
    });

    await PushNotifications.addListener('registrationError', err => {
      console.warn('Push registration error: ' + err.error);
    });

    await PushNotifications.addListener('pushNotificationReceived', notification => {
      console.info('Push notification received: ', notification);
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', notification => {
      console.info('Push notification action performed', notification);
    });

    // Request permissions
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('User denied push permissions!');
      return;
    }

    await PushNotifications.register();
  } catch (err) {
    console.warn('Push notification initialization skipped or unavailable:', err);
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

// 5. CONTACTS AGENDAS
export async function getContactsPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
    return 'granted';
  }
  return 'prompt';
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

// 6. PERSISTENT STORAGE
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

// 7. CLIPBOARD
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
  
  // Push initialization
  if (notif) {
    initializePushNotifications().catch(console.error);
  }

  return {
    notifications: notif,
    camera: cam,
    microphone: mic,
    storage: storage,
    geolocation: geo,
  };
}
