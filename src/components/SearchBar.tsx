import React from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useIsDark } from '../hooks/useIsDark';
import { Colors, Spacing, Radii, FontSize, Shadows } from '../constants/theme';
import type { SearchSuggestion } from '../api/geocoding';

interface Props {
  query: string;
  results: SearchSuggestion[];
  loading: boolean;
  onChangeText: (text: string) => void;
  onSelect: (item: SearchSuggestion) => void;
  onClear: () => void;
  placeholder?: string;
}

/**
 * Search bar with dropdown suggestions for location search.
 */
export function SearchBar({
  query,
  results,
  loading,
  onChangeText,
  onSelect,
  onClear,
  placeholder = 'Search city or address…',
}: Props) {
  const isDark = useIsDark();
  const thm = isDark ? Colors.dark : Colors.light;

  const showResults = query.length > 0 && (results.length > 0 || loading);

  return (
    <View style={styles.wrapper}>
      {/* Input row */}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: thm.glass,
            borderColor: thm.glassBorder,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={thm.textMuted}
        />
        <TextInput
          style={[styles.input, { color: thm.text }]}
          value={query}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={thm.textMuted}
          autoCorrect={false}
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color={Colors.primary} />}
        {query.length > 0 && !loading && (
          <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="close-circle" size={18} color={thm.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Dropdown */}
      {showResults && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: thm.glassElevated,
              borderColor: thm.glassBorder,
            },
          ]}
        >
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const icon =
                item.type === 'POI'
                  ? 'map-marker'
                  : item.type === 'Geography'
                  ? 'earth'
                  : 'home-map-marker';
              return (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => onSelect(item)}
                  activeOpacity={0.6}
                >
                  <MaterialCommunityIcons
                    name={icon}
                    size={18}
                    color={Colors.primary}
                  />
                  <View style={styles.resultText}>
                    <Text
                      style={[styles.resultName, { color: thm.text }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[styles.resultAddr, { color: thm.textSecondary }]}
                      numberOfLines={1}
                    >
                      {item.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            style={{ maxHeight: 240 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: Spacing.xl + 44,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 100,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radii.xl,
    borderWidth: 1,
    gap: Spacing.sm,
    ...Shadows.lg,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: 4,
  },
  dropdown: {
    marginTop: 8,
    borderRadius: Radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.xl,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  resultAddr: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
});
