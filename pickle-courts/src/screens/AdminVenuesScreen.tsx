// src/screens/AdminVenuesScreen.tsx
import React, { useState, useMemo } from "react";
import { View, Alert, ActivityIndicator, Image } from "react-native";
import {
  Button,
  Text,
  Card,
  Divider,
  Chip,
  TextInput as PaperInput,
} from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { listVenues, type Venue } from "../api/venues";
import { useCreateVenue, useUpdateVenue, useDeleteVenue } from "../hooks/useAdminVenues";
import { FlatList } from "react-native";

export default function AdminVenuesScreen() {
  const venuesQ = useQuery({ queryKey: ["venues"], queryFn: listVenues });
  const createM = useCreateVenue();
  const updateM = useUpdateVenue();
  const deleteM = useDeleteVenue();

  const [form, setForm] = useState<Partial<Venue>>({
    name: "",
    address: "",
    coverUrl: "",
  });

  const resetForm = () => setForm({ name: "", address: "", coverUrl: "" });
  const getId = (v: Partial<Venue>) => (v.id ?? (v as any)._id ?? "").toString();

  const submitCreate = () => {
    if (!form.name?.trim()) return Alert.alert("Thiếu tên địa điểm");
    createM.mutate(form, {
      onSuccess: resetForm,
      onError: (e: any) =>
        Alert.alert("Lỗi", e?.response?.data?.error || "Tạo venue thất bại"),
    });
  };

  const submitUpdate = () => {
    const id = getId(form);
    if (!id) return;
    updateM.mutate(
      { id, patch: form },
      {
        onSuccess: resetForm,
        onError: (e: any) =>
          Alert.alert("Lỗi", e?.response?.data?.error || "Cập nhật thất bại"),
      }
    );
  };

  const removeVenue = (id: string) =>
    deleteM.mutate(id, {
      onError: (e: any) =>
        Alert.alert("Lỗi", e?.response?.data?.error || "Xóa thất bại"),
    });

  const data: Venue[] = useMemo(() => venuesQ.data ?? [], [venuesQ.data]);

  // -------- Header + Form đưa vào ListHeaderComponent (để toàn màn hình cuộn) --------
  const HeaderForm = (
    <View>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        
      </View>

      {/* Form trong Card trắng */}
      <Card
        style={{
          marginHorizontal: 16,
          backgroundColor: "#fff",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#E5E7EB",
        }}
      >
        <Card.Content style={{ gap: 10 }}>
          <Text style={{ fontWeight: "700", color: "#374151" }}>
            Thêm / Sửa địa điểm
          </Text>

          <PaperInput
            mode="outlined"
            label="Tên địa điểm"
            value={form.name ?? ""}
            onChangeText={(t) => setForm((s) => ({ ...s, name: t }))}
            style={{ backgroundColor: "#fff" }}
          />
          <PaperInput
            mode="outlined"
            label="Địa chỉ"
            value={form.address ?? ""}
            onChangeText={(t) => setForm((s) => ({ ...s, address: t }))}
            style={{ backgroundColor: "#fff" }}
          />
          <PaperInput
            mode="outlined"
            label="Cover URL (tùy chọn)"
            value={form.coverUrl ?? ""}
            onChangeText={(t) => setForm((s) => ({ ...s, coverUrl: t }))}
            style={{ backgroundColor: "#fff" }}
          />

          <Chip icon="information-outline" compact>
            Có thể đổi ảnh bìa sân riêng ở màn “Đặt ảnh bìa”.
          </Chip>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
            {getId(form) ? (
              <>
                <Button
                  mode="contained"
                  onPress={submitUpdate}
                  loading={updateM.isPending}
                  style={{ borderRadius: 12 }}
                >
                  Lưu sửa
                </Button>
                <Button
                  mode="outlined"
                  onPress={resetForm}
                  style={{ borderRadius: 12, borderColor: "#D1D5DB" }}
                >
                  Hủy
                </Button>
              </>
            ) : (
              <Button
                mode="contained"
                onPress={submitCreate}
                loading={createM.isPending}
                style={{ borderRadius: 12 }}
              >
                Thêm địa điểm
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Khoảng cách với list */}
      <View style={{ height: 12 }} />
    </View>
  );

  // -------- Loading trống (lúc khởi tạo) --------
  if (venuesQ.isLoading && data.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Đang tải…</Text>
      </View>
    );
  }

  // -------- FlatList duy nhất cho toàn màn hình (cuộn được) --------
  return (
    <FlatList<Venue>
      data={data}
      keyExtractor={(item, index) =>
        (item.id ?? (item as any)._id ?? `${index}`)
      }
      ListHeaderComponent={HeaderForm}
      contentContainerStyle={{
        paddingBottom: 24,
        backgroundColor: "#F9FAFB",
        gap: 12,
      }}
      keyboardShouldPersistTaps="handled"
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderItem={({ item }) => (
        <Card
          style={{
            marginHorizontal: 16,
            backgroundColor: "#fff",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <Card.Content style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {/* Thumbnail nhỏ nếu có coverUrl */}
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  overflow: "hidden",
                  backgroundColor: "#F3F4F6",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item.coverUrl ? (
                  <Image
                    source={{ uri: item.coverUrl }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ color: "#9CA3AF", fontSize: 12 }}>No image</Text>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: "#111827" }}>
                  {item.name}
                </Text>
                {!!item.address && (
                  <Text style={{ color: "#6B7280" }}>Địa chỉ: {item.address}</Text>
                )}
                <Text numberOfLines={1} style={{ color: "#9CA3AF" }}>
                  Cover: {item.coverUrl || "—"}
                </Text>
              </View>
            </View>

            <Divider style={{ marginVertical: 6, backgroundColor: "#F3F4F6" }} />

            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Button
                mode="outlined"
                onPress={() => setForm(item)}
                style={{ borderRadius: 12, borderColor: "#D1D5DB" }}
              >
                Sửa
              </Button>
              <Button
                mode="contained-tonal"
                onPress={() =>
                  Alert.alert(
                    "Xóa địa điểm?",
                    `Bạn chắc chắn xóa ${item.name}?`,
                    [
                      { text: "Huỷ" },
                      {
                        text: "Xóa",
                        style: "destructive",
                        onPress: () => removeVenue(item.id as string),
                      },
                    ]
                  )
                }
                style={{ borderRadius: 12 }}
              >
                Xóa
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}
      ListEmptyComponent={
        !venuesQ.isLoading ? (
          <Card
            style={{
              marginHorizontal: 16,
              backgroundColor: "#fff",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Card.Content>
              <Text>Chưa có địa điểm nào.</Text>
            </Card.Content>
          </Card>
        ) : null
      }
    />
  );
}
