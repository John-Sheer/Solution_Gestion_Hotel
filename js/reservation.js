/**
 * Module de Réservation - Hotel Le Prince
 * Gère le formulaire de réservation et l'envoi à l'API
 */

class ReservationSystem {
  constructor() {
    this.form = document.getElementById('reservationForm');
    this.submitBtn = document.getElementById('submitReservation');
    this.init();
  }

  init() {
    if (!this.form) return;

    // Définir les dates minimales
    this.setMinDates();
    
    // Écouteurs d'événements
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Validation en temps réel
    this.form.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
    });

    // Calculer le prix en temps réel
    const dateInputs = ['dateArrivee', 'dateDepart', 'typeChbre'];
    dateInputs.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', () => this.calculatePrice());
      }
    });
  }

  setMinDates() {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const dateArrivee = document.getElementById('dateArrivee');
    const dateDepart = document.getElementById('dateDepart');

    if (dateArrivee) {
      dateArrivee.min = today;
      dateArrivee.addEventListener('change', () => {
        if (dateDepart) {
          const minDepart = new Date(dateArrivee.value);
          minDepart.setDate(minDepart.getDate() + 1);
          dateDepart.min = minDepart.toISOString().split('T')[0];
        }
      });
    }

    if (dateDepart) {
      dateDepart.min = tomorrowStr;
    }
  }

  calculatePrice() {
    const typeChbre = document.getElementById('typeChbre')?.value;
    const dateArrivee = document.getElementById('dateArrivee')?.value;
    const dateDepart = document.getElementById('dateDepart')?.value;
    const priceDisplay = document.getElementById('priceEstimate');

    if (!typeChbre || !dateArrivee || !dateDepart || !priceDisplay) return;

    const prix = {
      simple: 15000,
      double: 25000,
      familiale: 35000,
      suite: 50000,
      presidentielle: 75000,
      penthouse: 100000
    };

    const debut = new Date(dateArrivee);
    const fin = new Date(dateDepart);
    const nuits = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24));

    if (nuits > 0) {
      const total = prix[typeChbre] * nuits;
      priceDisplay.innerHTML = `
        <div class="price-estimate">
          <p><strong>${nuits}</strong> nuit${nuits > 1 ? 's' : ''} × <strong>${prix[typeChbre].toLocaleString()} FCFA</strong></p>
          <p class="total-price">Total estimé : <strong>${total.toLocaleString()} FCFA</strong></p>
        </div>
      `;
    }
  }

  validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';

    // Validation par type de champ
    switch (field.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isValid = emailRegex.test(value);
        errorMessage = 'Email invalide';
        break;
      
      case 'tel':
        const telRegex = /^\+?[0-9\s-]{8,}$/;
        isValid = telRegex.test(value);
        errorMessage = 'Numéro de téléphone invalide';
        break;
      
      case 'text':
        isValid = value.length >= 2;
        errorMessage = 'Minimum 2 caractères';
        break;
      
      case 'number':
        const num = parseInt(value);
        isValid = num >= parseInt(field.min) && num <= parseInt(field.max);
        errorMessage = `Doit être entre ${field.min} et ${field.max}`;
        break;
      
      case 'date':
        isValid = value !== '';
        errorMessage = 'Date requise';
        break;
    }

    // Afficher/masquer le message d'erreur
    this.showFieldError(field, isValid, errorMessage);
    return isValid;
  }

  showFieldError(field, isValid, message) {
    let errorDiv = field.parentElement.querySelector('.field-error');
    
    if (!isValid) {
      field.classList.add('invalid');
      field.classList.remove('valid');
      
      if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        field.parentElement.appendChild(errorDiv);
      }
      errorDiv.textContent = message;
    } else {
      field.classList.remove('invalid');
      field.classList.add('valid');
      
      if (errorDiv) {
        errorDiv.remove();
      }
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    // Valider tous les champs
    const inputs = this.form.querySelectorAll('input[required], select[required]');
    let allValid = true;

    inputs.forEach(input => {
      if (!this.validateField(input)) {
        allValid = false;
      }
    });

    if (!allValid) {
      this.showNotification('Veuillez corriger les erreurs dans le formulaire', 'error');
      return;
    }

    // Désactiver le bouton pendant l'envoi
    this.submitBtn.disabled = true;
    this.submitBtn.textContent = 'Envoi en cours...';

    try {
      // Collecter les données du formulaire
      const formData = new FormData(this.form);
      const data = Object.fromEntries(formData.entries());

      // Envoyer à l'API
      const response = await API.createReservation(data);

      // Succès
      this.showNotification('Réservation envoyée avec succès ! Vous recevrez un email de confirmation.', 'success');
      this.form.reset();
      document.getElementById('priceEstimate').innerHTML = '';

      // Redirection après 3 secondes
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 3000);

    } catch (error) {
      console.error('Erreur:', error);
      this.showNotification('Erreur lors de l\'envoi de la réservation. Veuillez réessayer.', 'error');
    } finally {
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = 'Réserver maintenant';
    }
  }

  showNotification(message, type = 'info') {
    // Supprimer les notifications existantes
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button class="notification-close">&times;</button>
    `;

    document.body.appendChild(notification);

    // Animation d'entrée
    setTimeout(() => notification.classList.add('show'), 10);

    // Fermeture au clic
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    });

    // Auto-fermeture après 5 secondes
    setTimeout(() => {
      if (notification.parentElement) {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  new ReservationSystem();
});
