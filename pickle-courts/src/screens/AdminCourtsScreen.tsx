// pickle-courts/src/screens/AdminCourtsScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  TextInput as RNTextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  TouchableOpacity,
  Image,
} from "react-native";
import { Button, Text, Card, Divider, Chip } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { listCourts, type Court } from "../api/courts";
import {
  useCreateCourt,
  useDeleteCourt,
  useUpdateCourt,
} from "../hooks/useAdminCourts";
import { listVenues, type Venue } from "../api/venues";

export default function AdminCourtsScreen({ navigation }: any) {
  const courtsQ = useQuery({ queryKey: ["courts"], queryFn: listCourts });
  const venuesQ = useQuery({ queryKey: ["venues"], queryFn: listVenues });

  const createM = useCreateCourt();
  const updateM = useUpdateCourt();
  const deleteM = useDeleteCourt();

  const [form, setForm] = useState<Partial<Court>>({
    name: "",
    pricePerHour: 0,
    description: "",
    coverUrl: "",
    venueId: "",
  });

  const resetForm = () =>
    setForm({
      name: "",
      pricePerHour: 0,
      description: "",
      coverUrl: "",
      venueId: "",
    });

  const getId = (c: Partial<Court>) =>
    (c.id ?? (c as any)._id ?? "").toString();

  // ===== Dropdown venues =====
  const [venuePickerVisible, setVenuePickerVisible] = useState(false);
  const venues: Venue[] = venuesQ.data ?? [];
  const selectedVenue = useMemo(
    () =>
      venues.find(
        (v: any) =>
          String(v.id ?? v._id) === String((form as any).venueId ?? "")
      ),
    [venues, form.venueId]
  );

  const submitCreate = () => {
    if (!form.name?.trim()) return Alert.alert("Thiếu tên sân");
    if (!form.venueId) return Alert.alert("Thiếu địa điểm (Venue)");
    createM.mutate(form, {
      onSuccess: () => {
        resetForm();
        courtsQ.refetch();
      },
      onError: (e: any) =>
        Alert.alert("Lỗi", e?.response?.data?.error || "Tạo sân thất bại"),
    });
  };

  const submitUpdate = () => {
    const id = getId(form);
    if (!id) return;
    if (!form.venueId) return Alert.alert("Thiếu địa điểm (Venue)");
    updateM.mutate(
      { id, patch: form },
      {
        onSuccess: () => {
          resetForm();
          courtsQ.refetch();
        },
        onError: (e: any) =>
          Alert.alert("Lỗi", e?.response?.data?.error || "Cập nhật thất bại"),
      }
    );
  };

  const removeCourt = (id: string) =>
    deleteM.mutate(id, {
      onSuccess: () => courtsQ.refetch(),
      onError: (e: any) =>
        Alert.alert("Lỗi", e?.response?.data?.error || "Xóa thất bại"),
    });

  const data: Court[] = useMemo(() => courtsQ.data ?? [], [courtsQ.data]);

  /** ===================== HEADER FORM (đặt trong ListHeader) ===================== */
  const HeaderForm = (
    <View style={{ gap: 12, paddingBottom: 8 }}>

      <Card
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          borderColor: "#E5E7EB",
          borderWidth: 1,
          elevation: 0,
        }}
      >
        <Card.Content style={{ gap: 12 }}>
          {/* Venue picker (giả lập input) */}
          <TouchableOpacity
            onPress={() =>
              venues.length ? setVenuePickerVisible(true) : venuesQ.refetch()
            }
            activeOpacity={0.7}
            style={{
              borderWidth: 1,
              borderColor: "#E5E7EB",
              backgroundColor: "#fff",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: selectedVenue ? "#111827" : "#6B7280" }}>
              {venuesQ.isLoading
                ? "Đang tải địa điểm…"
                : selectedVenue
                ? `Địa điểm: ${selectedVenue.name}`
                : "Chọn địa điểm"}
            </Text>
          </TouchableOpacity>

          {/* Form inputs */}
          <RNTextInput
            placeholder="Tên sân"
            value={form.name ?? ""}
            onChangeText={(t) => setForm((s) => ({ ...s, name: t }))}
            style={s.input}
          />
          <RNTextInput
            placeholder="Giá/giờ"
            keyboardType="number-pad"
            value={String(form.pricePerHour ?? 0)}
            onChangeText={(t) =>
              setForm((s) => ({ ...s, pricePerHour: Number(t) || 0 }))
            }
            style={s.input}
          />
          <RNTextInput
            placeholder="Mô tả"
            value={form.description ?? ""}
            onChangeText={(t) => setForm((s) => ({ ...s, description: t }))}
            style={[s.input, { height: 90, textAlignVertical: "top" }]}
            multiline
          />
          <RNTextInput
            placeholder="Ảnh bìa (URL)"
            value={form.coverUrl ?? ""}
            onChangeText={(t) => setForm((s) => ({ ...s, coverUrl: t }))}
            style={s.input}
          />

          {/* Actions */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {getId(form) ? (
              <>
                <Button
                  mode="contained"
                  onPress={submitUpdate}
                  loading={updateM.isPending}
                  disabled={updateM.isPending}
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
                disabled={createM.isPending}
                style={{ borderRadius: 12 }}
              >
                Thêm sân
              </Button>
            )}
          </View>

          {/* Hint: chưa có venue */}
          {!venuesQ.isLoading && venues.length === 0 ? (
            <Button
              mode="outlined"
              onPress={() => navigation?.navigate?.("AdminVenues")}
              style={{ borderRadius: 12, borderColor: "#D1D5DB" }}
            >
              Chưa có địa điểm – Tạo ngay
            </Button>
          ) : null}
        </Card.Content>
      </Card>

      {/* ===== Modal chọn venue ===== */}
      <Modal
        visible={venuePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVenuePickerVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPressOut={() => setVenuePickerVisible(false)}
          style={s.modalOverlay}
        >
          <View style={s.modalSheet}>
            <Text style={{ fontWeight: "700", fontSize: 16, margin: 12 }}>
              Chọn địa điểm
            </Text>
            {venuesQ.isLoading ? (
              <ActivityIndicator style={{ margin: 16 }} />
            ) : (
              <FlatList<Venue>
                data={venues}
                keyExtractor={(v, i) => (v.id ?? (v as any)._id ?? String(i))}
                ItemSeparatorComponent={() => (
                  <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />
                )}
                renderItem={({ item }) => {
                  const id = (item.id ?? (item as any)._id) as string;
                  const active = String(form.venueId) === id;
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        setForm((s) => ({ ...s, venueId: id }));
                        setVenuePickerVisible(false);
                      }}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        backgroundColor: active ? "#EEF2FF" : "white",
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>{item.name}</Text>
                      {!!item.address && (
                        <Text style={{ color: "#6B7280" }}>{item.address}</Text>
                      )}
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={{ paddingBottom: 8 }}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Lỗi query (nếu có) */}
      {courtsQ.error ? (
        <Text style={{ color: "#EF4444" }}>
          {`Lỗi tải danh sách sân: ${
            (courtsQ.error as any)?.response?.status ?? ""
          }\n${JSON.stringify(
            (courtsQ.error as any)?.response?.data ??
              (courtsQ.error as any)?.message
          )}`}
        </Text>
      ) : null}
    </View>
  );

  /** ===================== LOADING TRỐNG ===================== */
  if (courtsQ.isLoading && data.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Đang tải…</Text>
      </View>
    );
  }

  /** ===================== LIST ===================== */
  return (
    <FlatList<Court>
      data={data}
      keyExtractor={(item, index) =>
        (item.id ?? (item as any)._id ?? `${item.name}-${index}`).toString()
      }
      ListHeaderComponent={HeaderForm}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24, backgroundColor: "#F9FAFB" }}
      keyboardShouldPersistTaps="handled"
      refreshing={courtsQ.isFetching}
      onRefresh={() => courtsQ.refetch()}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderItem={({ item }) => (
        <Card
          style={{
            borderRadius: 16,
            borderColor: "#E5E7EB",
            borderWidth: 1,
            backgroundColor: "#fff",
          }}
        >
          <Card.Content style={{ padding: 12 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {/* Cover preview */}
              <TouchableOpacity
                onPress={() =>
                  navigation?.navigate?.("AdminSetCover", { courtId: item.id })
                }
                activeOpacity={0.8}
                style={s.coverBox}
              >
                {item.coverUrl ? (
                  <Image
                    source={{ uri: item.coverUrl }}
                    style={{ width: 70, height: 70 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ color: "#9CA3AF", fontSize: 12 }}>No image</Text>
                )}
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "700", fontSize: 16 }}>
                    {item.name}
                  </Text>
                  <Chip compact style={{ backgroundColor: "#F3F4F6" }}>
                    {(item as any).venueId ? "Venue" : "—"}
                  </Chip>
                </View>

                <Text style={{ color: "#6B7280", marginTop: 2 }}>
                  Giá: {Number(item.pricePerHour ?? 0).toLocaleString()} đ/giờ
                </Text>
                <Text numberOfLines={1} style={{ color: "#9CA3AF", marginTop: 2 }}>
                  Cover: {item.coverUrl || "—"}
                </Text>

                <Divider style={{ marginVertical: 10, backgroundColor: "#F3F4F6" }} />

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button
                    mode="outlined"
                    onPress={() =>
                      setForm({
                        ...item,
                        venueId: ((item as any).venueId ?? "").toString(),
                      })
                    }
                    style={{ borderRadius: 12, borderColor: "#D1D5DB" }}
                  >
                    Sửa
                  </Button>

                  <Button
                    mode="contained-tonal"
                    onPress={() =>
                      Alert.alert("Xóa sân?", `Bạn chắc chắn xóa ${item.name}?`, [
                        { text: "Huỷ" },
                        {
                          text: "Xóa",
                          style: "destructive",
                          onPress: () => removeCourt(getId(item)),
                        },
                      ])
                    }
                    style={{ borderRadius: 12 }}
                  >
                    Xóa
                  </Button>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}
      ListEmptyComponent={
        !courtsQ.isLoading ? (
          <Text style={{ textAlign: "center", color: "#6B7280", marginTop: 8 }}>
            Chưa có sân nào
          </Text>
        ) : null
      }
    />
  );
}

/** ===================== styles nhỏ gọn ===================== */
const s = {
  input: {
    borderWidth: 1,
    borderRadius: 12,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as RNTextInput["props"]["style"],
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 24,
  } as const,
  modalSheet: {
    backgroundColor: "#fff",
    borderRadius: 16,
    maxHeight: "70%",
    overflow: "hidden",
  } as const,
  coverBox: {
    width: 70,
    height: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  } as const,
};
