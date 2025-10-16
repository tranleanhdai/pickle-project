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
  Checkbox,
  Avatar,
} from "react-native-paper";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useRegister } from "../hooks/useRegister";

export default function RegisterScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const redirect = route.params?.redirect as { name: string; params?: any } | undefined;
  const register = useRegister();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(true); // mặc định tick giống ảnh

  const onSubmit = () => {
    const u = username.trim();
    const e = email.trim().toLowerCase();
    if (!u || !e || !password) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return;
    if (password !== confirm) return;

    register.mutate(
      { username: u, email: e, password },
      {
        onSuccess: () => {
          if (redirect) {
            nav.reset({ index: 0, routes: [{ name: redirect.name, params: redirect.params }] });
          } else {
            nav.navigate("Login");
          }
        },
      }
    );
  };

  const disabled =
    register.isPending ||
    !username ||
    !email ||
    !password ||
    !confirm ||
    password !== confirm ||
    !agree;

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
          <Text style={{ opacity: 0.6, marginTop: 4 }}>Tạo tài khoản mới</Text>
        </View>

        {/* Card Form giống login */}
        <Card mode="elevated" style={{ borderRadius: 20, overflow: "hidden" }}>
          <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 6 }}>
            <Text variant="titleLarge" style={{ fontWeight: "800" }}>
              Đăng ký
            </Text>
            <Text style={{ opacity: 0.7, marginTop: 6 }}>
              Nhập thông tin để bắt đầu sử dụng ứng dụng
            </Text>
          </View>
          <Divider />

          <Card.Content style={{ paddingTop: 18, gap: 12 }}>
            <TextInput
              mode="outlined"
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              left={<TextInput.Icon icon="account-outline" />}
            />
            <TextInput
              mode="outlined"
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              left={<TextInput.Icon icon="email-outline" />}
            />
            <TextInput
              mode="outlined"
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              left={<TextInput.Icon icon="lock-outline" />}
              right={<TextInput.Icon icon="eye" disabled />}
            />
            <TextInput
              mode="outlined"
              label="Nhập lại mật khẩu"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              left={<TextInput.Icon icon="lock-check-outline" />}
              right={<TextInput.Icon icon="eye" disabled />}
            />

            {/* Agree Row */}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
              <Checkbox
                status={agree ? "checked" : "unchecked"}
                onPress={() => setAgree((v) => !v)}
              />
              <Text style={{ flex: 1 }}>
                Tôi đồng ý với{" "}
                <Text
                  style={{ textDecorationLine: "underline" }}
                  onPress={() => Linking.openURL("https://example.com/terms")}
                >
                  Điều khoản dịch vụ
                </Text>{" "}
                và{" "}
                <Text
                  style={{ textDecorationLine: "underline" }}
                  onPress={() => Linking.openURL("https://example.com/privacy")}
                >
                  Chính sách bảo mật
                </Text>
              </Text>
            </View>

            {/* ✅ Nút Đăng ký màu đen */}
            <Button
              mode="contained"
              onPress={onSubmit}
              disabled={disabled}
              contentStyle={{ height: 50, borderRadius: 14 }}
              style={{
                borderRadius: 14,
                marginTop: 6,
                marginBottom: 4,
                backgroundColor: "#111", // <-- đen v0
              }}
              labelStyle={{
                color: "#fff",
                fontWeight: "600",
                fontSize: 16,
              }}
            >
              {register.isPending ? <ActivityIndicator color="#fff" /> : "Đăng ký"}
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
              onPress={() => nav.navigate("Login")}
              style={{ alignSelf: "center", marginBottom: 8 }}
            >
              Đã có tài khoản? <Text style={{ fontWeight: "700" }}>Đăng nhập</Text>
            </Button>
          </Card.Content>
        </Card>

        {/* Footer note giống login */}
        <View style={{ alignItems: "center", marginTop: 18 }}>
          <Text style={{ opacity: 0.6, textAlign: "center" }}>
            Bằng việc đăng ký, bạn đồng ý với{" "}
            <Text
              style={{ textDecorationLine: "underline" }}
              onPress={() => Linking.openURL("https://example.com/terms")}
            >
              Điều khoản dịch vụ
            </Text>{" "}
            và{" "}
            <Text
              style={{ textDecorationLine: "underline" }}
              onPress={() => Linking.openURL("https://example.com/privacy")}
            >
              Chính sách bảo mật
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
