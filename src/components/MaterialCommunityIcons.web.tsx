// Web mock for MaterialCommunityIcons
import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: any;
    [key: string]: any;
}

export default function MaterialCommunityIcons({
    name,
    size = 24,
    color = 'black',
    style,
    ...props
}: IconProps) {
    // Simple text-based icon for web
    const iconMap: Record<string, string> = {
        'gas-station': '⛽',
        'map-marker': '📍',
        'home': '🏠',
        'format-list-bulleted': '📋',
        'cash': '💰',
        'cog': '⚙️',
        'chevron-right': '›',
        'magnify': '🔍',
        'close': '✕',
        'menu': '☰',
        'arrow-left': '←',
        'information': 'ℹ️',
        'alert': '⚠️',
        'check': '✓',
    };

    const iconChar = iconMap[name] || '□';

    return (
        <Text
            style={[
                styles.icon,
                { fontSize: size, color },
                style,
            ]}
            {...props}
        >
            {iconChar}
        </Text>
    );
}

const styles = StyleSheet.create({
    icon: {
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'normal',
        textAlign: 'center',
    },
});