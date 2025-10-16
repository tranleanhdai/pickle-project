// pickle-courts/src/screens/ProfileScreen.tsx
import React, { useEffect, useState } from "react";
import { View, ScrollView, Pressable, Alert } from "react-native";
import {
  ActivityIndicator,
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Text,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "../hooks/useMe";
import { api } from "../api/client";
import { useRecentBookings, type PaymentStatus, type PaymentMethod } from "../hooks/useMyBookings";

export default function ProfileScreen({ navigation }: any) {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useMe();
  const [loggingOut, setLoggingOut] = useState(false);

  // Lấy 3 booking gần nhất
  const recent = useRecentBookings(3);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem("token");
      console.log("[Profile] api baseURL =", api.getUri());
      console.log("[Profile] token exist? ->", !!token);
      if (error) {
        const e: any = error;
        console.log("[Profile] /auth/me error status =", e?.response?.status);
        console.log("[Profile] /auth/me error data   =", e?.response?.data);
        console.log("[Profile] /auth/me error msg    =", e?.message);
      } else if (data) {
        console.log("[Profile] /auth/me OK ->", {
          id: data.id,
          role: data.role,
          name: data.name || data.username,
        });
      }
    })();
  }, [data, error]);

  const logout = async () => {
    setLoggingOut(true);
    try {
      await AsyncStorage.removeItem("token");
      qc.removeQueries({ queryKey: ["me"] });
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } finally {
      setLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Đang tải…</Text>
      </View>
    );
  }

  if (error || !data) {
    const err: any = error;
    const status = err?.response?.status;
    const body = err?.response?.data ?? err?.message;

    return (
      <View style={{ flex: 1, padding: 16, gap: 12, alignItems: "center" }}>
        <Text style={{ color: "red", textAlign: "center" }}>
          {"Không tải được thông tin user\n"}
          {status ? `HTTP ${status}` : ""} {status ? "\n" : ""}
          {typeof body === "string" ? body : JSON.stringify(body)}
        </Text>

        <Button onPress={() => refetch()} loading={isFetching}>
          Thử lại
        </Button>

        <Button
          mode="outlined"
          onPress={async () => {
            const t = await AsyncStorage.getItem("token");
            console.log("[Profile] Current token:", t);
          }}
        >
          Debug token
        </Button>

        <Button mode="contained" onPress={logout} loading={loggingOut} disabled={loggingOut}>
          Đăng xuất
        </Button>
      </View>
    );
  }

  const isAdmin = data.role === "admin";
  const displayName = data.name || data.username || "—";

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header */}
      <View style={{ backgroundColor: "#6750A4", paddingTop: 48, paddingBottom: 88, paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 16 }}>Hồ sơ cá nhân</Text>

        {/* User Info Card */}
        <Card style={{ borderRadius: 16, overflow: "hidden" }}>
          <Card.Content style={{ padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <Avatar.Text size={72} label={displayName.slice(0, 2).toUpperCase()} />
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: "700", marginBottom: 4 }}>
                  {displayName}
                </Text>
                <Badge style={{ alignSelf: "flex-start" }}>{isAdmin ? "Quản trị" : "Thành viên"}</Badge>
              </View>
            </View>

            <View style={{ gap: 6 }}>
              {!!data.email && <MutedRow label={data.email} />}
              {!!data.username && <MutedRow label={"@" + data.username} />}
              <MutedRow label={"TP. Hồ Chí Minh"} />
            </View>
          </Card.Content>
        </Card>
      </View>

      {/* Body */}
      <View style={{ paddingHorizontal: 16, marginTop: -60, gap: 16 }}>
        {/* Stats */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatCard value="24" label="Lượt đặt" tint="#6750A4" />
          <StatCard value="18" label="Hoàn thành" tint="#00A389" />
          <StatCard value="3" label="Đang chờ" tint="#4F46E5" />
        </View>

        {/* Account info */}
        <Card style={{ borderRadius: 16 }}>
          <Card.Title title="Thông tin tài khoản" />
          <Card.Content style={{ gap: 8 }}>
            <KV k="ID" v={data.id} />
            <KV k="Quyền" v={isAdmin ? "Quản trị" : "Người dùng"} />
            <KV k="Tạo lúc" v={fmt(data.createdAt)} />
            <KV k="Cập nhật" v={fmt(data.updatedAt)} />
          </Card.Content>
        </Card>

        {/* Menu Items */}
        <Card style={{ borderRadius: 16 }}>
          <Card.Content style={{ padding: 0 }}>
            <MenuItem
              label="Cài đặt tài khoản"
              onPress={() => Alert.alert("Thông báo", "Mục này đang phát triển")}
            />
            <Divider />
            <MenuItem
              label="Lịch đặt sân"
              onPress={() => {
                navigation.getParent?.()?.navigate("BookingsTab");
              }}
            />
            <Divider />
            <MenuItem
              label="Lịch sử giao dịch"
              onPress={() => Alert.alert("Thông báo", "Mục này đang phát triển")}
            />
          </Card.Content>
        </Card>

        {/* Recent Bookings (top 3 từ server) */}
        <View>
          <Text variant="titleMedium" style={{ fontWeight: "700", marginBottom: 8 }}>
            Lịch sử đặt sân
          </Text>

          {recent.isLoading ? (
            <Text style={{ opacity: 0.6 }}>Đang tải…</Text>
          ) : (recent.data?.length ?? 0) === 0 ? (
            <Text style={{ opacity: 0.6 }}>Chưa có lịch sử</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {recent.data!.map((b) => (
                <Card key={b.id} style={{ borderRadius: 14 }}>
                  <Card.Content style={{ padding: 14 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <View>
                        <Text style={{ fontWeight: "700", marginBottom: 2 }}>{b.courtName || "—"}</Text>
                      </View>
                      <HistoryStatusBadge status={b.paymentStatus} method={b.paymentMethod} />
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: "#6b7280" }}>
                        {dayjs(b.date).format("DD/MM/YYYY")}  •  {b.startAt} - {b.endAt}
                      </Text>
                      {!!b.price && (
                        <Text style={{ color: "#6750A4", fontWeight: "700" }}>
                          {b.price.toLocaleString("vi-VN")}đ
                        </Text>
                      )}
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </View>
          )}

          <Button
            mode="outlined"
            onPress={() => recent.refetch()}
            loading={recent.isRefetching}
            style={{ marginTop: 8 }}
          >
            Làm mới
          </Button>
        </View>

        {/* Actions */}
        <View style={{ gap: 8 }}>
          <Button mode="contained-tonal" onPress={logout} loading={loggingOut} disabled={loggingOut}>
            Đăng xuất
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

function MutedRow({ label }: { label: string }) {
  return <Text style={{ color: "#6b7280" }}>{label}</Text>;
}

function KV({ k, v }: { k: string; v?: any }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: "#6b7280" }}>{k}</Text>
      <Text selectable>{String(v ?? "—")}</Text>
    </View>
  );
}

function fmt(d?: string) {
  return d ? dayjs(d).format("HH:mm, DD/MM/YYYY") : "—";
}

function StatCard({ value, label, tint }: { value: string; label: string; tint: string }) {
  return (
    <Card style={{ flex: 1, borderRadius: 16 }}>
      <Card.Content style={{ paddingVertical: 14, alignItems: "center" }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: tint }}>{value}</Text>
        <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{label}</Text>
      </Card.Content>
    </Card>
  );
}

