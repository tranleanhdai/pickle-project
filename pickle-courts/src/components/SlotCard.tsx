import React, { useMemo } from "react";
import { View, Alert } from "react-native";
import { Button, Text } from "react-native-paper";
import type { Slot } from "../types/slot";

type Props = {
  slot: Slot;
  isBooking?: boolean;
  onBook: (slot: Slot) => void;
  onEditNote?: (bookingId: string) => void;
  onCancel: (bookingId: string) => void;
  disabled?: boolean;
  meId?: string;
};

export default function SlotCard({
  slot,
  isBooking = false,
  onBook,
  onCancel,
  onEditNote,
  disabled = false,
  meId,
}: Props) {
  const status = (slot as any).status as "available" | "blocked" | undefined;
  const booking = (slot as any).booking as
    | {
        id: string;
        userId: string;
        paymentMethod?: "pay_later" | "prepay_transfer";
        paymentStatus?:
          | "pending"
          | "awaiting_transfer"
          | "verifying"
          | "paid"
          | "failed"
          | "expired";
        holdUntil?: Date | string | null;
        note?: string;
      }
    | undefined;

  const isBooked = (slot as any).isBooked ?? (status === "blocked");
  const bookingId = (slot as any).bookingId ?? booking?.id;

  // ✅ ưu tiên cờ do server tính; nếu không có thì fallback so sánh userId
  const bookedByMeServer = Boolean((slot as any).bookedByMe);
  const isMineFallback =
    !!meId && !!booking?.userId && String(booking.userId) === String(meId);
  const isMine = bookedByMeServer || isMineFallback;

  const paymentMethod =
    (slot as any).paymentMethod ?? (booking?.paymentMethod as any);
  const paymentStatus =
    (slot as any).paymentStatus ?? (booking?.paymentStatus as any);
  const holdUntil =
    (slot as any).holdUntil ?? (booking?.holdUntil as any);

  const canManage = !!isMine && !!bookingId;

  // Đã qua giờ?
  const isPast = useMemo(() => {
    if (!(slot as any)?.date || !(slot as any)?.startAt) return false;
    const dt = new Date(`${(slot as any).date}T${(slot as any).startAt}:00`);
    return dt.getTime() <= Date.now();
  }, [(slot as any).date, (slot as any).startAt]);

  // Nhãn trạng thái
  const statusInfo = useMemo(() => {
    const m = paymentMethod;
    const s = paymentStatus;

    const hhmm = (d?: string | Date | null) => {
      if (!d) return "";
      const dd = new Date(d);
      const hh = String(dd.getHours()).padStart(2, "0");
      const mm = String(dd.getMinutes()).padStart(2, "0");
      return `đến ${hh}:${mm}`;
    };

    if (s === "paid") {
      return { text: isMine ? "ĐÃ THANH TOÁN (của bạn)" : "ĐÃ THANH TOÁN", color: "#2e7d32" };
    }
    if (m === "prepay_transfer" && (s === "awaiting_transfer" || s === "verifying")) {
      return { text: `Đang chờ chuyển khoản ${hhmm(holdUntil)}`, color: "#6b4eff" };
    }
    if (m === "pay_later" && s === "pending") {
      return { text: `Đang giữ chỗ ${hhmm(holdUntil)}`, color: isMine ? "#6b4eff" : "#d32f2f" };
    }
    if (isPast && !isBooked) {
      return { text: "Đã qua giờ", color: "#9e9e9e" };
    }
    if (isBooked) {
      return { text: isMine ? "ĐÃ ĐẶT (của bạn)" : "ĐÃ ĐẶT", color: isMine ? "#6b4eff" : "#d32f2f" };
    }
    return null;
  }, [isBooked, isMine, paymentMethod, paymentStatus, holdUntil, isPast]);

  const handleCancel = () => {
    const id = bookingId?.trim();
    if (!canManage) return Alert.alert("Không thể hủy", "Bạn không sở hữu booking này.");
    if (paymentStatus === "paid") {
      return Alert.alert("Không thể hủy", "Booking đã thanh toán, vui lòng liên hệ admin để được hỗ trợ.");
    }
    if (!id || id.startsWith("temp-"))
      return Alert.alert("Không hợp lệ", "Booking chưa tạo xong hoặc không hợp lệ.");
    onCancel(id);
  };

  const handleEditNote = () => {
  const id = bookingId?.trim();
  if (!canManage) return Alert.alert("Không thể sửa", "Bạn không sở hữu booking này.");
  if (!id) return Alert.alert("Lỗi", "Booking không tồn tại.");
  if (paymentStatus === "paid") return; // không cho sửa nếu đã thanh toán
  if (!onEditNote) return;              // guard khi prop không truyền
  onEditNote(id);                       // hoặc onEditNote?.(id)
};

  return (
    <View style={{ padding: 16, borderRadius: 12, backgroundColor: "#fff", marginBottom: 12 }}>
      <Text style={{ fontSize: 16 }}>
        {(slot as any).startAt} → {(slot as any).endAt}
      </Text>

      {(slot as any).price != null && (
        <Text style={{ marginTop: 4 }}>{Number((slot as any).price).toLocaleString()} đ</Text>
      )}

      {statusInfo && <Text style={{ marginTop: 6, color: statusInfo.color }}>{statusInfo.text}</Text>}

      {canManage ? (
  <View style={{ marginTop: 10 }}>
    {/* Chỉ render nút khi có onEditNote và chưa paid */}
    {onEditNote && paymentStatus !== "paid" && (
      <Button mode="outlined" onPress={handleEditNote}>Ghi chú</Button>
    )}

    <View style={{ height: 8 }} />
    {paymentStatus !== "paid" && (
      <Button mode="contained" onPress={handleCancel}>Hủy</Button>
    )}
  </View>
) : isBooked || isPast ? (
  <View style={{ height: 10 }} />
) : (
  <Button
    mode="contained"
    loading={isBooking}
    disabled={isBooking || disabled}
    onPress={() => onBook(slot)}
    style={{ marginTop: 10, opacity: isBooking || disabled ? 0.6 : 1 }}
  >
    Đặt sân
  </Button>
)}
    </View>
  );
}
