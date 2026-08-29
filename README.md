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

Trong dashboard, mục **Ảnh trên thiệp** cho phép tải ảnh cover, chân dung cô dâu/chú rể, ảnh chuyện tình, ảnh địa điểm/bản đồ và gallery. Ảnh gallery có thể kéo-thả để sắp xếp; ảnh gốc được lưu ở `public/uploads/` (hoặc thư mục `MEDIA_UPLOAD_DIRECTORY`), còn metadata và căn khung (`focusX`, `focusY`, `zoom`) được lưu ở SQLite. URL `/uploads/<tên-file>` được Next Route Handler đọc theo từng request, nên ảnh mới dùng được ngay sau khi upload khi chạy `next start`, kể cả khi thư mục nằm ngoài `public/`; Nginx chỉ cần proxy đường dẫn này về Next. Căn khung là không phá hủy: file gốc không bị ghi đè và admin/public dùng cùng một vị trí trọng tâm. Link mời có nút sao chép và xem trước, trong đó trang xem trước hiển thị tên khách được mời.

Nút **Xem trước toàn bộ thiệp** mở đúng trang `/` trong iframe; chế độ mobile được chọn mặc định và có thể chuyển sang desktop. Sau khi lưu căn khung thành công, bản xem trước được làm mới để kiểm tra ngay vị trí ảnh mới.

Link `demo` được thêm vào SQLite nếu chưa có và chỉ khi chạy development. Đổi tên, ngày cưới, deadline, địa điểm và timeline tại [`src/config/wedding.ts`](src/config/wedding.ts).

## SQLite và tài khoản admin

Tạo `.env.local` (local) hoặc `.env` (VPS) từ [`.env.example`](.env.example):

```env
SQLITE_PATH=data/wedding.sqlite
SQLITE_BACKUP_DIRECTORY=data/backups
MEDIA_UPLOAD_DIRECTORY=public/uploads
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

Khi triển khai VPS, cần sao lưu cả file SQLite và thư mục upload (mặc định `public/uploads/`, hoặc đường dẫn trong `MEDIA_UPLOAD_DIRECTORY`). SQLite chỉ chứa file metadata, bao gồm căn khung; nó không chứa bytes ảnh. Route Handler phục vụ upload theo thời gian chạy và các tên file được sinh ngẫu nhiên có thể cache dài hạn, nên không cần restart sau upload. Nếu đặt `MEDIA_UPLOAD_DIRECTORY` ngoài thư mục release, hãy trỏ biến này vào volume bền vững và giữ nguyên đường dẫn qua mỗi lần deploy/rollback; Nginx phải tiếp tục proxy `/uploads/` tới Next, không trỏ alias vào thư mục release cũ.

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
