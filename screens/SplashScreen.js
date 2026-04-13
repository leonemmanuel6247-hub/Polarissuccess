import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Etoiles from '../components/Etoiles';
import Orbe from '../components/Orbe';
import Anneau from '../components/Anneau';
import Satellite from '../components/Satellite';
import { SIZES, COLORS } from '../styles/globalStyles';

const SplashScreen = ({ onFinish }) => {
  const [timeLeft, setTimeLeft] = useState(5);
  const [showFlash, setShowFlash] = useState(false);

  // Animations des anneaux (Animated.Value de 0 à 360)
  const angleAnneau1 = useRef(new Animated.Value(0)).current;  // 4s/tour
  const angleAnneau2 = useRef(new Animated.Value(0)).current;  // 2.5s/tour
  const angleAnneau3 = useRef(new Animated.Value(0)).current;  // 1s/tour

  // Pulsation du texte
  const textPulse = useRef(new Animated.Value(0.6)).current;

  // Flash de sortie
  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation anneau 1 : 4 secondes/tour
    Animated.loop(
      Animated.timing(angleAnneau1, {
        toValue: 360,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();

    // Animation anneau 2 : 2.5 secondes/tour
    Animated.loop(
      Animated.timing(angleAnneau2, {
        toValue: 360,
        duration: 2500,
        useNativeDriver: true,
      })
    ).start();

    // Animation anneau 3 : 1 seconde/tour
    Animated.loop(
      Animated.timing(angleAnneau3, {
        toValue: 360,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();

    // Pulsation du texte : cycle de 3 secondes
    Animated.loop(
      Animated.sequence([
        Animated.timing(textPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(textPulse, {
          toValue: 0.6,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Compte à rebours : 5 → 0
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Déclencher le flash
          setShowFlash(true);
          Animated.timing(flashOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();

          // ⚠️ FORCER la transition après 500ms (au cas où l'animation échoue)
          setTimeout(() => {
            onFinish();
          }, 500);

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Étoiles scintillantes */}
      <Etoiles />

      {/* Anneau 3 : externe (1s/tour) */}
      <Anneau
        radius={SIZES.ANNEAU3_RADIUS}
        thickness={1}
        angle={angleAnneau3}
        color="rgba(255,255,255,0.5)"
        duration={1000}
      />

      {/* Anneau 2 : médian (2.5s/tour) */}
      <Anneau
        radius={SIZES.ANNEAU2_RADIUS}
        thickness={1.5}
        angle={angleAnneau2}
        color="rgba(255,255,255,0.7)"
        duration={2500}
      />

      {/* Satellite sur l'anneau 2 */}
      <Satellite angle={angleAnneau2} radius={SIZES.ANNEAU2_RADIUS} />

      {/* Anneau 1 : interne (4s/tour) */}
      <Anneau
        radius={SIZES.ANNEAU1_RADIUS}
        thickness={2}
        angle={angleAnneau1}
        color="rgba(255,255,255,0.9)"
        duration={4000}
      />

      {/* Orbe central avec rotation */}
      <Orbe />

      {/* Texte pulsant */}
      <Animated.View style={[styles.textContainer, { opacity: textPulse }]}>
        <Text style={styles.text}>SUCCESS POLARIS</Text>
      </Animated.View>

      {/* Compteur */}
      <View style={styles.counterContainer}>
        <Text style={styles.counter}>{timeLeft}</Text>
      </View>

      {/* Flash blanc de sortie */}
      {showFlash && (
        <Animated.View style={[styles.flash, { opacity: flashOpacity }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BLACK,
  },
  textContainer: {
    position: 'absolute',
    bottom: SIZES.HEIGHT * 0.15,
    width: '100%',
    alignItems: 'center',
  },
  text: {
    color: COLORS.WHITE,
    fontSize: SIZES.TEXT_SIZE,
    fontWeight: 'bold',
    letterSpacing: SIZES.TEXT_SIZE * 0.15,
  },
  counterContainer: {
    position: 'absolute',
    bottom: SIZES.HEIGHT * 0.08,
    width: '100%',
    alignItems: 'center',
  },
  counter: {
    color: COLORS.CYAN,
    fontSize: 18,
    fontWeight: '300',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.WHITE,
    zIndex: 999,
  },
});

export default SplashScreen;
