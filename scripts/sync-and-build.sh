#!/bin/bash
# 🔄 Sync des données Success Polaris + déclenchement build APK
# Ce script synchronise les données de l'app et déclenche un build APK automatique

echo "========================================"
echo "🔄 Sync données + Build APK — Success Polaris"
echo "========================================"
echo ""

# Vérifier qu'on est dans un repo git
if [ ! -d ".git" ]; then
    echo "❌ Erreur : ce script doit être exécuté depuis le dossier du projet (avec .git)"
    exit 1
fi

# 1. Récupérer les dernières modifications
echo "📥 Récupération des dernières modifications..."
git pull origin main 2>&1 || {
    echo "⚠️ Pull échoué, continuation..."
}
echo ""

# 2. Vérifier les fichiers modifiés
echo "📋 Vérification des fichiers modifiés..."
git status --short
echo ""

# 3. Ajouter tous les changements
echo "📦 Ajout des fichiers..."
git add .
echo ""

# 4. Demander le message de commit
echo "----------------------------------------"
read -p "💬 Message de commit (par défaut: 'sync: mise à jour des données') : " COMMIT_MSG
COMMIT_MSG=${COMMIT_MSG:-"sync: mise à jour des données"}
echo "----------------------------------------"
echo ""

# 5. Commit
echo "📝 Commit..."
git commit -m "$COMMIT_MSG" 2>&1 || {
    echo "⚠️ Aucun changement à commiter"
}
echo ""

# 6. Push — déclenche automatiquement le workflow GitHub Actions
echo "🚀 Push vers GitHub (déclenche le build APK automatique)..."
echo "💡 Saisis ton identifiant et mot de passe GitHub quand demandé"
echo ""
git push origin main

echo ""
echo "========================================"
echo "✅ Push terminé !"
echo "========================================"
echo ""
echo "📱 Vérifie le build sur GitHub :"
echo "   https://github.com/leonemmanuel6247-hub/Polarissuccess/actions"
echo ""
echo "🔗 Ou sur Expo.dev (lien de l'APK dans les logs du workflow)"
echo ""
