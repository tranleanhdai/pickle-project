// pickle-courts/src/screens/AdminSetCoverScreen.tsx
import React, { useMemo, useState, useEffect } from "react";
import { View, Image, Alert, ScrollView } from "react-native";
import {
  Button,
  Text,
  Card,
  ActivityIndicator,
  Menu,
  Divider,
  Chip,
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";

import { useVenues, type Venue } from "../hooks/useVenues";
import { useCourts } from "../hooks/useCourts";
import type { Court } from "../api/courts";
import { uploadToCloudinary } from "../api/cloudinary";
import { setCourtCover } from "../api/courts";

type Props = { route?: any; navigation?: any };

export default function AdminSetCoverScreen({ route, navigation }: Props) {
  const presetCourtId: string | undefined = route?.params?.courtId;

  // venues
  const venuesQ = useVenues();
  const [venueId, setVenueId] = useState<string | null>(null);

  // courts theo venue
  const courtsQ = useCourts(venueId ?? undefined);
  const [courtId, setCourtId] = useState<string | null>(presetCourtId ?? null);

  // menu dropdown
  const [venueMenu, setVenueMenu] = useState(false);
  const [courtMenu, setCourtMenu] = useState(false);

  // ảnh & upload state
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const selectedVenue = useMemo(
    () => venuesQ.data?.find((v: Venue) => v.id === venueId) ?? null,
    [venuesQ.data, venueId]
  );
  const selectedCourt = useMemo(
    () => courtsQ.data?.find((c: Court) => c.id === courtId) ?? null,
    [courtsQ.data, courtId]
  );

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Quyền ảnh", "Bạn cần cho phép truy cập thư viện ảnh.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    setLocalUri(a.uri);
    setUploadedUrl(null);
  };

  const doUpload = async () => {
    if (!localUri) return;
    setUploading(true);
    try {
      const up = await uploadToCloudinary(localUri);
      setUploadedUrl(up.url ?? null);
      Alert.alert("Thành công", "Đã upload ảnh lên Cloudinary.");
    } catch (e: any) {
      Alert.alert("Lỗi upload", e?.message || "Không thể upload ảnh");
    } finally {
      setUploading(false);
    }
  };

  const saveCover = async () => {
    if (!courtId || !uploadedUrl) return;
    setSaving(true);
    try {
      await setCourtCover(courtId, uploadedUrl);
      Alert.alert("OK", "Đã cập nhật ảnh bìa của sân.");
      navigation?.goBack?.();
    } catch (e: any) {
      Alert.alert("Lỗi", e?.response?.data?.error || e?.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  // auto chọn venue đầu tiên (loại undefined)
  useEffect(() => {
    if (!venueId && venuesQ.data?.length) {
      setVenueId(venuesQ.data?.[0]?.id ?? null);
    }
  }, [venuesQ.data, venueId]);

  // nếu presetCourtId nằm trong courts hiện tại thì set (chắc chắn là string)
  useEffect(() => {
    if (presetCourtId && courtsQ.data?.some((c: Court) => c.id === presetCourtId)) {
      setCourtId(presetCourtId);
    }
  }, [presetCourtId, courtsQ.data]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F9FAFB" }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={{ marginBottom: 8 }}>
        
        
      </View>

      {/* Bước 1 + 2: Chọn Venue/Sân */}
      <Card
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          marginTop: 8,
        }}
      >
        <Card.Content style={{ gap: 14 }}>
          <Text style={{ fontWeight: "700", color: "#374151" }}>
            Bước 1: Chọn địa điểm (Venue)
          </Text>

          <Menu
            visible={venueMenu}
            onDismiss={() => setVenueMenu(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setVenueMenu(true)}
                style={{ borderRadius: 12, borderColor: "#D1D5DB" }}
                textColor="#111827"
              >
                {selectedVenue?.name || "Chọn địa điểm"}
              </Button>
            }
            contentStyle={{ backgroundColor: "#fff" }}
          >
            {venuesQ.data?.map((v: Venue, i: number) => (
              <Menu.Item
                key={String(v.id ?? i)}
                onPress={() => {
                  setVenueMenu(false);
                  setVenueId(v.id ?? null);
                  setCourtId(null);
                }}
                title={v.name}
              />
            ))}
          </Menu>

          <Divider style={{ backgroundColor: "#F3F4F6" }} />

          <Text style={{ fontWeight: "700", color: "#374151" }}>
            Bước 2: Chọn sân
          </Text>

          {venueId ? (
            courtsQ.isLoading ? (
              <ActivityIndicator />
            ) : courtsQ.error ? (
              <Text style={{ color: "#EF4444" }}>Không tải được danh sách sân</Text>
            ) : (
              <Menu
                visible={courtMenu}
                onDismiss={() => setCourtMenu(false)}
                anchor={
                  <Button
                    mode="outlined"
                    disabled={!courtsQ.data?.length}
                    onPress={() => setCourtMenu(true)}
                    style={{ borderRadius: 12, borderColor: "#D1D5DB" }}
                    textColor="#111827"
                  >
                    {selectedCourt?.name || "Chọn sân"}
                  </Button>
                }
                contentStyle={{ backgroundColor: "#fff" }}
              >
                {courtsQ.data?.map((c: Court) => (
                  <Menu.Item
                    key={c.id}
                    onPress={() => {
                      setCourtMenu(false);
                      setCourtId(c.id ?? null);
                    }}
                    title={c.name}
                  />
                ))}
              </Menu>
            )
          ) : (
            <Chip icon="information-outline" compact>
              Hãy chọn địa điểm trước
            </Chip>
          )}
        </Card.Content>
      </Card>

      {/* Bước 3: Ảnh hiện tại + Ảnh mới chọn */}
      <Card
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          marginTop: 12,
        }}
      >
        <Card.Content style={{ gap: 14 }}>
          <Text style={{ fontWeight: "700", color: "#374151" }}>
            Bước 3: Chọn ảnh
          </Text>

          {!!selectedCourt?.coverUrl && (
            <View>
              <Text style={{ color: "#6B7280", marginBottom: 6 }}>
                Ảnh bìa hiện tại
              </Text>
              <View
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              >
                <Image
                  source={{ uri: selectedCourt.coverUrl }}
                  style={{ width: "100%", aspectRatio: 16 / 9 }}
                />
              </View>
            </View>
          )}

          {localUri ? (
            <View>
              <Text style={{ color: "#6B7280", marginBottom: 6 }}>
                Ảnh mới (chưa upload)
              </Text>
              <View
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              >
                <Image
                  source={{ uri: localUri }}
                  style={{ width: "100%", aspectRatio: 16 / 9 }}
                />
              </View>
            </View>
          ) : (
            <Chip icon="image" compact>
              Chưa chọn ảnh
            </Chip>
          )}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              mode="outlined"
              onPress={pickImage}
              disabled={!courtId}
              style={{ borderRadius: 12, borderColor: "#D1D5DB" }}
            >
              Chọn ảnh…
            </Button>
            <Button
              mode="contained"
              onPress={doUpload}
              loading={uploading}
              disabled={!localUri || uploading}
              style={{ borderRadius: 12 }}
            >
              Upload Cloudinary
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Bước 4: Lưu */}
      <Card
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          marginTop: 12,
        }}
      >
        <Card.Content style={{ gap: 12 }}>
          <Text style={{ fontWeight: "700", color: "#374151" }}>
            Bước 4: Lưu ảnh bìa
          </Text>
          <Text style={{ color: "#6B7280" }}>
            Ảnh chỉ được áp dụng khi bạn nhấn “Lưu ảnh bìa”.
          </Text>
          <Button
            mode="contained"
            onPress={saveCover}
            loading={saving}
            disabled={!uploadedUrl || !courtId || saving}
            style={{ borderRadius: 12 }}
          >
            Lưu ảnh bìa
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
