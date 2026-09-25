# Production backup and restore

Production data lives outside immutable releases under `shared/data` and `shared/uploads`.

## Backup layers

- Every successful push CI must create a **pre-deploy snapshot** before the deployment workflow is dispatched. If the SQLite backup or uploads archive fails, deployment stops.
- `Backup production` runs daily at 03:15 Asia/Ho_Chi_Minh and keeps the latest 14 scheduled VPS snapshots.
- SQLite snapshots use `better-sqlite3` backup plus `PRAGMA integrity_check`; copying a live WAL database file directly is intentionally avoided.
- Each snapshot contains `wedding.sqlite`, `metadata.json`, `uploads.tgz`, and a `COMPLETE` marker.
- If the production environment secret `BACKUP_ENCRYPTION_KEY` is configured, the daily workflow also uploads an AES-256 encrypted GitHub artifact with 30-day retention. Plaintext guest/RSVP/photo data is never uploaded as an artifact.

## Restore drill

1. Stop the PM2 app before changing persistent data.
2. Copy the current `shared/data` and `shared/uploads` aside so the restore itself is reversible.
3. Choose a snapshot that has a `COMPLETE` marker.
4. Replace the configured SQLite database with the snapshot `wedding.sqlite` and extract `uploads.tgz` into `shared` so it recreates `shared/uploads`.
5. Start the currently deployed release, open the public invitation, log into admin, verify guests/RSVPs, and load several uploaded images.
6. Keep the pre-restore copy until the full verification passes.

Encrypted offsite artifacts can be decrypted with:

```sh
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in production-backup-<snapshot>.tar.gz.enc \
  -out production-backup.tar.gz \
  -pass env:BACKUP_ENCRYPTION_KEY
```

Do not store the encryption key in this repository or inside the backup artifact.
