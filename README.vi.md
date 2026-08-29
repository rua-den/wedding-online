# Thiệp cưới Huy & Nhi

[![CI](https://github.com/rua-den/wedding-online/actions/workflows/ci.yml/badge.svg)](https://github.com/rua-den/wedding-online/actions/workflows/ci.yml)

[English](README.md) · **Tiếng Việt**

Website thiệp cưới responsive dùng Next.js App Router. Trang `/` là thiệp chung; mỗi khách nhận một link riêng dạng `/moi/<code>` với lời mời cá nhân hóa và RSVP. Link mời, RSVP, nội dung có thể chỉnh sửa, theme giao diện và metadata ảnh được lưu trong SQLite.

## Tính năng

- Thiệp cưới chung tại `/`.
- Link riêng `/moi/<code>` cho từng khách kèm RSVP.
- Admin có mật khẩu tại `/admin`.
- Quản lý link mời: tạo, sửa, bật/tắt, xoá vĩnh viễn, tìm kiếm và lọc.
- Dashboard RSVP với bộ lọc trạng thái và xuất CSV.
- Editor nội dung thiệp theo từng section tại `/admin/edit`.
- Chọn theme toàn bộ thiệp tại `/admin/appearance`, có 5 preset và preview mobile/desktop.
- Quản lý ảnh cover, cô dâu/chú rể, chuyện tình, địa điểm và gallery.
- Căn ảnh không phá huỷ; `focusX`, `focusY`, `zoom` được lưu trong SQLite.
- Script seed khách từ CSV và backup SQLite.
- Hỗ trợ deploy VPS bằng Node.js + PM2 + Nginx.

## Yêu cầu

- Node.js 22.5 trở lên.
- npm.
- Production ưu tiên `better-sqlite3`. Trong môi trường hỗ trợ, code có thể fallback sang `node:sqlite` tích hợp của Node khi native package không khả dụng.

## Chạy local nhanh

```bash
npm ci
cp .env.example .env.local
npm run db:init
npm run dev
```

Mở:

- `http://localhost:3000/` — thiệp chung.
- `http://localhost:3000/moi/demo` — link demo development.
- `http://localhost:3000/admin` — dashboard admin.

Link `demo` chỉ được tự seed trong development nếu chưa tồn tại.

## Biến môi trường

Tạo `.env.local` khi chạy local hoặc `.env` trên VPS từ [`.env.example`](.env.example):

```env
SQLITE_PATH=data/wedding.sqlite
SQLITE_BACKUP_DIRECTORY=data/backups
MEDIA_UPLOAD_DIRECTORY=public/uploads
ADMIN_PASSWORD_HASH=scrypt\$generated-salt\$generated-digest
ADMIN_SESSION_SECRET=replace-with-at-least-32-random-characters
PUBLIC_SITE_URL=https://your-domain.com
PORT=3000
```

Tạo password hash và session secret:

```bash
npm run admin:password -- 'mat-khau-dai-va-rieng'
openssl rand -base64 48
```

Lệnh tạo password sẽ in nguyên dòng `ADMIN_PASSWORD_HASH=...` đã được escape đúng cho file `.env` của Next.js. Copy nguyên dòng đó; không tự bỏ hoặc thêm dấu `\`. Không commit password hash hoặc session secret thật lên repo.

## Các khu vực admin

### Link khách mời và RSVP

`/admin` quản lý link mời và phản hồi. Danh sách link có thể tìm theo tên/mã và lọc theo **Đang bật / Đã tắt / Đã RSVP / Chưa RSVP**.

Dùng **Tắt link** khi muốn ngừng sử dụng link nhưng vẫn giữ lịch sử RSVP. **Xoá** là xoá vĩnh viễn; nếu khách đã RSVP thì phản hồi đó cũng bị xoá sau bước xác nhận cảnh báo.

### Chỉnh nội dung thiệp

`/admin/edit` cho sửa nội dung theo từng section: thông tin cặp đôi, cover, countdown, các mốc chuyện tình, thông tin lễ cưới, gallery, lời mời riêng/RSVP và footer. Dữ liệu được lưu SQLite và áp dụng cho cả thiệp chung lẫn thiệp riêng.

### Theme giao diện

`/admin/appearance` có 5 theme preset:

- Ivory Gold — giao diện hiện tại/mặc định.
- Blush Rose.
- Sage Garden.
- Burgundy Cream.
- Midnight Gold.

Chọn theme mới chỉ là trạng thái chờ. Theme chỉ được lưu khi bấm **Lưu giao diện**. Có thể preview trước trên mobile/desktop mà không ghi gì xuống SQLite. Theme được áp dụng cho `/` và toàn bộ `/moi/<code>`, còn giao diện admin giữ nguyên độc lập.

### Ảnh

Admin hỗ trợ ảnh hero/cover, chân dung cô dâu/chú rể, ảnh chuyện tình, địa điểm/bản đồ và gallery. Gallery có thể sắp xếp lại. File gốc nằm trong `MEDIA_UPLOAD_DIRECTORY`; SQLite chỉ lưu metadata như `focusX`, `focusY`, `zoom`.

Căn khung là không phá huỷ: file ảnh gốc không bị ghi đè. Route `/uploads/<filename>` được Next.js phục vụ theo thời gian chạy nên upload ảnh mới không cần rebuild ứng dụng. Nếu thư mục upload nằm ngoài release directory, hãy đặt `MEDIA_UPLOAD_DIRECTORY` vào vùng lưu trữ bền vững và tiếp tục proxy `/uploads/` về Next.js qua Nginx.

## Database, seed và backup

CSV khách mời dùng header `name,maxGuests`; xem [`data/guests.example.csv`](data/guests.example.csv).

```bash
npm run db:init
npm run db:seed -- data/guests.csv
npm run db:backup
```

- `db:init` tạo/migrate các bảng cần thiết mà không xoá dữ liệu cũ.
- `db:seed` tạo mã link ngẫu nhiên và in URL riêng cho từng khách.
- `db:backup` checkpoint WAL rồi tạo file backup SQLite có timestamp trong `SQLITE_BACKUP_DIRECTORY`.

Khi backup phải giữ cả SQLite lẫn thư mục upload. SQLite chỉ chứa metadata ảnh, không chứa bytes của file ảnh.

## Test và build

```bash
npm test
npm run lint
npm run build
```

Browser/E2E test:

```bash
npx playwright install chromium
npm run test:e2e
```

Repo có GitHub Actions CI. Mỗi push lên `main` và mỗi pull request sẽ tự chạy unit test, lint, build và Playwright Chromium E2E.

## Deploy VPS

Mô hình production là Node.js + PM2 + Nginx trên VPS; không bắt buộc Vercel. Xem [DEPLOYMENT.md](DEPLOYMENT.md) để cấu hình HTTPS, reverse proxy, backup/restore SQLite, PM2 reload và rollback.

Một lần update thường dùng:

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

SQLite và thư mục upload phải nằm trên storage bền vững để không mất dữ liệu qua các lần deploy/rollback.
