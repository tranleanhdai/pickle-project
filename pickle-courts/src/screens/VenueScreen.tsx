import React, { useMemo } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  ImageBackground,
  TouchableOpacity,
  Image,
} from "react-native";
import { Text, Card, Button, Chip, Divider } from "react-native-paper";
import { useRoute, useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCourts } from "../hooks/useCourts";

/* ---------- ICON SHORTCUTS ---------- */
const Ic = MaterialCommunityIcons;

/* ---------- LOCAL ASSET FALLBACKS ---------- */
const LOCAL_VENUE_COVERS = [
  require("../../assets/modern-sports-venue-exterior.jpg"),
  require("../../assets/pb1.jpg"),
  require("../../assets/pb2.jpg"),
  require("../../assets/pb3.jpg"),
];

const LOCAL_COURT_COVERS = [
  require("../../assets/pickleball-court-outdoor.jpg"),
  require("../../assets/pickleball-court-indoor.jpg"),
  require("../../assets/tennis-court-professional.jpg"),
  require("../../assets/pickleball-court.jpg"),
  require("../../assets/san1.jpg"),
  require("../../assets/san2.jpg"),
  require("../../assets/san3.jpg"),
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h >>> 0;
}
function assetUri(mod: any) {
  // convert require(...) to usable uri for <Image source={{uri}}>
  return Image.resolveAssetSource(mod).uri;
}

function getVenueCover({ coverUrl, venueId }: { coverUrl?: string | null; venueId: string }) {
  if (coverUrl) return coverUrl;
  const i = hashStr(venueId) % LOCAL_VENUE_COVERS.length;
  return assetUri(LOCAL_VENUE_COVERS[i]);
}

function getCourtCover(court: any, index: number) {
  if (court?.coverUrl) return court.coverUrl; // Admin set cover
  const firstPostImg = court?.posts?.[0]?.images?.[0]?.url; // if you attach post preview in API
  if (firstPostImg) return firstPostImg;
  const key = String(court?.id ?? index);
  const i = hashStr(key) % LOCAL_COURT_COVERS.length;
  return assetUri(LOCAL_COURT_COVERS[i]);
}

/* ---------- TYPES ---------- */
type RouteParams = {
  venueId: string;
  venueName: string;
  venueAddress: string;
  coverUrl?: string | null;
  rating?: number;
  ratingCount?: number;
  openHours?: string;
  phone?: string;
};

