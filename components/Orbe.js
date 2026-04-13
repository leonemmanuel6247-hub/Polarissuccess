import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { SIZES, COLORS } from '../styles/globalStyles';

const Orbe = () => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Rotation sur axe Y : 12 secondes/tour
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 12000,
        useNativeDriver: true,
      })
    ).start();
  }, [rotateAnim]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, {
      left: SIZES.CENTER_X - SIZES.ORBE_RADIUS,
      top: SIZES.CENTER_Y - SIZES.ORBE_RADIUS - 40,
    }]}>
      {/* Halo externe */}
      <View style={[styles.glow, {
        width: SIZES.ORBE_RADIUS * 2 + 8,
        height: SIZES.ORBE_RADIUS * 2 + 8,
        borderRadius: SIZES.ORBE_RADIUS + 4,
      }]} />
      {/* Orbe principal avec rotation */}
      <Animated.View style={[styles.orbe, {
        width: SIZES.ORBE_RADIUS * 2,
        height: SIZES.ORBE_RADIUS * 2,
        borderRadius: SIZES.ORBE_RADIUS,
        transform: [{ rotateY: rotateInterpolate }],
      }]}>
        {/* Reflet interne */}
        <View style={[styles.innerGlow, {
          width: SIZES.ORBE_RADIUS * 1.2,
          height: SIZES.ORBE_RADIUS * 1.2,
          borderRadius: SIZES.ORBE_RADIUS * 0.6,
          left: SIZES.ORBE_RADIUS * 0.4,
          top: SIZES.ORBE_RADIUS * 0.4,
        }]} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute' },
  glow: {
    position: 'absolute',
    backgroundColor: COLORS.CYAN,
    opacity: 0.5,
  },
  orbe: {
    backgroundColor: COLORS.CYAN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(128, 200, 255, 0.9)',
  },
});

export default Orbe;
