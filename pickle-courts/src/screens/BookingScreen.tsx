// src/screens/BookingScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import {
  Appbar,
  Card,
  Text,
  Button,
  ActivityIndicator,
  List,
  Badge,
  Divider,
} from "react-native-paper";
import { useRoute, useNavigation } from "@react-navigation/native";
import BookingDetails from "../components/BookingDetails";
import { useCreateBooking } from "../hooks/useCreateBooking";
import { ensureAuth } from "../utils/authGuard";
import { useVenues } from "../hooks/useVenues";
import { useCourts } from "../hooks/useCourts";
import { api } from "../api/client";

export default function BookingScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const {
    venueId,
    courtId,
    startAt: startAtParam,
    endAt: endAtParam,
    price: priceParam,
    date,
    note,
    venueName: venueNameParam,
    courtName: courtNameParam,
  } = route.params ?? {};

  // ---- Fallback tên venue/court ----
  const venuesQ = useVenues();
  const courtsQ = useCourts(venueId ?? undefined);

  const [courtNameFetched, setCourtNameFetched] = useState<string | null>(null);
  useEffect(() => {
    // nếu thiếu courtName thì gọi nhẹ /courts/:id để hiển thị
    if (!courtNameParam && courtId) {
      (async () => {
        try {
          const { data } = await api.get(`/courts/${courtId}`);
          setCourtNameFetched(data?.name || null);
        } catch {}
      })();
    }
  }, [courtId, courtNameParam]);

  const venueName = useMemo(() => {
    if (venueNameParam) return venueNameParam;
    const v = venuesQ.data?.find((x: any) => x.id === venueId || x._id === venueId);
    return v?.name || venueId || "";
  }, [venueNameParam, venuesQ.data, venueId]);

  const courtName = useMemo(() => {
    if (courtNameParam) return courtNameParam;
    if (courtNameFetched) return courtNameFetched;

    const byVenue = courtsQ.data?.find((c: any) => c.id === courtId || c._id === courtId);
    if (byVenue?.name) return byVenue.name;

    const allCourts = venuesQ.data?.flatMap((v: any) => v?.courts || []) || [];
    const inAll = (allCourts as any[]).find((c) => c.id === courtId || c._id === courtId);
    return inAll?.name || courtId || "";
  }, [courtNameParam, courtNameFetched, courtsQ.data, venuesQ.data, courtId]);

  const startAt = typeof startAtParam === "string" ? startAtParam : (startAtParam ?? "");
  const endAt   = typeof endAtParam   === "string" ? endAtParam   : (endAtParam   ?? "");
  const priceNum = Number(priceParam ?? 0);
  const amountText = Number.isFinite(priceNum)
    ? `${Intl.NumberFormat("vi-VN").format(priceNum)} đ`
    : "—";

  const mutation = useCreateBooking();

  const onConfirm = async () => {
    const token = await ensureAuth(navigation);
    if (!token) return;

    mutation.mutate(
      {
        courtId,
        date,
        startAt,
        endAt,
        price: Number.isFinite(priceNum) ? priceNum : 0,
        note,
        paymentMethod: "pay_later",
      },
      {
        onSuccess: (data: any) => {
          alert(`Đặt sân thành công #${data._id}`);
          navigation.goBack();
        },
        onError: (err: any) => {
          alert(err?.response?.data?.error ?? err?.message ?? "Đặt sân thất bại");
        },
      }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <Appbar.Header elevated mode="center-aligned">
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Xác nhận đặt sân" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Thông tin đặt sân */}
        <Card mode="elevated" style={{ marginBottom: 12 }}>
          <Card.Title
            title="Thông tin đặt sân"
            left={(props) => <List.Icon {...props} icon="calendar-clock" />}
            titleVariant="titleSmall"
          />
          <Divider />
          <Card.Content style={{ paddingTop: 8 }}>
            <BookingDetails
              venueId={venueId}
              courtId={courtId}
              date={date}
              startAt={startAt}
              endAt={endAt}
              price={priceNum}
              venueName={venueName}
              courtName={courtName}
            />
            {note ? (
              <View style={styles.noteWrap}>
                <Badge style={styles.noteBadge}>Ghi chú</Badge>
                <Text style={{ marginTop: 6 }}>{note}</Text>
              </View>
            ) : null}
          </Card.Content>
        </Card>

        {/* Thanh toán */}
        <Card mode="elevated">
          <Card.Title
            title="Thanh toán"
            left={(props) => <List.Icon {...props} icon="credit-card-outline" />}
            titleVariant="titleSmall"
          />
          <Divider />
          <Card.Content style={{ paddingTop: 6 }}>
            <List.Item
              title="Hình thức"
              description="Trả sau (giữ suất 15 phút)"
              left={(p) => <List.Icon {...p} icon="clock-outline" />}
              right={() => <Badge style={styles.methodBadge}>pay_later</Badge>}
            />
            <List.Item
              title="Số tiền"
              left={(p) => <List.Icon {...p} icon="cash-multiple" />}
              right={() => <Text style={styles.amount}>{amountText}</Text>}
            />
          </Card.Content>
        </Card>
      </ScrollView>

      {/* CTA */}
      <View style={styles.bottomBar}>
        <Button
          mode="contained"
          onPress={onConfirm}
          disabled={mutation.isPending}
          contentStyle={{ height: 52, borderRadius: 999 }}
          style={{ borderRadius: 999, flex: 1 }}
        >
          {mutation.isPending ? <ActivityIndicator /> : "Xác nhận đặt"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  noteWrap: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(98, 0, 238, 0.06)",
  },
  noteBadge: {
    alignSelf: "flex-start",
    marginBottom: 2,
    backgroundColor: "rgba(98,0,238,0.12)",
    color: "#6200ee",
  },
  methodBadge: {
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
    color: "#333",
    marginRight: 8,
  },
  amount: { fontSize: 20, fontWeight: "800", alignSelf: "center", marginRight: 8 },
});
