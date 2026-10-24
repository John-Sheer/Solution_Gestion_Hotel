/**
 * Module Animations - Hôtel
 * Animations au scroll et transitions fluides
 */

class AnimationController {
  constructor() {
    this.animatedElements = [];
    this.observers = [];
    this.init();
  }

  init() {
    // Attendre que le DOM soit chargé
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupAnimations());
    } else {
      this.setupAnimations();
    }
  }

  setupAnimations() {
    // Animer les sections au scroll
    this.animateSections();
    
    // Animer les cartes et éléments
    this.animateCards();
    
    // Compteurs animés
    this.animateCounters();
    
    // Effet parallaxe sur les images
    this.setupParallax();
    
    // Animations de hover personnalisées
    this.setupHoverEffects();
    
    // Smooth scroll pour les liens
    this.setupSmoothScroll();
  }

  animateSections() {
    const sections = document.querySelectorAll('section, .animate-section');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('section-visible');
          
          // Animer les enfants avec délai échelonné
          const children = entry.target.querySelectorAll('.animate-child');
          children.forEach((child, index) => {
            setTimeout(() => {
              child.classList.add('child-visible');
            }, index * 100);
          });
        }
      });
    }, { 
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    sections.forEach(section => {
      section.classList.add('animate-section');
      observer.observe(section);
    });

    this.observers.push(observer);
  }

  animateCards() {
    const cards = document.querySelectorAll('.card, .room-card, .service-card, .review-card');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('card-animate-in');
        }
      });
    }, { threshold: 0.2 });

    cards.forEach((card, index) => {
      card.style.animationDelay = `${index * 0.1}s`;
      observer.observe(card);
    });

    this.observers.push(observer);
  }

  animateCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
          this.animateCounter(entry.target);
          entry.target.classList.add('counted');
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
    this.observers.push(observer);
  }

  animateCounter(element) {
    const target = parseInt(element.getAttribute('data-counter'));
    const duration = 2000; // 2 secondes
    const increment = target / (duration / 16); // 60 FPS
    let current = 0;

    const updateCounter = () => {
      current += increment;
      if (current < target) {
        element.textContent = Math.floor(current);
        requestAnimationFrame(updateCounter);
      } else {
        element.textContent = target;
      }
    };

    updateCounter();
  }

  setupParallax() {
    const parallaxElements = document.querySelectorAll('.parallax');
    
    if (parallaxElements.length === 0) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          parallaxElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.5;
            
            element.style.transform = `translate3d(0, ${rate}px, 0)`;
          });
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  setupHoverEffects() {
    // Effet de levitation sur les cartes
    const hoverCards = document.querySelectorAll('.hover-lift');
    
    hoverCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px)';
        card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.boxShadow = '';
      });
    });

    // Effet de zoom sur les images
    const zoomImages = document.querySelectorAll('.zoom-hover');
    
    zoomImages.forEach(img => {
      img.addEventListener('mouseenter', () => {
        img.style.transform = 'scale(1.1)';
      });
      
      img.addEventListener('mouseleave', () => {
        img.style.transform = '';
      });
    });
  }

  setupSmoothScroll() {
    // Smooth scroll pour tous les liens d'ancre
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        
        // Ignorer les liens vides
        if (href === '#' || href === '#!') return;
        
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          
          const headerOffset = 80; // Hauteur du header fixe
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  // Méthodes utilitaires pour ajouter des animations custom
  fadeIn(element, duration = 500) {
    element.style.opacity = '0';
    element.style.display = 'block';
    
    let opacity = 0;
    const increment = 1 / (duration / 16);
    
    const animate = () => {
      opacity += increment;
      if (opacity < 1) {
        element.style.opacity = opacity;
        requestAnimationFrame(animate);
      } else {
        element.style.opacity = '1';
      }
    };
    
    animate();
  }

  fadeOut(element, duration = 500) {
    let opacity = 1;
    const increment = 1 / (duration / 16);
    
    const animate = () => {
      opacity -= increment;
      if (opacity > 0) {
        element.style.opacity = opacity;
        requestAnimationFrame(animate);
      } else {
        element.style.opacity = '0';
        element.style.display = 'none';
      }
    };
    
    animate();
  }

  slideIn(element, direction = 'left', duration = 500) {
    const directions = {
      left: 'translateX(-100%)',
      right: 'translateX(100%)',
      top: 'translateY(-100%)',
      bottom: 'translateY(100%)'
    };

    element.style.transform = directions[direction];
    element.style.transition = `transform ${duration}ms ease-out`;
    element.style.display = 'block';

    requestAnimationFrame(() => {
      element.style.transform = 'translate(0, 0)';
    });
  }

  // Cleanup
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
  }
}

// Animation de chargement de page
class PageLoader {
  constructor() {
    this.loader = null;
    this.init();
  }

  init() {
    // Créer l'overlay de chargement
    this.createLoader();
    
    // Masquer au chargement complet
    window.addEventListener('load', () => {
      this.hide();
    });
  }

  createLoader() {
    this.loader = document.createElement('div');
    this.loader.className = 'page-loader';
    this.loader.innerHTML = `
      <div class="loader-content">
        <div class="spinner"></div>
        <p>Chargement...</p>
      </div>
    `;
    
    document.body.appendChild(this.loader);
  }

  hide() {
    if (this.loader) {
      this.loader.classList.add('fade-out');
      setTimeout(() => {
        this.loader.remove();
      }, 500);
    }
  }
}

// Initialisation
let animationController;
let pageLoader;

document.addEventListener('DOMContentLoaded', () => {
  animationController = new AnimationController();
  pageLoader = new PageLoader();
});

// Export pour utilisation externe
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AnimationController, PageLoader };
}
