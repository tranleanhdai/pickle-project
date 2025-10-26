// App.tsx
import { useEffect, useState } from "react";
import { View, ActivityIndicator, Text as RNText } from "react-native";
import { NavigationContainer, CommonActions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as PaperProvider } from "react-native-paper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import HomeScreen from "./src/screens/HomeScreen";
import VenueScreen from "./src/screens/VenueScreen";
import CourtScreen from "./src/screens/CourtScreen";
import BookingScreen from "./src/screens/BookingScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import MyBookingsScreen from "./src/screens/MyBookingsScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";

import CreatePostScreen from "./src/screens/CreatePostScreen";
import CommentsScreen from "./src/screens/CommentsScreen";
import PaymentGuide from "./src/screens/PaymentGuide";

import AdminScreen from "./src/screens/AdminScreen";
import AdminTransfersScreen from "./src/screens/AdminTransfersScreen";
import AdminSetCoverScreen from "./src/screens/AdminSetCoverScreen";
import AdminCourtsScreen from "./src/screens/AdminCourtsScreen";
import AdminVenuesScreen from "./src/screens/AdminVenuesScreen";

import { navigationRef } from "./src/api/client";

const RootStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const queryClient = new QueryClient();

SplashScreen.preventAutoHideAsync().catch(() => {});

/* ===================== ROUTE CONSTANTS + HELPERS ===================== */
export const ROOT_ROUTES = {
  MainTabs: "MainTabs",
  Login: "Login",
  Register: "Register",
  ForgotPassword: "ForgotPassword",
  ResetPassword: "ResetPassword",
} as const;

export const TAB_ROUTES = {
  HomeTab: "HomeTab",
  SearchTab: "SearchTab",
  BookingsTab: "BookingsTab",
  ProfileTab: "ProfileTab",
} as const;

/** Dùng ở LoginScreen sau khi đăng nhập thành công */
export function resetToMainTabs(initialTab?: keyof typeof TAB_ROUTES) {
  const routeName = ROOT_ROUTES.MainTabs;
  const params = initialTab ? { screen: TAB_ROUTES[initialTab] } : undefined;

  navigationRef.current?.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: routeName, params }],
    })
  );
}

/** Dùng ở ProfileScreen khi đăng xuất */
export function resetToLogin() {
  navigationRef.current?.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: ROOT_ROUTES.Login }],
    })
  );
}

/* ===================== (optional) Search demo ===================== */
function SearchScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <RNText style={{ fontSize: 16 }}>Tính năng tìm kiếm đang hoàn thiện</RNText>
    </View>
  );
}

/* ===================== NESTED STACKS ===================== */
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="Venue" component={VenueScreen} />
      <HomeStack.Screen name="Court" component={CourtScreen} />
      <HomeStack.Screen name="PaymentGuide" component={PaymentGuide} />
      <HomeStack.Screen name="CreatePost" component={CreatePostScreen} />
      <HomeStack.Screen name="Comments" component={CommentsScreen} />
      <HomeStack.Screen name="BookingScreen" component={BookingScreen} />
    </HomeStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="Admin" component={AdminScreen} />
      <ProfileStack.Screen name="AdminTransfers" component={AdminTransfersScreen} />
      <ProfileStack.Screen name="AdminSetCover" component={AdminSetCoverScreen} />
      <ProfileStack.Screen name="AdminCourts" component={AdminCourtsScreen} />
      <ProfileStack.Screen name="AdminVenues" component={AdminVenuesScreen} />
    </ProfileStack.Navigator>
  );
}

/* ===================== MAIN TABS ===================== */
function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#7c774db0",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabelStyle: { fontSize: 12 },
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#eee",
          height: 56 + Math.max(insets.bottom, 8),
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
          elevation: 10,
        },
        tabBarBackground: () => <View style={{ flex: 1, backgroundColor: "#fff" }} />,
      }}
    >
      <Tab.Screen
        name={TAB_ROUTES.HomeTab}
        component={HomeStackNavigator}
        options={{
          tabBarLabel: "Trang chủ",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.SearchTab}
        component={SearchScreen}
        options={{
          tabBarLabel: "Tìm kiếm",
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="magnify" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.BookingsTab}
        component={MyBookingsScreen}
        options={{
          tabBarLabel: "Lịch đặt",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "calendar-check" : "calendar-month-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name={TAB_ROUTES.ProfileTab}
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: "Cá nhân",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? "account" : "account-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

/* ===================== APP ROOT ===================== */
export default function App() {
  const [fontsLoaded] = useFonts({
    MaterialCommunityIcons:
      require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf"),
  });

  // NEW: kiểm tra token trước khi render navigator
  const [authChecked, setAuthChecked] = useState(false);
  const [hasToken, setHasToken] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem("token");
        setHasToken(!!t);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (fontsLoaded && authChecked) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, authChecked]);

  // Đợi cả fonts + auth check xong rồi mới render navigator (để initialRouteName dùng đúng)
  if (!fontsLoaded || !authChecked) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider settings={{ icon: (p) => <MaterialCommunityIcons {...p} /> }}>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer
            ref={navigationRef}
            linking={{
              prefixes: ["picklecourts://"],
              config: { screens: { ResetPassword: "reset" } },
              subscribe(listener) {
                const sub = Linking.addEventListener("url", ({ url }) => listener(url));
                return () => sub.remove();
              },
              async getInitialURL() {
                const url = await Linking.getInitialURL();
                return url;
              },
            }}
          >
            <RootStack.Navigator
              // Quan trọng: chọn route đầu dựa vào token
              initialRouteName={hasToken ? ROOT_ROUTES.MainTabs : ROOT_ROUTES.Login}
              screenOptions={{ headerShown: false }}
            >
              {/* App chính (tabs) */}
              <RootStack.Screen name={ROOT_ROUTES.MainTabs} component={MainTabs} />
              {/* Auth modals */}
              <RootStack.Screen name={ROOT_ROUTES.Login} component={LoginScreen} options={{ presentation: "modal" }} />
              <RootStack.Screen name={ROOT_ROUTES.Register} component={RegisterScreen} options={{ presentation: "modal" }} />
              <RootStack.Screen
                name={ROOT_ROUTES.ForgotPassword}
                component={ForgotPasswordScreen}
                options={{ presentation: "modal" }}
              />
              <RootStack.Screen
                name={ROOT_ROUTES.ResetPassword}
                component={ResetPasswordScreen}
                options={{ presentation: "modal" }}
              />
            </RootStack.Navigator>
          </NavigationContainer>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
