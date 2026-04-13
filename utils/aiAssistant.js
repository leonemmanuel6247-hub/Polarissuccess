/**
 * 🤖 Assistant IA — Success Polaris
 * 
 * Agnostique : détecte automatiquement la clé API disponible
 * et appelle le bon fournisseur (Gemini, OpenAI, autre).
 */

import { getApiKey } from './apiKeys';

const SYSTEM_PROMPT = `Tu es POLARIS, l'assistant intelligent de l'application "Success Polaris".

🎯 TA MISSION :
- Aider les étudiants africains (principalement du Mali) dans leurs études
- Expliquer des concepts de cours (Maths, Physique, SVT, Philo, Français, Histoire, etc.)
- Donner des conseils de méthodologie
- Répondre aux questions sur le programme scolaire (Seconde, Première, Terminale)
- Être encourageant et motivant

📚 TA PERSONNALITÉ :
- Bienveillant et patient
- Tu expliques simplement, avec des exemples concrets
- Tu utilises le tutoiement pour être proche de l'étudiant
- Tu réponds en français
- Si la question n'est pas scolaire, tu restes poli mais tu recentres sur les études

🔒 RÈGLES :
- Ne donne jamais de réponses toutes faites sans expliquer
- Encourage la réflexion : "Qu'en penses-tu ?"
- Si tu ne sais pas, dis-le honnêtement
- Reste toujours respectueux et professionnel

Formatte tes réponses de manière claire et structurée.`;

/**
 * Appelle l'API Google Gemini
 */
async function callGemini(message, history, apiKey) {
  const messages = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    ...history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || `Erreur Gemini (${response.status})`);
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

/**
 * Appelle l'API OpenAI
 */
async function callOpenAI(message, history, apiKey) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-10),
    { role: 'user', content: message },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 1500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erreur API (${response.status})`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

/**
 * Détecte le type de clé API
 */
function detectKeyType(key) {
  if (!key) return 'none';
  if (key.startsWith('AIza') || key.startsWith('sk-')) return 'gemini';
  if (key.startsWith('sk-proj') || key.startsWith('sk-')) return 'openai';
  return 'unknown';
}

/**
 * 🤖 Envoie un message à l'IA — totalement agnostique
 */
export async function askAI(message, conversationHistory = []) {
  try {
    console.log('[IA] 🤖 Recherche clé API disponible...');

    // Essayer Gemini en priorité
    let apiKey = await getApiKey('gemini');
    let provider = apiKey ? 'gemini' : null;

    // Fallback sur OpenAI
    if (!provider) {
      apiKey = await getApiKey('openai');
      provider = apiKey ? 'openai' : null;
    }

    // Fallback sur tout autre service
    if (!provider) {
      apiKey = await getApiKey('ai_key');
      provider = apiKey ? detectKeyType(apiKey) : null;
    }

    if (!provider || !apiKey) {
      console.error('[IA] ❌ Aucune clé API configurée');
      return {
        success: false,
        error: 'Assistant IA non configuré. Contacte l\'administrateur.',
      };
    }

    console.log(`[IA] 🚀 Utilisation du fournisseur: ${provider}`);

    let aiResponse = null;

    if (provider === 'gemini') {
      aiResponse = await callGemini(message, conversationHistory, apiKey);
    } else if (provider === 'openai') {
      aiResponse = await callOpenAI(message, conversationHistory, apiKey);
    } else {
      // Tentative Gemini par défaut pour les clés inconnues
      aiResponse = await callGemini(message, conversationHistory, apiKey);
    }

    if (aiResponse) {
      console.log('[IA] ✅ Réponse reçue:', aiResponse.length, 'caractères');
      return { success: true, response: aiResponse };
    }

    return { success: false, error: 'Aucune réponse de l\'IA. Réessaie.' };
  } catch (error) {
    console.error('[IA] ❌ Erreur askAI:', error.message);
    return {
      success: false,
      error: `Erreur : ${error.message}`,
    };
  }
}

/**
 * Vérifie si l'IA est configurée
 */
export async function isIAConfigured() {
  const gemini = await getApiKey('gemini');
  if (gemini) return true;
  const openai = await getApiKey('openai');
  if (openai) return true;
  return false;
}

/**
 * Génère des suggestions de questions fréquentes
 */
export function getSuggestedQuestions() {
  return [
    'Comment résoudre une équation du second degré ?',
    'Explique-moi la loi de Newton simplement',
    'Quelles sont les figures de style en français ?',
    'Comment analyser un texte philosophique ?',
    'Donne-moi des astuces pour le bac',
    'Qu\'est-ce que l\'ADN et comment fonctionne-t-il ?',
    'Comment calculer une dérivée ?',
    'Explique-moi la révolution française',
  ];
}
