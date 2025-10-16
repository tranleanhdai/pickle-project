import { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useMe } from "../hooks/useMe";

export function useAdminGuard() {
  const nav = useNavigation<any>();
  const { data, isLoading } = useMe();

  useEffect(() => {
    if (!isLoading && data?.role !== "admin") {
      nav.replace("Home"); // hoặc nav.goBack()
    }
  }, [isLoading, data, nav]);
}
