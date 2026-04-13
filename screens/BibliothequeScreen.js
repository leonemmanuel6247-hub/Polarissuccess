import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  Modal, ScrollView, ActivityIndicator, Animated, RefreshControl, Alert, Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';
import { COLORS, SIZES, FONTS } from '../styles/globalStyles';

const API_URL = 'https://script.google.com/macros/s/AKfycbwvKIdck_vTma2WoKty3lVLSym4aFA3uebCXhbFZU_q_yKzbY30srxVK6c1ob-JM1HJ5g/exec';

const DOCUMENT_ICONS = {
  'Maths': '📄',
  'Mathématiques': '📄',
  'Physique': '📄',
  'Physique-Chimie': '📄',
  'Anglais': '📘',
  'Philosophie': '📙',
  'Philo': '📙',
  'SVT': '📕',
  'Histoire': '📗',
  'Géographie': '📗',
  'Géo': '📗',
  'Français': '📓',
  'default': '📄',
};

function getDocumentIcon(sousCategorie) {
  if (!sousCategorie) return DOCUMENT_ICONS.default;
  for (const [key, icon] of Object.entries(DOCUMENT_ICONS)) {
    if (key === 'default') continue;
    if (sousCategorie.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return DOCUMENT_ICONS.default;
}

export default function BibliothequeScreen({ user }) {
  // État des données
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtres
  const [searchText, setSearchText] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState('TOUS');
  const [selectedSousCategorie, setSelectedSousCategorie] = useState('TOUS');
  const [offlineMode, setOfflineMode] = useState(false);

  // Menu hamburger
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedTerminal, setSelectedTerminal] = useState(null);
  const menuSlideAnim = useRef(new Animated.Value(-300)).current;

  // Favoris
  const [favorites, setFavorites] = useState([]);

  // Téléchargement silencieux en arrière-plan
  const [backgroundDownload, setBackgroundDownload] = useState({
    active: false,
    progress: 0,
    total: 0,
    downloaded: 0,
  });

  // 🤖 Assistant IA — WebView
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [webViewLoading, setWebViewLoading] = useState(false);
  const [webViewError, setWebViewError] = useState(false);
  const aiWebViewRef = useRef(null);

  // Modal lecteur
  const [modalVisible, setModalVisible] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError] = useState(null);
  const [cachedForOffline, setCachedForOffline] = useState(false);
  const [localPdfUri, setLocalPdfUri] = useState(null);
  const [downloadComplete, setDownloadComplete] = useState(false);

  // Toast bienvenue
  const [showWelcome, setShowWelcome] = useState(true);
  const welcomeOpacity = useRef(new Animated.Value(1)).current;

  // État du WebView
  const [webViewReady, setWebViewReady] = useState(false);
  const webViewRef = useRef(null);

  // Données utilisateur
  const userName = user?.nom || 'Utilisateur';

  console.log('[BIBLIO] Rendu, user:', userName, '| loading:', loading, '| docs:', documents.length);

  // ── Chargement initial ──
  useEffect(() => {
    console.log('[BIBLIO] Montage du composant...');
    loadDocuments();
    loadFavorites();
    animateWelcomeToast();
  }, []);

  // ── Toast bienvenue disparaît après 2s ──
  const animateWelcomeToast = () => {
    console.log('[BIBLIO] Toast bienvenue lancé pour', userName);
    Animated.sequence([
      Animated.delay(2000),
      Animated.timing(welcomeOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => setShowWelcome(false));
  };

  // ── Charger les documents ──
  const loadDocuments = async () => {
    try {
      console.log('[BIBLIO] Chargement documents...');
      // Vérifier le cache
      const cached = await AsyncStorage.getItem('documents_cache');
      const cacheDate = await AsyncStorage.getItem('documents_cache_date');
      console.log('[BIBLIO] Cache:', cached ? cached.length + ' chars' : 'aucun', '| date:', cacheDate);

      if (cached && cacheDate) {
        const daysSinceSync = (Date.now() - parseInt(cacheDate)) / (1000 * 60 * 60 * 24);
        console.log('[BIBLIO] Jours depuis synchro:', daysSinceSync.toFixed(1));
        if (daysSinceSync < 7) {
          console.log('[BIBLIO] Utilisation du cache');
          const parsed = JSON.parse(cached);
          setDocuments(parsed);
          setLoading(false);
          // Lancer le téléchargement silencieux des PDFs en arrière-plan
          downloadAllDocumentsInBackground(parsed);
          return;
        }
      }

      // Appel API
      console.log('[BIBLIO] Appel API GET...');
      const response = await fetch(`${API_URL}?action=documents`);
      console.log('[BIBLIO] Réponse API status:', response.status);
      const text = await response.text();
      console.log('[BIBLIO] Réponse API brute (100 premiers chars):', text.substring(0, 100));
      const result = JSON.parse(text);
      console.log('[BIBLIO] Résultat API:', result.success, '| count:', result.count);

      if (result.success && result.data) {
        setDocuments(result.data);
        console.log('[BIBLIO] Documents chargés:', result.data.length);
        // Mettre en cache les métadonnées
        await AsyncStorage.setItem('documents_cache', JSON.stringify(result.data));
        await AsyncStorage.setItem('documents_cache_date', Date.now().toString());
        // Lancer le téléchargement silencieux des PDFs en arrière-plan
        downloadAllDocumentsInBackground(result.data);
      }
    } catch (error) {
      console.error('[BIBLIO] ERREUR chargement documents:', error.message);
      console.error('[BIBLIO] Stack:', error.stack);
      // Utiliser le cache en cas d'erreur
      try {
        const cached = await AsyncStorage.getItem('documents_cache');
        if (cached) {
          console.log('[BIBLIO] Fallback sur cache');
          const parsed = JSON.parse(cached);
          setDocuments(parsed);
          // Lancer le téléchargement silencieux même en mode hors ligne
          downloadAllDocumentsInBackground(parsed);
        }
      } catch (e) {
        console.error('[BIBLIO] ERREUR fallback cache:', e.message);
      }
    }

    setLoading(false);
    console.log('[BIBLIO] Loading terminé, docs:', documents.length);
  };

  // ── Téléchargement silencieux de TOUS les PDFs en arrière-plan ──
  const downloadAllDocumentsInBackground = async (docs) => {
    try {
      console.log('[BIBLIO] 🚀 Démarrage téléchargement silencieux des PDFs...');

      const cacheDir = FileSystem.cacheDirectory + 'successpolaris_docs/';
      const dirInfo = await FileSystem.getInfoAsync(cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      }

      // Vérifier quels documents sont déjà en cache
      const docsToDownload = [];
      for (const doc of docs) {
        const safeName = doc.titre.replace(/[^a-zA-Z0-9àâéèêëïîôùûüÿçœæ-]/g, '_').substring(0, 50);
        const fileName = `${doc.id}_${safeName}.pdf`;
        const localUri = cacheDir + fileName;
        const fileInfo = await FileSystem.getInfoAsync(localUri);

        // Télécharger si pas en cache ou fichier trop petit
        if (!fileInfo.exists || fileInfo.size < 500) {
          docsToDownload.push({ ...doc, localUri });
        }
      }

      if (docsToDownload.length === 0) {
        console.log('[BIBLIO] ✅ Tous les PDFs sont déjà en cache');
        setBackgroundDownload({ active: false, progress: 100, total: docs.length, downloaded: docs.length });
        return;
      }

      console.log(`[BIBLIO] 📥 ${docsToDownload.length}/${docs.length} PDFs à télécharger...`);

      // Télécharger les documents un par un
      setBackgroundDownload({
        active: true,
        progress: 0,
        total: docs.length,
        downloaded: docs.length - docsToDownload.length,
      });

      for (let i = 0; i < docsToDownload.length; i++) {
        const doc = docsToDownload[i];

        // Extraire le File ID Google Drive
        const fileIdMatch = doc.lien.match(/\/d\/([^/]+)/);
        if (!fileIdMatch) continue;

        const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;

        try {
          const downloadResumable = FileSystem.createDownloadResumable(
            downloadUrl,
            doc.localUri,
            {}
          );

          const result = await downloadResumable.downloadAsync();

          if (result && result.uri) {
            const info = await FileSystem.getInfoAsync(result.uri);
            if (info.size > 500) {
              console.log(`[BIBLIO] ✅ [${i + 1}/${docsToDownload.length}] ${doc.titre}`);
            } else {
              await FileSystem.deleteAsync(result.uri, { idempotent: true });
              console.warn(`[BIBLIO] ⚠️ Fichier trop petit: ${doc.titre}`);
            }
          }
        } catch (err) {
          console.warn(`[BIBLIO] ⚠️ Erreur téléchargement ${doc.titre}:`, err.message);
        }

        // Mettre à jour la progression
        const downloadedCount = docs.length - docsToDownload.length + i + 1;
        const progress = Math.round((downloadedCount / docs.length) * 100);
        setBackgroundDownload({
          active: true,
          progress,
          total: docs.length,
          downloaded: downloadedCount,
        });
      }

      console.log('[BIBLIO] ✅ Téléchargement silencieux terminé !');
      setBackgroundDownload(prev => ({ ...prev, active: false }));

      // Sauvegarder l'état du cache
      await AsyncStorage.setItem('pdf_cache_ready', 'true');
    } catch (error) {
      console.error('[BIBLIO] ERREUR téléchargement silencieux:', error.message);
      setBackgroundDownload({ active: false, progress: 0, total: 0, downloaded: 0 });
    }
  };

  // ── Pull to refresh ──
  const onRefresh = async () => {
    console.log('[BIBLIO] Pull-to-refresh...');
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  // ── Charger les favoris ──
  const loadFavorites = async () => {
    try {
      const favs = await AsyncStorage.getItem('offline_documents');
      console.log('[BIBLIO] Favoris chargés:', favs ? JSON.parse(favs).length : 0);
      if (favs) setFavorites(JSON.parse(favs));
    } catch (error) {
      console.error('[BIBLIO] ERREUR chargement favoris:', error.message);
    }
  };

  // ── Sauvegarder un favori ──
  const toggleFavorite = async (docId) => {
    let newFavorites;
    if (favorites.includes(docId)) {
      newFavorites = favorites.filter(id => id !== docId);
    } else {
      newFavorites = [...favorites, docId];
    }
    setFavorites(newFavorites);
    await AsyncStorage.setItem('offline_documents', JSON.stringify(newFavorites));
  };

  // ── Ouvrir/Fermer le menu hamburger ──
  const toggleMenu = () => {
    if (menuVisible) {
      Animated.timing(menuSlideAnim, {
        toValue: -300,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setMenuVisible(false));
    } else {
      setMenuVisible(true);
      Animated.timing(menuSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  // ── Sélectionner un terminal dans le menu ──
  const selectTerminal = (terminal) => {
    setSelectedTerminal(terminal);
    setSelectedCategorie(terminal);
    setSelectedSousCategorie('TOUS');
    toggleMenu();
  };

  // ── Réinitialiser les filtres (TOUS) ──
  const resetFilters = () => {
    setSelectedTerminal(null);
    setSelectedCategorie('TOUS');
    setSelectedSousCategorie('TOUS');
    toggleMenu();
  };

  // ── Obtenir les terminaux uniques (catégories principales) ──
  const terminaux = [...new Set(documents.map(d => d.categorie).filter(Boolean))].sort();

  // ── Obtenir les matières pour un terminal donné ──
  const getMatieresForTerminal = (terminal) => {
    if (!terminal) return [];
    return [...new Set(
      documents
        .filter(d => d.categorie === terminal)
        .map(d => d.sousCategorie)
        .filter(Boolean)
    )].sort();
  };

  // ═══════════════════════════════════════════
  // 🤖 ASSISTANT IA — WebView
  // ═══════════════════════════════════════════

  // Ouvrir l'IA dans une WebView intégrée
  const openAIChat = () => {
    setAiModalVisible(true);
    setWebViewLoading(true);
    setWebViewError(false);
  };

  // ── Ouvrir un document : télécharger puis afficher local ──
  const openDocument = async (doc) => {
    setCurrentDocument(doc);
    setModalVisible(true);
    setDownloadProgress(0);
    setCachedForOffline(false);
    setDownloadError(null);
    setLocalPdfUri(null);
    setDownloadComplete(false);
    setWebViewReady(false);
    trackDocumentRead(doc);
    await downloadDocument(doc);
  };

  // Envoyer le PDF au WebView quand il est prêt
  useEffect(() => {
    if (webViewReady && localPdfUri && webViewRef.current) {
      console.log('[BIBLIO] WebView prêt, chargement du PDF local...');
      webViewRef.current.injectJavaScript(`
        window.location.href = 'file://${localPdfUri}';
      `);
    }
  }, [webViewReady, localPdfUri]);

  // ── Télécharger le fichier et le stocker en cache ──
  const downloadDocument = async (doc) => {
    try {
      console.log('[BIBLIO] Téléchargement document:', doc.titre);

      const cacheDir = FileSystem.cacheDirectory + 'successpolaris_docs/';
      const dirInfo = await FileSystem.getInfoAsync(cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      }

      const safeName = doc.titre.replace(/[^a-zA-Z0-9àâéèêëïîôùûüÿçœæ-]/g, '_').substring(0, 50);
      const fileName = `${doc.id}_${safeName}.pdf`;
      const localUri = cacheDir + fileName;

      console.log('[BIBLIO] Chemin local:', localUri);

      // Vérifier si déjà en cache
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists && fileInfo.size > 500) {
        console.log('[BIBLIO] Déjà en cache, ouverture directe');
        setLocalPdfUri(localUri);
        setDownloadProgress(100);
        setCachedForOffline(true);
        setDownloadComplete(true);
        return;
      }

      // Convertir URL Google Drive en URL de téléchargement direct
      let downloadUrl = doc.lien;
      const fileIdMatch = doc.lien.match(/\/d\/([^/]+)/);
      if (fileIdMatch) {
        downloadUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
        console.log('[BIBLIO] File ID:', fileIdMatch[1]);
      }
      console.log('[BIBLIO] URL download:', downloadUrl);

      // Télécharger
      setDownloadProgress(1);
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        localUri,
        {},
        (dp) => {
          const progress = (dp.totalBytesWritten / dp.totalBytesExpectedToWrite) * 100;
          setDownloadProgress(Math.round(progress));
        }
      );

      const result = await downloadResumable.downloadAsync();

      if (result && result.uri) {
        const info = await FileSystem.getInfoAsync(result.uri);
        console.log('[BIBLIO] Taille:', info.size, 'octets');

        if (info.size > 500) {
          console.log('[BIBLIO] ✅ Document téléchargé et mis en cache');
          setLocalPdfUri(result.uri);
          setDownloadProgress(100);
          setCachedForOffline(true);
          setDownloadComplete(true);
        } else {
          await FileSystem.deleteAsync(result.uri, { idempotent: true });
          console.error('[BIBLIO] Fichier trop petit = erreur HTML');
          setDownloadError('Impossible de télécharger. Vérifiez votre connexion.');
          return;
        }
      } else {
        console.error('[BIBLIO] Échec téléchargement:', result);
        setDownloadError('Le téléchargement a échoué.');
        return;
      }
    } catch (error) {
      console.error('[BIBLIO] ERREUR:', error.message, error.stack);
      setDownloadError('Erreur: ' + error.message);
    }
  };

  // ── Tracking lecture ──
  const trackDocumentRead = async (doc) => {
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'read_document',
          document_id: doc.id,
          document_titre: doc.titre,
          email: user?.email,
          device_id: user?.device_id,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Erreur tracking:', error);
    }
  };

  // ── Filtrer les documents ──
  const getFilteredDocuments = () => {
    let filtered = [...documents];

    // Mode hors-ligne
    if (offlineMode) {
      filtered = filtered.filter(doc => favorites.includes(doc.id));
    }

    // Recherche
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.titre.toLowerCase().includes(search) ||
        doc.categorie.toLowerCase().includes(search) ||
        doc.sousCategorie.toLowerCase().includes(search)
      );
    }

    // Filtre catégorie
    if (selectedCategorie !== 'TOUS') {
      filtered = filtered.filter(doc => doc.categorie === selectedCategorie);
    }

    // Filtre sous-catégorie
    if (selectedSousCategorie !== 'TOUS') {
      filtered = filtered.filter(doc => doc.sousCategorie === selectedSousCategorie);
    }

    return filtered;
  };

  // ── Catégories disponibles ──
  const categories = ['TOUS', ...new Set(documents.map(d => d.categorie).filter(Boolean))];

  // ── Sous-catégories disponibles ──
  const sousCategories = selectedCategorie === 'TOUS'
    ? ['TOUS', ...new Set(documents.map(d => d.sousCategorie).filter(Boolean))]
    : ['TOUS', ...new Set(documents.filter(d => d.categorie === selectedCategorie).map(d => d.sousCategorie).filter(Boolean))];

  // ── Rendu d'une carte document ──
  const renderCard = ({ item }) => {
    const isFavorite = favorites.includes(item.id);
    const icon = getDocumentIcon(item.sousCategorie);

    return (
      <TouchableOpacity style={styles.card} onPress={() => openDocument(item)}>
        <View style={styles.cardIconContainer}>
          <Text style={styles.cardIcon}>{icon}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.titre}</Text>
        <Text style={styles.cardCategorie}>{item.categorie}</Text>
        <Text style={styles.cardSousCategorie}>{item.sousCategorie ? `> ${item.sousCategorie}` : ''}</Text>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item.id)}
        >
          <Text style={styles.favoriteIcon}>{isFavorite ? '⭐' : '☆'}</Text>
          <Text style={[styles.favoriteText, isFavorite && styles.favoriteTextActive]}>
            {isFavorite ? 'Sauvegardé' : 'Sauvegarder'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // ── Rendu puce filtre catégorie ──
  const renderCategoriePill = (cat) => (
    <TouchableOpacity
      key={cat}
      style={[
        styles.pill,
        selectedCategorie === cat && styles.pillActive,
      ]}
      onPress={() => {
        setSelectedCategorie(cat);
        setSelectedSousCategorie('TOUS');
      }}
    >
      <Text style={[
        styles.pillText,
        selectedCategorie === cat && styles.pillTextActive,
      ]}>
        {cat === 'TOUS' ? 'TOUS' : cat}
      </Text>
      {selectedCategorie === cat && <Text style={styles.pillCheck}> ✓</Text>}
    </TouchableOpacity>
  );

  // ── Rendu puce filtre sous-catégorie ──
  const renderSousCategoriePill = (sub) => (
    <TouchableOpacity
      key={sub}
      style={[
        styles.pill,
        selectedSousCategorie === sub && styles.pillActive,
      ]}
      onPress={() => setSelectedSousCategorie(sub)}
    >
      <Text style={[
        styles.pillText,
        selectedSousCategorie === sub && styles.pillTextActive,
      ]}>
        {sub === 'TOUS' ? 'TOUS' : sub}
      </Text>
      {selectedSousCategorie === sub && <Text style={styles.pillCheck}> ✓</Text>}
    </TouchableOpacity>
  );

  // ── Écran de chargement ──
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.CYAN} />
        <Text style={styles.loadingText}>Chargement de la bibliothèque...</Text>
      </View>
    );
  }

  const filteredDocs = getFilteredDocuments();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Toast bienvenue */}
      {showWelcome && (
        <Animated.View style={[styles.welcomeToast, { opacity: welcomeOpacity }]}>
          <Text style={styles.welcomeText}>Bienvenue {userName} !</Text>
        </Animated.View>
      )}

      {/* ZONE 1 : En-tête */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleMenu} style={styles.hamburgerButton}>
          <Text style={styles.hamburgerIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>📚 BIBLIOTHÈQUE</Text>
          {selectedTerminal && (
            <Text style={styles.headerSubtitle}>{selectedTerminal}</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={openAIChat} style={styles.aiButton}>
            <Text style={styles.aiButtonIcon}>🤖</Text>
          </TouchableOpacity>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>{filteredDocs.length}</Text>
          </View>
        </View>
      </View>

      {/* ZONE 2 : Barre de recherche */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un document..."
          placeholderTextColor="#888"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearSearchButton}>
            <Text style={styles.clearSearchIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Indicateur du filtre actif (si terminal ou matière sélectionné) */}
      {(selectedTerminal || selectedSousCategorie !== 'TOUS') && (
        <View style={styles.activeFilterBar}>
          <Text style={styles.activeFilterLabel}>Filtres actifs :</Text>
          {selectedTerminal && (
            <TouchableOpacity
              style={styles.activeFilterChip}
              onPress={() => { setSelectedTerminal(null); setSelectedCategorie('TOUS'); setSelectedSousCategorie('TOUS'); }}
            >
              <Text style={styles.activeFilterChipText}>📂 {selectedTerminal}</Text>
              <Text style={styles.activeFilterChipClose}> ✕</Text>
            </TouchableOpacity>
          )}
          {selectedSousCategorie !== 'TOUS' && (
            <TouchableOpacity
              style={[styles.activeFilterChip, styles.activeFilterChipMatiere]}
              onPress={() => setSelectedSousCategorie('TOUS')}
            >
              <Text style={styles.activeFilterChipText}>{getDocumentIcon(selectedSousCategorie)} {selectedSousCategorie}</Text>
              <Text style={styles.activeFilterChipClose}> ✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ZONE 5 : Grille des documents */}
      <FlatList
        data={filteredDocs}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderCard}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.CYAN}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>
              {offlineMode
                ? 'Aucun document sauvegardé'
                : searchText
                  ? 'Aucun document trouvé'
                  : 'Aucun document disponible'}
            </Text>
          </View>
        }
      />

      {/* ZONE 6 : Bouton flottant téléchargements */}
      <TouchableOpacity
        style={[
          styles.floatingButton,
          offlineMode && styles.floatingButtonActive,
        ]}
        onPress={() => setOfflineMode(!offlineMode)}
      >
        <Text style={styles.floatingIcon}>⭐</Text>
        <Text style={styles.floatingText}>TÉLÉCHARGEMENTS</Text>
        <View style={styles.floatingBadge}>
          <Text style={styles.floatingBadgeText}>{favorites.length}</Text>
        </View>
      </TouchableOpacity>

      {/* Indicateur de téléchargement en arrière-plan */}
      {backgroundDownload.active && (
        <Animated.View style={styles.backgroundDownloadBar}>
          <View style={styles.backgroundDownloadInfo}>
            <Text style={styles.backgroundDownloadIcon}>📥</Text>
            <Text style={styles.backgroundDownloadText}>
              Mise en cache... {backgroundDownload.downloaded}/{backgroundDownload.total}
            </Text>
            <Text style={styles.backgroundDownloadPercent}>
              {backgroundDownload.progress}%
            </Text>
          </View>
          <View style={styles.backgroundDownloadProgressBg}>
            <View style={[
              styles.backgroundDownloadProgressFg,
              { width: `${backgroundDownload.progress}%` },
            ]} />
          </View>
        </Animated.View>
      )}

      {/* MENU HAMBURGER — Panneau latéral */}
      {menuVisible && (
        <>
          {/* Overlay sombre */}
          <TouchableOpacity
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={toggleMenu}
          />
          {/* Panneau du menu */}
          <Animated.View
            style={[
              styles.menuPanel,
              { transform: [{ translateX: menuSlideAnim }] },
            ]}
          >
            {/* Header du menu */}
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>📂 TERMINAUX</Text>
              <TouchableOpacity onPress={toggleMenu} style={styles.menuCloseButton}>
                <Text style={styles.menuCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Option TOUS */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                !selectedTerminal && styles.menuItemActive,
              ]}
              onPress={resetFilters}
            >
              <Text style={[
                styles.menuItemText,
                !selectedTerminal && styles.menuItemTextActive,
              ]}>
                📚 TOUS LES DOCUMENTS
              </Text>
            </TouchableOpacity>

            {/* Liste des terminaux */}
            <ScrollView style={styles.menuScroll}>
              {terminaux.map((terminal) => {
                const matieres = getMatieresForTerminal(terminal);
                const isSelected = selectedTerminal === terminal;

                return (
                  <View key={terminal}>
                    <TouchableOpacity
                      style={[
                        styles.menuItem,
                        isSelected && styles.menuItemActive,
                      ]}
                      onPress={() => selectTerminal(terminal)}
                    >
                      <Text style={[
                        styles.menuItemText,
                        isSelected && styles.menuItemTextActive,
                      ]}>
                        {isSelected ? '▶' : '▷'} {terminal}
                      </Text>
                      <Text style={styles.menuItemBadge}>{matieres.length}</Text>
                    </TouchableOpacity>

                    {/* Sous-menu : matières du terminal (affiché si sélectionné) */}
                    {isSelected && matieres.length > 0 && (
                      <View style={styles.sousMenu}>
                        {matieres.map((matiere) => {
                          const isMatiereSelected = selectedSousCategorie === matiere;
                          const count = documents.filter(
                            d => d.categorie === terminal && d.sousCategorie === matiere
                          ).length;

                          return (
                            <TouchableOpacity
                              key={matiere}
                              style={[
                                styles.sousMenuItem,
                                isMatiereSelected && styles.sousMenuItemActive,
                              ]}
                              onPress={() => {
                                setSelectedSousCategorie(isMatiereSelected ? 'TOUS' : matiere);
                                setMenuVisible(false);
                              }}
                            >
                              <Text style={[
                                styles.sousMenuItemText,
                                isMatiereSelected && styles.sousMenuItemTextActive,
                              ]}>
                                {getDocumentIcon(matiere)} {matiere}
                              </Text>
                              <Text style={styles.sousMenuItemCount}>{count}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>
        </>
      )}

      {/* Modal lecteur de document PDF */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => { setModalVisible(false); setLocalPdfUri(null); setDownloadProgress(0); setDownloadError(null); setCachedForOffline(false); setDownloadComplete(false); }}
      >
        <View style={styles.modalContainer}>
          {/* Header modal */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setModalVisible(false); setLocalPdfUri(null); setDownloadProgress(0); setDownloadError(null); setCachedForOffline(false); setDownloadComplete(false); }} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {currentDocument?.titre}
            </Text>
            {cachedForOffline ? (
              <Text style={styles.cachedBadge}>⚡</Text>
            ) : (
              <View style={{ width: 20 }} />
            )}
          </View>

          {/* Écran de téléchargement */}
          {!downloadComplete && !downloadError && (
            <View style={styles.downloadContainer}>
              <Text style={styles.downloadIcon}>📥</Text>
              <Text style={styles.downloadText}>Téléchargement du document...</Text>
              <Text style={styles.downloadPercent}>{downloadProgress}%</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFg, { width: `${downloadProgress}%` }]} />
              </View>
            </View>
          )}

          {/* Document téléchargé — message de confirmation */}
          {downloadComplete && !localPdfUri && (
            <View style={styles.downloadContainer}>
              <Text style={styles.downloadIcon}>✅</Text>
              <Text style={styles.downloadText}>Document téléchargé et mis en cache</Text>
              <Text style={styles.downloadSubtext}>Ouverture du lecteur PDF...</Text>
            </View>
          )}

          {/* Erreur de téléchargement */}
          {downloadError && (
            <View style={styles.downloadContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{downloadError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => { setDownloadError(null); setDownloadProgress(0); setLocalPdfUri(null); setDownloadComplete(false); downloadDocument(currentDocument); }}
              >
                <Text style={styles.retryButtonText}>Réessayer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeErrorButton}
                onPress={() => { setModalVisible(false); setLocalPdfUri(null); setDownloadProgress(0); setDownloadError(null); setCachedForOffline(false); setDownloadComplete(false); }}
              >
                <Text style={styles.closeErrorButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Lecteur PDF local — affiche le fichier depuis le cache */}
          {downloadComplete && localPdfUri && (
            <WebView
              ref={webViewRef}
              source={{ uri: localPdfUri }}
              style={styles.webview}
              originWhitelist={['*']}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState
              onLoadingStart={() => setWebViewReady(false)}
              onLoadingFinish={() => setWebViewReady(true)}
              renderLoading={() => (
                <View style={styles.downloadContainer}>
                  <ActivityIndicator size="large" color={COLORS.CYAN} />
                  <Text style={styles.downloadText}>Ouverture du document...</Text>
                </View>
              )}
              onError={(e) => {
                console.error('[BIBLIO] WebView erreur:', JSON.stringify(e.nativeEvent));
                setDownloadError('Impossible d\'ouvrir ce fichier.');
                setLocalPdfUri(null);
              }}
            />
          )}
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════ */}
      {/* 🤖 MODALE ASSISTANT IA — WebView intégrée  */}
      {/* ═══════════════════════════════════════════ */}
      <Modal
        visible={aiModalVisible}
        animationType="slide"
        onRequestClose={() => setAiModalVisible(false)}
      >
        <View style={styles.aiModalContainer}>
          {/* Header compact */}
          <View style={styles.aiHeader}>
            <TouchableOpacity onPress={() => setAiModalVisible(false)} style={styles.aiCloseButton}>
              <Text style={styles.aiCloseIcon}>✕</Text>
            </TouchableOpacity>
            <View style={styles.aiHeaderInfo}>
              <Text style={styles.aiHeaderTitle}>🤖 POLARIS IA</Text>
            </View>
            <TouchableOpacity
              onPress={() => { setWebViewError(false); setWebViewLoading(true); aiWebViewRef.current?.reload(); }}
              style={styles.aiRefreshButton}
            >
              <Text style={styles.aiRefreshIcon}>🔄</Text>
            </TouchableOpacity>
          </View>

          {/* Contenu selon plateforme */}
          {Platform.OS === 'web' ? (
            /* 🌐 iFrame pour Web */
            <View style={styles.aiWebView}>
              {webViewLoading && !webViewError && (
                <View style={styles.aiLoadingOverlay}>
                  <ActivityIndicator size="large" color={COLORS.CYAN} />
                  <Text style={styles.aiLoadingText}>Chargement de l'assistant...</Text>
                </View>
              )}
              <iframe
                src="https://astarte18.pages.dev"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: webViewError ? 'none' : 'block',
                }}
                title="Assistant IA"
                onLoad={() => setWebViewLoading(false)}
                onError={() => { setWebViewLoading(false); setWebViewError(true); }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </View>
          ) : (
            /* 📱 WebView pour Mobile */
            <WebView
              ref={aiWebViewRef}
              source={{ uri: 'https://astarte18.pages.dev' }}
              style={styles.aiWebView}
              originWhitelist={['*']}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              startInLoadingState={true}
              onLoadStart={() => { setWebViewLoading(true); setWebViewError(false); }}
              onLoadEnd={() => setWebViewLoading(false)}
              onError={(e) => {
                console.error('[IA] WebView erreur:', JSON.stringify(e.nativeEvent));
                setWebViewLoading(false);
                setWebViewError(true);
              }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BLACK,
    paddingTop: 50,
  },

  // Toast bienvenue
  welcomeToast: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  welcomeText: {
    color: COLORS.CYAN,
    fontSize: 20,
    fontWeight: 'bold',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    ...FONTS.TITLE,
    fontSize: 22,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerSubtitle: {
    color: COLORS.CYAN_LIGHT,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiButtonIcon: {
    fontSize: 18,
  },
  hamburgerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerIcon: {
    fontSize: 24,
    color: COLORS.WHITE,
  },
  counterBadge: {
    backgroundColor: COLORS.CYAN,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  counterText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Recherche
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 15,
    height: 48,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.WHITE,
    fontSize: 16,
  },
  clearSearchButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchIcon: {
    color: '#888',
    fontSize: 18,
  },

  // Barre de filtres actifs
  activeFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  activeFilterLabel: {
    color: '#888',
    fontSize: 12,
    marginRight: 4,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.CYAN,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activeFilterChipMatiere: {
    backgroundColor: 'rgba(112, 226, 255, 0.15)',
    borderColor: COLORS.CYAN_LIGHT,
  },
  activeFilterChipText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: '500',
  },
  activeFilterChipClose: {
    color: COLORS.CYAN,
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Filtres puces
  pillsContainer: {
    maxHeight: 50,
  },
  pillsContent: {
    paddingHorizontal: 20,
    paddingVertical: 5,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    height: 40,
  },
  pillActive: {
    backgroundColor: COLORS.CYAN,
    borderColor: COLORS.CYAN,
  },
  pillText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  pillTextActive: {
    color: COLORS.WHITE,
  },
  pillCheck: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Grille de documents
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    width: '48%',
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
    padding: 15,
    alignItems: 'center',
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cardIconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardIcon: {
    fontSize: 48,
  },
  cardTitle: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  cardCategorie: {
    color: '#888',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 2,
  },
  cardSousCategorie: {
    color: COLORS.CYAN_LIGHT,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 10,
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
  favoriteIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  favoriteText: {
    color: '#888',
    fontSize: 10,
  },
  favoriteTextActive: {
    color: '#FFD700',
  },

  // État vide
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },

  // Bouton flottant
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: COLORS.CYAN,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: COLORS.CYAN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingButtonActive: {
    backgroundColor: COLORS.CYAN,
    borderColor: COLORS.CYAN,
  },
  floatingIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  floatingText: {
    color: COLORS.WHITE,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  floatingBadge: {
    backgroundColor: COLORS.CYAN,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  floatingBadgeText: {
    color: COLORS.WHITE,
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.WHITE,
    fontSize: 20,
  },
  modalTitle: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  cachedBadge: {
    color: '#FFD700',
    fontSize: 18,
  },
  webview: {
    flex: 1,
  },

  // Chargement
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BLACK,
  },
  loadingText: {
    color: COLORS.CYAN,
    fontSize: 16,
    marginTop: 15,
  },

  // Téléchargement
  downloadContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BLACK,
    padding: 30,
  },
  downloadIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  downloadText: {
    color: COLORS.WHITE,
    fontSize: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  downloadSubtext: {
    color: COLORS.CYAN,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  downloadPercent: {
    color: COLORS.CYAN,
    fontSize: 48,
    fontWeight: 'bold',
    marginTop: 5,
  },
  progressBarBg: {
    width: '80%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressBarFg: {
    height: '100%',
    backgroundColor: COLORS.CYAN,
    borderRadius: 4,
  },

  // Erreur
  errorIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  errorText: {
    color: COLORS.RED,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: COLORS.CYAN,
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 14,
    marginBottom: 10,
  },
  retryButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeErrorButton: {
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 12,
    paddingHorizontal: 30,
    paddingVertical: 12,
  },
  closeErrorButtonText: {
    color: '#888',
    fontSize: 14,
  },

  // ═══════════════════════════════════════════
  // BARRE DE TÉLÉCHARGEMENT EN ARRIÈRE-PLAN
  // ═══════════════════════════════════════════
  backgroundDownloadBar: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.CYAN,
    padding: 12,
    zIndex: 150,
    shadowColor: COLORS.CYAN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backgroundDownloadInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backgroundDownloadIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  backgroundDownloadText: {
    color: COLORS.WHITE,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  backgroundDownloadPercent: {
    color: COLORS.CYAN,
    fontSize: 14,
    fontWeight: 'bold',
  },
  backgroundDownloadProgressBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  backgroundDownloadProgressFg: {
    height: '100%',
    backgroundColor: COLORS.CYAN,
    borderRadius: 3,
  },

  // ═══════════════════════════════════════════
  // MENU HAMBURGER — Styles
  // ═══════════════════════════════════════════
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 200,
  },
  menuPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 300,
    backgroundColor: '#0d0d1a',
    zIndex: 201,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1a1a2e',
  },
  menuTitle: {
    color: COLORS.CYAN,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  menuCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuCloseIcon: {
    color: COLORS.WHITE,
    fontSize: 20,
  },
  menuScroll: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  menuItemActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.CYAN,
  },
  menuItemText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  menuItemTextActive: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
  menuItemBadge: {
    backgroundColor: '#333',
    color: COLORS.CYAN_LIGHT,
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  sousMenu: {
    backgroundColor: '#0a0a14',
    paddingLeft: 15,
  },
  sousMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginLeft: 25,
    borderLeftWidth: 2,
    borderLeftColor: '#333',
  },
  sousMenuItemActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderLeftColor: COLORS.CYAN,
  },
  sousMenuItemText: {
    color: '#888',
    fontSize: 13,
    flex: 1,
  },
  sousMenuItemTextActive: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
  sousMenuItemCount: {
    color: '#666',
    fontSize: 11,
    backgroundColor: '#222',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },

  // ═══════════════════════════════════════════
  // 🤖 ASSISTANT IA — Styles (WebView intégrée)
  // ═══════════════════════════════════════════
  aiModalContainer: {
    flex: 1,
    backgroundColor: '#0a0a14',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  aiCloseButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiCloseIcon: {
    color: COLORS.WHITE,
    fontSize: 22,
  },
  aiHeaderInfo: {
    flex: 1,
    alignItems: 'center',
  },
  aiHeaderTitle: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
  },
  aiRefreshButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiRefreshIcon: {
    fontSize: 20,
  },

  // Chargement WebView
  aiLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0a0a14',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  aiLoadingText: {
    color: COLORS.CYAN,
    fontSize: 16,
    marginTop: 15,
  },

  // Erreur WebView
  aiErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  aiErrorIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  aiErrorText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  aiRetryButton: {
    backgroundColor: COLORS.CYAN,
    borderRadius: 12,
    paddingHorizontal: 30,
    paddingVertical: 12,
  },
  aiRetryText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // WebView
  aiWebView: {
    flex: 1,
  },
});