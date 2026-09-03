# Triển khai Oracle VPS

Production chạy bằng Node.js + PM2 + Nginx trên Oracle VPS ARM64. Repo có CI/CD GitHub Actions theo mô hình **build/test ở GitHub, VPS chỉ nhận artifact ARM64 đã build sẵn và restart PM2**.

## Kiến trúc release

CD không `git pull`, `npm ci` hay `npm run build` trên VPS. GitHub Actions chạy test, build standalone bằng runner ARM64, smoke test artifact rồi mới upload qua SSH.

Dữ liệu runtime nằm ngoài release:

```text
<VPS_APP_ROOT>/
├── shared/
│   ├── .env
│   ├── data/
│   │   ├── wedding.sqlite
│   │   └── backups/
│   └── uploads/
├── releases/
│   ├── <commit-sha>/
│   └── ...
├── current -> releases/<commit-sha>
├── incoming/
└── DEPLOYED_REVISION
```

Mỗi release symlink `data`, `public/uploads` và `.env` về `shared/`. Vì vậy rollback code không rollback database, ảnh hay nhạc.

`better-sqlite3` có native binary nên release production được build trên `ubuntu-24.04-arm`, cùng kiến trúc ARM64 với Oracle VPS. CI x64 thông thường vẫn chạy unit/lint/build/E2E trước đó.

## Chuẩn bị Node.js, PM2 và Nginx

Cần:

- Node.js 22.5 trở lên.
- PM2 cài global và cấu hình `pm2 startup`.
- `curl` và `tar`.
- Nginx reverse proxy tới `127.0.0.1:3000` (hoặc `VPS_APP_PORT`).

Cấu hình domain/HTTPS như cũ:

1. Mở TCP 80/443 trong OCI Security List/NSG và UFW.
2. Dùng `deploy/nginx-wedding.conf` cho Nginx.
3. Chạy `sudo nginx -t && sudo systemctl reload nginx`.
4. Dùng Certbot cho HTTPS.

Nginx phải proxy `/uploads/` về Next.js; không alias thẳng vào thư mục release.

## Biến môi trường production

File production `.env` không được commit. Các biến hiện tại:

```env
SQLITE_PATH=data/wedding.sqlite
SQLITE_BACKUP_DIRECTORY=data/backups
MEDIA_UPLOAD_DIRECTORY=public/uploads
ADMIN_PASSWORD_HASH=scrypt\$generated-salt\$generated-digest
ADMIN_SESSION_SECRET=replace-with-at-least-32-random-characters
PUBLIC_SITE_URL=https://your-domain.com
PORT=3000
```

Các đường dẫn relative vẫn dùng được trong release-based CD vì `data` và `public/uploads` là symlink về `shared/`.

## Chuyển deployment hiện tại sang shared storage một lần

Từ thư mục repo hiện đang chạy trên VPS, pull commit có script bootstrap rồi chạy:

```bash
git pull --ff-only
bash deploy/bootstrap-shared-storage.sh "$(pwd)"
```

Script sẽ:

- dừng PM2 app `huy-nhi-wedding` trong lúc di chuyển dữ liệu;
- chuyển `.env` sang `shared/.env`;
- chuyển `data/` sang `shared/data/`;
- chuyển `public/uploads/` sang `shared/uploads/`;
- tạo symlink ngược để deployment thủ công hiện tại vẫn chạy bình thường;
- restart PM2 sau khi hoàn tất.

Script **không tự merge** nếu cả thư mục cũ và `shared/` đều đang chứa dữ liệu. Trường hợp đó nó dừng và yêu cầu xử lý thủ công để tránh ghi đè database/uploads.

Sau bootstrap, kiểm tra:

```bash
readlink -f .env
readlink -f data
readlink -f public/uploads
pm2 status
curl -I http://127.0.0.1:3000/
```

## SSH key dành riêng cho GitHub Actions

Tạo key deploy riêng trên máy tin cậy, không dùng private key cá nhân chính:

```bash
ssh-keygen -t ed25519 -C "github-actions-wedding-deploy" -f wedding-deploy
```

Thêm **public key** `wedding-deploy.pub` vào `~/.ssh/authorized_keys` của user deploy trên VPS. User này phải có quyền ghi `VPS_APP_ROOT` và chạy PM2 app `huy-nhi-wedding`, nhưng không cần quyền root để deploy app.

Lấy host key của VPS từ máy/network mà bạn tin cậy:

