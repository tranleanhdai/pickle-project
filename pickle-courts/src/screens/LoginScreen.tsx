import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  Card,
  Checkbox,
  Divider,
  HelperText,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute, CommonActions } from "@react-navigation/native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { login } from "../api/auth";

export default function LoginScreen({ navigation }: any) {
  const route = useRoute<any>();
  const redirect = route.params?.redirect;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");
      const { token } = await login(username.trim(), password);
      await AsyncStorage.setItem("token", token);
      if (remember) await AsyncStorage.setItem("remember_login", "1");
      else await AsyncStorage.removeItem("remember_login");

      if (redirect?.name) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: redirect.name, params: redirect.params }],
          })
        );
      } else {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "MainTabs", params: { screen: "HomeTab" } }],
          })
        );
      }
    } catch (e: any) {
      const msg =
        e?.response?.status === 401
          ? "Sai tên đăng nhập hoặc mật khẩu."
          : e?.response?.data?.error || e?.message || "Đăng nhập thất bại.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      {/* Header logo */}
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>PC</Text>
        </View>
        <Text style={styles.title}>Pickle Courts</Text>
        <Text style={styles.subtitle}>Đặt sân thể thao dễ dàng</Text>
      </View>

      {/* Card form */}
      <Card style={styles.card} mode="elevated">
        <Card.Content style={{ gap: 14 }}>
          <Text variant="titleLarge" style={styles.formTitle}>
            Đăng nhập
          </Text>
          <Text style={styles.formSubtitle}>
            Nhập thông tin để truy cập tài khoản của bạn
          </Text>

          <TextInput
            label="Email"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            mode="outlined"
            left={<TextInput.Icon icon="email-outline" />}
          />

          <TextInput
            label="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPassword ? "eye-off-outline" : "eye-outline"}
                onPress={() => setShowPassword(!showPassword)}
                forceTextInputFocus={false}
              />
            }
          />

          {!!error && (
            <HelperText type="error" visible={!!error}>
              {error}
            </HelperText>
          )}

          <View style={styles.rowBetween}>
            <TouchableOpacity
              style={styles.rowCenter}
              onPress={() => setRemember(!remember)}
            >
              <Checkbox
                status={remember ? "checked" : "unchecked"}
                onPress={() => setRemember(!remember)}
              />
              <Text>Ghi nhớ đăng nhập</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
              <Text style={styles.link}>Quên mật khẩu?</Text>
            </TouchableOpacity>
          </View>

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading || !username || !password}
            style={styles.loginButton}
            contentStyle={{ height: 48 }}
            labelStyle={{ color: "#fff", fontWeight: "600", fontSize: 16 }}
          >
            Đăng nhập
          </Button>

          <View style={styles.dividerWrap}>
            <Divider style={{ flex: 1 }} />
            <Text style={styles.dividerText}>HOẶC</Text>
            <Divider style={{ flex: 1 }} />
          </View>

          <Text style={styles.centerText}>
            Chưa có tài khoản?{" "}
            <Text
              style={styles.linkBold}
              onPress={() => navigation.navigate("Register")}
            >
              Đăng ký ngay
            </Text>
          </Text>
        </Card.Content>
      </Card>

      <Text style={styles.footer}>
        Bằng việc đăng nhập, bạn đồng ý với{" "}
        <Text style={styles.link}>Điều khoản dịch vụ</Text> và{" "}
        <Text style={styles.link}>Chính sách bảo mật</Text>
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(250, 250, 250, 1)",
    padding: 20,
    justifyContent: "center",
  },
  header: { alignItems: "center", marginBottom: 20 },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: { color: "white", fontWeight: "bold", fontSize: 22 },
  title: { fontWeight: "bold", fontSize: 24, color: "#111" },
  subtitle: { color: "#666", fontSize: 14 },
  card: {
    borderRadius: 16,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3,
  },
  formTitle: { fontWeight: "700", color: "#111" },
  formSubtitle: { color: "#666" },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowCenter: { flexDirection: "row", alignItems: "center" },
  loginButton: {
    borderRadius: 12,
    backgroundColor: "#111",
    marginTop: 8,
  },
  link: { color: "#111", textDecorationLine: "underline" },
  linkBold: { color: "#111", fontWeight: "700" },
  dividerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 8,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
  },
  centerText: { textAlign: "center", color: "#444" },
  footer: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 12,
    color: "#777",
  },
});
