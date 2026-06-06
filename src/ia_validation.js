const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const MODEL_IA = import.meta.env.VITE_MODEL_IA;

const CAT_LABELS = {
    pedagogie: 'Pédagogie',
    evenement: 'Événement',
    campus:    'Vie de Campus',
    technique: 'Technique',
    autre:     'Autre'
  };
 
 const VALID_CATEGORIES = Object.keys(CAT_LABELS);


const SYSTEM_PROMPT = `Tu es un moteur de classification sémantique pour l'application "Sunu Idées". Tu agis comme une API déterministe.
Ton unique objectif est d'assigner une catégorie valide à partir d'un titre et d'une description fournis.
Catégories autorisées : "pedagogie", "evenement", "campus", "technique", "autre".
Référentiel métier :
- pedagogie : cours, enseignement, apprentissage, examens, évaluations, révisions, ateliers, projets, formateurs.
- evenement : conférences, hackathons, compétitions, cérémonies, séminaires, meetups, webinaires, fêtes.
- campus : infrastructures, bâtiments, salles, bibliothèque, cafétéria, vie étudiante, clubs, BDE, confort.
- technique : bugs, incidents, développement logiciel, applications, sites, serveurs, wifi, réseaux, ordinateurs, matériel.
Format de sortie obligatoire : Réponds exclusivement avec un objet JSON valide. Aucun texte supplémentaire. Aucune balise Markdown.
Structure attendue : {"category": "pedagogie|evenement|campus|technique|autre"}`;

export const classifyWithAI = async (title, desc, fallback) => {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": MODEL_IA,
          "HTTP-Referer": window.location.href,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b:free",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user",   content: `Titre: ${title}\nDescription: ${desc}` }
          ],
          reasoning_effort: "low",
          max_completion_tokens: 100,
        }),
      });

      if (!res.ok) throw new Error(`OpenRouter ${res.status} : ${await res.text()}`);

      const raw  = (await res.json())?.choices?.[0]?.message?.content?.trim();
      if (!raw) throw new Error("Réponse vide");

      const { category } = JSON.parse(raw);
      if (VALID_CATEGORIES.includes(category)) return category;
      throw new Error(`Catégorie invalide : ${category}`);

    } catch (err) {
      console.warn("Fallback catégorie manuelle :", err.message);
      return fallback;
    }
  }
