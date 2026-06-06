// formManager.js
import { clearErrors } from './validators.js';

// État privé du module
let currentEditingPostIt = null;
let selectedCategory = 'pedagogie';
const touched = { title: false, desc: false };

// Références DOM locales configurées à l'initialisation
let dom = {};

export function initFormManager(config) {
  dom = config; // Reçoit titleInput, descInput, submitBtn, modalOverlay, catButtons, etc.
  setCategory('pedagogie');
}

// Getters pour que app.js lise l'état actuel sans pouvoir le modifier directement
export const getTouched = () => touched;
export const getSelectedCategory = () => selectedCategory;
export const getCurrentEditingPostIt = () => currentEditingPostIt;

export function setCategory(cat) {
  selectedCategory = cat;
  dom.catButtons.forEach(button => {
    if (button.getAttribute('data-cat') === cat) {
      button.classList.add('active');
    } else {
      button.classList.remove('active'); 
    }
  });
}

export function resetForm() {
  dom.titleInput.value = '';
  dom.descInput.value  = '';
  touched.title = false;
  touched.desc  = false;
  clearErrors();
  setCategory('pedagogie');
}

export function openModal(editPostIt = null) {
  currentEditingPostIt = editPostIt;
  resetForm();
  
  if (editPostIt) {
    dom.titleInput.value = editPostIt.querySelector('.task-title-text').textContent;
    dom.descInput.value  = editPostIt.querySelector('.task-desc-text').textContent;
    setCategory(editPostIt.dataset.cat);
    document.querySelector('.sunu-app h2').textContent = "Modifier votre idée";
    dom.submitBtn.textContent = "Mettre à jour l'idée";
  } else {
    document.querySelector('.sunu-app h2').textContent = "Partagez votre idée";
    dom.submitBtn.textContent = "Ajouter au mur";
  }
  dom.submitBtn.disabled = false;
  dom.modalOverlay.classList.add('active');
}

export function closeModal() {
  currentEditingPostIt?.classList.remove('editing-mode');
  resetForm();
  currentEditingPostIt = null;
  dom.modalOverlay.classList.remove('active');
}
