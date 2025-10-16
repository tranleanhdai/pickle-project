// src/screens/ResetPasswordScreen.tsx
import { useEffect, useState } from "react";
import { View } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import { useRoute } from "@react-navigation/native";
import { confirmPasswordReset } from "../api/auth";

export default function ResetPasswordScreen({ navigation }: any) {
  const route = useRoute<any>();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  // Lấy token từ deep link / params
  useEffect(() => {
    const tk = route.params?.token || "";
    if (tk) setToken(String(tk));
  }, [route.params?.token]);

  const onSubmit = async () => {
    try {
      setLoading(true);
      setError("");
      await confirmPasswordReset(token.trim(), password);
      setOk(true);
      // về màn Login
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Đặt lại mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text variant="titleLarge">Đặt lại mật khẩu</Text>

      <TextInput
        label="Mã khôi phục (từ email)"
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
      />
      <TextInput
        label="Mật khẩu mới"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? <Text style={{ color: "red" }}>{error}</Text> : null}
      {ok ? <Text style={{ color: "green" }}>Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.</Text> : null}

      <Button
        mode="contained"
        onPress={onSubmit}
        loading={loading}
        disabled={loading || !token || password.length < 3}
      >
        Xác nhận
      </Button>

      <Button onPress={() => navigation.navigate("Login")}>
        Quay lại đăng nhập
      </Button>
    </View>
  );
}
