import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from './screens/SplashScreen';
import AstarteScreen from './screens/AstarteScreen';
import InscriptionScreen from './screens/InscriptionScreen';
import BibliothequeScreen from './screens/BibliothequeScreen';

export default function App() {
  const [currentPage, setCurrentPage] = useState('splash');
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);

  console.log('[APP] currentPage:', currentPage, '| checking:', checking, '| user:', user?.nom);

  // Vérifier si l'utilisateur existe déjà au lancement
  useEffect(() => {
    const checkUser = async () => {
      try {
        console.log('[APP] Vérification utilisateur existant...');
        const userData = await AsyncStorage.getItem('user_data');
        console.log('[APP] user_data brut:', userData);
        if (userData) {
          const parsedUser = JSON.parse(userData);
          console.log('[APP] Utilisateur trouvé:', parsedUser.nom, parsedUser.email);
          setUser(parsedUser);
          setCurrentPage('bibliotheque');
        } else {
          console.log('[APP] Nouvel utilisateur → splash');
          setCurrentPage('splash');
        }
      } catch (err) {
        console.error('[APP] ERREUR checkUser:', err.message);
        setCurrentPage('splash');
      }
      setChecking(false);
    };
    checkUser();
  }, []);

  const handleSplashFinish = () => {
    console.log('[APP] Splash terminé → astarte');
    setCurrentPage('astarte');
  };

  const handleAstarteNext = () => {
    console.log('[APP] Astarte terminé → inscription');
    setCurrentPage('inscription');
  };

  const handleLoginSuccess = (loggedInUser) => {
    console.log('[APP] Inscription réussie → bibliothèque, user:', loggedInUser.nom);
    setUser(loggedInUser);
    setCurrentPage('bibliotheque');
  };

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#00D4FF" />
      </View>
    );
  }

  if (currentPage === 'splash') {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (currentPage === 'astarte') {
    return <AstarteScreen onNext={handleAstarteNext} />;
  }

  if (currentPage === 'inscription') {
    return <InscriptionScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentPage === 'bibliotheque' && user) {
    return <BibliothequeScreen user={user} />;
  }

  return null;
}
