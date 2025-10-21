import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useMe } from "../hooks/useMe";

export function useAdminGuard() {
  const nav = useNavigation<any>();
  const { data, isLoading } = useMe();

  useEffect(() => {
    if (!isLoading && data?.role !== "admin") {
  if (nav.canGoBack()) nav.goBack();
  else nav.navigate("ProfileMain");
}
  }, [isLoading, data, nav]);
}
