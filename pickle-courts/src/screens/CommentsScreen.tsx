import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, FlatList, Keyboard, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, TextInput, IconButton, ActivityIndicator } from "react-native-paper";
import { addComment, listComments } from "../api/posts";
import type { Comment } from "../types/post";

// 🎨 Accent thống nhất với HomeScreen
const ACCENT = {
  primary: "#7C3AED",
  primarySoft: "#EFE7FF",
  border: "#C4B5FD",
  textDim: "#6B7280",
};

// 👉 chỉnh tuỳ theo tab bar của bạn
const TAB_BAR_H = 64;

export default function CommentsScreen({ route }: any) {
  const { postId } = route.params as { postId: string };
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");

  // đo chiều cao bàn phím (Android/iOS)
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const onShow = (e: any) => setKbHeight(e?.endCoordinates?.height ?? 0);
    const onHide = () => setKbHeight(0);
    const s1 = Keyboard.addListener("keyboardDidShow", onShow);
    const s2 = Keyboard.addListener("keyboardWillShow", onShow);
    const h1 = Keyboard.addListener("keyboardDidHide", onHide);
    const h2 = Keyboard.addListener("keyboardWillHide", onHide);
    return () => {
      s1.remove(); s2.remove(); h1.remove(); h2.remove();
    };
  }, []);

  const load = useCallback(
    async (next?: boolean) => {
      if (loading) return;
      setLoading(true);
      try {
        const res = await listComments(postId, next ? cursor ?? undefined : undefined);
        setItems((old) => (next ? [...old, ...res.items] : res.items));
        setCursor(res.nextCursor);
      } finally {
        setLoading(false);
      }
    },
    [loading, postId, cursor]
  );

  useEffect(() => { load(false); }, [postId]); // initial

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  }, [load]);

  const send = useCallback(async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const c = await addComment(postId, text.trim());
      setItems((old) => [c, ...old]); // mới nhất lên đầu
      setText("");
    } finally {
      setSending(false);
    }
  }, [postId, text, sending]);

  // ======= Safe paddings =======
  const composerBottom = useMemo(
    () => (kbHeight > 0 ? kbHeight + 8 : TAB_BAR_H + insets.bottom + 8),
    [kbHeight, insets.bottom]
  );

  const listBottomPad = useMemo(
    // chừa thêm ~ composer height (~56) + tab bar
    () => (kbHeight > 0 ? kbHeight + 120 : TAB_BAR_H + insets.bottom + 140),
    [kbHeight, insets.bottom]
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 8,     // ✅ chừa safe-area top để không dính status bar
          paddingBottom: listBottomPad,   // ✅ chừa đủ chỗ cho composer + tab bar
        }}
        renderItem={({ item }) => (
          <View
            style={{
              paddingVertical: 10,
              borderBottomWidth: 0.5,
              borderColor: "#EEE",
              gap: 6,
            }}
          >
            {/* Ẩn userId, chỉ hiển thị nội dung + thời gian */}
            <Text
              style={{
                backgroundColor: ACCENT.primarySoft,
                borderColor: ACCENT.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 10,
              }}
            >
              {item.content}
            </Text>
            <Text style={{ color: ACCENT.textDim, fontSize: 12 }}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </View>
        )}
        onEndReachedThreshold={0.5}
        onEndReached={() => cursor && load(true)}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ textAlign: "center", color: ACCENT.textDim, marginTop: 24 }}>
              Chưa có bình luận
            </Text>
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator />
            </View>
          ) : null
        }
      />

      {/* Composer nổi */}
      <View
        style={{
          position: "absolute",
          left: 12,
          right: 12,
          bottom: composerBottom,  // ✅ không đè tab bar / navigation bar
          padding: 8,
          backgroundColor: "#fff",
          borderRadius: 16,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: 6 },
          shadowRadius: 12,
          elevation: 4,
          borderWidth: 1,
          borderColor: "#EEE",
        }}
        pointerEvents="box-none"
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TextInput
            mode="outlined"
            placeholder="Viết bình luận…"
            value={text}
            onChangeText={setText}
            style={{ flex: 1, backgroundColor: "#fff" }}
            outlineStyle={{ borderRadius: 999, borderColor: ACCENT.border }}
            dense
            returnKeyType="send"
            onSubmitEditing={send}
            blurOnSubmit={false}
          />
          <IconButton
            icon="send"
            onPress={send}
            disabled={sending || !text.trim()}
            containerColor={ACCENT.primary}
            iconColor="#fff"
            size={22}
            style={{ borderRadius: 999 }}
          />
        </View>
      </View>
    </View>
  );
}
