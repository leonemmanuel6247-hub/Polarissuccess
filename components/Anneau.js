import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { SIZES } from '../styles/globalStyles';

const Anneau = ({ radius, thickness, angle, color = 'white', duration }) => {
  const rotateInterpolate = angle.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, {
      left: SIZES.CENTER_X - radius,
      top: SIZES.CENTER_Y - radius - 40,
    }]}>
      {/* Anneau complet (cercle blanc fin) */}
      <View style={[styles.anneauComplet, {
        width: radius * 2,
        height: radius * 2,
        borderRadius: radius,
        borderWidth: thickness,
        borderColor: 'rgba(255,255,255,0.3)',
      }]} />

      {/* Arc lumineux rotatif */}
      <Animated.View style={[styles.arcContainer, {
        width: radius * 2,
        height: radius * 2,
        transform: [{ rotate: rotateInterpolate }],
      }]}>
        <View style={[styles.lightArc, {
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          borderWidth: thickness + 1,
          borderColor: color,
        }]} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  anneauComplet: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  arcContainer: {
    position: 'absolute',
  },
  lightArc: {
    position: 'absolute',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'white',
    borderBottomColor: 'transparent',
    borderStyle: 'solid',
  },
});

export default Anneau;