/* ---------- COMPONENT ---------- */
export default function VenueScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const {
    venueId,
    venueName,
    venueAddress,
    coverUrl,
    rating = 4.8,
    ratingCount = 124,
    openHours = "6:00 - 22:00 hàng ngày",
    phone = "0901 234 567",
  } = route.params as RouteParams;

  const courtsQ = useCourts(venueId);
  const courts = courtsQ.data ?? [];

  const header = useMemo(() => {
    const src = getVenueCover({ coverUrl, venueId });
    return (
      <View style={{ width: "100%", height: 200, marginBottom: 12 }}>
        <ImageBackground
          source={{ uri: src }}
          style={{ flex: 1, justifyContent: "space-between" }}
          imageStyle={{ resizeMode: "cover" }}
        >
          <View
            style={{
              paddingTop: 16,
              paddingHorizontal: 12,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity onPress={() => navigation.goBack()} style={btnCircleStyle}>
              <Ic name="arrow-left" size={20} />
            </TouchableOpacity>
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity onPress={() => {}} style={[btnCircleStyle, { marginRight: 8 }]}>
                <Ic name="share-variant" size={20} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {}} style={btnCircleStyle}>
                <Ic name="heart-outline" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }, [coverUrl, venueId, navigation]);

  return (
    <View style={{ flex: 1 }}>
      {header}

      {/* Venue Info */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: "700" }}>{venueName}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
              <Ic name="map-marker" size={16} color="#666" />
              <Text style={{ color: "#666", marginLeft: 6 }}>{venueAddress}</Text>
            </View>
          </View>
          <Chip
            compact
            style={{ alignSelf: "flex-start", backgroundColor: "#4f46e5" }}
            textStyle={{ color: "white", fontWeight: "600" }}
          >
            Hot
          </Chip>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Ic name="star" size={18} color="#f5a524" />
          <Text style={{ fontWeight: "600", marginLeft: 6 }}>{rating.toFixed(1)}</Text>
          <Text style={{ color: "#666", marginLeft: 4 }}>({ratingCount} đánh giá)</Text>
        </View>

        {/* Contact Card */}
        <Card style={{ marginBottom: 12, borderRadius: 14 }}>
          <Card.Content>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Ic name="clock-outline" size={18} color="#4f46e5" />
              <View style={{ marginLeft: 10 }}>
                <Text style={{ fontWeight: "600" }}>Giờ mở cửa</Text>
                <Text style={{ color: "#666" }}>{openHours}</Text>
              </View>
            </View>
            <Divider />
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
              <Ic name="phone-outline" size={18} color="#4f46e5" />
              <View style={{ marginLeft: 10 }}>
                <Text style={{ fontWeight: "600" }}>Liên hệ</Text>
                <Text style={{ color: "#666" }}>{phone}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </View>

      {/* Courts List */}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 8 }}>
          Danh sách sân ({courts.length})
        </Text>

        {courtsQ.isLoading ? (
          <Text style={{ paddingVertical: 12 }}>Đang tải…</Text>
        ) : courtsQ.error ? (
          <Text style={{ color: "red", paddingVertical: 12 }}>Không tải được danh sách sân</Text>
        ) : (
          <FlatList
            data={courts}
            keyExtractor={(c) => c.id}
            refreshControl={
              <RefreshControl refreshing={courtsQ.isFetching} onRefresh={() => courtsQ.refetch()} />
            }
            ListEmptyComponent={<Text>Chưa có sân cho địa điểm này</Text>}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item, index }) => {
              const features: string[] = (item as any).features ?? ["Ánh sáng tốt"];
              const status: "available" | "booked" = (item as any).status ?? "available";
              const priceStr =
                (item as any).price != null
                  ? `${Number((item as any).price).toLocaleString()}đ`
                  : "—";
              const image = getCourtCover(item, index);

              return (
                <Card
                  style={{ borderRadius: 14 }}
                  onPress={() =>
                    navigation.navigate("Court", {
                      courtId: item.id,
                      courtName: item.name,
                      coverUrl: image,
                    })
                  }
                >
                  <View style={{ flexDirection: "row" }}>
                    <View
                      style={{
                        width: 110,
                        height: 110,
                        borderTopLeftRadius: 14,
                        borderBottomLeftRadius: 14,
                        overflow: "hidden",
                      }}
                    >
                      <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} />
                    </View>

                    <Card.Content style={{ flex: 1, paddingVertical: 12, paddingLeft: 12 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                        <View style={{ paddingRight: 8 }}>
                          <Text style={{ fontSize: 16, fontWeight: "600" }}>{item.name}</Text>
                          <Chip compact mode="outlined" style={{ alignSelf: "flex-start", marginTop: 4 }}>
                            {(item as any).type || "Pickleball"}
                          </Chip>
                        </View>

                        {status === "available" ? (
                          <Chip
                            compact
                            style={{ alignSelf: "flex-start", backgroundColor: "#22c55e" }}
                            textStyle={{ color: "white", fontWeight: "600" }}
                          >
                            Còn trống
                          </Chip>
                        ) : (
                          <Chip compact mode="outlined" style={{ alignSelf: "flex-start" }}>
                            Đã đặt
                          </Chip>
                        )}
                      </View>

                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                        {features.map((f) => (
                          <Text key={f} style={{ fontSize: 12, color: "#666" }}>
                            • {f}
                          </Text>
                        ))}
                      </View>

                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <Text style={{ fontWeight: "700", color: "#4f46e5" }}>{priceStr}/giờ</Text>
                        <Button
                          mode="contained"
                          compact
                          onPress={() =>
                            navigation.navigate("Court", {
                              courtId: item.id,
                              courtName: item.name,
                              coverUrl: image,
                            })
                          }
                          disabled={status === "booked"}
                          style={{ borderRadius: 20 }}
                          labelStyle={{ fontSize: 13 }}
                        >
                          Đặt sân
                        </Button>
                      </View>
                    </Card.Content>
                  </View>
                </Card>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}

/* ---------- STYLES ---------- */
const btnCircleStyle = {
  backgroundColor: "white",
  width: 36,
  height: 36,
  borderRadius: 18,
  alignItems: "center",
  justifyContent: "center",
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 6,
  elevation: 3,
} as const;
