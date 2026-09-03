# Thiệp cưới Huy & Nhi

[![CI](https://github.com/rua-den/wedding-online/actions/workflows/ci.yml/badge.svg)](https://github.com/rua-den/wedding-online/actions/workflows/ci.yml)

[English](README.md) · **Tiếng Việt**

Website thiệp cưới responsive dùng Next.js App Router. `/` là thiệp chung; mỗi khách nhận link riêng `/moi/<code>` với lời mời cá nhân hóa và RSVP. Link mời, RSVP, nội dung, giao diện, nhạc nền và metadata media được lưu trong SQLite.

## Tính năng

- Thiệp chung và link khách mời riêng kèm RSVP.
- Admin có mật khẩu.
- CRUD link mời, tìm kiếm/lọc, lọc RSVP và xuất CSV.
- Editor nội dung theo section tại `/admin/edit`.
- 5 theme màu và 11 font preset hỗ trợ tiếng Việt tại `/admin/appearance`.
- Giao diện admin đổi theo theme/font đang chọn của thiệp.
- Upload và điều khiển nhạc nền MP3.
- Quản lý ảnh và căn focus/zoom không phá huỷ, gồm cả ảnh milestone chuyện tình.
- Các section public tối thiểu full viewport và có nút nhảy section.
- Script backup SQLite và seed khách từ CSV.
- GitHub Actions CI gồm unit/lint/build, Playwright E2E, visual smoke summary và CD VPS ARM64 có gate.

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

`/admin` quản lý link mời, RSVP, media và thao tác vận hành. `/admin/edit` là nơi duy nhất chỉnh nội dung thiệp. `/admin/appearance` quản lý theme, font và nhạc nền toàn cục. Theme/font chỉ persist sau khi bấm **Lưu giao diện**; admin cũng đổi theo appearance đang chọn.

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

Production chạy Node.js + PM2 + Nginx trên Oracle VPS ARM64. CD được khóa bằng variable `CD_ENABLED` để không tự deploy trước khi cấu hình SSH production xong.

Khi bật, một push `main` xanh sẽ:

1. build lại Next.js standalone trên runner GitHub ARM64;
2. smoke-test chính artifact ARM64 đó;
3. upload artifact lên VPS bằng SSH strict host key;
4. switch symlink release `current`;
5. reload PM2;
6. health check localhost;
7. tự rollback nếu health check fail.

SQLite, `.env`, backups, ảnh và nhạc nằm trong `shared/` bền vững và không bị thay khi deploy code. VPS không cần chạy lại `npm ci` hay `npm run build` cho deployment CD bình thường.

Xem [DEPLOYMENT.md](DEPLOYMENT.md) để bootstrap shared storage một lần, cấu hình GitHub Environment `production`, chạy manual deploy đầu tiên, bật auto-deploy và rollback.
