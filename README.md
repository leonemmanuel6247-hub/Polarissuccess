# 📱 Success Polaris

Application React Native Expo pour étudiants maliens — bibliothèque de documents PDF + assistant IA Polaris.

## 🚀 Sync + Build APK

### Méthode automatique (recommandée)

```bash
./scripts/sync-and-build.sh
```

Ce script :
1. Récupère les dernières modifications (`git pull`)
2. Ajoute tous les fichiers modifiés
3. Demande un message de commit
4. Pousse vers GitHub → **déclenche le build APK automatique**

### Méthode manuelle

```bash
git add .
git commit -m "sync: mise à jour des données"
git push origin main
```

## 🔧 Configuration requise

### Secrets GitHub requis

Va sur GitHub → Repo → **Settings** → Secrets and variables → Actions → **New repository secret**

Ajoute ces 2 secrets :

| Secret | Valeur |
|---|---|
| `EXPO_USERNAME` | Ton identifiant Expo (email) |
| `EXPO_PASSWORD` | Ton mot de passe Expo |

> 💡 Crée un compte sur https://expo.dev si tu n'en as pas.

## 📦 Workflow GitHub Actions

Le build APK se déclenche automatiquement à chaque push sur `main`.

Pour un build manuel : GitHub → **Actions** → **Build APK Android** → **Run workflow**

## 🏗️ Structure

```
├── App.js                    # Point d'entrée (Splash → Astarté → Inscription → Bibliothèque)
├── screens/                  # Écrans
├── components/               # Composants animés (Orbe, Anneau, Satellite, Étoiles)
├── styles/                   # Styles globaux
├── utils/                    # IA (Gemini/OpenAI), API keys cryptées
├── assets/                   # Icônes, splash, favicon
├── scripts/
│   └── sync-and-build.sh     # 🔄 Script de sync + build
├── .github/workflows/
│   └── build-apk.yml         # ⚙️ GitHub Actions
├── eas.json                  # Config EAS Build
├── app.json                  # Config Expo (SDK 49)
└── package.json              # Dépendances
```

## 📋 Dépendances compatibles SDK 49

| Package | Version |
|---|---|
| expo | ~49.0.0 |
| react-native | 0.72.10 |
| @react-native-async-storage/async-storage | 1.18.2 |
| react-native-webview | 13.2.2 |
| @expo/metro-runtime | ~3.1.3 |
