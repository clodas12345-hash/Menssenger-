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

export async function getExactAlarmPermissionStatus(): Promise<'granted' | 'denied' | 'unsupported'> { return 'granted'; }

export async function requestExactAlarmPermission(): Promise<boolean> { return true; }

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> { return 'unsupported'; }

export async function requestNotificationPermission(): Promise<'granted' | 'denied'> { return 'denied'; }

export async function sendAppNotification(
  title: string, 
  options?: { body?: string; id?: number; type?: any; extra?: Record<string, any> }
): Promise<boolean> {
  return false;
}

export async function sendBrowserNotification(title: string, options?: NotificationOptions): Promise<any> {
  return null;
}

export async function registerFcmTokenOnBackend(fcmToken: string): Promise<void> {}

export async function triggerPushMessageNotification(payload: any): Promise<void> {}

export async function initializePushNotifications(onOpenConversation?: any) {}

export function registerNotificationListeners(onOpenCampaign?: any): void {}

export function triggerVibration(pattern: number[] = [200, 100, 200, 100, 300]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (_) {}
}

export async function getCameraPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> { return 'denied'; }
export async function requestCameraPermission(): Promise<boolean> { return false; }
export async function getMicrophonePermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> { return 'denied'; }
export async function requestMicrophonePermission(): Promise<boolean> { return false; }
export async function getContactsPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> { return 'denied'; }
export async function requestNativeContacts(): Promise<any[]> { return []; }
export async function getStoragePersistenceStatus(): Promise<{ persisted: boolean; usageMb: number; quotaMb: number }> { return { persisted: false, usageMb: 0, quotaMb: 0 }; }
export async function requestPersistentStorage(): Promise<boolean> { return false; }
export async function getClipboardPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> { return 'denied'; }
export async function getGeolocationPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> { return 'denied'; }
export async function requestGeolocationPermission(): Promise<boolean> { return false; }
export async function requestAllPermissions(): Promise<any> {
  return { notifications: false, camera: false, microphone: false, storage: false, geolocation: false };
}

export async function isBatteryOptimizationExempt(): Promise<boolean> { return true; }
export async function requestIgnoreBatteryOptimization(): Promise<void> {}
export async function openBatteryOptimizationSettings(): Promise<void> {}

export function getCampaignScheduleId(str: string): number { return 1; }
export function getCampaignImmediateId(str: string): number { return 1; }
