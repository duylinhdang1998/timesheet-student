/** Text of the two legal screens. Update LEGAL_UPDATED whenever the wording changes. */

export type LegalDoc = 'terms' | 'privacy'

export interface LegalSection {
  title: string
  paragraphs?: string[]
  bullets?: string[]
}

export const LEGAL_UPDATED = '09/10/2026'

/** Shown as the contact line at the end of both documents; leave empty to only mention the administrator. */
export const CONTACT_EMAIL = 'contact@vfmtech.vn'

export const LEGAL_TITLE: Record<LegalDoc, string> = {
  terms: 'Điều khoản sử dụng',
  privacy: 'Chính sách bảo mật',
}

export const LEGAL_PATH: Record<LegalDoc, string> = {
  terms: '/dieu-khoan',
  privacy: '/bao-mat',
}

export const LEGAL_INTRO: Record<LegalDoc, string> = {
  terms:
    'Chào mừng bạn đến với “Mẹ và lịch học”, ứng dụng giúp gia đình quản lý lịch học và ghi chú hằng ngày của các con. Khi tạo tài khoản hoặc sử dụng ứng dụng, bạn đồng ý với các điều khoản dưới đây.',
  privacy:
    'Chúng tôi hiểu rằng lịch học và thông tin về các con là dữ liệu riêng tư của gia đình bạn. Chính sách này giải thích ứng dụng thu thập những gì, dùng để làm gì và bạn có những quyền gì đối với dữ liệu đó.',
}

