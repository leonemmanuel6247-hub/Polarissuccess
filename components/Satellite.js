import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { SIZES, COLORS } from '../styles/globalStyles';

const Satellite = ({ angle, radius }) => {
  const satelliteAngle = angle.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[
      styles.container,
      {
        left: SIZES.CENTER_X,
        top: SIZES.CENTER_Y - 40,
        transform: [{ rotate: satelliteAngle }],
      },
    ]}>
      {/* Point cyan sur l'orbite */}
      <View style={[styles.satellite, {
        left: radius - 6,
        top: -6,
      }]}>
        {/* Halo autour du satellite */}
        <View style={styles.halo} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  satellite: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.CYAN_LIGHT,
  },
  halo: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(112, 226, 255, 0.3)',
    left: -6,
    top: -6,
  },
});

export default Satellite;
