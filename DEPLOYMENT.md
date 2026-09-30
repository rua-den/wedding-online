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

Trước khi thay process production, release mới chạy `verify-persistent-state.cjs` để xác nhận SQLite và uploads thật sự resolve về `shared/`, chạy `PRAGMA integrity_check`, kiểm tra file nhạc mà `music_settings` đang tham chiếu, chụp snapshot số row của các bảng runtime quan trọng và manifest tên file uploads, đồng thời tạo một SQLite backup `pre-deploy-*.sqlite`. Sau khi release mới qua HTTP health check, cùng verifier chạy lại; nếu DB path/uploads path đổi, row bị giảm, file upload cũ biến mất hoặc file nhạc được tham chiếu không còn tồn tại thì deployment fail và code rollback về release trước. Backup trước deploy được giữ lại khi failure xảy ra.

`better-sqlite3` có native binary nên release production được build trên `ubuntu-24.04-arm`, cùng kiến trúc ARM64 với Oracle VPS. CI x64 thông thường vẫn chạy unit/lint/build/E2E trước đó.

## Chuẩn bị Node.js, PM2 và Nginx

Cần:

- Node.js 22.5 trở lên.
- PM2 cài global và cấu hình `pm2 startup`.
- `curl` và `tar`.
- Nginx reverse proxy tới `127.0.0.1:3000` (hoặc `VPS_APP_PORT`).

**Port ứng dụng (`3000`/`VPS_APP_PORT`) là private origin và không được public ra Internet.** Không mở port này trong OCI Security List/NSG hoặc UFW. Production Next.js phải luôn bind `127.0.0.1`; chỉ Nginx trên cùng VPS được truy cập origin.

Nginx cũng là trusted proxy boundary cho rate limit. `deploy/nginx-wedding.conf` cố ý **overwrite** `X-Real-IP` và `X-Forwarded-For` bằng `$remote_addr`; không đổi sang `$proxy_add_x_forwarded_for` nếu chưa đồng thời thay đổi trust-hop model trong ứng dụng.

Cấu hình domain/HTTPS như cũ:

1. Mở TCP 80/443 trong OCI Security List/NSG và UFW. Không mở `3000`/`VPS_APP_PORT`.
2. Dùng `deploy/nginx-wedding.conf` cho Nginx.
3. Chạy `sudo nginx -t && sudo systemctl reload nginx`.
4. Dùng Certbot cho HTTPS.

