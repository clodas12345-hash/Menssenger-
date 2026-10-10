import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function onAuthUserChanged(callback: (user: import('firebase/auth').User | null) => void) {
  return auth.onAuthStateChanged(callback);
}

export async function signOutFirebase() {
  return signOut(auth);
}

export function sanitizeSyncKey(key: string): string {
  return (key || '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-\.\@]/g, '')
    .slice(0, 128);
}

export function getOrCreateDefaultSyncKey(): string {
  try {
    const stored = localStorage.getItem('gkd_cloud_sync_key');
    if (stored && sanitizeSyncKey(stored).length >= 3) {
      return sanitizeSyncKey(stored);
    }
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newKey = `GKD-${randomSuffix}`;
    localStorage.setItem('gkd_cloud_sync_key', newKey);
    return newKey;
  } catch {
    return 'GKD-PADRAO';
  }
}

export function saveLocalSyncKey(key: string): void {
  try {
    const sanitized = sanitizeSyncKey(key);
    if (sanitized.length >= 3) {
      localStorage.setItem('gkd_cloud_sync_key', sanitized);
    }
  } catch {}
}

export async function saveUserCloudBackup(
  payloadJson: string,
  deviceLabel: string = 'GKD Messenger',
  providedSyncKey?: string
): Promise<{ syncKey: string }> {
  if (payloadJson.length > 900000) {
    throw new Error('O volume de dados excede o limite de 900KB do Firestore. Limpe logs antigos ou use o backup em arquivo JSON.');
  }

  const user = auth.currentUser;
  const rawKey = providedSyncKey || (user ? user.email || user.uid : '') || getOrCreateDefaultSyncKey();
  const sanitizedKey = sanitizeSyncKey(rawKey) || getOrCreateDefaultSyncKey();
  saveLocalSyncKey(sanitizedKey);

  const sanitizedDeviceLabel = (deviceLabel || 'GKD Messenger').slice(0, 120);
  const cloudPath = `cloud_backups/${sanitizedKey}`;
  const cloudDocRef = doc(db, 'cloud_backups', sanitizedKey);

  // 1. Save directly into cloud_backups (fully accessible by sync key on mobile APK and web)
  let cloudExists = false;
  try {
    const snap = await getDoc(cloudDocRef);
    cloudExists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, cloudPath);
  }

  if (!cloudExists) {
    try {
      await setDoc(cloudDocRef, {
        syncKey: sanitizedKey,
        payloadJson,
        deviceLabel: sanitizedDeviceLabel,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, cloudPath);
    }
  } else {
    try {
      await updateDoc(cloudDocRef, {
        payloadJson,
        deviceLabel: sanitizedDeviceLabel,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, cloudPath);
    }
  }

  // 2. Mirror into user_backups if authenticated with Google
  if (user) {
    const sanitizedOwnerId = user.uid.slice(0, 128);
    const userPath = `user_backups/${sanitizedOwnerId}`;
    const userDocRef = doc(db, 'user_backups', sanitizedOwnerId);
    try {
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) {
        await setDoc(userDocRef, {
          ownerId: sanitizedOwnerId,
          payloadJson,
          deviceLabel: sanitizedDeviceLabel,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(userDocRef, {
          payloadJson,
          deviceLabel: sanitizedDeviceLabel,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (mirrorErr) {
      console.warn('Mirroring to user_backups skipped:', mirrorErr);
    }
  }

  return { syncKey: sanitizedKey };
}

export async function loadUserCloudBackup(
  providedSyncKey?: string
): Promise<{ payloadJson: string; deviceLabel: string; syncKey?: string } | null> {
  const user = auth.currentUser;
  const rawKey = providedSyncKey || (user ? user.email || user.uid : '') || getOrCreateDefaultSyncKey();
  const sanitizedKey = sanitizeSyncKey(rawKey);

  // 1. First attempt to load by sync key from cloud_backups
  if (sanitizedKey && sanitizedKey.length >= 3) {
    const cloudPath = `cloud_backups/${sanitizedKey}`;
    const cloudDocRef = doc(db, 'cloud_backups', sanitizedKey);
    try {
      const snap = await getDoc(cloudDocRef);
      if (snap.exists()) {
        const data = snap.data();
        saveLocalSyncKey(sanitizedKey);
        return {
          payloadJson: String(data.payloadJson || '{}'),
          deviceLabel: String(data.deviceLabel || 'GKD Messenger'),
          syncKey: sanitizedKey,
        };
      }
    } catch (error) {
      console.warn('Error reading from cloud_backups:', error);
    }
  }

  // 2. If not found or if authenticated with Google, check user_backups
  if (user) {
    const sanitizedOwnerId = user.uid.slice(0, 128);
    const path = `user_backups/${sanitizedOwnerId}`;
    const docRef = doc(db, 'user_backups', sanitizedOwnerId);

    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          payloadJson: String(data.payloadJson || '{}'),
          deviceLabel: String(data.deviceLabel || 'GKD Messenger'),
        };
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  return null;
}

export async function saveUserPushTokenToFirestore(fcmToken: string, platform: string = 'android'): Promise<void> {
  const user = auth.currentUser;
  if (!user || !fcmToken || fcmToken.length < 10) return;

  const sanitizedOwnerId = user.uid.slice(0, 128);
  const sanitizedToken = fcmToken.slice(0, 4096);
  const sanitizedPlatform = (platform || 'android').slice(0, 32);
  const path = `user_push_tokens/${sanitizedOwnerId}`;
  const docRef = doc(db, 'user_push_tokens', sanitizedOwnerId);

  let exists = false;
  try {
    const snap = await getDoc(docRef);
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!exists) {
    try {
      await setDoc(docRef, {
        ownerId: sanitizedOwnerId,
        fcmToken: sanitizedToken,
        platform: sanitizedPlatform,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } else {
    try {
      await updateDoc(docRef, {
        fcmToken: sanitizedToken,
        platform: sanitizedPlatform,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}

