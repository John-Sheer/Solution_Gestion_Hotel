/**
 * Module Formulaire de Contact - Hotel Le Prince
 */

class ContactForm {
  constructor() {
    this.form = document.getElementById('contactForm');
    this.init();
  }

  init() {
    if (!this.form) return;

    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Validation en temps réel
    this.form.querySelectorAll('input, textarea').forEach(field => {
      field.addEventListener('blur', () => this.validateField(field));
      field.addEventListener('input', () => this.clearFieldError(field));
    });
  }

  validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';

    if (field.hasAttribute('required') && !value) {
      isValid = false;
      errorMessage = 'Ce champ est requis';
    } else {
      switch (field.type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          isValid = emailRegex.test(value);
          errorMessage = 'Email invalide';
          break;
        
        case 'tel':
          if (value) {
            const telRegex = /^\+?[0-9\s-]{8,}$/;
            isValid = telRegex.test(value);
            errorMessage = 'Numéro de téléphone invalide';
          }
          break;
        
        case 'text':
          if (field.hasAttribute('minlength')) {
            const minLength = parseInt(field.getAttribute('minlength'));
            isValid = value.length >= minLength;
            errorMessage = `Minimum ${minLength} caractères`;
          }
          break;
        
        case 'textarea':
          if (field.hasAttribute('minlength')) {
            const minLength = parseInt(field.getAttribute('minlength'));
            isValid = value.length >= minLength;
            errorMessage = `Minimum ${minLength} caractères`;
          }
          break;
      }
    }

    this.showFieldError(field, isValid, errorMessage);
    return isValid;
  }

  showFieldError(field, isValid, message) {
    this.clearFieldError(field);
    
    if (!isValid) {
      field.classList.add('invalid');
      
      const errorDiv = document.createElement('div');
      errorDiv.className = 'field-error';
      errorDiv.textContent = message;
      field.parentElement.appendChild(errorDiv);
    } else {
      field.classList.remove('invalid');
      field.classList.add('valid');
    }
  }

  clearFieldError(field) {
    field.classList.remove('invalid', 'valid');
    const existingError = field.parentElement.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    // Valider tous les champs
    const fields = this.form.querySelectorAll('input, textarea');
    let allValid = true;

    fields.forEach(field => {
      if (!this.validateField(field)) {
        allValid = false;
      }
    });

    if (!allValid) {
      this.showNotification('Veuillez corriger les erreurs dans le formulaire', 'error');
      return;
    }

    const submitBtn = this.form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours...';

    try {
      const formData = new FormData(this.form);
      const data = Object.fromEntries(formData.entries());

      const response = await API.sendContactMessage(data);

      if (response.success) {
        this.showNotification('Message envoyé avec succès ! Nous vous répondrons bientôt.', 'success');
        this.form.reset();
        fields.forEach(field => this.clearFieldError(field));
      }
    } catch (error) {
      console.error('Erreur:', error);
      this.showNotification('Erreur lors de l\'envoi du message. Veuillez réessayer.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Envoyer le message';
    }
  }

  showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button class="notification-close">&times;</button>
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);

    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    });

    setTimeout(() => {
      if (notification.parentElement) {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
  new ContactForm();
});
