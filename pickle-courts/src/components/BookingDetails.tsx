// src/components/BookingDetails.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, List, Divider, Badge } from "react-native-paper";

type Props = {
  venueId?: string | null;
  courtId?: string | null;
  date?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  price?: number | string | null;

  /** (tuỳ chọn) tên hiển thị nếu đã có */
  venueName?: string | null;
  courtName?: string | null;
};

export default function BookingDetails({
  venueId,
  courtId,
  date,
  startAt,
  endAt,
  price,
  venueName,
  courtName,
}: Props) {
  const locationLabel = (venueName || venueId || "").toString().trim() || "—";
  const courtLabel = (courtName || courtId || "").toString().trim() || "—";

  const timeLabel =
    startAt && endAt
      ? `${startAt}  →  ${endAt}`
      : startAt
      ? `${startAt}`
      : "—";

  const numPrice = Number(price ?? 0);
  const hasPrice = !Number.isNaN(numPrice) && Number.isFinite(numPrice);
  const priceLabel = hasPrice
    ? `${Intl.NumberFormat("vi-VN").format(numPrice)} đ`
    : "—";

  return (
    <View style={styles.wrap}>
      {/* Địa điểm */}
      <List.Item
        title="Địa điểm"
        description={locationLabel}
        left={(p) => <List.Icon {...p} icon="map-marker-outline" />}
        titleStyle={styles.title}
        descriptionNumberOfLines={2}
      />
      <Divider />

      {/* Tên sân */}
      <List.Item
        title="Tên sân"
        description={courtLabel}
        left={(p) => <List.Icon {...p} icon="tennis" />}
        titleStyle={styles.title}
        descriptionNumberOfLines={2}
      />
      <Divider />

      {/* Ngày */}
      <List.Item
        title="Ngày"
        description={date || "—"}
        left={(p) => <List.Icon {...p} icon="calendar-range" />}
        titleStyle={styles.title}
      />
      <Divider />

      {/* Giờ */}
      <List.Item
        title="Giờ"
        description={timeLabel}
        left={(p) => <List.Icon {...p} icon="clock-outline" />}
        titleStyle={styles.title}
      />
      <Divider />

      {/* Giá */}
      <List.Item
        title="Giá"
        left={(p) => <List.Icon {...p} icon="cash-multiple" />}
        right={() => (
          <Text style={styles.priceText}>
            {priceLabel}
          </Text>
        )}
        titleStyle={styles.title}
      />

      {!hasPrice && (
        <View style={styles.hint}>
          <Badge style={styles.hintBadge}>Lưu ý</Badge>
          <Text style={styles.hintText}>
            Chưa có giá hợp lệ cho khung giờ này.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.03)", // nền nhạt kiểu v0
  },
  title: {
    fontWeight: "600",
  },
  priceText: {
    fontSize: 18,
    fontWeight: "800",
    alignSelf: "center",
    marginRight: 8,
  },
  hint: {
    marginHorizontal: 12,
    marginBottom: 12,
    marginTop: 4,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(98, 0, 238, 0.06)",
  },
  hintBadge: {
    alignSelf: "flex-start",
    marginBottom: 4,
    backgroundColor: "rgba(98,0,238,0.12)",
    color: "#6200ee",
  },
  hintText: {
    opacity: 0.9,
  },
});