export const LEGAL_SECTIONS: Record<LegalDoc, LegalSection[]> = {
  terms: [
    {
      title: '1. Phạm vi dịch vụ',
      paragraphs: [
        'Ứng dụng cho phép bạn tạo gia đình, thêm hồ sơ các con, lập lịch học (một lần hoặc lặp hằng tuần), ghi chú theo ngày, nhận nhắc lịch và mời người thân cùng xem hoặc cùng sửa lịch.',
        'Ứng dụng được cung cấp miễn phí và có thể được thay đổi, bổ sung hoặc tạm ngừng tính năng mà không cần báo trước.',
      ],
    },
    {
      title: '2. Tài khoản',
      bullets: [
        'Bạn đăng ký bằng email và mật khẩu. Hãy cung cấp email chính xác và giữ bí mật mật khẩu của mình.',
        'Bạn chịu trách nhiệm về mọi hoạt động diễn ra dưới tài khoản của mình.',
        'Mỗi tài khoản thuộc về một gia đình. Nếu quên mật khẩu, hãy nhờ quản trị viên đặt lại.',
      ],
    },
    {
      title: '3. Gia đình và quyền truy cập',
      bullets: [
        'Người tạo gia đình là chủ nhà, có quyền mời thành viên, chọn quyền “Được sửa” hoặc “Chỉ xem” và xoá thành viên.',
        'Mã mời chỉ dùng một lần và hết hạn sau 7 ngày. Chỉ chia sẻ mã cho người bạn tin tưởng.',
        'Mọi thành viên trong gia đình đều xem được lịch học, ghi chú và thông tin các con của gia đình đó.',
      ],
    },
    {
      title: '4. Nội dung bạn nhập',
      paragraphs: [
        'Bạn giữ quyền đối với nội dung mình nhập (tên, ảnh đại diện của con, lịch học, ghi chú, số điện thoại giáo viên…). Bạn cam kết có quyền nhập và chia sẻ các thông tin này với thành viên gia đình, đặc biệt là thông tin của trẻ em và của bên thứ ba như giáo viên.',
        'Không dùng ứng dụng để lưu trữ hoặc phát tán nội dung vi phạm pháp luật, xúc phạm người khác hoặc xâm phạm quyền riêng tư của bất kỳ ai.',
      ],
    },
    {
      title: '5. Nhắc lịch',
      paragraphs: [
        'Thông báo nhắc lịch trên điện thoại và email nhắc lịch là tiện ích hỗ trợ. Việc gửi có thể bị chậm hoặc không thành công do cài đặt thiết bị, kết nối mạng hoặc nhà cung cấp email. Bạn vẫn nên tự theo dõi lịch học của các con.',
      ],
    },
    {
      title: '6. Hành vi bị cấm',
      bullets: [
        'Truy cập trái phép vào tài khoản hoặc dữ liệu của gia đình khác.',
        'Can thiệp, tấn công hoặc làm quá tải hệ thống.',
        'Sao chép, dịch ngược hoặc khai thác ứng dụng cho mục đích thương mại khi chưa được phép.',
      ],
    },
    {
      title: '7. Giới hạn trách nhiệm',
      paragraphs: [
        'Ứng dụng được cung cấp “nguyên trạng”. Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm về thiệt hại phát sinh từ việc lỡ lịch, dữ liệu nhập sai hoặc gián đoạn dịch vụ ngoài tầm kiểm soát hợp lý của chúng tôi.',
      ],
    },
    {
      title: '8. Tạm ngừng và chấm dứt',
      paragraphs: [
        'Bạn có thể ngừng sử dụng và tự xoá tài khoản bất cứ lúc nào trong tab Gia đình › Xoá tài khoản. Chúng tôi có thể khoá tài khoản vi phạm các điều khoản này.',
      ],
    },
    {
      title: '9. Thay đổi điều khoản',
      paragraphs: [
        'Khi điều khoản thay đổi, ngày cập nhật ở đầu trang sẽ được đổi theo. Việc bạn tiếp tục sử dụng ứng dụng sau đó đồng nghĩa với việc chấp nhận điều khoản mới.',
        'Các điều khoản này được điều chỉnh theo pháp luật Việt Nam.',
      ],
    },
  ],
  privacy: [
    {
      title: '1. Dữ liệu chúng tôi thu thập',
      bullets: [
        'Tài khoản: email, mật khẩu (được mã hoá, chúng tôi không đọc được) và tên hiển thị của bạn.',
        'Gia đình: tên gia đình, danh sách thành viên và quyền của từng người.',
        'Thông tin các con: tên, lớp, trường, màu đại diện và ảnh đại diện (nếu bạn thêm).',
        'Lịch học: tên lớp, ngày giờ, địa điểm, giáo viên, số điện thoại liên hệ, người đưa đón, thời gian nhắc, ghi chú, lý do nghỉ.',
        'Ghi chú theo ngày của gia đình và của từng con.',
      ],
      paragraphs: [
        'Ứng dụng không thu thập vị trí, danh bạ, không dùng quảng cáo và không theo dõi hành vi của bạn trên các ứng dụng khác.',
      ],
    },
    {
      title: '2. Mục đích sử dụng',
      bullets: [
        'Hiển thị và đồng bộ lịch học giữa các thành viên trong gia đình.',
        'Gửi thông báo nhắc lịch trên điện thoại và email nhắc lịch khi bạn bật “Nhắc cả gia đình”.',
        'Đăng nhập, bảo vệ tài khoản và hỗ trợ khi bạn cần.',
      ],
      paragraphs: ['Chúng tôi không bán, cho thuê hay dùng dữ liệu của bạn cho mục đích quảng cáo.'],
    },
    {
      title: '3. Ai xem được dữ liệu',
      paragraphs: [
        'Chỉ các thành viên trong cùng gia đình mới xem được dữ liệu của gia đình đó. Quy tắc này được áp dụng ngay trong cơ sở dữ liệu, không chỉ trên giao diện.',
      ],
    },
    {
      title: '4. Bên cung cấp dịch vụ',
      bullets: [
        'Supabase: lưu trữ cơ sở dữ liệu và xác thực đăng nhập.',
        'Resend: gửi email nhắc lịch tới thành viên gia đình (chỉ khi bạn bật nhắc cả gia đình).',
      ],
      paragraphs: [
        'Các bên này chỉ xử lý dữ liệu để vận hành dịch vụ cho chúng tôi. Máy chủ của họ có thể đặt ngoài Việt Nam.',
      ],
    },
    {
      title: '5. Dữ liệu trên thiết bị',
      paragraphs: [
        'Ứng dụng lưu tạm lịch đã tải trên thiết bị để bạn xem được khi mất mạng, và đặt lịch thông báo cục bộ để nhắc giờ học. Khi đăng xuất, phiên đăng nhập, dữ liệu lưu tạm và các thông báo nhắc lịch trên thiết bị sẽ bị xoá.',
      ],
    },
    {
      title: '6. Bảo mật',
      paragraphs: [
        'Dữ liệu được truyền qua kết nối mã hoá (HTTPS) và được phân quyền theo từng gia đình. Không có hệ thống nào an toàn tuyệt đối, vì vậy hãy dùng mật khẩu mạnh và không chia sẻ tài khoản.',
      ],
    },
    {
      title: '7. Dữ liệu của trẻ em',
      paragraphs: [
        'Ứng dụng dành cho phụ huynh và người giám hộ, không dành cho trẻ em tự sử dụng. Thông tin của các con do phụ huynh nhập và quản lý; phụ huynh có thể sửa hoặc xoá bất cứ lúc nào.',
      ],
    },
    {
      title: '8. Lưu trữ và xoá dữ liệu',
      bullets: [
        'Dữ liệu được lưu cho đến khi bạn xoá. Bạn có thể tự xoá tài khoản trong tab Gia đình › Xoá tài khoản; email và tên hiển thị của bạn sẽ bị xoá ngay.',
        'Xoá một con sẽ xoá toàn bộ lịch học và ghi chú của con đó.',
        'Nếu gia đình còn thành viên khác, dữ liệu chung của gia đình được giữ lại cho họ (quyền chủ nhà chuyển cho người có quyền sửa tham gia sớm nhất). Nếu bạn là thành viên cuối cùng, toàn bộ dữ liệu của gia đình bị xoá vĩnh viễn.',
      ],
    },
    {
      title: '9. Quyền của bạn',
      paragraphs: [
        'Theo pháp luật Việt Nam về bảo vệ dữ liệu cá nhân, bạn có quyền được biết, truy cập, chỉnh sửa, yêu cầu xoá dữ liệu và rút lại sự đồng ý. Phần lớn dữ liệu bạn có thể tự sửa hoặc xoá ngay trong ứng dụng; với các yêu cầu khác, hãy liên hệ quản trị viên.',
      ],
    },
    {
      title: '10. Thay đổi chính sách',
      paragraphs: [
        'Khi chính sách thay đổi, ngày cập nhật ở đầu trang sẽ được đổi theo. Với thay đổi quan trọng, chúng tôi sẽ thông báo trong ứng dụng.',
      ],
    },
  ],
}
