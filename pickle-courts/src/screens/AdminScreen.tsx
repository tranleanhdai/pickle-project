import React, { useMemo, useState, useLayoutEffect } from "react";
import { View, FlatList, RefreshControl, Alert, Pressable, ScrollView } from "react-native";
import {
  Text,
  TextInput,
  Button,
  Card,
  Chip,
  ActivityIndicator,
  Dialog,
  Portal,
  List,
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
import { useVenues } from "../hooks/useVenues";
import { useCourts } from "../hooks/useCourts";
import { useAdminSummary } from "../hooks/useAdminSummary";

type VenueLite = { id: string; name: string };
type CourtLite = { id: string; name: string };

const statusText = (st?: string) => {
  switch (st) {
    case "awaiting_transfer": return "Chờ chuyển khoản";
    case "verifying":         return "Đang chờ duyệt";
    case "paid":              return "Đã thanh toán";
    case "expired":           return "Hết hạn";
    case "failed":            return "Thất bại";
    case "pending":           return "Giữ chỗ";
    default:                  return undefined;
  }
};
const statusColor = (st?: string) => {
  switch (st) {
    case "awaiting_transfer": return "#F59E0B";
    case "verifying":         return "#06B6D4";
    case "paid":              return "#16A34A";
    case "expired":           return "#EF4444";
    case "failed":            return "#A855F7";
    case "pending":           return "#8B5CF6";
    default:                  return "#6B7280";
  }
};

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
        <Button mode="text" textColor="#6B4EFF" onPress={() => navigation.navigate("AdminTransfers")}>
          Xác nhận
        </Button>
      ),
    });
  }, [navigation]);

  // ===== chọn venue/court =====
  const venuesQ = useVenues();
  const [venueId, setVenueId] = useState<string>("");
  const courtsQ = useCourts(venueId || undefined);
  const [courtId, setCourtId] = useState<string>("");

  const venueList: VenueLite[] = (venuesQ.data as any[]) ?? [];
  const courtList: CourtLite[] = (courtsQ.data as any[]) ?? [];
  const selectedVenue = venueList.find((v) => v.id === venueId);
  const selectedCourt = courtList.find((c) => c.id === courtId);

  const [venueDlgOpen, setVenueDlgOpen] = useState(false);
  const [courtDlgOpen, setCourtDlgOpen] = useState(false);

  // ===== chế độ xem + ngày =====
  type ViewMode = "day" | "past";
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));

  // filters cho list
  const filters = useMemo(
    () => ({
      courtId: courtId || undefined,
      date: viewMode === "day" ? (date || undefined) : undefined,
      mode: viewMode as ViewMode,
    }),
    [courtId, date, viewMode]
  );

  const q     = useAdminBookings(filters);
  const delM  = useAdminDeleteBooking(filters);
  const noteM = useAdminUpdateNote(filters);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<AdminBooking | null>(null);

  // tổng đã qua (không phụ thuộc date)
  const pastSumQ = useAdminSummary({
    venueId: venueId || undefined,
    courtId: courtId || undefined,
    mode: "past",
  });

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
            onError: (e: any) => Alert.alert("Lỗi", e?.response?.data?.error ?? "Không huỷ được"),
          }),
      },
    ]);
  };

  const sortedData = useMemo(() => {
    const arr = (q.data ?? []).slice();
    arr.sort((a, b) => (`${a.date} ${a.startAt}`).localeCompare(`${b.date} ${b.startAt}`));
    return arr;
  }, [q.data]);

  const summary = useMemo(
    () => ({
      count: sortedData.length,
      revenue: sortedData.reduce((s, x) => s + (Number(x.price) || 0), 0),
    }),
    [sortedData]
  );

  function StatusBadge({ item }: { item: AdminBooking }) {
    const ps = (item as any).paymentStatus as string | undefined;
    const pm = (item as any).paymentMethod as string | undefined;
    const text = [pm === "prepay_transfer" ? "Chuyển khoản" : pm === "pay_later" ? "Trả sau" : undefined, statusText(ps)]
      .filter(Boolean)
      .join(" • ");
    if (!text) return null;
    const color = statusColor(ps);
    return (
      <View
        style={{
          backgroundColor: `${color}15`,
          borderColor: `${color}40`,
          borderWidth: 1,
          paddingHorizontal: 10,
          paddingVertical: 3,
          borderRadius: 8,
        }}
      >
        <Text style={{ color, fontWeight: "600", fontSize: 13 }}>{text}</Text>
      </View>
    );
  }

  const today     = dayjs().format("YYYY-MM-DD");
  const tomorrow  = dayjs().add(1, "day").format("YYYY-MM-DD");
  const isToday   = viewMode === "day" && date === today;
  const isTomorrow= viewMode === "day" && date === tomorrow;

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <View style={{ flex: 1, padding: 16, gap: 14 }}>
        {/* FILTER CARD */}
        <Card style={{ backgroundColor: "#fff", borderRadius: 16, borderColor: "#E5E7EB", borderWidth: 1, elevation: 0 }}>
          <Card.Content style={{ gap: 12 }}>
            {/* Quick date chips */}
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Chip
                icon="calendar-today"
                selected={isToday}
                onPress={() => {
                  setViewMode("day");
                  setDate(today);
                }}
                style={{ backgroundColor: isToday ? "#E0E7FF" : "#F3F4F6" }}
                textStyle={{ color: isToday ? "#4338CA" : "#374151", fontWeight: "600" }}
              >
                Hôm nay
              </Chip>

              <Chip
                icon="calendar"
                selected={isTomorrow}
                onPress={() => {
                  setViewMode("day");
                  setDate(tomorrow);
                }}
                style={{ backgroundColor: isTomorrow ? "#E0E7FF" : "#F3F4F6" }}
                textStyle={{ color: isTomorrow ? "#4338CA" : "#374151", fontWeight: "600" }}
              >
                Ngày mai
              </Chip>

              <Chip
                icon="history"
                selected={viewMode === "past"}
                onPress={() => {
                  setViewMode("past"); // chuyển sang đã-qua -> bỏ chọn today/tomorrow
                }}
                style={{ backgroundColor: viewMode === "past" ? "#E0E7FF" : "#F3F4F6" }}
                textStyle={{ color: viewMode === "past" ? "#4338CA" : "#374151", fontWeight: "600" }}
              >
                Đã qua
              </Chip>

              <Chip
                icon="close"
                onPress={() => {
                  setViewMode("day");
                  setDate("");
                }}
                style={{ backgroundColor: "#F3F4F6" }}
                textStyle={{ color: "#374151", fontWeight: "600" }}
              >
                Xoá ngày
              </Chip>
            </View>

            {/* Venue & Court pickers */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable style={{ flex: 1 }} onPress={() => setVenueDlgOpen(true)}>
                <TextInput
                  mode="outlined"
                  label="Chọn địa điểm"
                  value={selectedVenue?.name || ""}
                  placeholder="Chọn địa điểm"
                  editable={false}
                  right={<TextInput.Icon icon="chevron-down" />}
                  style={{ backgroundColor: "#fff" }}
                  outlineStyle={{ borderColor: "#E5E7EB" }}
                />
              </Pressable>

              <Pressable style={{ flex: 1 }} onPress={() => venueId && setCourtDlgOpen(true)}>
                <TextInput
                  mode="outlined"
                  label="Chọn sân"
                  value={selectedCourt?.name || ""}
                  placeholder={venueId ? "Chọn sân" : "Chọn địa điểm trước"}
                  editable={false}
                  right={<TextInput.Icon icon="chevron-down" />}
                  style={{ backgroundColor: "#fff" }}
                  outlineStyle={{ borderColor: "#E5E7EB" }}
                />
              </Pressable>
            </View>

            {/* Manual date input (chỉ dùng cho chế độ day) */}
            <TextInput
              label="Ngày (YYYY-MM-DD)"
              value={viewMode === "day" ? date : ""}
              onChangeText={(v) => {
                setViewMode("day");
                setDate(v);
              }}
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
            </View>
          </Card.Content>
        </Card>

        {/* SUMMARY cho list hiện tại (day hoặc past) */}
        <Card style={{ backgroundColor: "#fff", borderRadius: 16, borderColor: "#E5E7EB", borderWidth: 1 }}>
          <Card.Content style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
            <View>
              <Text style={{ color: "#6B7280" }}>
                {viewMode === "past" ? "Tổng booking" : "Tổng booking"}
              </Text>
              <Text style={{ color: "#111827", fontWeight: "700", fontSize: 18 }}>{summary.count}</Text>
            </View>
            <View>
              <Text style={{ color: "#6B7280" }}>
                {viewMode === "past" ? "Doanh thu " : "Doanh thu"}
              </Text>
              <Text style={{ color: "#16A34A", fontWeight: "700", fontSize: 18 }}>
                {summary.revenue.toLocaleString()} đ
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Tổng ĐÃ QUA toàn thời gian (theo venue/court) */}
        

        {/* LIST */}
        {q.isLoading ? (
          <View style={{ paddingTop: 20 }}>
            <ActivityIndicator />
          </View>
        ) : q.error ? (
          <Text style={{ paddingTop: 16, color: "#EF4444" }}>
            Không tải được danh sách{"\n"}
            {String((q.error as any)?.response?.status || "")}{" "}
            {JSON.stringify((q.error as any)?.response?.data || (q.error as any)?.message)}
          </Text>
        ) : (
          <FlatList
            data={sortedData}
            keyExtractor={(b) => b._id}
            refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} />}
            contentContainerStyle={{ paddingBottom: 30 }}
            ListEmptyComponent={
              <Text style={{ color: "#9CA3AF", textAlign: "center", marginTop: 16 }}>
                {viewMode === "past" ? "Không có booking đã qua" : "Không có booking nào"}
              </Text>
            }
            renderItem={({ item }) => {
              const title = item.courtName || item.venueName || "Sân";
              const ps = (item as any).paymentStatus as string | undefined;

              return (
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
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: "#111827", fontWeight: "700", fontSize: 16 }}>{title}</Text>
                      <StatusBadge item={item} />
                    </View>

                    <Text style={{ color: "#6B7280" }}>
                      {item.date} • {item.startAt} → {item.endAt}
                    </Text>
                    <Text style={{ color: "#111827" }}>Giá: {item.price?.toLocaleString?.()} đ</Text>
                    {!!ps && (
                      <Text style={{ color: "#6B7280" }}>
                        Trạng thái: <Text style={{ color: statusColor(ps) }}>{statusText(ps)}</Text>
                      </Text>
                    )}

                    <Text style={{ color: "#6B7280" }}>
                      Ghi chú: <Text style={{ color: "#111827" }}>{item.note || "—"}</Text>
                    </Text>

                    <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
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
              );
            }}
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
                onError: (e: any) => Alert.alert("Lỗi", e?.response?.data?.error ?? "Không cập nhật được"),
              }
            );
          }}
        />
      </View>

      {/* PICKERS */}
      <Portal>
        <Dialog visible={venueDlgOpen} onDismiss={() => setVenueDlgOpen(false)}>
          <Dialog.Title>Chọn địa điểm</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 340 }}>
            <ScrollView>
              {(venueList || []).map((v) => (
                <List.Item
                  key={v.id}
                  title={v.name}
                  left={(props) => <List.Icon {...props} icon="map-marker" />}
                  onPress={() => {
                    setVenueId(String(v.id));
                    setCourtId("");
                    setVenueDlgOpen(false);
                  }}
                />
              ))}
              {!venueList?.length && <List.Item title="Chưa có địa điểm" description="Tạo venue trước" />}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setVenueDlgOpen(false)}>Đóng</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={courtDlgOpen} onDismiss={() => setCourtDlgOpen(false)}>
          <Dialog.Title>Chọn sân</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 340 }}>
            <ScrollView>
              {(courtList || []).map((c) => (
                <List.Item
                  key={c.id}
                  title={c.name}
                  left={(props) => <List.Icon {...props} icon="tennis" />}
                  onPress={() => {
                    setCourtId(String(c.id));
                    setCourtDlgOpen(false);
                  }}
                />
              ))}
              {!venueId && <List.Item title="Chọn địa điểm trước" />}
              {venueId && !courtList?.length && <List.Item title="Không có sân" />}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setCourtDlgOpen(false)}>Đóng</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
