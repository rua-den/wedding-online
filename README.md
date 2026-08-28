# Thiệp cưới Huy & Nhi

Website thiệp cưới responsive bằng Next.js App Router. Trang chính là phiên bản giới thiệu chung; mỗi khách nhận một link riêng dạng `/moi/<code>` để xem lời mời và gửi RSVP. Dữ liệu thiệp mời và RSVP được lưu trong SQLite; trang `/admin` dùng để quản lý link và theo dõi phản hồi.

## Chạy local nhanh

Yêu cầu Node.js LTS (22.5+). Bản local có thể dùng `node:sqlite` tích hợp khi native package chưa được cài; production vẫn ưu tiên `better-sqlite3` từ `npm ci`.

```bash
npm ci
cp .env.example .env.local
npm run db:init
npm run dev
```

Mở:

- `http://localhost:3000/` — thiệp chung, không có RSVP.
- `http://localhost:3000/moi/demo` — link demo development, khách “Khách mời thân yêu”, tối đa 2 người.
- `http://localhost:3000/admin` — dashboard quản trị.

Link `demo` được thêm vào SQLite nếu chưa có và chỉ khi chạy development. Đổi tên, ngày cưới, deadline, địa điểm và timeline tại [`src/config/wedding.ts`](src/config/wedding.ts).

## SQLite và tài khoản admin

Tạo `.env.local` (local) hoặc `.env` (VPS) từ [`.env.example`](.env.example):

```env
SQLITE_PATH=data/wedding.sqlite
SQLITE_BACKUP_DIRECTORY=data/backups
ADMIN_PASSWORD_HASH=scrypt$...
ADMIN_SESSION_SECRET=replace-with-at-least-32-random-characters
PUBLIC_SITE_URL=https://your-domain.com
PORT=3000
```

Tạo password hash và một session secret ngẫu nhiên:

```bash
npm run admin:password -- 'mat-khau-dai-va-rieng'
openssl rand -base64 48
```

Chỉ chép giá trị hash/secret vào file env trên máy chạy ứng dụng; không commit chúng.

## Khởi tạo, nạp khách và sao lưu

CSV có header `name,maxGuests`; xem [`data/guests.example.csv`](data/guests.example.csv).

```bash
npm run db:init
npm run db:seed -- data/guests.csv
npm run db:backup
```

`db:init` không xóa dữ liệu hiện có. `db:seed` tạo mã ngẫu nhiên và in URL riêng cho từng khách. `db:backup` checkpoint WAL rồi tạo bản sao có timestamp trong `SQLITE_BACKUP_DIRECTORY`.

## Kiểm tra và build

```bash
npm test
npm run lint
npm run build
npm run start
```

Browser test local (tự build server và dùng SQLite tạm):

```bash
npx playwright install chromium
npm run test:e2e
```

## Triển khai Oracle VPS

Dùng Node.js + PM2 + Nginx, không cần Vercel. Xem [DEPLOYMENT.md](DEPLOYMENT.md) để cài đặt HTTPS, reverse proxy, SQLite backup/restore, PM2 reload và rollback.
