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

export const NOTIFICATION_CHANNEL_ID = 'gkd_campaigns_v2';

// 1. NOTIFICATIONS (Local & Push)
export async function ensureNotificationChannel(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.createChannel({
        id: NOTIFICATION_CHANNEL_ID,
        name: 'Alertas de Disparos e Campanhas',
        description: 'Notificações prioritárias com alerta sonoro e banner para início e término de disparos',
        importance: 5, // IMPORTANCE_HIGH (5) ativa heads-up banner e som no Android
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

export async function getExactAlarmPermissionStatus(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      const res = await LocalNotifications.checkExactNotificationSetting();
      return res.exact_alarm === 'granted' ? 'granted' : 'denied';
    } catch (err) {
      console.warn('Erro ao verificar permissão de alarme exato:', err);
      return 'granted';
    }
  }
  return 'granted';
}

export async function requestExactAlarmPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      const check = await LocalNotifications.checkExactNotificationSetting();
      if (check.exact_alarm === 'granted') return true;
      const res = await LocalNotifications.changeExactNotificationSetting();
      return res.exact_alarm === 'granted';
    } catch (err) {
      console.warn('Erro ao solicitar permissão de alarme exato:', err);
      return false;
    }
  }
  return true;
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureNotificationChannel();
      const status = await LocalNotifications.checkPermissions();
      const enabledRes = await LocalNotifications.areEnabled().catch(() => ({ value: true }));
      if (status.display === 'granted' && enabledRes.value !== false) return 'granted';
      if (status.display === 'denied' || enabledRes.value === false) return 'denied';
      return 'prompt';
    } catch (err) {
      console.warn('Erro ao verificar permissão nativa:', err);
    }
  }
  return 'unsupported';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureNotificationChannel();
      const status = await LocalNotifications.requestPermissions();
      const enabledRes = await LocalNotifications.areEnabled().catch(() => ({ value: true }));
      return status.display === 'granted' && enabledRes.value !== false;
    } catch (err) {
      console.warn('Erro ao solicitar permissão nativa:', err);
    }
  }
  return false;
}

import { getSettings } from './storage';
import { NotificationPreferences } from '../types';

export async function sendAppNotification(
  title: string, 
  options?: { body?: string; id?: number; type?: keyof NotificationPreferences; extra?: Record<string, any> }
): Promise<boolean> {
  if (options?.type) {
    try {
      const settings = getSettings();
      if (settings?.notificationToggles && settings.notificationToggles[options.type] === false) {
        return false; // Disabled by user in settings
      }
    } catch (_) {}
  }

  // Exclusively Native Capacitor Notifications (Android/iOS)
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    await ensureNotificationChannel();
    let permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') {
      permStatus = await LocalNotifications.requestPermissions();
    }

    if (permStatus.display === 'granted') {
      const validId = (options?.id && !isNaN(options.id) && Number.isInteger(options.id))
        ? options.id
        : Math.floor(Math.random() * 900000) + 100000;

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body: options?.body || '',
            largeBody: options?.body || '',
            id: validId,
            smallIcon: 'ic_stat_icon',
            channelId: NOTIFICATION_CHANNEL_ID,
            autoCancel: true,
            extra: options?.extra || undefined
          }
        ]
      });
      return true;
    }
  } catch (capErr) {
    console.warn('LocalNotifications.schedule falhou:', capErr);
  }

  return false;
}

export async function sendBrowserNotification(title: string, options?: NotificationOptions): Promise<any> {
  const parsedId = options?.tag ? parseInt(options.tag.replace(/\D/g, ''), 10) : undefined;
  const validId = (parsedId && !isNaN(parsedId)) ? parsedId : undefined;
  return sendAppNotification(title, { body: options?.body, id: validId });
}

import { auth, saveUserPushTokenToFirestore } from '../firebase';

