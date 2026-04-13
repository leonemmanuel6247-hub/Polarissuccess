import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, SIZES } from '../styles/globalStyles';

const AstarteScreen = ({ onNext }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Fondu enchaîné : opacité 0 → 1
    // Zoom doux : échelle 0.9 → 1
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Timer : 2 secondes puis transition vers PAGE 3
    const timer = setTimeout(() => {
      onNext();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        {/* Trait décoratif supérieur */}
        <View style={styles.divider} />

        {/* Titre principal */}
        <Text style={styles.title}>STUDIO ASTARTÉ</Text>

        {/* Trait décoratif inférieur */}
        <View style={styles.divider} />

        {/* Sous-titre */}
        <Text style={styles.subtitle}>Créateur de Success Polaris</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: SIZES.TEXT_SIZE * 1.2,
    fontWeight: 'bold',
    color: COLORS.SKY_BLUE,
    letterSpacing: SIZES.TEXT_SIZE * 0.08,
    textAlign: 'center',
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: COLORS.SKY_BLUE,
    marginTop: 20,
    marginBottom: 20,
    opacity: 0.5,
  },
  subtitle: {
    fontSize: SIZES.TEXT_SIZE * 0.5,
    color: '#999',
    textAlign: 'center',
  },
});

export default AstarteScreen;
