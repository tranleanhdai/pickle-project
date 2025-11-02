// src/screens/PaymentGuide.tsx
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Alert, ScrollView } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import {
  Appbar,
  Card,
  Text,
  Button,
  Badge,
  Divider,
  List,
} from "react-native-paper";
import { api } from "../api/client";
import { createVnpayPayment } from "../api/payments";

type RouteParams = {
  bookingId: string;
  amount: number;
  username?: string;
  courtName?: string;
};

type BookingDTO = {
  _id: string;
  paymentMethod: "pay_later" | "prepay_transfer";
  paymentStatus:
    | "pending"
    | "awaiting_transfer"
    | "verifying"
    | "paid"
    | "failed"
    | "expired";
  price: number;
  courtId?: string;
  date?: string;
  transfer?: { memoCode?: string; proofUrl?: string; bankRef?: string };
  note?: string;
};

export default function PaymentGuide({ route, navigation }: any) {
  const { bookingId, amount } = route.params as RouteParams;
  const qc = useQueryClient();
  const openedRef = useRef(false);
  const doneRef = useRef(false);

  // Poll booking
  const bookingQ = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const { data } = await api.get<BookingDTO>(`/bookings/${bookingId}`);
      return data;
    },
    enabled: !!bookingId,
    refetchInterval: (q) => {
      const st = (q.state.data as BookingDTO | undefined)?.paymentStatus;
      return st && st !== "paid" && st !== "failed" ? 3000 : false;
    },
  });

  // Tự mở VNPAY ngay lần đầu vào màn (nếu chưa paid)
  useEffect(() => {
    const st = bookingQ.data?.paymentStatus;
    if (!openedRef.current && st && st !== "paid" && st !== "failed") {
      openedRef.current = true;
      openVnpay();
    }
  }, [bookingQ.data?.paymentStatus]);

  // Khi đã paid → invalidate + điều hướng
  useEffect(() => {
    const st = bookingQ.data?.paymentStatus;
    if (!doneRef.current && st === "paid") {
      doneRef.current = true;
      qc.invalidateQueries({ queryKey: ["availability"], exact: false });
      qc.invalidateQueries({ queryKey: ["my-bookings"], exact: false });
      qc.invalidateQueries({ queryKey: ["booking", bookingId] });
      Alert.alert("Thành công", "Thanh toán đã được xác nhận.");
      navigation.replace("Booking", { highlightId: bookingId });
    }
  }, [bookingQ.data?.paymentStatus]);

  const openVnpay = async () => {
    try {
      const { url } = await createVnpayPayment(bookingId);
      // Return URL server sẽ redirect về deep-link: picklecourts://payment-result
      await WebBrowser.openAuthSessionAsync(url, Linking.createURL("payment-result"));
      bookingQ.refetch();
    } catch (e: any) {
      Alert.alert("Không thể mở VNPAY", e?.response?.data?.error || e?.message || "Lỗi không xác định");
    }
  };

  const status =
    (bookingQ.data?.paymentStatus as
      | "awaiting_transfer"
      | "verifying"
      | "paid"
      | "failed"
      | undefined) || "awaiting_transfer";

  const renderStatusBadge = () => {
    if (status === "paid")
      return <Badge style={styles.badgeSuccess}>ĐÃ THANH TOÁN</Badge>;
    if (status === "verifying")
      return <Badge style={styles.badgeWarning}>ĐANG XÁC MINH</Badge>;
    if (status === "failed")
      return <Badge style={styles.badgeDanger}>THANH TOÁN THẤT BẠI</Badge>;
    return <Badge style={styles.badgeInfo}>CHỜ THANH TOÁN</Badge>;
  };

  const ctaLabel = status === "paid" ? "Đã thanh toán" : "Mở lại cổng thanh toán VNPAY";
  const disableButton = status === "paid";

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <Appbar.Header elevated mode="center-aligned">
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Thanh toán online (VNPAY)" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} alwaysBounceVertical>
        {/* Thông tin đơn & trạng thái */}
        <Card mode="elevated" style={{ marginBottom: 12 }}>
          <Card.Title
            title="Thông tin thanh toán"
            left={(props) => <List.Icon {...props} icon="credit-card-outline" />}
            right={() => (
              <View style={{ paddingRight: 12, paddingTop: 6 }}>{renderStatusBadge()}</View>
            )}
            titleVariant="titleSmall"
          />
          <Divider />
          <Card.Content style={{ paddingTop: 8 }}>
            <List.Item
              title="Cổng thanh toán"
              description="VNPAY (Sandbox)"
              left={(p) => <List.Icon {...p} icon="shield-check-outline" />}
            />
            <List.Item
              title="Số tiền"
              right={() => (
                <Text style={styles.amount}>
                  {Intl.NumberFormat("vi-VN").format(Number(amount))} đ
                </Text>
              )}
              left={(p) => <List.Icon {...p} icon="cash-multiple" />}
            />
            <Text style={{ opacity: 0.7, marginTop: 8 }}>
              Sau khi hoàn tất trên VNPAY, hóa đơn sẽ được tự động xác nhận. Bạn có thể bấm
              “Mở lại cổng thanh toán” để vào lại nếu đã đóng trình duyệt.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <Button
          mode={status === "paid" ? "contained-tonal" : "contained"}
          onPress={status === "paid" ? () => navigation.replace("Booking", { highlightId: bookingId }) : openVnpay}
          disabled={disableButton}
          contentStyle={{ height: 52, borderRadius: 999 }}
          style={{ borderRadius: 999, flex: 1 }}
        >
          {ctaLabel}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { fontSize: 20, fontWeight: "800", alignSelf: "center", marginRight: 6 },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
    backgroundColor: "white",
  },
  badgeInfo: {
    backgroundColor: "rgba(98,0,238,0.12)",
    color: "#6200ee",
    paddingHorizontal: 8,
  },
  badgeWarning: {
    backgroundColor: "rgba(255,193,7,0.18)",
    color: "#8a6d00",
    paddingHorizontal: 8,
  },
  badgeSuccess: {
    backgroundColor: "rgba(46,125,50,0.18)",
    color: "#2e7d32",
    paddingHorizontal: 8,
  },
  badgeDanger: {
    backgroundColor: "rgba(211,47,47,0.18)",
    color: "#d32f2f",
    paddingHorizontal: 8,
  },
});
