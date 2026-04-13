import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { SIZES, COLORS } from '../styles/globalStyles';

const Etoiles = () => {
  const starsRef = useRef([]);
  const opacityAnims = useRef([]);

  useEffect(() => {
    const newStars = [];
    const newAnims = [];
    const { width, height } = { width: SIZES.WIDTH, height: SIZES.HEIGHT };

    for (let i = 0; i < 150; i++) {
      newStars.push({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
      });
      newAnims.push(new Animated.Value(Math.random() * 0.5 + 0.2));
    }

    starsRef.current = newStars;
    opacityAnims.current = newAnims;

    // Scintillement : chaque étoile pulse indépendamment
    const animations = newAnims.map(anim =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: Math.random() * 0.3 + 0.7,
            duration: Math.random() * 2000 + 1000,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: Math.random() * 0.2 + 0.1,
            duration: Math.random() * 2000 + 1000,
            useNativeDriver: true,
          }),
        ])
      )
    );

    Animated.parallel(animations).start();

    return () => {
      // Nettoyage
      animations.forEach(a => a.stop());
    };
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {starsRef.current.map((star, index) => (
        <Animated.View
          key={star.id}
          style={{
            position: 'absolute',
            left: star.x,
            top: star.y,
            width: star.size,
            height: star.size,
            borderRadius: star.size / 2,
            backgroundColor: COLORS.WHITE,
            opacity: opacityAnims.current[index],
          }}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
});

export default Etoiles;
