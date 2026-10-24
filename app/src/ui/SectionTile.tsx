import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { border, colors, pressed, radius, Section, size, space, type } from '../theme';

type Props = {
  section: Section;
  title: string;
  count: number;
  icon: ComponentProps<typeof Feather>['name'];
  onPress: () => void;
};

export function SectionTile({ section, title, count, icon, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${count}`}
      onPress={onPress}
      style={({ pressed: p }) => [s.tile, { backgroundColor: colors[section].fill, opacity: p ? pressed : 1 }]}
    >
      <Feather name={icon} size={size.iconBar} color={colors.ink} />
      <Text style={type.bodyStrong}>{title}</Text>
      <Text style={type.meta}>{count}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 104,
    padding: space.m,
    gap: space.xs,
    justifyContent: 'flex-end',
    borderRadius: radius.tile,
    borderWidth: border.width,
    borderColor: border.color,
  },
});
