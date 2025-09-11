import React from 'react';
import { Dialog, Portal, TextInput, Button } from 'react-native-paper';

type Props = {
  visible: boolean;
  mode: 'book' | 'edit';
  draftNote: string;
  setDraftNote: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void; // Đặt hoặc Lưu
};

export default function NoteDialog({ visible, mode, draftNote, setDraftNote, onClose, onSubmit }: Props) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose}>
        <Dialog.Title>{mode === 'book' ? 'Ghi chú khi đặt sân' : 'Sửa ghi chú'}</Dialog.Title>
        <Dialog.Content>
          <TextInput
            placeholder="Ví dụ: mang thêm bóng, 4 người..."
            value={draftNote}
            onChangeText={setDraftNote}
            multiline
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onClose}>Đóng</Button>
          <Button onPress={onSubmit}>{mode === 'book' ? 'Đặt' : 'Lưu'}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
