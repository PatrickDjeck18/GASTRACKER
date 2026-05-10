import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleProp, ViewStyle, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  AnimateProps,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export interface AnimatedTouchableProps extends AnimateProps<TouchableOpacityProps> {
  children?: React.ReactNode;
  id?: string;
  hapticFeedback?: 'Light' | 'Medium' | 'Heavy' | 'Success' | 'None';
  scaleTo?: number;
  activeOpacity?: number;
}

export const AnimatedTouchable: React.FC<AnimatedTouchableProps> = ({
  children,
  onPress,
  onPressIn,
  onPressOut,
  style,
  hapticFeedback = 'Light',
  scaleTo = 0.96,
  activeOpacity = 0.85,
  ...props
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = (e: any) => {
    scale.value = withTiming(scaleTo, {
      duration: 100,
      easing: Easing.out(Easing.ease),
    });
    if (onPressIn) onPressIn(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withTiming(1, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    });
    if (onPressOut) onPressOut(e);
  };

  const handlePress = (e: any) => {
    if (Platform.OS !== 'web' && hapticFeedback !== 'None') {
      try {
        switch (hapticFeedback) {
          case 'Heavy':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
            break;
          case 'Medium':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            break;
          case 'Success':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            break;
          case 'Light':
          default:
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            break;
        }
      } catch (err) {
        // Ignore haptic errors on unsupported platforms
      }
    }
    if (onPress) onPress(e);
  };

  return (
    <AnimatedTouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      activeOpacity={activeOpacity}
      style={[animatedStyle, style]}
      {...props}
    >
      {children}
    </AnimatedTouchableOpacity>
  );
};
