// src/screens/PaymentGuide.tsx
import React, { useEffect, useRef } from "react";
import { View, Image, StyleSheet, Alert, ScrollView } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import {
  Appbar,
  Card,
  Text,
  Button,
  Badge,
  Divider,
  TouchableRipple,
  List,
} from "react-native-paper";
import { api } from "../api/client";
import qrVcb from "../../assets/qr-vcb.png";

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
  transfer?: { memoCode?: string; proofUrl?: string };
  note?: string;
};

export default function PaymentGuide({ route, navigation }: any) {
  const { bookingId, amount, username, courtName } = route.params as RouteParams;
  const qc = useQueryClient();
  const confirmingRef = useRef(false);
  const doneRef = useRef(false);

  // ===== Poll booking (giữ nguyên) =====
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

  // ======= Giờ local để tạo memo (giữ nguyên) =======
  const pad = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const nowDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}`;

  const memoContent = (() => {
    if (courtName) return `CK DAT ${courtName} luc ${nowTime} ngay ${nowDate}`;
    if (username)
      return `TOI DA CHUYEN KHOAN DAT SAN luc ${nowTime} ngay ${nowDate} - ${username}`;
    return `TOI DA CHUYEN KHOAN DAT SAN luc ${nowTime} ngay ${nowDate}`;
  })();

  const status = bookingQ.data?.paymentStatus as
    | "awaiting_transfer"
    | "verifying"
    | "paid"
    | "failed"
    | undefined;

  const onCopyMemo = async () => {
    await Clipboard.setStringAsync(memoContent);
    Alert.alert("Đã sao chép", "Bạn đã copy nội dung chuyển khoản.");
  };

  const onIHaveTransferred = async () => {
    if (confirmingRef.current || status === "verifying" || status === "paid") return;
    try {
      confirmingRef.current = true;
      await api.post("/payments/transfer/confirm", {
        bookingId,
        proofUrl: "USER_CONFIRMED_TRANSFER",
      });
      Alert.alert("Đã ghi nhận", "Đang chờ xác minh giao dịch. Vui lòng đợi chút nhé!");
      bookingQ.refetch();
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.error || e?.message || "Báo đã chuyển thất bại"
      );
    } finally {
      confirmingRef.current = false;
    }
  };

  const disableButton = status === "verifying" || status === "paid";

  // ======= UI helpers =======
  const renderStatusBadge = () => {
    if (status === "paid")
      return <Badge style={styles.badgeSuccess}>ĐÃ THANH TOÁN</Badge>;
    if (status === "verifying")
      return <Badge style={styles.badgeWarning}>ĐANG XÁC MINH</Badge>;
    if (status === "failed")
      return <Badge style={styles.badgeDanger}>THANH TOÁN THẤT BẠI</Badge>;
    return <Badge style={styles.badgeInfo}>CHỜ CHUYỂN KHOẢN</Badge>;
  };

  const ctaLabel =
    status === "awaiting_transfer"
      ? "Tôi đã chuyển"
      : status === "verifying"
      ? "Đang xác minh…"
      : status === "paid"
      ? "Đã thanh toán"
      : "Báo đã chuyển";

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      {/* Header v0 */}
      <Appbar.Header elevated mode="center-aligned">
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Hướng dẫn thanh toán" />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        alwaysBounceVertical
      >
        {/* SECTION: Thông tin chuyển khoản (icon + list rows) */}
        <Card mode="elevated" style={{ marginBottom: 12 }}>
          <Card.Title
            title="Thông tin chuyển khoản"
            left={(props) => <List.Icon {...props} icon="credit-card-outline" />}
            right={() => (
              <View style={{ paddingRight: 12, paddingTop: 6 }}>{renderStatusBadge()}</View>
            )}
            titleVariant="titleSmall"
          />
          <Divider />
          <Card.Content style={{ paddingTop: 8 }}>
            <List.Item
              title="Ngân hàng"
              description="Vietcombank"
              left={(p) => <List.Icon {...p} icon="bank-outline" />}
            />
            <List.Item
              title="Chủ tài khoản"
              description="TRAN LE ANH DAI"
              left={(p) => <List.Icon {...p} icon="account-outline" />}
            />
            <List.Item
              title="Số tài khoản"
              description="1018538056"
              left={(p) => <List.Icon {...p} icon="numeric" />}
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
          </Card.Content>
        </Card>

        {/* SECTION: Nội dung chuyển khoản (chip + copy bên cạnh) */}
        <Card mode="elevated" style={{ marginBottom: 12 }}>
          <Card.Title
            title="Nội dung chuyển khoản"
            left={(props) => <List.Icon {...props} icon="text-box-outline" />}
            titleVariant="titleSmall"
          />
          <Card.Content>
            <TouchableRipple onPress={onCopyMemo} borderless>
              <View style={styles.memoRow}>
                <View style={styles.memoChip}>
                  <Text style={{ fontWeight: "600" }}>{memoContent}</Text>
                </View>
                <Button
                  mode="outlined"
                  onPress={onCopyMemo}
                  compact
                  contentStyle={{ height: 40, borderRadius: 999, paddingHorizontal: 14 }}
                  style={{ borderRadius: 999, marginLeft: 8 }}
                >
                  Sao chép
                </Button>
              </View>
            </TouchableRipple>
            <Text style={{ opacity: 0.7, marginTop: 8 }}>
              Chạm để sao chép – vui lòng ghi đúng y chang.
            </Text>
          </Card.Content>
        </Card>

        {/* SECTION: QR */}
        <Card mode="elevated">
          <Card.Title
            title="Quét mã nhanh"
            left={(props) => <List.Icon {...props} icon="qrcode-scan" />}
            titleVariant="titleSmall"
          />
          <Card.Content>
            <View style={styles.qrWrap}>
              <Image source={qrVcb} style={styles.qr} />
            </View>
            <Text style={{ opacity: 0.7, marginTop: 12 }}>
              Sau khi chuyển khoản, vui lòng bấm “Tôi đã chuyển” để chúng tôi xác minh.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Bottom Action Bar (pill) */}
      {status !== "paid" && (
        <View style={styles.bottomBar}>
          <Button
            mode="contained"
            onPress={onIHaveTransferred}
            disabled={disableButton}
            contentStyle={{ height: 52, borderRadius: 999 }}
            style={{ borderRadius: 999, flex: 1 }}
          >
            {ctaLabel}
          </Button>
        </View>
      )}
      {status === "paid" && (
        <View style={styles.bottomBar}>
          <Button
            mode="contained-tonal"
            onPress={() => navigation.replace("Booking", { highlightId: bookingId })}
            contentStyle={{ height: 52, borderRadius: 999 }}
            style={{ borderRadius: 999, flex: 1 }}
          >
            Xem đơn của tôi
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { fontSize: 20, fontWeight: "800", alignSelf: "center", marginRight: 6 },
  memoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  memoChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(98, 0, 238, 0.06)", // tím nhạt v0
  },
  qrWrap: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.03)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  qr: {
    width: "100%",
    height: 320,
    resizeMode: "contain",
  },
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
