# Security Specification (`security_spec.md`)

## 1. Data Invariants
- A `UserBackup` document at `/user_backups/{userId}` can only be read, created, updated, or deleted by the authenticated user whose `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
- `ownerId` must strictly equal `request.auth.uid` and `userId` on creation and remain immutable on update.
- `createdAt` must equal `request.time` on creation and remain immutable on update.
- `updatedAt` must equal `request.time` on creation and update.
- All string fields must respect strict `.size()` boundaries (`ownerId <= 128`, `deviceLabel <= 120`, `payloadJson <= 900000`).

## 2. The "Dirty Dozen" Payloads
1. Unauthenticated read/write to `/user_backups/user_123`.
2. Unverified email (`email_verified == false`) attempting to create `/user_backups/user_123`.
3. Identity spoofing: Authenticated `user_A` writing to `/user_backups/user_B`.
4. Body ownerId mismatch: Authenticated `user_A` writing to `/user_backups/user_A` with `ownerId: "user_B"`.
5. Shadow field injection: Adding `isAdmin: true` to `/user_backups/user_A`.
6. Missing required field: Omitting `deviceLabel` on create.
7. Immutable field mutation: Changing `ownerId` or `createdAt` during update.
8. Forged client timestamp: Passing a past/future timestamp instead of `request.time` for `createdAt` or `updatedAt`.
9. Resource poisoning: `deviceLabel` exceeding 120 chars or `payloadJson` exceeding 900,000 chars.
10. Type confusion: Passing a number or boolean for `payloadJson` or `deviceLabel`.
11. ID poisoning: Document ID containing invalid characters or exceeding 128 chars.
12. Unauthorized collection access: Reading or writing to `/unknown_collection/doc_1`.
