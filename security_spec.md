# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Identity Isolation**: A user backup (`/user_backups/{userId}`) or push token (`/user_push_tokens/{userId}`) can only be read, created, or updated by the authenticated user whose `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
2. **Owner Field Integrity**: `incoming().ownerId` must strictly equal `request.auth.uid` and `userId`, and cannot be mutated on update (`incoming().ownerId == existing().ownerId`).
3. **Strict Schema & Size Boundaries**:
   - `UserBackup`: Only keys `['ownerId', 'payloadJson', 'deviceLabel', 'createdAt', 'updatedAt']` are allowed. `payloadJson` max 900,000 chars; `deviceLabel` max 120 chars; `ownerId` max 128 chars matching `^[a-zA-Z0-9_\-]+$`.
   - `UserPushToken`: Only keys `['ownerId', 'fcmToken', 'platform', 'createdAt', 'updatedAt']` are allowed. `fcmToken` max 4,096 chars; `platform` max 32 chars.
4. **Temporal Integrity**: `createdAt` must equal `request.time` on creation and remain immutable on update. `updatedAt` must equal `request.time` on both creation and update.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: Creating `/user_backups/user_1` with `auth == null`.
2. **Unverified Email Spoof**: Creating `/user_backups/user_1` with `email_verified == false`.
3. **Cross-User Path Write**: Authenticated `user_1` writing to `/user_backups/user_2`.
4. **OwnerId Spoofing on Create**: Authenticated `user_1` writing to `/user_backups/user_1` with `ownerId: "user_2"`.
5. **Shadow Field Injection on Create**: Creating `/user_backups/user_1` with extra field `isAdmin: true`.
6. **Shadow Field Injection on Update**: Updating `/user_backups/user_1` with extra field `hacked: "yes"`.
7. **Immutable Field Mutation (`ownerId`)**: Updating `/user_backups/user_1` to change `ownerId` to `"user_2"`.
8. **Immutable Field Mutation (`createdAt`)**: Updating `/user_backups/user_1` with a modified `createdAt` timestamp.
9. **Client Timestamp Forgery**: Creating `/user_backups/user_1` with a past/future timestamp instead of `request.time`.
10. **Payload Size Exhaustion (Denial of Wallet)**: Writing `payloadJson` exceeding 900,000 characters or `deviceLabel` exceeding 120 characters.
11. **Type Poisoning on Update**: Updating `payloadJson` with a number or boolean (`payloadJson: 12345`).
12. **Cross-User Read (PII Leak)**: Authenticated `user_2` attempting `get` or `list` on `/user_backups/user_1`.
