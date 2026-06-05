document.addEventListener('DOMContentLoaded', () => {

  // --- ÉLÉMENTS DOM ---
  const $ = id => document.getElementById(id);
  const openModalBtn  = $('open-modal-btn');
  const closeModalBtn = $('close-modal-btn');
  const modalOverlay  = $('modal-overlay');
  const submitBtn     = $('submit-btn');
  const ideasWall     = $('ideas-wall');
  const titleInput    = $('task-title');
  const descInput     = $('task-desc');
  const catButtons    = document.querySelectorAll('.category-btn');

  const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ;
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

  // --- ÉTAT ---
  let selectedCategory     = 'pedagogie';
  let currentEditingPostIt = null;
  const touched            = { title: false, desc: false };

  // --- SUPABASE ---
  if (typeof supabase === 'undefined') { 
    console.error("Supabase non chargé."); 
    return; }
  const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // --- VALIDATION ---
  const reDoubleStart = new RegExp(`^(?:([aàâæeéèêëiîïoôœuùûüyÿ])\\1|([bcçdfghjklmnpqrstvwxz])\\2)`, 'i');
  const reDoubleEnd   = new RegExp(`(?:([aàâæeéèêëiîïoôœuùûüyÿ])\\1|([bcçdfghjklmnpqrstvwxz])\\2)$`, 'i');

  const validators = {
    title: v => {
      if (!v)               return 'Veuillez remplir le champ titre.';
      if (v.length < 5)     return 'Titre trop court (min 5 caractères).';
      if (v.length > 30)    return 'Titre trop long (max 30 caractères).';
      if (/^[\d\s]+$/.test(v)) return 'Le titre ne peut pas contenir que des chiffres ou des espaces.';
      if (/([^\w\s])\1/.test(v)) return 'Les caractères spéciaux ne peuvent pas se suivre (ex: !!, --).';
      if (/([a-zA-Z])\1{2}/i.test(v)) return 'Un mot ne peut pas contenir 3 lettres identiques à la suite.';
      if (reDoubleStart.test(v) || reDoubleEnd.test(v)) return 'Soyez explicite dans le sens des mots.';
      return null;
    },
    desc: v => {
      if (!v)               return "N'oublie pas de décrire ton idée.";
      if (v.length < 25)    return 'Description trop courte (min 25 caractères).';
      if (v.length > 255)   return 'Description trop longue (max 255 caractères).';
      if (/^[\d\s]+$/.test(v)) return 'La description ne peut pas contenir que des chiffres ou des espaces.';
      if (/([^\w\s])\1/.test(v)) return 'Les caractères spéciaux ne peuvent pas se suivre dans la description.';
      if (/([a-zA-Z])\1{2}/i.test(v)) return 'Un mot ne peut pas contenir 3 lettres identiques à la suite.';
      return null;
    }
  };




  function applyValidation(input, error) {
  const group = input.closest('.input-area');
  let errDiv = group.querySelector('.error-message');

  if (error) {
    // 1. Gestion des classes visuelles
    group.classList.add('error');
    group.classList.remove('success');

    // 2. Gestion du texte de l'erreur
    if (!errDiv) {
      errDiv = document.createElement('div');
      errDiv.className = 'error-message';
      group.appendChild(errDiv);
    }
    errDiv.textContent = error;

  } else {
    // 1. Gestion des classes visuelles
    group.classList.remove('error');
    group.classList.add('success');

    // 2. Suppression du message s'il existe
    if (errDiv) {
      errDiv.remove();
    }
  }
}


  function clearErrors() {
  const groups = document.querySelectorAll('.input-area');
  groups.forEach(group => {
    group.classList.remove('error');
    group.classList.remove('success');
    
    const errDiv = group.querySelector('.error-message');
    if (errDiv) {
      errDiv.remove();
    }
  });
}


  // Attache blur + input sur un champ avec la clé du validator
  function attachValidation(input, key) {
    input.addEventListener('blur', () => {
      touched[key] = true;
      applyValidation(input, validators[key](input.value.trim()));
    });
    input.addEventListener('input', () => {
      if (!touched[key]) return;
      applyValidation(input, validators[key](input.value.trim()));
    });
  }

  attachValidation(titleInput, 'title');
  attachValidation(descInput,  'desc');

  // --- MODALE ---
  function setCategory(cat) {
  selectedCategory = cat;
  catButtons.forEach(button => {
    const buttonCategory = button.getAttribute('data-cat');

    if (buttonCategory  === cat) {
      button.classList.add('active');
    } else {
      button.classList.remove('active'); 
    }
  });
}


  function resetForm() {
    titleInput.value = '';
    descInput.value  = '';
    touched.title    = false;
    touched.desc     = false;
    clearErrors();
    setCategory('pedagogie');
  }

  function openModal(editPostIt = null) {
    currentEditingPostIt = editPostIt;
    resetForm();
    if (editPostIt) {
      titleInput.value = editPostIt.querySelector('.task-title-text').textContent;
      descInput.value  = editPostIt.querySelector('.task-desc-text').textContent;
      setCategory(editPostIt.dataset.cat);
      document.querySelector('.sunu-app h2').textContent = "Modifier votre idée";
      submitBtn.textContent = "Mettre à jour l'idée";
    } else {
      document.querySelector('.sunu-app h2').textContent = "Partagez votre idée";
      submitBtn.textContent = "Ajouter au mur";
    }
    submitBtn.disabled = false;
    modalOverlay.classList.add('active');
  }

  function closeModal() {
    currentEditingPostIt?.classList.remove('editing-mode');
    resetForm();
    currentEditingPostIt = null;
    modalOverlay.classList.remove('active');
  }

  openModalBtn.addEventListener('click',  () => openModal());
  closeModalBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click',  e => { if (e.target === modalOverlay) closeModal(); });
  modalOverlay.querySelector('.sunu-app')?.addEventListener('click', e => e.stopPropagation());
  catButtons.forEach(btn => btn.addEventListener('click', e => setCategory(e.currentTarget.getAttribute('data-cat'))));

  // --- POST-IT ---
  function createPostIt(titleText, descText, catValue, isCompleted = false, dbId = null) {
    const element = document.createElement('div');
    element.className = `post-it cat-${catValue}`;
    element.dataset.cat = catValue;
    if (dbId) element.dataset.dbId = dbId;
    if (isCompleted) element.classList.add('completed');

    element.innerHTML = `
      <div class="post-it-header">
        <span class="task-badge">${CAT_LABELS[catValue] ?? CAT_LABELS.autre}</span>
        <input type="checkbox" class="checkbox" ${isCompleted ? 'checked' : ''}>
      </div>
      <div class="post-it-body">
        <h3 class="task-title-text"></h3>
        <p class="task-desc-text"></p>
      </div>
      <div class="post-it-footer">
        <button class="edit-btn"   title="Modifier"><i class="fa-solid fa-pen"></i></button>
        <button class="delete-btn" title="Supprimer"><i class="fa-solid fa-trash"></i></button>
      </div>`;

    element.querySelector('.task-title-text').textContent = titleText;
    element.querySelector('.task-desc-text').textContent  = descText;

    const checkbox = element.querySelector('.checkbox');

    checkbox.addEventListener('change', async () => {
      element.classList.toggle('completed', checkbox.checked);
      if (dbId) {
        const { error } = await db.from('ideas').update({ completed: checkbox.checked }).eq('id', dbId);
        if (error) console.error("Erreur completed :", error);
      }
    });

    element.querySelector('.delete-btn').addEventListener('click', async () => {
      if (dbId) {
        const { error } = await db.from('ideas').delete().eq('id', dbId);
        if (!error) element.remove(); else console.error("Erreur suppression :", error);
      } else {
        element.remove();
      }
    });

    element.querySelector('.edit-btn').addEventListener('click', () => {
      if (checkbox.checked) return;
      element.classList.add('editing-mode');
      openModal(element);
    });

    ideasWall.appendChild(element);
  }

  // --- IA ---
  const classifyWithAI = async (title, desc, fallback) => {
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

  // --- SOUMISSION ---
  submitBtn.addEventListener('click', async e => {
    e.preventDefault();
    e.stopPropagation();
    clearErrors();

    const title = titleInput.value.trim();
    const desc  = descInput.value.trim();

    const titleErr = validators.title(title);
    const descErr  = validators.desc(desc);
    applyValidation(titleInput, titleErr);
    applyValidation(descInput,  descErr);
    if (titleErr || descErr) return;

    const originalText    = submitBtn.textContent;
    submitBtn.textContent = "Classification IA en cours...";
    submitBtn.disabled    = true;

    const category = await classifyWithAI(title, desc, selectedCategory);
    

    try {
      if (currentEditingPostIt) {
        const dbId = currentEditingPostIt.dataset.dbId;
        if (dbId) {
          const { error } = await db.from('ideas')
            .update({ title, description: desc, category }).eq('id', dbId);
          if (error) throw error;
        }
        currentEditingPostIt.querySelector('.task-title-text').textContent = title;
        currentEditingPostIt.querySelector('.task-desc-text').textContent  = desc;
        currentEditingPostIt.className = `post-it cat-${category}`;
        currentEditingPostIt.dataset.cat = category;
         if (currentEditingPostIt.querySelector('.checkbox').checked) {
          currentEditingPostIt.classList.add('completed');
        }

        currentEditingPostIt.querySelector('.task-badge').textContent = CAT_LABELS[category] ?? CAT_LABELS.autre;

      } else {
        const { data, error } = await db.from('ideas').insert([{ title, description: desc, category, completed: false }]).select();
        if (error) throw error;
        if (data?.[0]) createPostIt(title, desc, category, false, data[0].id);
      }

      submitBtn.textContent = originalText;
      submitBtn.disabled    = false;
      closeModal();

    } catch (err) {
      console.error("Échec Supabase :", err);
      alert("Impossible de sauvegarder. Vérifiez la console.");
      submitBtn.textContent = originalText;
      submitBtn.disabled    = false;
    }
  });

  // --- CHARGEMENT INITIAL ---
  async function loadFromSupabase() {
    try {
      const { data, error } = await db.from('ideas').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      ideasWall.querySelectorAll('.post-it').forEach(p => p.remove());
      data?.forEach(({ title, description, category, completed, id }) =>
        createPostIt(title, description, category, completed, id)
      );
    } catch (err) {
      console.error("Erreur chargement Supabase :", err);
    }
  }

  loadFromSupabase();
});