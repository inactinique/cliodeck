#!/bin/bash

# Test précis entre 2000 et 3000 caractères

echo "🎯 Test précis de la limite nomic-embed-text (2000-3000 caractères)"
echo ""

BASE_TEXT="This is a test sentence to check the maximum length supported by the nomic-embed-text model. "

# Test par paliers de 100 caractères
for length in 2000 2100 2200 2300 2400 2500 2600 2700 2800 2900 3000; do
    echo -n "📏 Test $length chars... "

    TEXT=""
    while [ ${#TEXT} -lt $length ]; do
        TEXT="${TEXT}${BASE_TEXT}"
    done
    TEXT="${TEXT:0:$length}"

    RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:11434/api/embeddings -d "{
  \"model\": \"nomic-embed-text\",
  \"prompt\": \"$TEXT\"
}" 2>&1)

    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ SUCCESS"
    else
        BODY=$(echo "$RESPONSE" | head -n -1)
        echo "❌ FAILED (HTTP $HTTP_CODE)"
        echo "   Erreur: $(echo "$BODY" | jq -r '.error // "Unknown"' 2>/dev/null || echo "$BODY")"
        echo ""
        echo "🎯 LIMITE EXACTE TROUVÉE: < $length caractères"
        break
    fi

    sleep 0.5
done

echo ""
echo "✅ Test terminé"
