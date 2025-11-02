import React, { useMemo, useState, useCallback } from "react";
import { View, FlatList, RefreshControl, Alert, Image } from "react-native";
import {
  Text,
  ActivityIndicator,
  Card,
  Badge,
  Appbar,
  Divider,
} from "react-native-paper";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import dayjs from "dayjs";

import { useAvailability } from "../hooks/useAvailability";
import {
  useBookSlot,
  useCancelBooking,
  useUpdateBookingNote,
} from "../hooks/useBookingMutations";
import type { Slot } from "../types/slot";
import CourtHeader from "../components/CourtHeader";
import SlotCard from "../components/SlotCard";
import NoteDialog from "../components/NoteDialog";
import PaymentMethodDialog from "../components/PaymentMethodDialog";

import { useTransferInitiate } from "../hooks/useTransferInitiate";
import { ensureAuth } from "../utils/authGuard";
import { useMe } from "../hooks/useMe";

type RouteParams = {
  courtId: string;
  courtName: string;
  coverUrl?: string | null;
  venueName?: string | null;
};

export default function CourtScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { courtId, courtName, coverUrl, venueName } = route.params as RouteParams;

  const today = dayjs().format("YYYY-MM-DD");
  const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
  const [date, setDate] = useState<string>(today);

  // data & mutations
  const { slots, isLoading, error, refetch } = useAvailability(courtId, date);
  const bookM = useBookSlot(courtId, date);
  const cancelM = useCancelBooking(courtId, date);
  const updateNoteM = useUpdateBookingNote(courtId, date);
  const initiate = useTransferInitiate();

  // user info
  const me = useMe();
  const meIdRaw =
    (me.data as any)?._id ||
    (me.data as any)?.id ||
    (me.data as any)?.user?.id ||
    (me.data as any)?.user?._id;
  const meId = String(meIdRaw ?? "");

  const username =
    (me.data as any)?.username ||
    (me.data as any)?.name ||
    (me.data as any)?.user?.username ||
    "";

  // always refresh when screen focuses
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [courtId, date, refetch])
  );

  // dialogs state
  const [openNote, setOpenNote] = useState(false);
  const [draftNote, setDraftNote] = useState("");
  const [pendingSlot, setPendingSlot] = useState<Slot | null>(null); // for "book"
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null); // for "edit"
  const [mode, setMode] = useState<"book" | "edit">("book");

  // payment method dialog
  const [pmVisible, setPmVisible] = useState(false);
  const [pmValue, setPmValue] = useState<"prepay_transfer" | "pay_later">("pay_later");

  const requireAuth = async () => !!(await ensureAuth(navigation));

  // ============== handlers ==============
  const openBookDialog = async (slot: Slot) => {
    if (!(await requireAuth())) return;

    // chặn đặt khi bị người khác block
    const isBlocked = (slot as any).status === "blocked";
    const mine = isBlocked && String((slot as any).booking?.userId || "") === meId;
    if (isBlocked && !mine) {
      Alert.alert("Thông báo", "Suất này đã có người giữ/đặt rồi.");
      refetch();
      return;
    }

    setMode("book");
    setPendingSlot(slot);
    setPendingBookingId(null);
    setDraftNote("");
    setOpenNote(true);
  };

  // SlotCard sẽ gửi bookingId string vào đây
  const openEditDialog = async (bookingId: string) => {
    if (!(await requireAuth())) return;
    const slot = (slots as any[]).find(
      (s) => (s as any).bookingId === bookingId || (s as any)?.booking?.id === bookingId
    );
    setMode("edit");
    setPendingSlot(null);
    setPendingBookingId(bookingId);
    setDraftNote((slot as any)?.note || "");
    setOpenNote(true);
  };

  // ---------- UI pieces ----------
  const StickyHeader = useMemo(
    () => (
      <Appbar.Header elevated mode="center-aligned">
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Đặt sân" subtitle={courtName} />
      </Appbar.Header>
    ),
    [navigation, courtName]
  );

  const CourtInfoCard = (
    <Card mode="elevated" style={{ marginHorizontal: 16, marginTop: 12 }}>
      <Card.Content style={{ flexDirection: "row", gap: 16 }}>
        <Image
          source={coverUrl ? { uri: coverUrl } : require("../../assets/pickleball-court.jpg")}
          style={{ width: 80, height: 80, borderRadius: 12 }}
          resizeMode="cover"
        />
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={{ marginBottom: 4 }}>
            {courtName}
          </Text>
          {!!venueName && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Text style={{ opacity: 0.7 }}>{venueName}</Text>
            </View>
          )}
          <Badge style={{ alignSelf: "flex-start" }} size={22}>
            Pickleball
          </Badge>
        </View>
      </Card.Content>
    </Card>
  );

  const DatePickerCard = (
    <Card mode="elevated" style={{ marginHorizontal: 16, marginTop: 12 }}>
      <Card.Title
        title="Chọn ngày"
        titleVariant="titleSmall"
        left={(props) => <Appbar.Action {...props} icon="calendar" />}
      />
      <Card.Content style={{ paddingBottom: 12 }}>
        <CourtHeader
          courtName={courtName}
          date={date}
          today={today}
          tomorrow={tomorrow}
          onChangeDate={setDate}
        />
      </Card.Content>
    </Card>
  );

  const SlotsSectionHeader = (
    <Card mode="elevated" style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 8 }}>
      <Card.Title
        title="Chọn khung giờ"
        titleVariant="titleSmall"
        left={(props) => <Appbar.Action {...props} icon="clock-outline" />}
      />
      <Divider />
    </Card>
  );

  // loading / error
  if (!courtId) {
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "red" }}>Thiếu courtId</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "white" }}>
        {StickyHeader}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Đang tải khung giờ…</Text>
        </View>
      </View>
    );
  }

  if (error) {
    const err: any = error;
    return (
      <View style={{ flex: 1, backgroundColor: "white" }}>
        {StickyHeader}
        <Text style={{ padding: 16, color: "red" }}>
          Không tải được khung giờ{"\n"}
          {String(err?.response?.status || "")} {JSON.stringify(err?.response?.data || err?.message)}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      {StickyHeader}

      <FlatList
        data={slots}
        keyExtractor={(s, i) => (s as any).id ?? `${s.courtId}|${s.date}|${s.startAt}-${s.endAt}-${i}`}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => refetch()} />}
        ListHeaderComponent={
          <>
            {CourtInfoCard}
            {DatePickerCard}
            {SlotsSectionHeader}
          </>
        }
        ListEmptyComponent={
          <Text style={{ paddingHorizontal: 16, paddingVertical: 12 }}>Không có khung giờ</Text>
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16 }}
        renderItem={({ item }) => {
  const booking = (item as any).booking;
  const isMine =
    !!(item as any).bookedByMe || String(booking?.userId || "") === meId;

  // ✅ đã thanh toán?
  const isPaid = booking?.paymentStatus === "paid";

  return (
    <Card mode="elevated">
      <Card.Content style={{ paddingVertical: 8 }}>
        <SlotCard
          slot={{ ...(item as any), isMine }}
          meId={meId}
          disabled={
            (item as any).status === "blocked" &&
            booking?.userId &&
            String(booking.userId) !== meId
          }
          isBooking={bookM.isPending}
          onBook={openBookDialog}
          onCancel={async (bookingId) => {
            if (!(await requireAuth())) return;
            cancelM.mutate(bookingId, {
              onSuccess: () => refetch(),
              onError: (err: any) =>
                Alert.alert(
                  "Lỗi",
                  err?.response?.data?.error || err?.message || "Hủy thất bại"
                ),
            });
          }}
          // ⬇️ chỉ cho sửa ghi chú nếu CHƯA paid
          onEditNote={!isPaid ? openEditDialog : undefined}
        />
      </Card.Content>
    </Card>
  );
}}

      />

      {/* Note dialog */}
      <NoteDialog
        visible={openNote}
        mode={mode}
        draftNote={draftNote}
        setDraftNote={setDraftNote}
        onClose={() => setOpenNote(false)}
        onSubmit={async () => {
          setOpenNote(false);
          if (!(await requireAuth())) return;

          if (mode === "book" && pendingSlot) {
            setPmValue("pay_later");
            setPmVisible(true);
          }

          if (mode === "edit" && pendingBookingId) {
            updateNoteM.mutate(
              { bookingId: pendingBookingId, note: draftNote },
              {
                onSuccess: () => refetch(),
                onError: (err: any) =>
                  Alert.alert(
                    "Lỗi",
                    err?.response?.data?.error || err?.message || "Cập nhật thất bại"
                  ),
              }
            );
          }
        }}
      />

      {/* Payment method dialog */}
      <PaymentMethodDialog
        visible={pmVisible}
        value={pmValue}
        onChange={setPmValue}
        onClose={() => setPmVisible(false)}
        onConfirm={async () => {
          if (!pendingSlot) return;
          setPmVisible(false);

          try {
            if (pmValue === "pay_later") {
              const n = (draftNote || "").trim();
              navigation.navigate("BookingScreen", {
                venueId: (route as any)?.params?.venueId,
                venueName: (route as any)?.params?.venueName,
                courtId,
                courtName,
                date,
                startAt: pendingSlot.startAt,
                endAt: pendingSlot.endAt,
                price: pendingSlot.price,
                note: n,
              });
              return;
            }

            if (pendingSlot.price == null) {
              Alert.alert("Lỗi", "Không xác định được giá của khung giờ.");
              return;
            }

            const booking = await bookM.mutateAsync({
              slot: pendingSlot,
              paymentMethod: "prepay_transfer",
              note: (draftNote || "").trim() || undefined,
            });

            const createdId = (booking as any)._id ?? (booking as any).id;

            const info = await initiate.mutateAsync({
              bookingId: createdId,
              amount: pendingSlot.price!,
            });

            navigation.navigate("PaymentGuide", {
              bookingId: createdId,
              amount: (info as any).amount ?? pendingSlot.price,
              username,
              vietqrUrl: (info as any).vietqr?.url,
            });
            return;
          } catch (err: any) {
            const msg =
              err?.response?.status === 409
                ? "Suất này vừa có người đặt mất rồi."
                : err?.response?.data?.error || err?.message || "Khởi tạo thanh toán thất bại";
            Alert.alert("Lỗi", msg);
          }
        }}
      />
    </View>
  );
}
