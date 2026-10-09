const KNOWN: [RegExp, string][] = [
  [/invalid login credentials/i, 'Sai email hoặc mật khẩu'],
  [/user already registered/i, 'Email này đã được đăng ký'],
  [/password should be at least/i, 'Mật khẩu cần ít nhất 6 ký tự'],
  [/unable to validate email|invalid email/i, 'Email không hợp lệ'],
  [/email not confirmed/i, 'Tài khoản chưa được xác nhận email. Hãy liên hệ quản trị viên.'],
  // "Load failed" is WebKit's wording (Safari, iOS app)
  [/failed to fetch|load failed|network/i, 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'],
  [/sessions_no_overlap/i, 'Bé đã có buổi học khác trùng giờ này.'],
]

export function errorMessage(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err)
  for (const [pattern, message] of KNOWN) if (pattern.test(raw)) return message
  return raw
}
