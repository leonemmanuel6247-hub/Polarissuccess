#!/bin/bash
# 🚀 PUSH + BUILD APK — Success Polaris
# Exécute ce script dans ton terminal pour pusher et lancer le build

echo "========================================"
echo "🚀 Push vers GitHub + Build APK automatique"
echo "========================================"
echo ""
echo "💡 Quand demandé, saisis :"
echo "   Username : ton nom d'utilisateur GitHub"
echo "   Password : ton Personal Access Token (PAT)"
echo ""
echo "🔗 Si tu n'as pas de PAT, crée-en un ici :"
echo "   https://github.com/settings/tokens/new?description=git-push"
echo ""
echo "========================================"
echo ""

cd /home/leon/successpolairs_clean

# Vérifier qu'il y a des changements
git status --short
echo ""

git add .
git commit -m "sync: mise à jour des données" 2>&1 || echo "⚠️ Aucun nouveau changement à commiter"
echo ""

echo "🚀 Push en cours..."
git push origin main

echo ""
echo "========================================"
echo "✅ Terminé !"
echo "========================================"
echo ""
echo "📱 Vérifie le build ici :"
echo "   https://github.com/leonemmanuel6247-hub/Polarissuccess/actions"
echo ""
echo "🔗 Lien APK dans les logs du workflow GitHub Actions"
echo ""