`deploy/nginx-wedding.conf` cấu hình HSTS theo `$scheme`: header `Strict-Transport-Security: max-age=31536000` chỉ được gửi khi request thật sự đi qua HTTPS sau khi Certbot bật TLS; HTTP/localhost không nhận HSTS. Chưa bật `includeSubDomains` hoặc preload để tránh khóa nhầm các subdomain chưa sẵn sàng HTTPS.

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
HOSTNAME=127.0.0.1
```

Các đường dẫn relative vẫn dùng được trong release-based CD vì `data` và `public/uploads` là symlink về `shared/`. Persistent-state preflight cũng fail-closed nếu các path này resolve ra ngoài `shared/data` hoặc `shared/uploads`.

## Rate limit production

Admin login và RSVP hiện dùng rate limit in-memory trong process Node.js. Với topology hiện tại (`instances: 1`, một PM2 process duy nhất, origin localhost-only) đây là trade-off chấp nhận được và không cần Redis/external service.

Giới hạn cần nhớ:

- quota reset khi process restart/deploy;
- quota không được chia sẻ nếu sau này chạy nhiều Node/PM2 instances hoặc nhiều VPS;
- client identity chỉ đáng tin vì reverse proxy local overwrite forwarding headers trước khi request vào Next.js.

Nếu scale production lên nhiều process/host, phải chuyển rate-limit state sang shared store hoặc enforcement layer dùng chung trước khi scale. Không được giải quyết bằng cách tin thêm forwarding header từ Internet.

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
- `CD_ENABLED` — để `false` hoặc chưa tạo trong lúc setup. Workflow `Auto deploy production` chỉ dispatch deploy tự động khi biến này đúng bằng `true`.

Có thể thêm required reviewer cho environment `production` nếu muốn mỗi deploy phải được approve thủ công.

## Test deploy lần đầu

### Read-only production readiness audit

Sau khi unit test, lint/build và browser E2E xanh, push một tag duy nhất `production-readiness/<unique-name>` trỏ vào commit đã review để chạy audit trước khi merge. Khi workflow đã có trên default branch, cũng có thể mở **Actions → CI → Run workflow**, bật `verify_production` và để `deploy_to_vps` tắt. Tag này chỉ chọn job readiness; release/deploy vẫn giới hạn ở nhánh `main`. Cả hai entry point đều fail nếu `CD_ENABLED` đúng chính xác bằng `true`, nên audit chỉ chạy khi automatic CD vẫn tắt.

Audit dùng SSH với `BatchMode` và `StrictHostKeyChecking=yes`, kiểm tra topology release/shared, revision, PID metadata hiện có của PM2, identity/parent/cwd của process trong `/proc`, localhost health và listener chỉ bind `127.0.0.1`. Nó đọc `$PM2_HOME` hoặc mặc định `$HOME/.pm2` mà không khởi tạo thư mục, và không gọi PM2 CLI. Verifier được stream vào Node trên VPS, mở SQLite read-only, kiểm tra integrity, nhạc, các realpath và thư mục backup mà không tạo snapshot/backup/state file. Output chỉ gồm revision, PASS và số lượng bảng; không in guest rows, tên file upload/nhạc, tiêu đề nhạc, `.env` hay PM2 environment.

Audit này là một kiểm tra trạng thái tại thời điểm chạy. Nó **không chứng minh manual deployment an toàn hoặc thành công**; trước khi bật automatic CD vẫn cần deliberate manual deploy được verifier pre/post activation xác nhận.

### Manual production deploy

Sau khi bootstrap shared storage và cấu hình secrets/variables, vào **Actions → CI → Run workflow** rồi bật input **deploy_to_vps**.

Manual deploy này vẫn chạy toàn bộ dù `CD_ENABLED` đang tắt, vì đây là hành động deploy chủ động:

1. unit tests;
2. lint;
3. Next.js build;
4. Playwright E2E;
5. ARM64 standalone build;
6. chạy standalone artifact thật trên ARM64 runner và HTTP smoke test;
7. SCP artifact lên VPS;
8. dựng release với symlink về `shared/data`, `shared/uploads`, `shared/.env`;
9. persistent-state preflight: xác minh realpath, `PRAGMA integrity_check`, music reference, row counts và upload manifest;
10. tạo SQLite backup `pre-deploy-*.sqlite` trong `shared/data/backups`;
11. start release mới bằng PM2;
12. health check `http://127.0.0.1:<VPS_APP_PORT>/`;
13. persistent-state verify lại sau activation;
14. chỉ khi tất cả đều pass mới switch `current` và ghi `DEPLOYED_REVISION`;
15. rollback code tự động nếu activation, health check hoặc state verification fail.

Nếu lần deploy đầu xanh và muốn tự động deploy mỗi push `main`, đặt variable:

```text
CD_ENABLED=true
```

Từ đó mỗi push `main` chỉ được workflow auto-deploy dispatch sau khi CI/E2E xanh. Nếu `CD_ENABLED` không phải `true`, một push/merge `main` không được tự dispatch production deployment.

## Cơ chế rollback

Workflow giữ tối đa 5 release gần nhất. Nếu release mới không trả HTTP 2xx hoặc persistent-state verification fail, workflow đổi `current` về release trước và reload PM2.

Rollback code **không tự restore shared data**. Nếu verifier phát hiện state giảm/mất, pre-deploy SQLite backup vẫn được giữ để điều tra/restore có chủ đích; tự động restore DB có thể ghi đè một thay đổi hợp lệ xảy ra đồng thời và không thể tự khôi phục file uploads đã mất.

Lần cutover đầu tiên, nếu chưa có `current` release nhưng repo cũ vẫn có `ecosystem.config.cjs`, workflow dùng config legacy đó làm fallback rollback.

Rollback thủ công về một release còn giữ:

```bash
cd <VPS_APP_ROOT>
ls -1dt releases/*
ln -sfn "$(pwd)/releases/<commit-sha>" current
cd current
PORT=3000 HOSTNAME=127.0.0.1 pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
curl -I http://127.0.0.1:3000/
```

## Backup định kỳ

Mỗi production deployment tạo thêm một SQLite backup ngay trước activation, nhưng **pre-deploy backup và persistent storage không thay thế backup định kỳ/offsite**. Tiếp tục chạy backup SQLite định kỳ bằng cùng user PM2 và copy backup + uploads sang storage khác.

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
