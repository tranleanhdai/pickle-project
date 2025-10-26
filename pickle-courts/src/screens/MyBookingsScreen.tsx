// src/screens/MyBookingsScreen.tsx
import React, { useMemo, useCallback, useState } from "react";
import { View, SectionList, RefreshControl, TouchableOpacity } from "react-native";
import {
  Appbar,
  Card,
  Text,
  Badge,
  Button,
  ActivityIndicator,
  Divider,
} from "react-native-paper";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import { cancelBooking } from "../api/booking";
import { useMyBookings, type Booking } from "../hooks/useMyBookings";

/* ===== v0 palette ===== */
const C = {
  bg: "#F7F4FA",                // nền tím nhạt
  card: "#FFFFFF",
  textMuted: "rgba(0,0,0,0.55)",
  chipBg: "rgba(98,0,238,0.10)",
  chipActiveBg: "#6B4EFF",
  chipActiveText: "#fff",
  badgeBg: "rgba(0,0,0,0.06)",
  paid: "#2e7d32",
  waiting: "#6b4eff",
  fail: "#d32f2f",
  gray: "#9e9e9e",
  border: "rgba(0,0,0,0.06)",
};

function statusStyle(b: Booking) {
  switch (b.paymentStatus) {
    case "paid":
      return { text: "Đã thanh toán", color: C.paid, border: "rgba(46,125,50,0.16)" };
    case "verifying":
      return { text: "Đang xác minh", color: C.waiting, border: "rgba(107,78,255,0.18)" };
    case "awaiting_transfer":
      return { text: "Chờ chuyển khoản", color: C.waiting, border: "rgba(107,78,255,0.18)" };
    case "pending":
      return { text: b.paymentMethod === "pay_later" ? "Giữ chỗ (trả sau)" : "Chờ xử lý", color: C.waiting, border: "rgba(107,78,255,0.18)" };
    case "failed":
      return { text: "Thanh toán thất bại", color: C.fail, border: "rgba(211,47,47,0.14)" };
    case "expired":
      return { text: "Hết hạn giữ chỗ", color: C.gray, border: "rgba(0,0,0,0.06)" };
    default:
      return { text: b.paymentStatus, color: C.gray, border: "rgba(0,0,0,0.06)" };
  }
}

const isUpcoming = (b: Booking) =>
  dayjs(`${b.date} ${b.endAt}`, "YYYY-MM-DD HH:mm").valueOf() > Date.now();

export default function MyBookingsScreen() {
  const qc = useQueryClient();
  const q = useMyBookings();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const sorted = useMemo(() => {
    const items = (q.data ?? []) as Booking[];
    const upcoming = items
      .filter(isUpcoming)
      .sort((a, b) =>
        dayjs(`${a.date}T${a.startAt}:00`).valueOf() -
        dayjs(`${b.date}T${b.startAt}:00`).valueOf()
      );
    const past = items
      .filter((b) => !isUpcoming(b))
      .sort((a, b) =>
        dayjs(`${b.date}T${b.startAt}:00`).valueOf() -
        dayjs(`${a.date}T${a.startAt}:00`).valueOf()
      );
    return { upcoming, past };
  }, [q.data]);

  const onRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["my-bookings"] });
  }, [qc]);

  const onCancel = useCallback((id: string, status: Booking["paymentStatus"]) => {
    if (status === "paid") {
      return alert("Booking đã thanh toán, vui lòng liên hệ admin để hỗ trợ.");
    }
    alert("Xác nhận hủy?"); // v0: dùng alert nhanh, nếu muốn dialog đẹp có thể thêm sau
    cancelBooking(id)
      .then(() => onRefresh())
      .catch((e: any) => alert(e?.response?.data?.error || "Không hủy được"));
  }, [onRefresh]);

  const data = tab === "upcoming" ? sorted.upcoming : sorted.past;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header v0: center aligned, nền phẳng */}
      <Appbar.Header mode="center-aligned" style={{ backgroundColor: C.bg, elevation: 0 }}>
        <Appbar.Content title="Lịch đặt" />
      </Appbar.Header>

      {/* Segmented chip v0 */}
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
        <TouchableOpacity
          onPress={() => setTab("upcoming")}
          style={{
            flex: 1,
            backgroundColor: tab === "upcoming" ? C.chipActiveBg : C.chipBg,
            paddingVertical: 10,
            borderRadius: 999,
            alignItems: "center",
          }}
        >
          <Text style={{ color: tab === "upcoming" ? C.chipActiveText : "#2c2c2c", fontWeight: "700" }}>
            Sắp tới {sorted.upcoming.length ? `(${sorted.upcoming.length})` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab("past")}
          style={{
            flex: 1,
            backgroundColor: tab === "past" ? C.chipActiveBg : C.chipBg,
            paddingVertical: 10,
            borderRadius: 999,
            alignItems: "center",
          }}
        >
          <Text style={{ color: tab === "past" ? C.chipActiveText : "#2c2c2c", fontWeight: "700" }}>
            Đã qua {sorted.past.length ? `(${sorted.past.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {q.isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: C.textMuted }}>Đang tải lịch đặt…</Text>
        </View>
      ) : (
        <SectionList
          sections={[{ title: "", data }]}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const st = statusStyle(item);
            return (
              <Card
                mode="elevated"
                style={{
                  marginBottom: 12,
                  borderRadius: 16,
                  backgroundColor: C.card,
                  // viền nhẹ theo trạng thái
                  borderColor: st.border as string,
                  borderWidth: 1,
                  shadowColor: "#000",
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 1,
                }}
              >
                <Card.Title
                  title={item.courtName || "—"}
                  titleVariant="titleMedium"
                  subtitle={`${dayjs(item.date).format("DD/MM/YYYY")} • ${item.startAt} - ${item.endAt}`}
                  subtitleStyle={{ color: C.textMuted }}
                  right={() => (
                    <Badge
                      style={{
                        marginRight: 12,
                        alignSelf: "center",
                        backgroundColor: C.badgeBg,
                        color: st.color,
                      }}
                    >
                      {st.text}
                    </Badge>
                  )}
                />
                <Divider />
                <Card.Content style={{ paddingTop: 10, paddingBottom: 6 }}>
                  {!!item.price && (
                    <Text style={{ fontWeight: "800", fontSize: 18 }}>
                      {item.price.toLocaleString("vi-VN")} đ
                    </Text>
                  )}
                  {!!item.note && (
                    <Text style={{ marginTop: 6, color: C.textMuted }}>Ghi chú: {item.note}</Text>
                  )}
                </Card.Content>
                <Card.Actions style={{ justifyContent: "flex-end", paddingHorizontal: 12, paddingBottom: 10 }}>
                  {item.paymentStatus !== "paid" ? (
                    <Button
                      onPress={() => onCancel(item.id, item.paymentStatus)}
                      mode="outlined"
                      textColor="#2c2c2c"
                      style={{ borderColor: C.border, borderRadius: 12 }}
                      contentStyle={{ height: 42 }}
                    >
                      Hủy
                    </Button>
                  ) : null}
                </Card.Actions>
              </Card>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 48 }}>
              <Text style={{ color: C.textMuted }}>Chưa có lịch đặt nào</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
