// pickle-courts/src/screens/HomeScreen.tsx
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  Animated,
  Pressable,
} from "react-native";
import { Text, Button, ActivityIndicator, FAB, Card } from "react-native-paper";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useVenues, type Venue } from "../hooks/useVenues";
import { useCourts } from "../hooks/useCourts";
import type { Court } from "../api/courts";
import { usePosts } from "../hooks/usePosts";
import { addView } from "../api/posts";
import { api } from "../api/client";

import PostCard from "../components/PostCard";
import VenueCard from "../components/VenueCard";
import CourtHero from "../components/CourtHero";

/* ===== Theme colors ===== */
const COLORS = {
  primary: "#0ea5e9",
  dark: "#111827",
  card: "#ffffff",
  muted: "#e5e7eb",
  overlay: "rgba(0,0,0,0.35)",
};

type TabMode = "posts" | "venues";

function idOf(x: any): string | null {
  const raw = x?.id ?? x?._id ?? null;
  return raw ? String(raw) : null;
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  /* ===== Auth state ===== */
  const [hasToken, setHasToken] = useState(false);
  const refreshTokenState = useCallback(async () => {
    const t = await AsyncStorage.getItem("token");
    setHasToken(!!t);
    console.log("[Home] token exist? ->", !!t, "| baseURL =", api.getUri());
  }, []);
  useFocusEffect(useCallback(() => { refreshTokenState(); }, [refreshTokenState]));

  const handleLogout = useCallback(async () => {
    await AsyncStorage.removeItem("token");
    setHasToken(false);
    // đưa về tab cá nhân (để hiện màn đăng nhập) hoặc mở modal Login
    navigation.navigate("MainTabs", { screen: "ProfileTab", params: { screen: "ProfileMain" } });
  }, [navigation]);

  /* ===== Tabs ===== */
  const [mode, setMode] = useState<TabMode>("posts");

  /* ===== Data ===== */
  const venuesQ = useVenues();

  // venueId & courtId: luôn là string hoặc null
  const [venueId, setVenueId] = useState<string | null>(null);
  useEffect(() => {
    if (!venueId && venuesQ.data?.length) {
      const firstId = idOf(venuesQ.data[0]);
      setVenueId(firstId);
    }
  }, [venuesQ.data, venueId]);

  // chỉ gọi courts khi có venueId
  const courtsQ = useCourts(venueId ?? undefined);
  const [courtId, setCourtId] = useState<string | null>(null);

  // set sân mặc định 1 lần khi courtId đang null
  useEffect(() => {
    if (courtId == null && courtsQ.data?.length) {
      setCourtId(idOf(courtsQ.data[0]));
    }
  }, [courtsQ.data, courtId]);

  const posts = usePosts(courtId ?? undefined);
  const postItems = Array.isArray(posts.items) ? posts.items : [];

  /* ===== Chip ===== */
  const Chip = ({
    label, active, onPress, dark,
  }: { label: string; active?: boolean; dark?: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        alignSelf: "flex-start",
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: active ? (dark ? COLORS.dark : COLORS.primary) : COLORS.muted,
        marginRight: 10,
      }}
    >
      <Text style={{ color: active ? "#fff" : COLORS.dark, fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );

  /* ===== Venue pills ===== */
  const VenuePills = useMemo(() => {
    if (venuesQ.isLoading) return <ActivityIndicator />;
    if (venuesQ.error) return <Text style={{ color: "red" }}>Lỗi tải địa điểm</Text>;
    const data: Venue[] = venuesQ.data ?? [];
    if (!data.length) return <Text>Chưa có địa điểm</Text>;
    return (
      <FlatList<Venue>
        data={data}
        keyExtractor={(v, i) => idOf(v) ?? String(i)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => {
          const id = idOf(item)!;
          return (
            <Chip
              label={item.name}
              active={venueId === id}
              dark
              onPress={() => { setVenueId(id); setCourtId(null); }}
            />
          );
        }}
      />
    );
  }, [venuesQ.data, venuesQ.isLoading, venuesQ.error, venueId]);

  /* ===== Court pills ===== */
  const CourtPills = useMemo(() => {
    if (!venueId) return null;
    if (courtsQ.isLoading) return <ActivityIndicator />;
    if (courtsQ.error) return <Text style={{ color: "red" }}>Lỗi tải sân</Text>;
    const data: Court[] = courtsQ.data ?? [];
    if (!data.length) return <Text>Địa điểm này chưa có sân</Text>;
    return (
      <FlatList<Court>
        data={data}
        keyExtractor={(c, i) => idOf(c) ?? String(i)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
        renderItem={({ item }) => {
          const id = idOf(item)!;
          return (
            <Chip
              label={item.name}
              active={courtId === id}
              onPress={() => setCourtId(id)}
            />
          );
        }}
      />
    );
  }, [venueId, courtsQ.data, courtsQ.isLoading, courtsQ.error, courtId]);

  /* ===== Search (venue + court) ===== */
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [inputH, setInputH] = useState(52);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 200);
    setOpen(!!search.trim());
    return () => clearTimeout(t);
  }, [search]);

  function norm(s?: string) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  }
  function match(q: string, ...fields: (string | undefined)[]) {
    const qq = norm(q);
    if (!qq) return false;
    return fields.some(f => norm(f).includes(qq));
  }

  type Suggest =
    | { type: "venue"; id: string; title: string; subtitle?: string; cover?: string }
    | { type: "court"; id: string; title: string; subtitle?: string; cover?: string; venueId?: string | null; venueName?: string | null };

  const suggestions: Suggest[] = useMemo(() => {
    if (!debounced) return [];

    const vArr: Venue[] = Array.isArray(venuesQ.data) ? (venuesQ.data as Venue[]) : [];
    const cArr: Court[]  = Array.isArray(courtsQ.data) ? (courtsQ.data as Court[]) : [];

    const currentVenueName: string | null =
      vArr.find((v: Venue) => idOf(v) === venueId)?.name ?? null;

    const vs: Suggest[] = vArr
      .filter((v: Venue) => match(debounced, v.name, (v as any).address))
      .map((v: Venue) => ({
        type: "venue" as const,
        id: idOf(v)!,
        title: v.name,
        subtitle: (v as any).address,
        cover: (v as any).coverUrl,
      }));

    const cs: Suggest[] = cArr
      .filter((c: Court) => match(debounced, c.name, (c as any).code))
      .map((c: Court) => ({
        type: "court" as const,
        id: idOf(c)!,
        title: c.name,
        subtitle: currentVenueName ?? undefined,
        cover: (c as any).coverUrl,
        venueId: venueId ?? null,
        venueName: currentVenueName,
      }));

    return [...cs, ...vs].slice(0, 8);
  }, [debounced, venuesQ.data, courtsQ.data, venueId]);

  const suggestOpen = open && suggestions.length > 0;

  /* ===== View counter ===== */
  const viewedRef = useRef<Set<string>>(new Set());
  const onViewableItemsChangedReal = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: any }> }) => {
      for (const vi of viewableItems) {
        const p: any = vi.item;
        const pid = idOf(p);
        if (pid && !viewedRef.current.has(pid)) {
          viewedRef.current.add(pid);
          addView(pid).catch((e) => console.log("[Home] addView error:", e?.message));
        }
      }
    }
  ).current;
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  /* ===== Glow/scale cho icon profile ===== */
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };
  const goProfile = () =>
    navigation.navigate("MainTabs", { screen: "ProfileTab", params: { screen: "ProfileMain" } });

  /* ===== HERO ===== */
  const Hero = (
    <View>
      <View style={{ height: 260, backgroundColor: COLORS.primary, overflow: "visible" }}>
        <Image
          source={require("../../assets/pickleball-action-shot.jpg")}
          style={{ position: "absolute", width: "100%", height: "100%" }}
          resizeMode="cover"
        />
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay }} />

        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 28, zIndex: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <View>
              <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900", marginBottom: 2 }}>
                Pickle Courts
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.9)" }}>Đặt sân thể thao dễ dàng</Text>
            </View>

            {/* Icon Profile sáng nhẹ khi chọn */}
            <Animated.View style={{
              transform: [{ scale }],
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.92)",
              elevation: 4,
              shadowColor: "#000",
              shadowOpacity: 0.18,
              shadowRadius: 8,
            }}>
              <Pressable
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                onPress={goProfile}
                android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: false }}
                style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ fontSize: 22 }}>👤</Text>
              </Pressable>
            </Animated.View>
          </View>

          {/* ====== SEARCH + ABS DROPDOWN ====== */}
          <View style={{ position: "relative", zIndex: 30 }}>
            {/* Input row */}
            <View
              onLayout={e => setInputH(e.nativeEvent.layout.height)}
              style={{
                backgroundColor: "#fff",
                borderRadius: 18,
                minHeight: 52,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                paddingVertical: 6,
                shadowColor: "#000",
                shadowOpacity: 0.16,
                shadowRadius: 18,
                elevation: 12,
              }}
            >
              <Text style={{ marginRight: 8, fontSize: 18 }}>🔎</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Tìm địa điểm hoặc sân…"
                placeholderTextColor="#6b7280"
                style={{ flex: 1, fontSize: 16, paddingVertical: 8 }}
                onFocus={() => setOpen(!!search.trim())}
              />
              {!!search && (
                <TouchableOpacity onPress={() => { setSearch(""); setOpen(false); }} >
                  <Text style={{ fontSize: 16 }}>✖️</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Overlay click-outside */}
            {suggestOpen && (
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setOpen(false)}
                style={{
                  ...StyleSheet.absoluteFillObject,
                  top: inputH + 6,
                  backgroundColor: "transparent",
                }}
              />
            )}

            {/* Dropdown */}
            {suggestOpen && (
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: inputH + 6,
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  overflow: "hidden",
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 20,
                  elevation: 20,
                  maxHeight: 340,
                  paddingVertical: 6,
                }}
              >
                <FlatList
                  data={suggestions}
                  keyExtractor={(s, i) => `${s.type}-${s.id}-${i}`}
                  ItemSeparatorComponent={() => (
                    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: "#eee" }} />
                  )}
                  renderItem={({ item: s }) => (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        if (s.type === "venue") {
                          setMode("venues");
                          setVenueId(s.id);
                          setCourtId(null);
                        } else {
                          if (s.venueId) setVenueId(s.venueId);
                          setCourtId(s.id);
                          setMode("posts");
                        }
                        setSearch("");
                        setOpen(false);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      {!!s.cover && (
                        <Image
                          source={{ uri: s.cover }}
                          style={{ width: 44, height: 32, borderRadius: 8 }}
                          resizeMode="cover"
                        />
                      )}

                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700" }}>{s.title}</Text>
                        {!!s.subtitle && (
                          <Text style={{ fontSize: 12, color: "#6b7280" }} numberOfLines={1}>
                            {s.subtitle}
                          </Text>
                        )}
                      </View>

                      {/* chip loại */}
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 999,
                          backgroundColor: s.type === "venue" ? "#eef2ff" : "#e0f2fe",
                        }}
                      >
                        <Text style={{ fontSize: 12, color: "#374151" }}>
                          {s.type === "venue" ? "Địa điểm" : "Sân"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>
        </View>
      </View>

      {/* QUICK ACTIONS (card nổi) */}
      <View style={{
        paddingHorizontal: 16,
        marginTop: suggestOpen ? 12 : -26, // mở dropdown thì không đè
        marginBottom: 12,
        zIndex: 5,
      }}>
        <Card style={{ borderRadius: 20, padding: 14, elevation: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <ActionTile label="Đặt sân" color="#0B1220" emoji="📅" onPress={() => navigation.navigate("Booking")} />
            <ActionTile label="Lịch sử" color="#0F766E" emoji="🕘" onPress={() => {}} />
            <ActionTile label="Ưu đãi" color="#0B4F71" emoji="📈" onPress={() => {}} />
            <ActionTile
              label="Hồ sơ"
              color="#F59E0B"
              emoji="👤"
              onPress={() => navigation.navigate("MainTabs", { screen: "ProfileTab", params: { screen: "ProfileMain" } })}
            />
          </View>
        </Card>
      </View>
    </View>
  );

  /* ===== Header của tab Bài đăng ===== */
  const selectedCourt = courtsQ.data?.find((c: any) => idOf(c) === courtId);
  const header = (
    <View>
      {Hero}

      <View style={{ paddingHorizontal: 16 }}>
        {/* Tabs */}
        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          <Chip label="Bài đăng" active onPress={() => {}} />
          <Chip label="Địa điểm" onPress={() => setMode("venues")} />
        </View>

        {VenuePills}
        {CourtPills}

        {(selectedCourt?.coverUrl || postItems[0]?.images?.[0]?.url) && (
          <CourtHero
            venueName={venuesQ.data?.find((v: any) => idOf(v) === venueId)?.name}
            courtName={selectedCourt?.name}
            imageUrl={selectedCourt?.coverUrl ?? postItems[0]?.images?.[0]?.url ?? null}
          />
        )}

        {/* Featured Venues (hiển thị HẾT) */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 8 }}>
          <Text style={{ fontWeight: "bold", fontSize: 16 }}>Địa điểm nổi bật</Text>
          <Button compact onPress={() => setMode("venues")}>Xem tất cả</Button>
        </View>
        {Array.isArray(venuesQ.data) && (venuesQ.data as Venue[]).map((v: Venue) => (
          <View key={idOf(v) ?? String(v.name)} style={{ marginBottom: 8 }}>
            <VenueCard
              venue={v}
              onPress={() =>
                navigation.navigate("Venue", {
                  venueId: idOf(v),
                  venueName: v.name,
                  venueAddress: (v as any).address,
                })
              }
            />
          </View>
        ))}
      </View>
    </View>
  );

  /* ===== Tab “Địa điểm” ===== */
  if (mode === "venues") {
    if (venuesQ.isLoading) return <Text style={{ padding: 16 }}>Đang tải…</Text>;
    if (venuesQ.error) {
      const err = venuesQ.error as any;
      return (
        <Text style={{ padding: 16, color: "red" }}>
          Lỗi tải địa điểm: {err?.response?.status} {"\n"}
          {JSON.stringify(err?.response?.data ?? err?.message)}
        </Text>
      );
    }
    const data: Venue[] = venuesQ.data ?? [];
    return (
      <View style={{ flex: 1 }}>
        <FlatList<Venue>
          data={data}
          keyExtractor={(v, i) => idOf(v) ?? String(i)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={
            <>
              {Hero}
              <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 12 }}>
                <View style={{ flexDirection: "row", marginBottom: 12 }}>
                  <Chip label="Bài đăng" onPress={() => setMode("posts")} />
                  <Chip label="Địa điểm" active onPress={() => {}} />
                </View>
              </View>
            </>
          }
          renderItem={({ item }) => {
            const id = idOf(item)!;
            return (
              <VenueCard
                venue={item}
                onPress={() =>
                  navigation.navigate("Venue", {
                    venueId: id,
                    venueName: item.name,
                    venueAddress: (item as any).address,
                  })
                }
              />
            );
          }}
        />
      </View>
    );
  }

  /* ===== Render tab “Bài đăng” ===== */
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        key={`posts-${courtId ?? "none"}`}
        data={postItems}
        keyExtractor={(p, i) => idOf(p) ?? String(i)}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <PostCard
              post={item}
              onPressCourt={() => {
                const cid = String((item as any).courtId ?? "");
                navigation.navigate("Court", { courtId: cid, courtName: "Sân" });
              }}
              onPressComments={() => navigation.navigate("Comments", { postId: idOf(item) })}
            />
          </View>
        )}
        onEndReachedThreshold={0.4}
        onEndReached={() => posts.fetchNext()}
        ListFooterComponent={
          posts.isFetchingMore ? <ActivityIndicator style={{ marginVertical: 12 }} /> : null
        }
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChangedReal}
      />

      {/* FAB Đăng bài */}
      {hasToken && courtId ? (
        <FAB
          icon="plus"
          label="Đăng bài"
          onPress={() => navigation.navigate("CreatePost", { courtId })}
          style={{ position: "absolute", right: 16, bottom: insets.bottom + 24 }}
        />
      ) : null}
    </View>
  );
}

/* ===== Quick action tile ===== */
function ActionTile({
  label, emoji, color, onPress,
}: { label: string; emoji: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ width: "23%", alignItems: "center", gap: 8 }}>
      <View style={{
        width: 60, height: 60, borderRadius: 16,
        alignItems: "center", justifyContent: "center",
        backgroundColor: color,
      }}>
        <Text style={{ fontSize: 22, color: "#fff" }}>{emoji}</Text>
      </View>
      <Text style={{ fontSize: 12, color: COLORS.dark }}>{label}</Text>
    </TouchableOpacity>
  );
}
