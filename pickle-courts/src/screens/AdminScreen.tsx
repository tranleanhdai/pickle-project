// pickle-courts/src/screens/AdminScreen.tsx
import React, { useMemo, useState, useLayoutEffect } from "react";
import { View, FlatList, RefreshControl, Alert } from "react-native";
import {
  Text,
  TextInput,
  Button,
  Card,
  Chip,
  Divider,
  ActivityIndicator,
} from "react-native-paper";
import dayjs from "dayjs";
import { useNavigation } from "@react-navigation/native";
import NoteDialog from "../components/NoteDialog";
import { useAdminGuard } from "../utils/adminGuard";
import {
  useAdminBookings,
  useAdminDeleteBooking,
  useAdminUpdateNote,
  type AdminBooking,
} from "../hooks/useAdminBookings";

export default function AdminScreen() {
  useAdminGuard();
  const navigation = useNavigation<any>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Bảng điều khiển",
      headerStyle: { backgroundColor: "#fff", elevation: 0 },
      headerTitleStyle: { color: "#111827", fontWeight: "700" },
      headerShadowVisible: false,
      headerRight: () => (
        <Button
          mode="text"
          textColor="#6B4EFF"
          onPress={() => navigation.navigate("AdminTransfers")}
        >
          Xác nhận
        </Button>
      ),
    });
  }, [navigation]);

  const [courtId, setCourtId] = useState("");
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));

  const filters = useMemo(
    () => ({ courtId: courtId.trim() || undefined, date: date || undefined }),
    [courtId, date]
  );

  const q = useAdminBookings(filters);
  const delM = useAdminDeleteBooking(filters);
  const noteM = useAdminUpdateNote(filters);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<AdminBooking | null>(null);

  const openEdit = (b: AdminBooking) => {
    setEditing(b);
    setDraft(b.note || "");
    setOpen(true);
  };

  const doDelete = (b: AdminBooking) => {
    Alert.alert("Xác nhận", `Huỷ booking ${b.date} ${b.startAt}-${b.endAt}?`, [
      { text: "Không" },
      {
        text: "Huỷ",
        style: "destructive",
        onPress: () =>
          delM.mutate(b._id, {
            onSuccess: () => Alert.alert("OK", "Đã huỷ booking"),
            onError: (e: any) =>
              Alert.alert("Lỗi", e?.response?.data?.error ?? "Không huỷ được"),
          }),
      },
    ]);
  };

  const sortedData = useMemo(() => {
    const arr = (q.data ?? []).slice();
    arr.sort((a, b) => {
      const ka = `${a.date} ${a.startAt}`;
      const kb = `${b.date} ${b.startAt}`;
      return ka.localeCompare(kb);
    });
    return arr;
  }, [q.data]);

  const summary = useMemo(() => {
    const count = sortedData.length;
    const revenue = sortedData.reduce((s, x) => s + (Number(x.price) || 0), 0);
    return { count, revenue };
  }, [sortedData]);

  const isToday = date === dayjs().format("YYYY-MM-DD");
  const isTomorrow = date === dayjs().add(1, "day").format("YYYY-MM-DD");

  /** ========== BADGE ========== */
  function StatusBadge({ item }: { item: AdminBooking }) {
    const pm = (item as any).paymentMethod;
    const ps = (item as any).paymentStatus;

    if (!pm && !ps) return null;

    let color = "#6B7280";
    let text = `${pm ?? "—"}${ps ? ` • ${ps}` : ""}`;

    switch (ps) {
      case "awaiting_transfer": color = "#F59E0B"; break;
      case "verifying": color = "#06B6D4"; break;
      case "paid": color = "#16A34A"; break;
      case "expired": color = "#EF4444"; break;
      case "pending": color = "#8B5CF6"; break;
    }

    return (
      <View
        style={{
          backgroundColor: `${color}15`,
          borderColor: `${color}40`,
          borderWidth: 1,
          paddingHorizontal: 10,
          paddingVertical: 3,
          borderRadius: 8,
          alignSelf: "flex-start",
        }}
      >
        <Text style={{ color, fontWeight: "600", fontSize: 13 }}>{text}</Text>
      </View>
    );
  }

  /** ========== UI ========== */
  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>


      <View style={{ flex: 1, padding: 16, gap: 14 }}>
        {/* FILTER CARD */}
        <Card
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            borderColor: "#E5E7EB",
            borderWidth: 1,
            elevation: 0,
          }}
        >
          <Card.Content style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Chip
                icon="calendar-today"
                selected={isToday}
                onPress={() => setDate(dayjs().format("YYYY-MM-DD"))}
                style={{
                  backgroundColor: isToday ? "#E0E7FF" : "#F3F4F6",
                }}
                textStyle={{
                  color: isToday ? "#4338CA" : "#374151",
                  fontWeight: "600",
                }}
              >
                Hôm nay
              </Chip>
              <Chip
                icon="calendar"
                selected={isTomorrow}
                onPress={() => setDate(dayjs().add(1, "day").format("YYYY-MM-DD"))}
                style={{
                  backgroundColor: isTomorrow ? "#E0E7FF" : "#F3F4F6",
                }}
                textStyle={{
                  color: isTomorrow ? "#4338CA" : "#374151",
                  fontWeight: "600",
                }}
              >
                Ngày mai
              </Chip>
              <Chip
                icon="close"
                onPress={() => setDate("")}
                style={{ backgroundColor: "#F3F4F6" }}
                textStyle={{ color: "#374151", fontWeight: "600" }}
              >
                Xoá ngày
              </Chip>
            </View>

            <TextInput
              label="Court ID (tuỳ chọn)"
              value={courtId}
              onChangeText={setCourtId}
              left={<TextInput.Icon icon="magnify" />}
              mode="outlined"
              style={{ backgroundColor: "#fff" }}
              outlineStyle={{ borderColor: "#E5E7EB" }}
            />
            <TextInput
              label="Ngày (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
              right={<TextInput.Affix text="YYYY-MM-DD" />}
              left={<TextInput.Icon icon="calendar-range" />}
              mode="outlined"
              style={{ backgroundColor: "#fff" }}
              outlineStyle={{ borderColor: "#E5E7EB" }}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                mode="contained"
                icon="filter"
                onPress={() => q.refetch()}
                loading={q.isFetching}
                style={{ borderRadius: 12 }}
              >
                Lọc
              </Button>
              <Button
                mode="outlined"
                icon="bank"
                onPress={() => navigation.navigate("AdminTransfers")}
                textColor="#6B4EFF"
                style={{ borderRadius: 12, borderColor: "#D1D5DB" }}
              >
                Xác nhận chuyển khoản
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* SUMMARY */}
        <Card
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            borderColor: "#E5E7EB",
            borderWidth: 1,
          }}
        >
          <Card.Content
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 4,
            }}
          >
            <View>
              <Text style={{ color: "#6B7280" }}>Tổng booking</Text>
              <Text style={{ color: "#111827", fontWeight: "700", fontSize: 18 }}>
                {summary.count}
              </Text>
            </View>
            <View>
              <Text style={{ color: "#6B7280" }}>Doanh thu</Text>
              <Text style={{ color: "#16A34A", fontWeight: "700", fontSize: 18 }}>
                {summary.revenue.toLocaleString()} đ
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* LIST */}
        {q.isLoading ? (
          <View style={{ paddingTop: 20 }}>
            <ActivityIndicator />
          </View>
        ) : q.error ? (
          <Text style={{ paddingTop: 16, color: "#EF4444" }}>
            Không tải được danh sách
          </Text>
        ) : (
          <FlatList
            data={sortedData}
            keyExtractor={(b) => b._id}
            refreshControl={
              <RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} />
            }
            contentContainerStyle={{ paddingBottom: 30 }}
            ListEmptyComponent={
              <Text style={{ color: "#9CA3AF", textAlign: "center", marginTop: 16 }}>
                Không có booking nào
              </Text>
            }
            renderItem={({ item }) => (
              <Card
                style={{
                  marginTop: 12,
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  borderColor: "#E5E7EB",
                  borderWidth: 1,
                }}
              >
                <Card.Content style={{ gap: 6 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#111827", fontWeight: "700", fontSize: 16 }}>
                      {item.courtName || item.courtId}
                    </Text>
                    <StatusBadge item={item} />
                  </View>
                  <Text style={{ color: "#6B7280" }}>
                    {item.date} • {item.startAt} → {item.endAt}
                  </Text>
                  <Text style={{ color: "#111827" }}>
                    Giá: {item.price?.toLocaleString?.()} đ
                  </Text>

                  {/* 🔒 Ẩn UserId cho gọn */}
                  {/* <Text style={{ color: "#6B7280" }}>UserId: {item.userId}</Text> */}

                  <Text style={{ color: "#6B7280" }}>
                    Thanh toán: {(item as any).paymentMethod} •{" "}
                    {(item as any).paymentStatus}
                  </Text>

                  <Text style={{ color: "#6B7280" }}>
                    Ghi chú:{" "}
                    <Text style={{ color: "#111827" }}>{item.note || "—"}</Text>
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,
                      marginTop: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <Chip icon="pencil" onPress={() => openEdit(item)} compact>
                      Sửa ghi chú
                    </Chip>
                    <Chip
                      icon="delete"
                      onPress={() => doDelete(item)}
                      compact
                      style={{ backgroundColor: "#F3E8FF" }}
                      textStyle={{ color: "#7E22CE" }}
                    >
                      Huỷ
                    </Chip>
                  </View>
                </Card.Content>
              </Card>
            )}
          />
        )}

        <NoteDialog
          visible={open}
          mode="edit"
          draftNote={draft}
          setDraftNote={setDraft}
          onClose={() => setOpen(false)}
          onSubmit={() => {
            if (!editing) return;
            setOpen(false);
            noteM.mutate(
              { id: editing._id, note: draft },
              {
                onSuccess: () => Alert.alert("OK", "Đã cập nhật ghi chú"),
                onError: (e: any) =>
                  Alert.alert("Lỗi", e?.response?.data?.error ?? "Không cập nhật được"),
              }
            );
          }}
        />
      </View>
    </View>
  );
}
