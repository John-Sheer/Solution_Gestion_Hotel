/**
 * Module Avis Clients - Hôtel
 * Gère l'affichage et la soumission des avis
 */

class ReviewsSystem {
  constructor() {
    this.reviewsContainer = document.getElementById('reviewsContainer');
    this.reviewForm = document.getElementById('reviewForm');
    this.statsContainer = document.getElementById('reviewStats');
    this.currentPage = 1;
    this.limit = 6;
    
    this.init();
  }

  init() {
    // Charger les avis au chargement de la page
    if (this.reviewsContainer) {
      this.loadReviews();
    }

    // Gérer le formulaire de soumission
    if (this.reviewForm) {
      this.initReviewForm();
    }
  }

  async loadReviews(page = 1) {
    try {
      const response = await API.getReviews(page, this.limit);
      
      if (response.success) {
        this.displayReviews(response.data);
        this.displayStats(response.stats);
        this.displayPagination(response.pagination);
      }
    } catch (error) {
      console.error('Erreur chargement avis:', error);
      this.reviewsContainer.innerHTML = `
        <div class="error-message">
          <p>Impossible de charger les avis pour le moment.</p>
        </div>
      `;
    }
  }

  displayStats(stats) {
    if (!this.statsContainer || !stats) return;

    const moyenne = stats.moyenneNote || 0;
    const total = stats.totalAvis || 0;

    this.statsContainer.innerHTML = `
      <div class="review-stats">
        <div class="stats-summary">
          <div class="average-rating">
            <span class="rating-number">${moyenne.toFixed(1)}</span>
            <div class="stars">${this.renderStars(moyenne)}</div>
            <span class="total-reviews">${total} avis</span>
          </div>
        </div>
        
        <div class="rating-breakdown">
          ${this.renderRatingBar(5, stats.note5, total)}
          ${this.renderRatingBar(4, stats.note4, total)}
          ${this.renderRatingBar(3, stats.note3, total)}
          ${this.renderRatingBar(2, stats.note2, total)}
          ${this.renderRatingBar(1, stats.note1, total)}
        </div>
      </div>
    `;
  }

  renderRatingBar(stars, count, total) {
    const percentage = total > 0 ? (count / total * 100) : 0;
    return `
      <div class="rating-bar">
        <span class="star-label">${stars} ⭐</span>
        <div class="bar-container">
          <div class="bar-fill" style="width: ${percentage}%"></div>
        </div>
        <span class="count">${count}</span>
      </div>
    `;
  }

  displayReviews(reviews) {
    if (!this.reviewsContainer) return;

    if (reviews.length === 0) {
      this.reviewsContainer.innerHTML = `
        <div class="no-reviews">
          <p>Aucun avis pour le moment. Soyez le premier à partager votre expérience !</p>
        </div>
      `;
      return;
    }

    this.reviewsContainer.innerHTML = reviews.map(review => `
      <div class="review-card" data-review-id="${review._id}">
        <div class="review-header">
          <div class="reviewer-info">
            <div class="reviewer-avatar">
              ${review.nom.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 class="reviewer-name">${this.escapeHtml(review.nom)}</h4>
              <div class="review-meta">
                ${this.renderStars(review.note)}
                <span class="review-date">${this.formatDate(review.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="review-content">
          <h5 class="review-title">${this.escapeHtml(review.titre)}</h5>
          <p class="review-text">${this.escapeHtml(review.commentaire)}</p>
          
          ${review.typeChbre ? `
            <span class="room-badge">Chambre ${review.typeChbre}</span>
          ` : ''}
          
          ${review.estVerifie ? `
            <span class="verified-badge">✓ Séjour vérifié</span>
          ` : ''}
        </div>
        
        ${review.reponseHotel ? `
          <div class="hotel-reply">
            <strong>Réponse de l'hôtel :</strong>
            <p>${this.escapeHtml(review.reponseHotel.texte)}</p>
            <span class="reply-date">${this.formatDate(review.reponseHotel.dateReponse)}</span>
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  displayPagination(pagination) {
    if (!pagination || pagination.pages <= 1) return;

    const paginationContainer = document.getElementById('reviewsPagination');
    if (!paginationContainer) return;

    let paginationHTML = '<div class="pagination">';
    
    // Bouton Précédent
    if (pagination.page > 1) {
      paginationHTML += `
        <button class="pagination-btn" data-page="${pagination.page - 1}">
          ← Précédent
        </button>
      `;
    }

    // Numéros de page
    for (let i = 1; i <= pagination.pages; i++) {
      if (i === 1 || i === pagination.pages || (i >= pagination.page - 1 && i <= pagination.page + 1)) {
        paginationHTML += `
          <button class="pagination-btn ${i === pagination.page ? 'active' : ''}" data-page="${i}">
            ${i}
          </button>
        `;
      } else if (i === pagination.page - 2 || i === pagination.page + 2) {
        paginationHTML += '<span class="pagination-dots">...</span>';
      }
    }

    // Bouton Suivant
    if (pagination.page < pagination.pages) {
      paginationHTML += `
        <button class="pagination-btn" data-page="${pagination.page + 1}">
          Suivant →
        </button>
      `;
    }

    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;

    // Événements de pagination
    paginationContainer.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page);
        this.loadReviews(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  initReviewForm() {
    // Gestion des étoiles
    const starInputs = this.reviewForm.querySelectorAll('.star-rating input');
    starInputs.forEach((input, index) => {
      input.addEventListener('change', () => {
        this.updateStarDisplay(index + 1);
      });
    });

    // Soumission du formulaire
    this.reviewForm.addEventListener('submit', (e) => this.handleReviewSubmit(e));
  }

  updateStarDisplay(rating) {
    const starLabels = this.reviewForm.querySelectorAll('.star-rating label');
    starLabels.forEach((label, index) => {
      if (index < rating) {
        label.classList.add('selected');
      } else {
        label.classList.remove('selected');
      }
    });
  }

  async handleReviewSubmit(e) {
    e.preventDefault();

    const submitBtn = this.reviewForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours...';

    try {
      const formData = new FormData(this.reviewForm);
      const data = Object.fromEntries(formData.entries());

      const response = await API.createReview(data);

      if (response.success) {
        this.showNotification('Merci pour votre avis ! Il sera publié après modération.', 'success');
        this.reviewForm.reset();
        this.updateStarDisplay(0);
      }
    } catch (error) {
      console.error('Erreur:', error);
      this.showNotification('Erreur lors de l\'envoi de l\'avis. Veuillez réessayer.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Envoyer mon avis';
    }
  }

  renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars += '⭐';
      } else if (i === fullStars && hasHalfStar) {
        stars += '⭐';
      } else {
        stars += '☆';
      }
    }

    return stars;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
  new ReviewsSystem();
});
