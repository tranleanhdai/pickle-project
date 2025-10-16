// pickle-courts/src/screens/AdminTransfersScreen.tsx
import React, { useMemo, useState } from "react";
import { View, Image, Alert, Linking, ScrollView } from "react-native";
import {
  Button,
  Text,
  TextInput,
  ActivityIndicator,
  Card,
  Divider,
  Chip,
  Badge,
} from "react-native-paper";
import { useAdminTransfers, useVerifyTransfer } from "../hooks/useAdminTransfers";

/* ---------------- UI helpers (UI only) ---------------- */
const statusColor = (st?: string) => {
  switch (st) {
    case "awaiting_transfer":
      return "#f59e0b"; // amber
    case "verifying":
      return "#06b6d4"; // cyan
    case "paid":
      return "#16a34a"; // green
    case "expired":
      return "#ef4444"; // red
    default:
      return "#6b7280"; // gray
  }
};

const ProofImage = ({ url }: { url?: string }) => {
  if (!url) return null;
  const isHttp = /^https?:\/\//i.test(url);
  if (!isHttp) return <Text style={{ color: "#6B7280", marginTop: 6 }}>Proof: {url}</Text>;
  return (
    <Image
      source={{ uri: url }}
      style={{
        width: "100%",
        height: 210,
        resizeMode: "cover",
        marginTop: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
      }}
    />
  );
};

/* ---------------- Screen ---------------- */
export default function AdminTransfersScreen() {
  const listQ = useAdminTransfers();
  const verifyM = useVerifyTransfer();

  const [bankRefMap, setBankRefMap] = useState<Record<string, string>>({});

  const onApprove = (id: string) => {
    const bankRef = bankRefMap[id]?.trim() || undefined;
    verifyM.mutate(
      { bookingId: id, success: true, bankRef },
      {
        onSuccess: () => Alert.alert("Thành công", "Đã xác nhận thanh toán."),
        onError: (e: any) => Alert.alert("Lỗi", e?.response?.data?.error || "Không xác nhận được."),
      }
    );
  };

  const onReject = (id: string) => {
    verifyM.mutate(
      { bookingId: id, success: false },
      {
        onSuccess: () => Alert.alert("Đã từ chối", "Đã đánh dấu thất bại."),
        onError: (e: any) => Alert.alert("Lỗi", e?.response?.data?.error || "Không từ chối được."),
      }
    );
  };

  const content = useMemo(() => {
    if (listQ.isLoading) {
      return (
        <View style={{ alignItems: "center", marginTop: 24 }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Đang tải danh sách…</Text>
        </View>
      );
    }

    if (listQ.error) {
      return <Text style={{ color: "#EF4444", padding: 16 }}>Không tải được danh sách</Text>;
    }

    const items = listQ.data ?? [];
    if (!items.length) {
      return (
        <Card style={{ borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB" }}>
          <Card.Content>
            <Text>Chưa có giao dịch cần duyệt.</Text>
          </Card.Content>
        </Card>
      );
    }

    return (
      <View style={{ gap: 12 }}>
        {items.map((b) => {
          const id = b._id;
          const money = Intl.NumberFormat("vi-VN").format(b.price);
          const memo = b.transfer?.memoCode ? `Memo: ${b.transfer.memoCode}` : undefined;
          const bankRef = bankRefMap[id] ?? "";
          const color = statusColor(b.paymentStatus);

          return (
            <Card
              key={id}
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <Card.Title
                title={`${b.courtName ?? b.courtId}`}
                subtitle={`${b.date}  ${b.startAt} – ${b.endAt}`}
                titleStyle={{ fontWeight: "700" }}
                right={() => (
                  <Chip
                    compact
                    style={{
                      marginRight: 12,
                      backgroundColor: `${color}1A`,
                      borderColor: color,
                      borderWidth: 1,
                      height: 28,
                    }}
                    textStyle={{ color, fontWeight: "600" }}
                  >
                    {b.paymentStatus}
                  </Chip>
                )}
              />
              <Card.Content style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <Badge style={{ backgroundColor: "#EEF2FF", color: "#4F46E5" }}>Chuyển khoản</Badge>
                  {!!memo && <Chip compact>{memo}</Chip>}
                </View>

                <Divider style={{ marginVertical: 8, backgroundColor: "#F3F4F6" }} />

                <Text style={{ color: "#111827" }}>
                  Số tiền: <Text style={{ fontWeight: "700" }}>{money} đ</Text>
                </Text>

                {/* Ẩn UserId khỏi dòng chính, nếu cần xem thì hiển thị nhẹ nhàng */}
                {!!b.userId && (
                  <Text style={{ color: "#9CA3AF" }} selectable>
                    User ID: {b.userId}
                  </Text>
                )}

                {!!b.note && <Text style={{ color: "#6B7280" }}>Ghi chú: {b.note}</Text>}

                <ProofImage url={b.transfer?.proofUrl} />

                <TextInput
                  mode="outlined"
                  label="Bank reference (tuỳ chọn)"
                  value={bankRef}
                  onChangeText={(t) => setBankRefMap((m) => ({ ...m, [id]: t }))}
                  style={{ marginTop: 10, backgroundColor: "#fff" }}
                />

                <View style={{ flexDirection: "row", marginTop: 12, gap: 10, flexWrap: "wrap" }}>
                  <Button
                    mode="contained"
                    onPress={() => onApprove(id)}
                    loading={verifyM.isPending}
                    style={{ borderRadius: 12 }}
                  >
                    Xác nhận
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => onReject(id)}
                    disabled={verifyM.isPending}
                    style={{ borderRadius: 12, borderColor: "#D1D5DB" }}
                  >
                    Từ chối
                  </Button>
                  {b.transfer?.memoCode && (
                    <Button
                      mode="text"
                      onPress={() => {
                        const q = encodeURIComponent(b.transfer!.memoCode!);
                        Linking.openURL(`https://www.google.com/search?q=${q}`);
                      }}
                    >
                      Tra cứu
                    </Button>
                  )}
                </View>
              </Card.Content>
            </Card>
          );
        })}
      </View>
    );
  }, [listQ.data, listQ.isLoading, listQ.error, bankRefMap, verifyM.isPending]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F9FAFB" }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={{ marginBottom: 4 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>Xác nhận chuyển khoản</Text>
        <Text style={{ color: "#6B7280", marginTop: 2 }}>Duyệt các giao dịch người dùng đã gửi minh chứng.</Text>
      </View>
      {content}
    </ScrollView>
  );
}