```bash
ssh-keyscan -H -p 22 YOUR_VPS_HOST
```

CI dùng `StrictHostKeyChecking=yes`; workflow không tự `ssh-keyscan` lúc deploy để tránh chấp nhận host key giả do MITM.

## GitHub Environment `production`

Trong GitHub repo → **Settings → Environments → production**, thêm secrets:

- `VPS_HOST` — IP/domain SSH của VPS.
- `VPS_USER` — user deploy.
- `VPS_SSH_PRIVATE_KEY` — toàn bộ nội dung private key `wedding-deploy`.
- `VPS_KNOWN_HOSTS` — output trusted của `ssh-keyscan -H ...`.

Thêm repository/environment variables:

- `VPS_APP_ROOT` — đường dẫn tuyệt đối tới thư mục repo/app hiện tại trên VPS, ví dụ `/home/ubuntu/wedding-online`.
- `VPS_PORT` — SSH port, mặc định `22` nếu bỏ trống.
- `VPS_APP_PORT` — app port, mặc định `3000` nếu bỏ trống.
- `CD_ENABLED` — để `false` hoặc chưa tạo trong lúc setup.

Có thể thêm required reviewer cho environment `production` nếu muốn mỗi deploy phải được approve thủ công.

## Test deploy lần đầu

Sau khi bootstrap shared storage và cấu hình secrets/variables, vào **Actions → CI → Run workflow** rồi bật input **deploy_to_vps**.

Manual deploy này vẫn chạy toàn bộ:

1. unit tests;
2. lint;
3. Next.js build;
4. Playwright E2E;
5. ARM64 standalone build;
6. chạy standalone artifact thật trên ARM64 runner và HTTP smoke test;
7. SCP artifact lên VPS;
8. switch `current` atomically;
9. `pm2 startOrReload`;
10. health check `http://127.0.0.1:<VPS_APP_PORT>/`;
11. rollback tự động nếu health check fail.

Nếu lần deploy đầu xanh, đặt variable:

```text
CD_ENABLED=true
```

Từ đó mỗi push `main` chỉ deploy sau khi CI/E2E xanh.

## Cơ chế rollback

Workflow giữ tối đa 5 release gần nhất. Nếu release mới không trả HTTP 2xx trong health-check window, workflow đổi `current` về release trước và reload PM2.

Lần cutover đầu tiên, nếu chưa có `current` release nhưng repo cũ vẫn có `ecosystem.config.cjs`, workflow dùng config legacy đó làm fallback rollback.

Rollback thủ công về một release còn giữ:

```bash
cd <VPS_APP_ROOT>
ls -1dt releases/*
ln -sfn "$(pwd)/releases/<commit-sha>" current
cd current
PORT=3000 HOSTNAME=0.0.0.0 pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
curl -I http://127.0.0.1:3000/
```

## Backup định kỳ

CD giữ persistent storage nhưng **không thay thế backup**. Tiếp tục chạy backup SQLite định kỳ bằng cùng user PM2 và copy backup + uploads sang storage khác.

Trong deployment thủ công cũ có thể dùng:

```bash
npm run db:backup
```

`db:backup` checkpoint WAL và tạo file timestamp trong `SQLITE_BACKUP_DIRECTORY`. Khi restore, phải restore cả SQLite và `shared/uploads` tương ứng.

## Khôi phục dữ liệu

Dừng app, restore database vào `shared/data` và upload vào `shared/uploads`, rồi start lại:

```bash
pm2 stop huy-nhi-wedding
cp shared/data/backups/wedding-YYYY-MM-DDTHH-MM-SSZ.sqlite shared/data/wedding.sqlite
rm -f shared/data/wedding.sqlite-wal shared/data/wedding.sqlite-shm
# restore uploads vào shared/uploads nếu cần
pm2 restart huy-nhi-wedding
pm2 logs huy-nhi-wedding
```

Không thay cả release directory khi chỉ cần restore dữ liệu.

## Deploy thủ công dự phòng

Nếu CD bị tắt, deployment cũ vẫn có thể dùng ở repo legacy vì bootstrap giữ symlink data/uploads/.env:

```bash
npm run db:backup
git pull --ff-only
npm ci
npm test
npm run lint
npm run build
npm run db:init
pm2 reload ecosystem.config.cjs --update-env
```

Khi CD hoạt động ổn, VPS không cần build source cho các deploy thường ngày nữa.
