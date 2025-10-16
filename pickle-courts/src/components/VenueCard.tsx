// src/components/VenueCard.tsx
import React, { useMemo } from "react";
import { Image, TouchableOpacity, View } from "react-native";
import { Card, Text } from "react-native-paper";
import type { Venue } from "../hooks/useVenues";
import { useCourts } from "../hooks/useCourts"; // <-- fetch đếm sân

// ảnh pickleball local trong: pickle-courts/assets/
const SEEDED_COVERS = [
  require("../../assets/pb1.jpg"),
  require("../../assets/pb2.jpg"),
  require("../../assets/pb3.jpg"),
  require("../../assets/pb4.jpg"),
  require("../../assets/pb5.jpg"),
  require("../../assets/pb6.jpg"),
] as const;

function seedIndex(seed: string, mod: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % mod;
}

type Props = { venue: Venue; onPress?: () => void };

export default function VenueCard({ venue, onPress }: Props) {
  const address = (venue as any).address as string | undefined;
  const venueId =
    (venue as any).id ?? (venue as any)._id ?? null;

  // nếu list venue chưa có courts, gọi hook để lấy số sân
  const courtsQ = useCourts(venueId ?? undefined);
  const fetchedCount = Array.isArray(courtsQ.data) ? courtsQ.data.length : undefined;

  // ưu tiên courtCount từ API -> độ dài courts có sẵn -> số fetch được -> 0
  const courtCount: number =
    (venue as any).courtCount ??
    ((venue as any).courts?.length) ??
    (fetchedCount ?? 0);

  const vCover = (venue as any).coverUrl as string | undefined;
  const courtCover = (venue as any)?.courts?.[0]?.coverUrl as string | undefined;

  const coverSource = useMemo(() => {
    if (vCover) return { uri: vCover };
    if (courtCover) return { uri: courtCover };
    const seed = String(venueId ?? venue.name ?? "seed");
    const idx = seedIndex(seed, SEEDED_COVERS.length);
    return SEEDED_COVERS[idx];
  }, [vCover, courtCover, venueId, venue.name]);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <Card mode="elevated" style={{ borderRadius: 18, overflow: "hidden", marginBottom: 12 }}>
        <Image source={coverSource} style={{ width: "100%", height: 170 }} resizeMode="cover" />

        <View style={{ padding: 14, backgroundColor: "rgba(250,250,255,0.96)" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text variant="titleMedium" style={{ fontWeight: "700", marginBottom: 4 }}>
              {venue.name}
            </Text>

            {/* badge số sân */}
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: "#e0f2fe",
              }}
            >
              <Text style={{ fontSize: 12, color: "#0c4a6e", fontWeight: "600" }}>
                {courtCount} sân
              </Text>
            </View>
          </View>

          {!!address && (
            <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
              {address}
            </Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}
