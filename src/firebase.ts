import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
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
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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

export async function saveUserCloudBackup(payloadJson: string, deviceLabel: string = 'GKD Messenger'): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado no Firebase. Conecte sua conta Google primeiro.');
  }

  const sanitizedOwnerId = user.uid.slice(0, 128);
  const sanitizedDeviceLabel = (deviceLabel || 'GKD Messenger').slice(0, 120);
  if (payloadJson.length > 900000) {
    throw new Error('O volume de dados excede o limite de 900KB do Firestore. Limpe logs antigos ou use o backup em arquivo JSON.');
  }
  const sanitizedPayload = payloadJson;
  const path = `user_backups/${sanitizedOwnerId}`;
  const docRef = doc(db, 'user_backups', sanitizedOwnerId);

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
        payloadJson: sanitizedPayload,
        deviceLabel: sanitizedDeviceLabel,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } else {
    try {
      await updateDoc(docRef, {
        payloadJson: sanitizedPayload,
        deviceLabel: sanitizedDeviceLabel,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}

export async function loadUserCloudBackup(): Promise<{ payloadJson: string; deviceLabel: string } | null> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado no Firebase.');
  }

  const sanitizedOwnerId = user.uid.slice(0, 128);
  const path = `user_backups/${sanitizedOwnerId}`;
  const docRef = doc(db, 'user_backups', sanitizedOwnerId);

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      payloadJson: String(data.payloadJson || '{}'),
      deviceLabel: String(data.deviceLabel || 'GKD Messenger'),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
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

