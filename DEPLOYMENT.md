# Triển khai Oracle VPS

## Chuẩn bị Node.js và biến môi trường

Dùng Node.js LTS 22.5 trở lên (ARM64 trên Oracle VPS). Ứng dụng ưu tiên `better-sqlite3`; `node:sqlite` chỉ là fallback để chạy local khi dependency native chưa có.

Trên VPS tạo `.env` từ `.env.example`; không commit file này. Đặt `SQLITE_PATH` ở ổ đĩa bền vững mà user chạy PM2 có quyền đọc/ghi, tạo `ADMIN_PASSWORD_HASH` bằng lệnh của dự án, và tạo `ADMIN_SESSION_SECRET` ít nhất 32 ký tự ngẫu nhiên.

```bash
cp .env.example .env
npm run admin:password -- 'mat-khau-dai-va-rieng'
openssl rand -base64 48
```

Chép hai giá trị vừa tạo vào `.env`. Không lưu mật khẩu rõ trong `.env`.

## Cài ứng dụng lần đầu

```bash
git clone <repository-url> wedding-online
cd wedding-online
npm ci
cp .env.example .env
# Điền ADMIN_PASSWORD_HASH, ADMIN_SESSION_SECRET và PUBLIC_SITE_URL trước khi tiếp tục.
npm run admin:password -- 'mat-khau-dai-va-rieng'
npm run db:init
npm run db:seed -- data/guests.csv
npm run build
npm install --global pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Sao chép lệnh `sudo ... pm2 startup ...` mà PM2 in ra để service tự chạy sau reboot. Nếu không có file khách ban đầu, bỏ qua `db:seed` và tạo link trong `/admin`.

## Domain và HTTPS

1. Mở port TCP 80 và 443 trong OCI Security List/Network Security Group và UFW.
2. Cài Nginx và sao chép `deploy/nginx-wedding.conf` vào `/etc/nginx/sites-available/wedding`.
3. Thay `your-domain.com` bằng domain thực, tạo symlink ở `sites-enabled`, rồi chạy `sudo nginx -t && sudo systemctl reload nginx`.
4. Cấp chứng chỉ: `sudo certbot --nginx -d your-domain.com -d www.your-domain.com`.

## Cập nhật

Sao lưu trước mỗi lần cập nhật:

```bash
npm run db:backup
git pull --ff-only
npm ci
npm test
npm run build
npm run db:init
pm2 reload ecosystem.config.cjs --update-env
pm2 logs huy-nhi-wedding
```

## Sao lưu định kỳ

`npm run db:backup` thực hiện WAL checkpoint trước khi dùng API backup của SQLite. Có thể chạy lệnh này bằng cron với cùng user chạy PM2. Đặt `SQLITE_BACKUP_DIRECTORY` trên volume bền vững và sao chép các file backup sang nơi lưu trữ khác.

## Khôi phục dữ liệu

Chọn đúng file backup có timestamp, dừng ứng dụng, thay **chỉ** file database tại `SQLITE_PATH`, xóa các file `-wal`/`-shm` cũ cùng tên nếu còn, rồi khởi động lại:

```bash
pm2 stop huy-nhi-wedding
cp data/backups/wedding-YYYY-MM-DDTHH-MM-SSZ.sqlite data/wedding.sqlite
rm -f data/wedding.sqlite-wal data/wedding.sqlite-shm
pm2 start huy-nhi-wedding
pm2 logs huy-nhi-wedding
```

Không thay cả thư mục dự án khi khôi phục database. Nếu cần quay lui mã nguồn, checkout commit trước đó, chạy `npm ci`, `npm run build`, `npm run db:init`, rồi `pm2 reload ecosystem.config.cjs --update-env`.
