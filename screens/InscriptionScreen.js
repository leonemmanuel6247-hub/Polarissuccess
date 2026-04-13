import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SIZES, FONTS } from '../styles/globalStyles';

const API_URL = 'https://script.google.com/macros/s/AKfycbwvKIdck_vTma2WoKty3lVLSym4aFA3uebCXhbFZU_q_yKzbY30srxVK6c1ob-JM1HJ5g/exec?action=documents';

const InscriptionScreen = ({ onLoginSuccess }) => {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [pays, setPays] = useState('');
  const [loading, setLoading] = useState(false);
  const [ip, setIp] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [nomError, setNomError] = useState(false);

  // Animations d'apparition (CSV Page 3)
  const logoFade = useRef(new Animated.Value(0)).current;
  const titreFade = useRef(new Animated.Value(0)).current;
  const sousTitreFade = useRef(new Animated.Value(0)).current;
  const champNomTrans = useRef(new Animated.Value(20)).current;
  const champEmailTrans = useRef(new Animated.Value(20)).current;
  const champPaysTrans = useRef(new Animated.Value(20)).current;
  const boutonFade = useRef(new Animated.Value(0)).current;
  const boutonScale = useRef(new Animated.Value(0.95)).current;
  const noteFade = useRef(new Animated.Value(0)).current;
  const infosFade = useRef(new Animated.Value(0)).current;

  // Capture IP et Device ID au chargement
  useEffect(() => {
    console.log('[INSCRIPTION] Composant monté');
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => {
        console.log('[INSCRIPTION] IP reçue:', data.ip);
        setIp(data.ip);
      })
      .catch((err) => {
        console.warn('[INSCRIPTION] ⚠️ IP non récupérée:', err.message);
        setIp('0.0.0.0');
      });

    getOrCreateDeviceId();
    console.log('[INSCRIPTION] Device ID généré');

    //Animations d'apparition séquencées (CSV Page 3)
    console.log('[INSCRIPTION] 🎬 Animations lancées');
    Animated.parallel([
      Animated.timing(logoFade, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(titreFade, { toValue: 1, duration: 800, delay: 100, useNativeDriver: true }),
      Animated.timing(sousTitreFade, { toValue: 1, duration: 800, delay: 200, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(300),
      Animated.spring(champNomTrans, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(400),
      Animated.spring(champEmailTrans, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(500),
      Animated.spring(champPaysTrans, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(700),
      Animated.timing(boutonFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(900),
      Animated.spring(boutonScale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(1000),
      Animated.timing(noteFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(1200),
      Animated.timing(infosFade, { toValue: 0.5, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const getOrCreateDeviceId = async () => {
    let id = await AsyncStorage.getItem('device_id');
    if (!id) {
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
      await AsyncStorage.setItem('device_id', id);
    }
    setDeviceId(id);
  };

  // Regex email
  const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;

  // Validation email en temps réel
  const isValidEmail = (text) => {
    setEmail(text);
    setEmailError(!emailRegex.test(text) && text.length > 0);
  };

  // Validation nom en temps réel
  const handleNomChange = (text) => {
    setNom(text);
    setNomError(false);
  };

  const handleSubmit = async () => {
    console.log('[INSCRIPTION] handleSubmit appelé');
    console.log('[INSCRIPTION] nom:', nom, '| email:', email, '| pays:', pays);

    let hasError = false;

    if (!nom.trim()) {
      console.log('[INSCRIPTION] ❌ Nom vide');
      setNomError(true);
      hasError = true;
    }
    if (!email.trim()) {
      console.log('[INSCRIPTION] ❌ Email vide');
      setEmailError(true);
      hasError = true;
    } else if (!emailRegex.test(email.trim())) {
      console.log('[INSCRIPTION] ❌ Email invalide:', email);
      setEmailError(true);
      hasError = true;
    }

    if (hasError) {
      console.log('[INSCRIPTION] Formulaire invalide, arrêt');
      return;
    }

    console.log('[INSCRIPTION] Formulaire valide, envoi...');
    setLoading(true);

    const userData = {
      nom: nom.trim(),
      email: email.trim().toLowerCase(),
      pays: pays.trim() || 'Non spécifié',
      ip: ip,
      device_id: deviceId,
    };

    try {
      // Envoi POST à l'API Google Apps Script
      console.log('[INSCRIPTION] Envoi API vers:', API_URL);
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(userData),
      });

      console.log('[INSCRIPTION] Réponse reçue, status:', response.status);
      console.log('[INSCRIPTION] Données envoyées:', userData);

      // Stockage local
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));
      console.log('[INSCRIPTION] ✅ user_data stocké localement');

      // Navigation directe vers la bibliothèque
      console.log('[INSCRIPTION] → Navigation vers Bibliothèque');
      setLoading(false);
      onLoginSuccess(userData);
    } catch (error) {
      console.error('[INSCRIPTION] ❌ Erreur envoi:', error.message, error.stack);
      // Quand même essayer de naviguer avec les données locales
      console.log('[INSCRIPTION] → Navigation locale (hors ligne)');
      setLoading(false);
      onLoginSuccess(userData);
    }

    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Logo */}
        <Animated.View style={{ opacity: logoFade }}>
          <Text style={styles.logo}>✨</Text>
        </Animated.View>

        {/* Titre */}
        <Animated.View style={{ opacity: titreFade }}>
          <Text style={styles.title}>SUCCESS POLARIS</Text>
        </Animated.View>

        {/* Sous-titre */}
        <Animated.View style={{ opacity: sousTitreFade }}>
          <Text style={styles.subtitle}>Créez votre compte</Text>
        </Animated.View>

        {/* Formulaire */}
        <View style={styles.form}>
          {/* Champ Nom */}
          <Animated.View style={[styles.inputWrapper, {
            transform: [{ translateY: champNomTrans }],
            borderColor: nomError ? COLORS.RED : '#333',
          }]}>
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom complet"
              placeholderTextColor="#888"
              value={nom}
              onChangeText={handleNomChange}
            />
          </Animated.View>

          {/* Champ Email */}
          <Animated.View style={[styles.inputWrapper, {
            transform: [{ translateY: champEmailTrans }],
            borderColor: emailError ? COLORS.RED : '#333',
          }]}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#888"
              value={email}
              onChangeText={isValidEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Animated.View>

          {/* Champ Pays */}
          <Animated.View style={[styles.inputWrapper, {
            transform: [{ translateY: champPaysTrans }],
          }]}>
            <Text style={styles.inputIcon}>🌍</Text>
            <TextInput
              style={styles.input}
              placeholder="Pays (optionnel)"
              placeholderTextColor="#888"
              value={pays}
              onChangeText={setPays}
            />
          </Animated.View>

          {/* Bouton */}
          <Animated.View style={{
            opacity: boutonFade,
            transform: [{ scale: boutonScale }],
          }}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>COMMENCER L'AVENTURE</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Note légale */}
        <Animated.View style={{ opacity: noteFade }}>
          <Text style={styles.legalNote}>
            En continuant, vous acceptez que vos informations soient sécurisées
          </Text>
        </Animated.View>

        {/* Infos techniques */}
        <Animated.View style={[styles.hiddenInfo, { opacity: infosFade }]}>
          <Text style={styles.hiddenText}>IP: {ip}</Text>
          <Text style={styles.hiddenText}>Device ID: {deviceId ? deviceId.substring(0, 12) + '...' : ''}</Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BLACK,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    fontSize: 60,
    textAlign: 'center',
    marginBottom: 10,
  },
  title: {
    ...FONTS.TITLE,
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    ...FONTS.SUBTITLE,
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputIcon: {
    fontSize: 20,
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    paddingRight: 15,
    color: COLORS.WHITE,
    fontSize: 16,
  },
  button: {
    backgroundColor: COLORS.CYAN,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  legalNote: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  hiddenInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  hiddenText: {
    color: '#444',
    fontSize: 10,
    marginHorizontal: 10,
  },
});

export default InscriptionScreen;
