// src/components/PaymentMethodDialog.tsx
import React from "react";
import {
  Dialog,
  Portal,
  Button,
  Text,
  Divider,
  List,
  RadioButton,
} from "react-native-paper";
import { View } from "react-native";

type Props = {
  visible: boolean;
  value: "prepay_transfer" | "pay_later";
  onChange: (v: "prepay_transfer" | "pay_later") => void;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

type OptionKey = "pay_later" | "prepay_transfer";

const OPTIONS: Record<OptionKey, { title: string; subtitle: string; icon: string }> = {
  pay_later: {
    title: "Trả sau",
    subtitle: "Giữ suất ngay 15 phút, thanh toán tại quầy hoặc theo hướng dẫn",
    icon: "clock-outline",
  },
  prepay_transfer: {
    title: "Thanh toán online (VNPAY)",
    subtitle: "Thanh toán qua VNPAY, xác nhận xong là giữ chỗ thành công",
    icon: "credit-card-outline",
  },
};

function OptionRow({
  k,
  active,
  onPress,
}: {
  k: OptionKey;
  active: boolean;
  onPress: () => void;
}) {
  const opt = OPTIONS[k];
  return (
    <List.Item
      onPress={onPress}
      title={opt.title}
      description={opt.subtitle}
      left={(props) => <List.Icon {...props} icon={opt.icon} />}
      right={() => (
        <RadioButton value={k} status={active ? "checked" : "unchecked"} onPress={onPress} />
      )}
      style={{ paddingVertical: 4 }}
      titleStyle={{ fontWeight: "600" }}
      descriptionNumberOfLines={2}
    />
  );
}

export default function PaymentMethodDialog({
  visible,
  value,
  onChange,
  onClose,
  onConfirm,
}: Props) {
  const current = OPTIONS[value]; // 👈 dùng cho “Lưu ý” động
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose} style={{ borderRadius: 16 }}>
        <Dialog.Title>Chọn hình thức thanh toán</Dialog.Title>

        <Dialog.Content style={{ paddingTop: 0 }}>
          <View style={{ borderRadius: 12, overflow: "hidden" }}>
            <OptionRow
              k="pay_later"
              active={value === "pay_later"}
              onPress={() => onChange("pay_later")}
            />
            <Divider />
            <OptionRow
              k="prepay_transfer"
              active={value === "prepay_transfer"}
              onPress={() => onChange("prepay_transfer")}
            />
          </View>

          {/* Lưu ý động theo lựa chọn */}
          <View
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 10,
              backgroundColor: "rgba(98, 0, 238, 0.06)",
            }}
          >
            <Text style={{ fontWeight: "600" }}>Lưu ý</Text>
            <Text style={{ marginTop: 4, opacity: 0.8 }}>
              {current.subtitle}
            </Text>
          </View>
        </Dialog.Content>

        <Dialog.Actions style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Button onPress={onClose} mode="text" style={{ marginRight: 8 }} contentStyle={{ height: 44 }}>
            Hủy
          </Button>
          <Button
            mode="contained"
            onPress={onConfirm}
            contentStyle={{ height: 44, borderRadius: 999 }}
            style={{ borderRadius: 999 }}
          >
            Xác nhận
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
