import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationProp } from "@react-navigation/native";

export async function ensureAuth(navigation: NavigationProp<any>): Promise<string | null> {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    navigation.navigate("Login"); // ép login
    return null;
  }
  return token;
}
