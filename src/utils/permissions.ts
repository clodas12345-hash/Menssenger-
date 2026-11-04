import { Capacitor } from '@capacitor/core';

export interface PermissionItem {
  id: 'notifications' | 'camera' | 'microphone' | 'contacts' | 'storage' | 'clipboard' | 'geolocation';
  title: string;
  description: string;
  status: 'granted' | 'denied' | 'prompt' | 'unsupported';
  icon: string;
  actionLabel: string;
  details?: string;
}

export const NOTIFICATION_CHANNEL_ID = 'padrao';

export async function ensureNotificationChannel(): Promise<void> {}

export async function getExactAlarmPermissionStatus(): Promise<'granted' | 'denied' | 'unsupported'> { 
  return 'granted'; 
}

export async function requestExactAlarmPermission(): Promise<boolean> { 
  return true; 
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return 'prompt';
}

export async function requestNotificationPermission(): Promise<'granted' | 'denied'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const res = await Notification.requestPermission();
    return res === 'granted' ? 'granted' : 'denied';
  } catch (err) {
    console.error('Erro ao solicitar permissão de notificação:', err);
    return 'denied';
  }
}

export async function sendAppNotification(
  title: string, 
  options?: { body?: string; id?: number; type?: any; extra?: Record<string, any>; icon?: string }
): Promise<boolean> {
  // Always trigger vibration feedback
  triggerVibration([250, 100, 250, 100, 300]);

  // Attempt Web Notification API
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body: options?.body,
          icon: options?.icon || '/assets/aistudio/logo.png',
          badge: '/assets/aistudio/logo.png',
          tag: options?.id ? String(options.id) : undefined,
          data: options?.extra,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
        return true;
      } catch (err) {
        console.error('Erro ao disparar notificação Web:', err);
      }
    } else if (Notification.permission !== 'denied') {
      const permission = await requestNotificationPermission();
      if (permission === 'granted') {
        return sendAppNotification(title, options);
      }
    }
  }

  return false;
}

export async function sendBrowserNotification(title: string, options?: NotificationOptions): Promise<any> {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        return new Notification(title, options);
      } catch (err) {
        console.error('Erro em sendBrowserNotification:', err);
      }
    }
  }
  return null;
}

export async function registerFcmTokenOnBackend(fcmToken: string): Promise<void> {}

export async function triggerPushMessageNotification(payload: any): Promise<void> {
  if (payload) {
    const sender = payload.senderName || 'Mensseger';
    const body = payload.messageSnippet || payload.phone || 'Mensagem enviada';
    await sendAppNotification(`📲 ${sender}`, {
      body,
      extra: payload,
    });
  }
}

export async function initializePushNotifications(onOpenConversation?: any) {}

export function registerNotificationListeners(onOpenCampaign?: any): void {}

export function triggerVibration(pattern: number[] = [200, 100, 200, 100, 300]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (_) {}
}

export async function getCameraPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> { return 'granted'; }
export async function requestCameraPermission(): Promise<boolean> { return true; }
export async function getMicrophonePermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> { return 'granted'; }
export async function requestMicrophonePermission(): Promise<boolean> { return true; }
export async function getContactsPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> { return 'granted'; }
export async function requestNativeContacts(): Promise<any[]> { return []; }

export async function getStoragePersistenceStatus(): Promise<{ persisted: boolean; usageMb: number; quotaMb: number }> {
  let persisted = false;
  let usageMb = 0;
  let quotaMb = 0;
  if (typeof navigator !== 'undefined' && navigator.storage) {
    if (navigator.storage.persisted) {
      try {
        persisted = await navigator.storage.persisted();
      } catch (_) {}
    }
    if (navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        usageMb = Math.round((est.usage || 0) / (1024 * 1024));
        quotaMb = Math.round((est.quota || 0) / (1024 * 1024));
      } catch (_) {}
    }
  }
  return { persisted, usageMb, quotaMb };
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist();
    } catch (_) {}
  }
  return false;
}

export async function getClipboardPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> { return 'granted'; }
export async function getGeolocationPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> { return 'granted'; }
export async function requestGeolocationPermission(): Promise<boolean> { return true; }
export async function requestAllPermissions(): Promise<any> {
  const notif = await requestNotificationPermission();
  const storage = await requestPersistentStorage();
  return { 
    notifications: notif === 'granted', 
    camera: true, 
    microphone: true, 
    storage, 
    geolocation: true 
  };
}

export async function isBatteryOptimizationExempt(): Promise<boolean> { return true; }
export async function requestIgnoreBatteryOptimization(): Promise<void> {}
export async function openBatteryOptimizationSettings(): Promise<void> {}

export function getCampaignScheduleId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getCampaignImmediateId(str: string): number {
  return getCampaignScheduleId(str) + 1;
}