function MenuItem({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} android_ripple={{ color: "#E9E9EC" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 }}>
        <Text style={{ flex: 1 }}>{label}</Text>
        <Text style={{ color: "#9CA3AF" }}>›</Text>
      </View>
    </Pressable>
  );
}

/** Badge trạng thái dựa trên paymentStatus (+ method để ghi nhãn “Giữ chỗ (trả sau)”) */
function HistoryStatusBadge({
  status,
  method,
}: {
  status: PaymentStatus;
  method: PaymentMethod;
}) {
  if (status === "paid") {
    return <Badge style={{ backgroundColor: "#E6FAF4", color: "#00A389" }}>Hoàn thành</Badge>;
  }
  if (status === "verifying") {
    return <Badge style={{ backgroundColor: "#EEF2FF", color: "#4F46E5" }}>Đang xác minh</Badge>;
  }
  if (status === "awaiting_transfer") {
    return <Badge style={{ backgroundColor: "#EEF2FF", color: "#4F46E5" }}>Chờ chuyển khoản</Badge>;
  }
  if (status === "pending") {
    return (
      <Badge style={{ backgroundColor: "#EEF2FF", color: "#4F46E5" }}>
        {method === "pay_later" ? "Giữ chỗ (trả sau)" : "Chờ xử lý"}
      </Badge>
    );
  }
  if (status === "expired") {
    return <Badge style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>Hết hạn</Badge>;
  }
  // failed / cancelled
  return <Badge style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>Đã hủy</Badge>;
}
