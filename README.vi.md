# Thiệp cưới Huy & Nhi

[![CI](https://github.com/rua-den/wedding-online/actions/workflows/ci.yml/badge.svg)](https://github.com/rua-den/wedding-online/actions/workflows/ci.yml)

[English](README.md) · **Tiếng Việt**

Website thiệp cưới responsive dùng Next.js App Router. `/` là thiệp chung; mỗi khách nhận link riêng `/moi/<code>` với lời mời cá nhân hóa và RSVP. Link mời, RSVP, nội dung, giao diện, nhạc nền, profile sự kiện và metadata media được lưu trong SQLite.

## Tính năng

- Thiệp chung và link khách mời riêng kèm RSVP.
- Chia scope thiệp cá nhân theo **11/10/2026**, **31/10/2026** hoặc cả hai ngày nhưng vẫn giữ một `/moi/<code>` cho mỗi khách.
- Hai profile sự kiện độc lập tại `/admin/events`, gồm deadline RSVP riêng theo ngày và cơ chế fail-closed nếu thiếu dữ liệu production bắt buộc.
- Khách mời `both` có hai RSVP độc lập; admin report/export hiểu đúng từng event.
- Admin có mật khẩu.
- CRUD link mời, tìm kiếm/lọc, lọc RSVP và xuất CSV.
- Editor nội dung theo section tại `/admin/edit`.
- 5 theme màu và 11 font preset hỗ trợ tiếng Việt tại `/admin/appearance`.
- Giao diện admin đổi theo theme/font đang chọn của thiệp.
- Upload và điều khiển nhạc nền MP3.
- Quản lý ảnh và căn focus/zoom không phá huỷ, gồm cả ảnh milestone chuyện tình.
- Các section public tối thiểu full viewport và có nút nhảy section.
- Script backup SQLite và seed khách từ CSV.
- GitHub Actions CI gồm unit/lint/build, Playwright E2E, visual smoke summary, CD VPS ARM64 có gate và kiểm tra persistent state trước/sau activation.

## Yêu cầu

- Node.js 22.5 trở lên.
- npm.
- Production dùng `better-sqlite3`; có fallback sang SQLite tích hợp của Node khi môi trường hỗ trợ.

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
- `http://localhost:3000/admin` — admin.

## Biến môi trường

Dùng `.env.local` ở local hoặc `.env` trên VPS:

```env
SQLITE_PATH=data/wedding.sqlite
SQLITE_BACKUP_DIRECTORY=data/backups
MEDIA_UPLOAD_DIRECTORY=public/uploads
ADMIN_PASSWORD_HASH=scrypt\$generated-salt\$generated-digest
ADMIN_SESSION_SECRET=replace-with-at-least-32-random-characters
PUBLIC_SITE_URL=https://your-domain.com
PORT=3000
```

Tạo credential admin:

```bash
npm run admin:password -- 'mat-khau-dai-va-rieng'
openssl rand -base64 48
```

Không commit credential thật.

## Các khu vực admin

`/admin` quản lý link mời, RSVP, media và thao tác vận hành. `/admin/events` quản lý hai profile sự kiện 11/10 và 31/10 dùng cho thiệp cá nhân theo ngày. `/admin/edit` chỉnh nội dung thiệp toàn cục. `/admin/appearance` quản lý theme, font và nhạc nền toàn cục. Theme/font chỉ persist sau khi bấm **Lưu giao diện**; admin cũng đổi theo appearance đang chọn.

Không tự bịa giờ cưới, venue, địa chỉ, Google Maps URL, deadline RSVP hay event copy production chỉ để profile trông như đã cấu hình. Thiếu dữ liệu bắt buộc thì thiệp theo ngày phải fail-closed.

## Media và nhạc

Upload được phục vụ runtime qua `/uploads/<filename>`. `MEDIA_UPLOAD_DIRECTORY` phải nằm trên storage bền vững. SQLite lưu reference và metadata crop/focus; bytes ảnh/nhạc nằm trong upload directory.

Khi backup phải giữ cả SQLite lẫn uploads.

## Database, seed và backup

```bash
npm run db:init
npm run db:seed -- data/guests.csv
npm run db:backup
```

`db:backup` checkpoint WAL trước khi tạo bản backup SQLite có timestamp.

## Test và CI

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

GitHub Actions chạy unit test, lint, build và Playwright Chromium E2E cho push `main` và pull request. Run `main` thành công publish visual smoke trực tiếp vào Actions Summary.

## CI/CD lên VPS

Production chạy Node.js + PM2 + Nginx trên Oracle VPS ARM64. Auto production dispatch được khóa bằng variable `CD_ENABLED`; merge bình thường không được âm thầm deploy khi biến này đang tắt.

Khi production deploy được chủ động bật/chạy, pipeline sẽ:

1. build Next.js standalone trên runner GitHub ARM64;
2. smoke-test chính artifact ARM64 đó;
3. upload artifact lên VPS bằng SSH strict host key;
4. dựng release với symlink về persistent `shared/`;
5. kiểm tra realpath SQLite/uploads, SQLite integrity, file nhạc đang được tham chiếu, row count các bảng quan trọng và manifest tên file uploads;
6. tạo SQLite backup ngay trước deploy;
7. start release mới bằng PM2 và health-check localhost;
8. verify lại persistent state sau activation;
9. chỉ khi mọi gate đều pass mới ghi/switch release thành công;
10. rollback code nếu activation, health check hoặc persistent-state verification fail.

SQLite, `.env`, backups, ảnh và nhạc nằm trong `shared/` bền vững và không thuộc quyền sở hữu của immutable code release. Nếu state verification fail, pre-deploy SQLite backup được giữ để recovery có chủ đích; workflow không tự restore shared data một cách mù quáng.

Xem [DEPLOYMENT.md](DEPLOYMENT.md) để bootstrap shared storage, cấu hình GitHub Environment `production`, manual deploy, bật auto-deploy, các invariant về dữ liệu và quy trình rollback/recovery.

Checkpoint coding hiện tại và lịch sử deploy đã verify nằm ở `docs/superpowers/plans/2026-09-30-codex-handoff.md`.
