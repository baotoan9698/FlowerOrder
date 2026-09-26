export const accessMessages: Record<string, string> = {
  expired: "Bạn cần gia hạn để được tiếp tục sử dụng",
  pending: "Tài khoản đang chờ quản trị viên duyệt và cấp thời hạn sử dụng.",
  suspended: "Shop đã bị tạm khóa. Vui lòng liên hệ quản trị viên.",
  rejected: "Đăng ký chưa được chấp thuận. Vui lòng liên hệ quản trị viên.",
};
export function accessReason(shop: { accessStatus: string; accessUntil: Date | null }) {
  if (shop.accessStatus !== "active") return shop.accessStatus;
  return shop.accessUntil && shop.accessUntil.getTime() <= Date.now() ? "expired" : null;
}
