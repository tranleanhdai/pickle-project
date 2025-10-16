import React, { useState } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  Card,
  Divider,
  Avatar,
} from "react-native-paper";
import { requestPasswordReset } from "../api/auth";

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    setLoading(true);
    setMessage("");
    try {
      await requestPasswordReset(e);
      setMessage("Nếu email tồn tại, mã khôi phục đã được gửi. Vui lòng kiểm tra hộp thư.");
    } catch (err: any) {
      setMessage(err?.response?.data?.error ?? "Không thể gửi email khôi phục.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo + Title */}
        <View style={{ alignItems: "center", marginTop: 56, marginBottom: 16 }}>
          <Avatar.Text
            size={84}
            label="PC"
            color="#fff"
            style={{ backgroundColor: "#111827", borderRadius: 22 }}
          />
          <Text variant="headlineMedium" style={{ marginTop: 16, fontWeight: "700" }}>
            Pickle Courts
          </Text>
          <Text style={{ opacity: 0.6, marginTop: 4 }}>Khôi phục mật khẩu</Text>
        </View>

        {/* Card Form */}
        <Card mode="elevated" style={{ borderRadius: 20, overflow: "hidden" }}>
          <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 6 }}>
            <Text variant="titleLarge" style={{ fontWeight: "800" }}>
              Quên mật khẩu
            </Text>
            <Text style={{ opacity: 0.7, marginTop: 6 }}>
              Nhập email đăng ký để nhận mã khôi phục
            </Text>
          </View>
          <Divider />

          <Card.Content style={{ paddingTop: 18, gap: 12 }}>
            <TextInput
              mode="outlined"
              label="Email đăng ký"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              left={<TextInput.Icon icon="email-outline" />}
            />

            {message ? (
              <Text
                style={{
                  color: message.includes("Không thể") ? "#b00020" : "#111",
                  opacity: message.includes("Không thể") ? 1 : 0.8,
                }}
              >
                {message}
              </Text>
            ) : null}

            {/* ✅ Nút đen kiểu v0 */}
            <Button
              mode="contained"
              onPress={onSubmit}
              loading={loading}
              disabled={loading || !email}
              contentStyle={{ height: 50, borderRadius: 14 }}
              style={{
                borderRadius: 14,
                marginTop: 6,
                marginBottom: 4,
                backgroundColor: "#111",
              }}
              labelStyle={{ color: "#fff", fontWeight: "600", fontSize: 16 }}
            >
              Gửi mã khôi phục
            </Button>

            <View style={{ alignItems: "center", marginVertical: 8 }}>
              <View
                style={{
                  width: "100%",
                  height: 1,
                  backgroundColor: "rgba(0, 0, 0, 0.08)",
                  marginBottom: 8,
                }}
              />
              <Text style={{ opacity: 0.5 }}>HOẶC</Text>
            </View>

            <Button
              mode="text"
              onPress={() => navigation.navigate("ResetPassword")}
              style={{ alignSelf: "center", marginBottom: 8 }}
            >
              Đã có mã? <Text style={{ fontWeight: "700" }}>Đặt lại mật khẩu</Text>
            </Button>
          </Card.Content>
        </Card>

        {/* Footer note */}
        <View style={{ alignItems: "center", marginTop: 18 }}>
          <Text style={{ opacity: 0.6, textAlign: "center" }}>
            Cần hỗ trợ?{" "}
            <Text
              style={{ textDecorationLine: "underline" }}
              onPress={() => Linking.openURL("mailto:support@example.com")}
            >
              Liên hệ hỗ trợ
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
