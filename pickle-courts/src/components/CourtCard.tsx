import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import type { Court } from '../hooks/useCourts';

type Props = { court: Court; onPress?: () => void };

export default function CourtCard({ court, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={{ marginBottom: 12, padding: 12 }}>
        <Card.Title title={court.name} />
      </Card>
    </TouchableOpacity>
  );
}