// Push Registration Logic (FCM via @capacitor/push-notifications)
export async function registerFcmTokenOnBackend(fcmToken: string): Promise<void> {
  if (!fcmToken) return;
  try {
    localStorage.setItem('gkd_fcm_token', fcmToken);
  } catch (_) {}

  const currentUser = auth.currentUser;
  const settings = getSettings();
  const userId =
    currentUser?.uid ||
    (settings?.mentorName ? settings.mentorName.replace(/[^a-zA-Z0-9_-]/g, '_') : '') ||
    localStorage.getItem('gkd_device_user_id') ||
    (() => {
      const generated = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      try {
        localStorage.setItem('gkd_device_user_id', generated);
      } catch (_) {}
      return generated;
    })();

  const platform = Capacitor.getPlatform();

  // 1. Register token on backend API associated with logged-in user
  try {
    await fetch('/api/push/register-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        fcmToken,
        platform,
        senderName: settings?.mentorName || currentUser?.displayName || 'Usuário',
      }),
    });
  } catch (err) {
    console.warn('Falha ao registrar FCM token no backend:', err);
  }

  // 2. Also persist in Firestore if Firebase Auth user is signed in
  if (currentUser) {
    try {
      await saveUserPushTokenToFirestore(fcmToken, platform);
    } catch (err) {
      console.warn('Falha ao salvar FCM token no Firestore:', err);
    }
  }
}

export async function triggerPushMessageNotification(payload: {
  recipientUserId?: string;
  fcmToken?: string;
  senderName: string;
  messageSnippet: string;
  conversationId?: string;
  campaignId?: string;
  contactId?: string;
  phone?: string;
}): Promise<void> {
  try {
    const fallbackToken = payload.fcmToken || localStorage.getItem('gkd_fcm_token') || undefined;
    const fallbackUserId =
      payload.recipientUserId ||
      auth.currentUser?.uid ||
      localStorage.getItem('gkd_device_user_id') ||
      undefined;

    await fetch('/api/push/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        recipientUserId: fallbackUserId,
        fcmToken: fallbackToken,
      }),
    });
  } catch (err) {
    console.warn('Erro ao acionar push notification no backend:', err);
  }
}

export async function initializePushNotifications(
  onOpenConversation?: (data: {
    conversationId?: string;
    campaignId?: string;
    contactId?: string;
    phone?: string;
  }) => void
) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await ensureNotificationChannel();
    await PushNotifications.removeAllListeners();

    // 1. On successful FCM registration, store token and associate with logged user in backend
    await PushNotifications.addListener('registration', async (token) => {
      console.info('Push registration success, token: ' + token.value);
      await registerFcmTokenOnBackend(token.value);
    });

    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('Push registration error: ' + err.error);
    });

    // 2. Foreground push received: display heads-up notification with monochromatic ic_stat_icon
    await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      console.info('Push notification received: ', notification);
      const data = notification.data || {};
      await sendAppNotification(notification.title || data.senderName || 'Nova Mensagem', {
        body: notification.body || data.messageSnippet || '',
        extra: data,
      });
    });

    // 3. Notification click action performed (background/closed app or foreground) -> open direct conversation/campaign
    await PushNotifications.addListener('pushNotificationActionPerformed', (notificationAction) => {
      console.info('Push notification action performed', notificationAction);
      const data = notificationAction.notification?.data || {};
      if (onOpenConversation) {
        onOpenConversation({
          conversationId: data.conversationId,
          campaignId: data.campaignId || data.conversationId,
          contactId: data.contactId,
          phone: data.phone,
        });
      }
    });

    // Request permissions on startup
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
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

import { BatteryOptimization } from '@capawesome-team/capacitor-android-battery-optimization';
import { ScheduledCampaign } from '../types';

export async function isBatteryOptimizationExempt(): Promise<boolean> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      const isEnabled = await BatteryOptimization.isBatteryOptimizationEnabled();
      return !isEnabled;
    } catch (err) {
      console.warn('Erro ao verificar otimização de bateria:', err);
    }
  }
  return true;
}

export async function requestIgnoreBatteryOptimization(): Promise<void> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      await BatteryOptimization.requestIgnoreBatteryOptimization();
    } catch (err) {
      console.warn('Erro ao solicitar isenção de otimização de bateria:', err);
    }
  }
}

