#!/bin/bash

# Script de test pour trouver la longueur max supportée par nomic-embed-text

echo "🧪 Test de longueur maximale pour nomic-embed-text"
echo ""

# Texte de base à répéter
BASE_TEXT="This is a test sentence to check the maximum length supported by the nomic-embed-text model. "

# Test avec différentes longueurs
for length in 100 500 1000 2000 3000 3500 4000 5000; do
    echo "📏 Test avec ~$length caractères..."

    # Générer le texte de la longueur souhaitée
    TEXT=""
    while [ ${#TEXT} -lt $length ]; do
        TEXT="${TEXT}${BASE_TEXT}"
    done
    TEXT="${TEXT:0:$length}"

    # Tester avec Ollama
    RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:11434/api/embeddings -d "{
  \"model\": \"nomic-embed-text\",
  \"prompt\": \"$TEXT\"
}" 2>&1)

    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | head -n -1)

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ $length caractères: SUCCESS"
    else
        echo "❌ $length caractères: FAILED (HTTP $HTTP_CODE)"
        echo "   Erreur: $(echo "$BODY" | jq -r '.error // "Unknown"' 2>/dev/null || echo "$BODY")"
        echo ""
        echo "🎯 Longueur limite trouvée: entre la dernière longueur OK et $length caractères"
        break
    fi

    echo ""
    sleep 1  # Pause entre les tests
done

echo ""
echo "✅ Test terminé"
