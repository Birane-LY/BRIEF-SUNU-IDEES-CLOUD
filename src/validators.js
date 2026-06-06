// 1. Définition des Regex internes
const reDoubleStart = new RegExp(`^(?:([aàâæeéèêëiîïoôœuùûüyÿ])\\1|([bcçdfghjklmnpqrstvwxz])\\2)`, 'i');
const reDoubleEnd   = new RegExp(`(?:([aàâæeéèêëiîïoôœuùûüyÿ])\\1|([bcçdfghjklmnpqrstvwxz])\\2)$`, 'i');

// 2. Export de l'objet des validateurs (les règles métiers)
export const validators = {
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

// 3. Gestion de l'affichage HTML des erreurs
export function applyValidation(input, error) {
  const group = input.closest('.input-area');
  let errDiv = group.querySelector('.error-message');

  if (error) {
    group.classList.add('error');
    group.classList.remove('success');
    if (!errDiv) {
      errDiv = document.createElement('div');
      errDiv.className = 'error-message';
      group.appendChild(errDiv);
    }
    errDiv.textContent = error;
  } else {
    group.classList.remove('error');
    group.classList.add('success');
    if (errDiv) errDiv.remove();
  }
}

// 4. Nettoyage global des erreurs
export function clearErrors() {
  const groups = document.querySelectorAll('.input-area');
  groups.forEach(group => {
    group.classList.remove('error');
    group.classList.remove('success');
    const errDiv = group.querySelector('.error-message');
    if (errDiv) errDiv.remove();
  });
}

// 5. Liaison des événements DOM
export function attachValidation(input, key, touched) {
  input.addEventListener('blur', () => {
    touched[key] = true;
    applyValidation(input, validators[key](input.value.trim()));
  });
  input.addEventListener('input', () => {
    if (!touched[key]) return;
    applyValidation(input, validators[key](input.value.trim()));
  });
}