export async function openBatteryOptimizationSettings(): Promise<void> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      await BatteryOptimization.openBatteryOptimizationSettings();
    } catch (err) {
      console.warn('Erro ao abrir configurações de otimização de bateria:', err);
    }
  }
}

// Convert string ID to positive integer for scheduled alarms (range: 1 to 500,000)
export function getCampaignScheduleId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 500000) + 1;
}

// Convert string ID to positive integer for immediate foreground notifications (range: 500,001 to 999,999)
export function getCampaignImmediateId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 499999) + 500001;
}

// Sync all future scheduled campaigns as native local notifications
export async function syncLocalNotifications(campaigns: ScheduledCampaign[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // 0. Ensure high-priority notification channel is active
    await ensureNotificationChannel();

    // Ensure permissions are requested
    let permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') {
      permStatus = await LocalNotifications.requestPermissions();
    }
    if (permStatus.display !== 'granted') return;

    const now = Date.now();

    // 1. Identify campaigns that are scheduled for the future (> now + 2000ms)
    const futureCamps = campaigns.filter(c => 
      c.status !== 'concluido' && 
      c.status !== 'cancelado' && 
      (c.progress?.sent || 0) < c.contactIds.length && 
      new Date(c.scheduledAt).getTime() > now + 2000
    );

    // 2. Identify campaigns that are still active (either future OR due/em_andamento right now)
    // We MUST NOT call LocalNotifications.cancel() on a campaign that just became due,
    // because LocalNotifications.cancel() calls dismissVisibleNotification(id) in Android!
    const allActiveIds = new Set(
      campaigns
        .filter(c => c.status !== 'concluido' && c.status !== 'cancelado' && (c.progress?.sent || 0) < c.contactIds.length)
        .map(c => getCampaignScheduleId(c.id))
    );

    // 3. Only cancel pending scheduled notifications that belong to deleted, cancelled, or completed campaigns
    const pending = await LocalNotifications.getPending();
    if (pending.notifications && pending.notifications.length > 0) {
      const toCancel = pending.notifications
        .filter(n => !allActiveIds.has(n.id))
        .map(n => ({ id: n.id }));
      if (toCancel.length > 0) {
        await LocalNotifications.cancel({ notifications: toCancel });
      }
    }

    // 4. Schedule or update future campaigns in batch
    if (futureCamps.length > 0) {
      const notificationsToSchedule = futureCamps.map(camp => {
        const id = getCampaignScheduleId(camp.id);
        const rawMs = new Date(camp.scheduledAt).getTime();
        const safeMs = Math.max(rawMs, Date.now() + 2000);
        const scheduledTime = new Date(safeMs);
        const bodyText = `Agendamento pronto com ${camp.contactIds.length} contato(s). Toque para abrir o disparador!`;

        return {
          title: `🚨 HORA DO DISPARO: "${camp.title}"`,
          body: bodyText,
          largeBody: bodyText,
          id,
          smallIcon: 'ic_stat_icon',
          channelId: NOTIFICATION_CHANNEL_ID,
          autoCancel: true,
          schedule: { at: scheduledTime, allowWhileIdle: true },
          extra: {
            campaignId: camp.id
          }
        };
      });

      await LocalNotifications.schedule({
        notifications: notificationsToSchedule
      });
    }
  } catch (err) {
    console.warn('Erro ao sincronizar notificações locais:', err);
  }
}

export function registerNotificationListeners(onOpenCampaign?: (campaignId: string) => void): void {
  if (!Capacitor.isNativePlatform()) return;

  try {
    LocalNotifications.removeAllListeners().then(() => {
      LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
        const extra = notificationAction.notification.extra;
        if (extra && extra.campaignId && onOpenCampaign) {
          onOpenCampaign(extra.campaignId);
        }
      });
    }).catch(err => {
      console.warn('Erro ao registrar ouvintes de notificação:', err);
    });
  } catch (err) {
    console.warn('Erro ao inicializar listeners:', err);
  }
}
