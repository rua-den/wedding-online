# Thiệp cưới Huy & Nhi

Website thiệp cưới responsive bằng Next.js App Router. Trang chính là phiên bản giới thiệu chung; mỗi khách nhận một link riêng dạng `/moi/<code>` để xem lời mời và gửi RSVP.

## Chạy local nhanh

Yêu cầu Node.js LTS.

```bash
npm ci
npm run dev
```

Mở:

- `http://localhost:3000/` — thiệp chung, không có RSVP.
- `http://localhost:3000/moi/demo` — link demo local, khách “Khách mời thân yêu”, tối đa 2 người.

Link `demo` chỉ là dữ liệu giả trong bộ nhớ khi chạy development; RSVP sẽ mất khi restart server và không ghi Google Sheets. Đổi tên, ngày cưới, deadline, địa điểm và timeline tại [`src/config/wedding.ts`](src/config/wedding.ts).

## Google Sheets

Khi chạy production, tạo `.env.local` (local) hoặc `.env` (VPS) từ [`.env.example`](.env.example):

```env
GOOGLE_SHEET_ID=your-google-sheet-id
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
PUBLIC_SITE_URL=https://your-domain.com
PORT=3000
```

Spreadsheet cần hai tab với header:

- `Invitations`: `code,name,maxGuests,active`
- `RSVPs`: `code,name,attendance,guestCount,message,createdAt,updatedAt`

Nạp danh sách khách từ CSV bằng:

```bash
node scripts/seed-invitations.mjs data/guests.example.csv
```

## Kiểm tra và build

```bash
npm test
npm run lint
npm run build
npm run start
```

## Triển khai Oracle VPS

Dùng Node.js + PM2 + Nginx, không cần Vercel. Xem [DEPLOYMENT.md](DEPLOYMENT.md) để cài đặt HTTPS, reverse proxy, PM2 reload và rollback.
