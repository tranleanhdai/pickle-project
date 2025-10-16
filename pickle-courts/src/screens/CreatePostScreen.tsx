import React, { useMemo, useState } from "react";
import { View, Image, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { Button, Card, TextInput, HelperText, Text, Divider, IconButton } from "react-native-paper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { createPost } from "../api/posts";
import { uploadToCloudinary } from "../api/cloudinary";

type ImageMeta = { url: string; w?: number; h?: number; mime?: string };

// 🎨 Accent theo HomeScreen
const ACCENT = {
  primary: "#7C3AED",      // tím chính (button)
  primarySoft: "#EFE7FF",  // nền mềm (ô & card highlight)
  pillBorder: "#C4B5FD",   // viền nhạt
  textDim: "#6B7280",      // xám mô tả
};

export default function CreatePostScreen({ route, navigation }: any) {
  const courtId: string = route.params?.courtId;
  const qc = useQueryClient();

  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [preview, setPreview] = useState<ImageMeta | null>(null);
  const [uploading, setUploading] = useState(false);

  const createM = useMutation({
    mutationFn: (payload: { courtId: string; content: string; images: ImageMeta[] }) =>
      createPost(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts", courtId] });
      navigation.goBack();
    },
    onError: (e: any) => {
      Alert.alert("Lỗi", e?.response?.data?.error || e?.message || "Đăng bài thất bại");
    },
  });

  const canSubmit = useMemo(() => {
    return (!!content.trim() || !!imageUrl.trim() || !!preview) && !createM.isPending && !uploading;
  }, [content, imageUrl, preview, createM.isPending, uploading]);

  const submit = async () => {
    const images: ImageMeta[] = [];
    const pasted = imageUrl.trim();
    if (preview?.url) images.push(preview);
    if (pasted && (!preview || preview.url !== pasted)) images.push({ url: pasted });

    if (!content.trim() && images.length === 0) {
      Alert.alert("Thiếu nội dung", "Nhập nội dung hoặc thêm ảnh.");
      return;
    }
    createM.mutate({ courtId, content: content.trim(), images });
  };

  const pickAndUpload = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") return Alert.alert("Cần quyền truy cập ảnh");
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (r.canceled || !r.assets?.length) return;

    setUploading(true);
    try {
      const up = await uploadToCloudinary(r.assets[0].uri);
      setPreview(up); // chỉ preview, bấm "Đăng bài" mới gửi — UX thống nhất
    } catch (e: any) {
      Alert.alert("Upload lỗi", e?.message ?? "Không thể upload ảnh");
    } finally {
      setUploading(false);
    }
  };

  const charCount = content.length;
  const charTooLong = charCount > 1000;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Card mode="elevated" style={{ borderRadius: 20, overflow: "hidden", backgroundColor: "#fff" }}>
          <Card.Title
            title="Đăng bài"
            titleVariant="titleLarge"
            titleStyle={{ fontWeight: "800" }}
            left={(p) => <IconButton {...p} icon="plus-circle-outline" />}
          />
          <Divider />

          <Card.Content style={{ gap: 12, paddingTop: 16 }}>
            {/* Nội dung */}
            <TextInput
              mode="outlined"
              multiline
              value={content}
              onChangeText={setContent}
              placeholder="Viết gì đó về sân, lịch, hình ảnh... ✍️"
              left={<TextInput.Icon icon="text" />}
              style={{
                minHeight: 110,
                backgroundColor: "#FFF",
                borderRadius: 14,
              }}
              outlineStyle={{ borderRadius: 14 }}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <HelperText type={charTooLong ? "error" : "info"} visible>
                {charTooLong ? `Quá ${charCount - 1000} ký tự (tối đa 1000)` : `${charCount}/1000 ký tự`}
              </HelperText>
              {(createM.isPending || uploading) && (
                <Text style={{ color: ACCENT.textDim }}>
                  {uploading ? "Đang upload ảnh…" : "Đang đăng…"}
                </Text>
              )}
            </View>

            {/* Tip + URL ảnh */}
            <View style={{ backgroundColor: ACCENT.primarySoft, padding: 10, borderRadius: 12 }}>
              <Text style={{ color: ACCENT.textDim }}>
                Ảnh (tuỳ chọn) — dán URL hoặc chọn ảnh từ máy.
              </Text>
            </View>

            <TextInput
              mode="outlined"
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="Dán Image URL (https://...)"
              autoCapitalize="none"
              autoCorrect={false}
              left={<TextInput.Icon icon="link-variant" />}
              style={{ backgroundColor: "#FFF", borderRadius: 14 }}
              outlineStyle={{ borderRadius: 14 }}
            />

            {/* Preview */}
            {(preview?.url || imageUrl.trim()) ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: ACCENT.textDim }}>Xem trước</Text>
                <Image
                  source={{ uri: preview?.url || imageUrl.trim() }}
                  style={{
                    width: "100%",
                    aspectRatio: (preview?.w && preview?.h) ? preview.w / preview.h : 16 / 9,
                    borderRadius: 14,
                    backgroundColor: "#f2f2f2",
                  }}
                  resizeMode="cover"
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {preview?.url && (
                    <Button mode="outlined" onPress={() => setPreview(null)} textColor={ACCENT.primary} icon="close" style={{ borderRadius: 999, borderColor: ACCENT.pillBorder }}>
                      Bỏ ảnh
                    </Button>
                  )}
                  {!!imageUrl.trim() && (
                    <Button mode="outlined" onPress={() => setImageUrl("")} textColor={ACCENT.primary} icon="close-circle-outline" style={{ borderRadius: 999, borderColor: ACCENT.pillBorder }}>
                      Xoá URL
                    </Button>
                  )}
                </View>
              </View>
            ) : null}

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                mode="contained"
                onPress={submit}
                loading={createM.isPending}
                disabled={!canSubmit}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  backgroundColor: ACCENT.primary,
                }}
                contentStyle={{ height: 48 }}
                labelStyle={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
              >
                Đăng bài
              </Button>
              <Button
                mode="outlined"
                onPress={pickAndUpload}
                disabled={createM.isPending || uploading}
                style={{
                  borderRadius: 999,
                  borderColor: ACCENT.pillBorder,
                  backgroundColor: ACCENT.primarySoft,
                }}
                textColor={ACCENT.primary}
                contentStyle={{ height: 48 }}
                icon="image-plus"
              >
                Chọn ảnh
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}
