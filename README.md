# Mẹ và lịch học

PWA quản lý thời khoá biểu và ghi chú hằng ngày của các con. Nhiều phụ huynh dùng chung một "gia đình", liên kết bằng mã mời.

## Chạy local

```bash
pnpm install
cp .env.example .env.local   # điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY
pnpm dev
```

## Thiết lập Supabase (một lần)

1. **Tạo bảng:** mở *SQL Editor* trên dashboard, dán toàn bộ `supabase/migrations/20261007000000_init.sql` rồi bấm *Run*.
2. **Tắt xác nhận email:** *Authentication → Sign In / Providers → Email* → tắt **Confirm email**.
3. **Quên mật khẩu:** app không có chức năng này. Quản trị viên đặt lại trong *Authentication → Users → (chọn người dùng) → Reset password* hoặc đặt mật khẩu mới.

## Deploy (Vercel)

Import repo vào Vercel, framework *Vite*, thêm 2 biến môi trường `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. `vercel.json` đã cấu hình rewrite cho SPA.

## App Android / iOS (Capacitor)

Cùng source với bản web. Bản app tắt service worker (`vite build --mode mobile`), file web nằm sẵn trong app.

```bash
pnpm build:mobile   # build web vào dist/ rồi cap sync sang android/ và ios/
pnpm ios            # mở Xcode
pnpm android        # mở Android Studio (cần JDK 21)
```

- Đặt `VITE_PUBLIC_URL` (domain Vercel) trong `.env.local` để lời mời trong app kèm link. Không có biến này thì chỉ gửi mã.
- Ảnh gốc nằm trong `resources/` (không phục vụ lên web):
  - `logo.png`: icon app. Đã cắt bỏ viền trắng, lấp góc bo bằng nền gradient, rồi sinh icon iOS/Android bằng `npx @capacitor/assets@3.0.5 generate --ios --android` (từ `assets/icon-only.png`, `icon-foreground.png`, `icon-background.png`). Icon web trong `public/` (`pwa-*`, `apple-touch-icon`, `favicon.ico`, `app-icon.png`) được cắt từ icon iOS.
  - `splash.png`: ảnh màn hình chờ, dùng nguyên ảnh (iOS: `Splash.imageset`, phủ kín màn hình; Android ≤ 11: `drawable*/splash.png`). Android 12+ chỉ hiện icon app trên nền trắng (giới hạn của hệ điều hành).

## Nhắc lịch

Mỗi buổi học có "Nhắc trước" (15 phút … 1 ngày, mặc định 15 phút) và tuỳ chọn gửi thêm email.

- **Thông báo trên máy** (chỉ app iOS/Android): mỗi lần app tải lịch, máy tự hẹn thông báo cho các buổi trong 14 ngày tới (tối đa 60, giới hạn của iOS). Hệ điều hành tự hiện đúng giờ kể cả khi khoá màn hình hay đã tắt app. Buổi do người khác thêm chỉ được hẹn khi máy này mở app.
- **Email** (Resend): `pg_cron` gọi Edge Function `send-reminders` mỗi 5 phút, hàm gửi email cho mọi thành viên trong gia đình. Cần đặt secrets trong *Edge Functions → Secrets*:
  - `RESEND_API_KEY`
  - `REMINDER_FROM`, ví dụ `Lịch học <nhac-lich@ten-mien-cua-ban.vn>` (tên miền phải được xác thực trong Resend; nếu chưa có thì mặc định `onboarding@resend.dev` chỉ gửi được tới email chủ tài khoản Resend).

## Cài lên điện thoại

- **iPhone (Safari):** nút Chia sẻ → *Thêm vào MH chính*.
- **Android (Chrome):** menu ⋮ → *Cài đặt ứng dụng*.

## Kiến trúc nhanh

- Vite + React + TypeScript + Tailwind v4, `vite-plugin-pwa` (service worker tự cập nhật).
- Giao diện dùng **Ionic React** (giao diện iOS trên iPhone, Material trên Android): chuyển trang trượt kiểu native, chọn ngày/giờ bằng `IonDatetime`, select/xác nhận bằng action sheet và alert. Router là `@ionic/react-router` + react-router v6; các tab ở `/tabs/lich`, `/tabs/thang`, `/tabs/gia-dinh`. Tailwind chỉ dùng utilities (không preflight) để không đè style của Ionic.
- TanStack Query, cache được lưu vào `localStorage` để xem lịch khi offline (sửa thì cần mạng).
- Supabase: Auth email/mật khẩu, Postgres + RLS. Mọi quy tắc nghiệp vụ quan trọng nằm trong migration:
  - mỗi tài khoản thuộc đúng 1 gia đình (`unique (user_id)`), vai trò `owner` / `editor` / `viewer`;
  - mã mời 6 ký tự, dùng 1 lần, hết hạn 7 ngày (`create_invite`, `join_household`);
  - lịch lặp hằng tuần được sinh sẵn thành từng buổi (`create_series`): lặp đến ngày (tối đa 5 năm) sinh đủ một lần; lặp không kết thúc sinh 5 năm một lần, đến ngày cuối thì cron `extend-open-series` (chạy mỗi đêm) sinh thêm 5 năm; sửa/xoá "buổi này và các buổi sau" (`update_series_from`, `delete_series_from`);
  - một bé không thể có 2 buổi "có học" trùng giờ (exclusion constraint `sessions_no_overlap`); lịch lặp tự bỏ qua ngày trùng.
