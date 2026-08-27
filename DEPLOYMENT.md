# Triển khai Oracle VPS

## Chuẩn bị Google Sheets

1. Tạo spreadsheet với hai tab: `Invitations` và `RSVPs`.
2. Thêm header theo thứ tự:
   - `Invitations`: `code,name,maxGuests,active`
   - `RSVPs`: `code,name,attendance,guestCount,message,createdAt,updatedAt`
3. Tạo Google service account, bật Google Sheets API, rồi chia sẻ spreadsheet với email của service account ở quyền **Editor**.
4. Trên VPS tạo `.env` từ `.env.example`; không commit file này.

## Cài ứng dụng

```bash
git clone <repository-url> wedding-online
cd wedding-online
npm ci
cp .env.example .env
npm run build
npm install --global pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Sao chép lệnh `sudo ... pm2 startup ...` mà PM2 in ra để service tự chạy sau reboot.

## Domain và HTTPS

1. Mở port TCP 80 và 443 trong OCI Security List/Network Security Group và UFW.
2. Cài Nginx và sao chép `deploy/nginx-wedding.conf` vào `/etc/nginx/sites-available/wedding`.
3. Thay `your-domain.com` bằng domain thực, tạo symlink ở `sites-enabled`, rồi chạy `sudo nginx -t && sudo systemctl reload nginx`.
4. Cấp chứng chỉ: `sudo certbot --nginx -d your-domain.com -d www.your-domain.com`.

## Cập nhật và khôi phục

```bash
git pull
npm ci
npm test
npm run build
pm2 reload ecosystem.config.cjs --update-env
pm2 logs huy-nhi-wedding
```

Nếu cần quay lui, checkout commit trước đó, chạy lại `npm ci`, `npm run build`, sau đó `pm2 reload ecosystem.config.cjs --update-env`. Google Sheets là nguồn dữ liệu RSVP; hãy export một bản sao trước khi thao tác hàng loạt.
