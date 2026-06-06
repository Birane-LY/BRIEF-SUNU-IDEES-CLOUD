import { classifyWithAI } from './ia_validation.js';
import { db, loadFromSupabase } from './supabase.js';

import { applyValidation, clearErrors, attachValidation, validators } from './validators.js';
import { 
  initFormManager, 
  openModal, 
  closeModal, 
  setCategory, 
  getTouched, 
  getSelectedCategory, 
  getCurrentEditingPostIt 
} from './form.js';

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
  
  const CAT_LABELS = {
    pedagogie: 'Pédagogie',
    evenement: 'Événement',
    campus:    'Vie de Campus',
    technique: 'Technique',
    autre:     'Autre'
  };

  // Initialisation du gestionnaire de formulaire
  initFormManager({ titleInput, descInput, submitBtn, modalOverlay, catButtons });

  attachValidation(titleInput, 'title', getTouched());
  attachValidation(descInput,  'desc',  getTouched());
  
  // Chargement de la base Supabase
  loadFromSupabase(ideasWall, createPostIt);

  // --- ÉCOUTEURS INTERFACE ---
  openModalBtn.addEventListener('click',  () => openModal());
  closeModalBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click',  e => { if (e.target === modalOverlay) closeModal(); });
  modalOverlay.querySelector('.sunu-app')?.addEventListener('click', e => e.stopPropagation());
  catButtons.forEach(btn => btn.addEventListener('click', e => setCategory(e.currentTarget.getAttribute('data-cat'))));

  // --- COMPOSANT POST-IT ---
  function createPostIt(titleText, descText, catValue, isCompleted = false, dbId = null) {
    const element = document.createElement('div');
    element.className = `post-it cat-${catValue}`;
    element.dataset.cat = catValue;
    if (dbId) element.dataset.dbId = dbId;
    if (isCompleted) element.classList.add('completed');

    element.innerHTML = `
      <div class="post-it-header">
        <span class="task-badge">${CAT_LABELS[catValue] ?? 'Autre'}</span>
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

  // --- TRAITEMENT SOUMISSION ---
  submitBtn.addEventListener('click', async e => {
    e.preventDefault();
    e.stopPropagation();
    clearErrors();

    const title = titleInput.value.trim();
    const desc  = descInput.value.trim();

    // Utilisation directe de l'objet validators importé
    const titleErr = validators.title(title);
    const descErr  = validators.desc(desc);
    applyValidation(titleInput, titleErr);
    applyValidation(descInput,  descErr);
    if (titleErr || descErr) return;

    const originalText    = submitBtn.textContent;
    submitBtn.textContent = "Classification IA en cours...";
    submitBtn.disabled    = true;

    try {
      const category = await classifyWithAI(title, desc, getSelectedCategory());
      const currentEditingPostIt = getCurrentEditingPostIt();

      if (currentEditingPostIt) {
        const dbId = currentEditingPostIt.dataset.dbId;
        if (dbId) {
          const { error } = await db.from('ideas').update({ title, description: desc, category }).eq('id', dbId);
          if (error) throw error;
        }
        currentEditingPostIt.querySelector('.task-title-text').textContent = title;
        currentEditingPostIt.querySelector('.task-desc-text').textContent  = desc;
        currentEditingPostIt.className = `post-it cat-${category}`;
        currentEditingPostIt.dataset.cat = category;
        
        if (currentEditingPostIt.querySelector('.checkbox').checked) {
          currentEditingPostIt.classList.add('completed');
        }
      } else {
        const { data, error } = await db.from('ideas').insert([{ title, description: desc, category, completed: false }]).select().single();
        if (error) throw error;
        if (data) createPostIt(data.title, data.description, data.category, data.completed, data.id);
      }
      closeModal();
    } catch (err) {
      console.error("Erreur lors de la soumission :", err);
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });

});
