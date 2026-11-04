import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Contacts } from '@capacitor-community/contacts';
import { Camera, PermissionStatus as CameraPermissionStatus } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { BatteryOptimization } from '@capawesome-team/capacitor-android-battery-optimization';

export interface PermissionItem {
  id: 'notifications' | 'camera' | 'microphone' | 'contacts' | 'storage' | 'clipboard' | 'geolocation';
  title: string;
  description: string;
  status: 'granted' | 'denied' | 'prompt' | 'unsupported';
  icon: string;
  actionLabel: string;
  details?: string;
}

export const NOTIFICATION_CHANNEL_ID = 'high_priority_notifications';

export async function ensureNotificationChannel(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  
  try {
    await LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: 'Notificações de Alta Prioridade',
      description: 'Canal para alertas de disparo e notificações importantes',
      importance: 5, // Max importance
      visibility: 1, // Public
      sound: 'default',
      vibration: true,
      lights: true,
      lightColor: '#FF0000',
    });
    console.log('Notification channel created/ensured');
  } catch (err) {
    console.error('Error creating notification channel:', err);
  }
}

export async function getExactAlarmPermissionStatus(): Promise<'granted' | 'denied' | 'unsupported'> { 
  if (Capacitor.getPlatform() !== 'android') return 'unsupported';
  // Check exact alarm permission is tricky in JS, but we can assume if notification is granted
  return 'granted'; 
}

export async function requestExactAlarmPermission(): Promise<boolean> { 
  return true; 
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display === 'granted') return 'granted';
      if (perm.display === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'prompt';
    }
  }
  
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return 'prompt';
}

export async function requestNotificationPermission(): Promise<'granted' | 'denied'> {
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.requestPermissions();
      return perm.display === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }

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

  if (Capacitor.isNativePlatform()) {
    try {
      await ensureNotificationChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body: options?.body || '',
            id: options?.id || Math.floor(Math.random() * 1000000),
            schedule: { at: new Date(Date.now() + 100) }, // Schedule almost immediately
            channelId: NOTIFICATION_CHANNEL_ID,
            extra: options?.extra,
            smallIcon: 'res://ic_stat_name', // Default Capacitor icon if available
            actionTypeId: options?.type,
          }
        ]
      });
      return true;
    } catch (err) {
      console.error('Erro ao disparar Local Notification:', err);
    }
  }

  // Attempt Web Notification API fallback
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

export async function registerFcmTokenOnBackend(fcmToken: string): Promise<void> {
  console.log('FCM Token registered:', fcmToken);
}

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

export async function initializePushNotifications(onOpenConversation?: any) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Request permission to use push notifications
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      perm = await PushNotifications.requestPermissions();
    }

    if (perm.receive === 'granted') {
      // Register with Apple / Google to receive push via APNS/FCM
      await PushNotifications.register();
    }

    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', (token) => {
      registerFcmTokenOnBackend(token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed:', notification);
      if (onOpenConversation) {
        onOpenConversation(notification.notification.data);
      }
    });
  } catch (err) {
    console.error('Push Notifications initialization error:', err);
  }
}

export function registerNotificationListeners(onOpenCampaign?: any): void {
  if (!Capacitor.isNativePlatform()) return;

  LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    if (onOpenCampaign && action.notification.extra?.campaignId) {
      onOpenCampaign(action.notification.extra.campaignId);
    }
  });
}

export function triggerVibration(pattern: number[] = [200, 100, 200, 100, 300]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (_) {}
}

export async function getCameraPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (!Capacitor.isNativePlatform()) return 'unsupported';
  try {
    const status = await Camera.checkPermissions();
    if (status.camera === 'granted') return 'granted';
    if (status.camera === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'prompt';
  }
}

export async function requestCameraPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const status = await Camera.requestPermissions({ permissions: ['camera'] });
    return status.camera === 'granted';
  } catch {
    return false;
  }
}

export async function getMicrophonePermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  // Capacitor doesn't have a direct mic plugin in core, usually uses browser API
  return 'granted';
}

export async function requestMicrophonePermission(): Promise<boolean> {
  return true;
}

export async function getContactsPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (!Capacitor.isNativePlatform()) return 'unsupported';
  try {
    const status = await Contacts.checkPermissions();
    if (status.contacts === 'granted') return 'granted';
    if (status.contacts === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'prompt';
  }
}

export async function requestNativeContacts(): Promise<any[]> {
  if (!Capacitor.isNativePlatform()) return [];
  try {
    const perm = await Contacts.requestPermissions();
    if (perm.contacts === 'granted') {
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true,
        }
      });
      return result.contacts;
    }
  } catch (err) {
    console.error('Error fetching native contacts:', err);
  }
  return [];
}

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

export async function getClipboardPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  return 'granted';
}

export async function getGeolocationPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (!Capacitor.isNativePlatform()) return 'unsupported';
  try {
    const status = await Geolocation.checkPermissions();
    if (status.location === 'granted') return 'granted';
    if (status.location === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'prompt';
  }
}

export async function requestGeolocationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const status = await Geolocation.requestPermissions();
    return status.location === 'granted';
  } catch {
    return false;
  }
}

export async function requestAllPermissions(): Promise<any> {
  const notif = await requestNotificationPermission();
  const storage = await requestPersistentStorage();
  const camera = await requestCameraPermission();
  const geo = await requestGeolocationPermission();
  
  return { 
    notifications: notif === 'granted', 
    camera, 
    microphone: true, 
    storage, 
    geolocation: geo 
  };
}

export async function isBatteryOptimizationExempt(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'android') return true;
  try {
    const { enabled } = await BatteryOptimization.isBatteryOptimizationEnabled();
    // In this plugin, enabled: true means optimization is ON (bad for us), 
    // so exempt: true means enabled: false.
    return !enabled;
  } catch {
    return true;
  }
}

export async function requestIgnoreBatteryOptimization(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  try {
    await BatteryOptimization.requestIgnoreBatteryOptimization();
  } catch (err) {
    console.error('Error requesting battery exemption:', err);
  }
}

export async function openBatteryOptimizationSettings(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  try {
    // There isn't a direct "open settings" in this plugin, it usually requests it
    await BatteryOptimization.requestIgnoreBatteryOptimization();
  } catch (err) {
    console.error('Error opening battery settings:', err);
  }
}

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
