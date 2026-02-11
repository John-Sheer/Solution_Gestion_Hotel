/**
 * Galerie d'images Interactive - Hotel Le Prince
 * Lightbox avec navigation, zoom et diaporama
 */

class ImageGallery {
  constructor(gallerySelector = '.image-gallery') {
    this.galleries = document.querySelectorAll(gallerySelector);
    this.currentIndex = 0;
    this.images = [];
    this.lightbox = null;
    this.slideshowInterval = null;
    
    this.init();
  }

  init() {
    if (this.galleries.length === 0) return;

    this.galleries.forEach(gallery => {
      this.initGallery(gallery);
    });

    this.createLightbox();
    this.attachKeyboardEvents();
  }

  initGallery(gallery) {
    const images = gallery.querySelectorAll('.gallery-item');
    
    images.forEach((item, index) => {
      item.addEventListener('click', () => {
        this.openLightbox(gallery, index);
      });

      // Animation au scroll
      this.observeElement(item);
    });
  }

  createLightbox() {
    this.lightbox = document.createElement('div');
    this.lightbox.className = 'lightbox';
    this.lightbox.innerHTML = `
      <div class="lightbox-content">
        <button class="lightbox-close" aria-label="Fermer">&times;</button>
        
        <button class="lightbox-nav lightbox-prev" aria-label="Précédent">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        
        <button class="lightbox-nav lightbox-next" aria-label="Suivant">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        
        <div class="lightbox-image-container">
          <img src="" alt="" class="lightbox-image">
          <div class="lightbox-caption"></div>
        </div>
        
        <div class="lightbox-controls">
          <button class="lightbox-zoom-in" aria-label="Zoom +">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          
          <button class="lightbox-zoom-out" aria-label="Zoom -">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </button>
          
          <button class="lightbox-slideshow" aria-label="Diaporama">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
          
          <span class="lightbox-counter">1 / 1</span>
        </div>
        
        <div class="lightbox-thumbnails"></div>
      </div>
    `;

    document.body.appendChild(this.lightbox);

    // Événements
    this.lightbox.querySelector('.lightbox-close').addEventListener('click', () => this.closeLightbox());
    this.lightbox.querySelector('.lightbox-prev').addEventListener('click', () => this.showPrevImage());
    this.lightbox.querySelector('.lightbox-next').addEventListener('click', () => this.showNextImage());
    this.lightbox.querySelector('.lightbox-zoom-in').addEventListener('click', () => this.zoomIn());
    this.lightbox.querySelector('.lightbox-zoom-out').addEventListener('click', () => this.zoomOut());
    this.lightbox.querySelector('.lightbox-slideshow').addEventListener('click', () => this.toggleSlideshow());
    
    // Fermer en cliquant sur le fond
    this.lightbox.addEventListener('click', (e) => {
      if (e.target === this.lightbox) {
        this.closeLightbox();
      }
    });
  }

  openLightbox(gallery, index) {
    // Collecter toutes les images de la galerie
    this.images = Array.from(gallery.querySelectorAll('.gallery-item')).map(item => ({
      src: item.dataset.fullSrc || item.querySelector('img').src,
      alt: item.querySelector('img').alt,
      caption: item.dataset.caption || item.querySelector('img').alt
    }));

    this.currentIndex = index;
    this.showImage(index);
    this.createThumbnails();
    
    this.lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeLightbox() {
    this.lightbox.classList.remove('active');
    document.body.style.overflow = '';
    this.stopSlideshow();
    this.resetZoom();
  }

  showImage(index) {
    if (index < 0 || index >= this.images.length) return;

    this.currentIndex = index;
    const image = this.images[index];
    
    const img = this.lightbox.querySelector('.lightbox-image');
    const caption = this.lightbox.querySelector('.lightbox-caption');
    const counter = this.lightbox.querySelector('.lightbox-counter');

    img.src = image.src;
    img.alt = image.alt;
    caption.textContent = image.caption;
    counter.textContent = `${index + 1} / ${this.images.length}`;

    // Mettre à jour les miniatures
    this.updateThumbnails();
    this.resetZoom();
  }

  showNextImage() {
    const nextIndex = (this.currentIndex + 1) % this.images.length;
    this.showImage(nextIndex);
  }

  showPrevImage() {
    const prevIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.showImage(prevIndex);
  }

  createThumbnails() {
    const container = this.lightbox.querySelector('.lightbox-thumbnails');
    
    container.innerHTML = this.images.map((img, index) => `
      <img 
        src="${img.src}" 
        alt="${img.alt}"
        class="lightbox-thumbnail ${index === this.currentIndex ? 'active' : ''}"
        data-index="${index}"
      >
    `).join('');

    container.querySelectorAll('.lightbox-thumbnail').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const index = parseInt(thumb.dataset.index);
        this.showImage(index);
      });
    });
  }

  updateThumbnails() {
    const thumbnails = this.lightbox.querySelectorAll('.lightbox-thumbnail');
    thumbnails.forEach((thumb, index) => {
      thumb.classList.toggle('active', index === this.currentIndex);
    });
  }

  zoomIn() {
    const img = this.lightbox.querySelector('.lightbox-image');
    const currentScale = parseFloat(img.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || 1);
    const newScale = Math.min(currentScale + 0.2, 3);
    img.style.transform = `scale(${newScale})`;
    img.style.cursor = 'move';
    
    // Activer le déplacement
    this.enableDrag(img);
  }

  zoomOut() {
    const img = this.lightbox.querySelector('.lightbox-image');
    const currentScale = parseFloat(img.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || 1);
    const newScale = Math.max(currentScale - 0.2, 1);
    img.style.transform = `scale(${newScale})`;
    
    if (newScale === 1) {
      img.style.cursor = '';
      this.disableDrag(img);
    }
  }

  resetZoom() {
    const img = this.lightbox.querySelector('.lightbox-image');
    img.style.transform = '';
    img.style.cursor = '';
    this.disableDrag(img);
  }

  enableDrag(img) {
    let isDragging = false;
    let startX, startY, translateX = 0, translateY = 0;

    const onMouseDown = (e) => {
      isDragging = true;
      startX = e.clientX - translateX;
      startY = e.clientY - translateY;
      img.style.cursor = 'grabbing';
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      translateX = e.clientX - startX;
      translateY = e.clientY - startY;
      const scale = parseFloat(img.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || 1);
      img.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
    };

    const onMouseUp = () => {
      isDragging = false;
      img.style.cursor = 'move';
    };

    img.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    img.dragHandlers = { onMouseDown, onMouseMove, onMouseUp };
  }

  disableDrag(img) {
    if (img.dragHandlers) {
      img.removeEventListener('mousedown', img.dragHandlers.onMouseDown);
      document.removeEventListener('mousemove', img.dragHandlers.onMouseMove);
      document.removeEventListener('mouseup', img.dragHandlers.onMouseUp);
      delete img.dragHandlers;
    }
  }

  toggleSlideshow() {
    const btn = this.lightbox.querySelector('.lightbox-slideshow');
    
    if (this.slideshowInterval) {
      this.stopSlideshow();
      btn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      `;
    } else {
      this.startSlideshow();
      btn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
      `;
    }
  }

  startSlideshow() {
    this.slideshowInterval = setInterval(() => {
      this.showNextImage();
    }, 3000);
  }

  stopSlideshow() {
    if (this.slideshowInterval) {
      clearInterval(this.slideshowInterval);
      this.slideshowInterval = null;
    }
  }

  attachKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      if (!this.lightbox.classList.contains('active')) return;

      switch (e.key) {
        case 'Escape':
          this.closeLightbox();
          break;
        case 'ArrowLeft':
          this.showPrevImage();
          break;
        case 'ArrowRight':
          this.showNextImage();
          break;
        case '+':
        case '=':
          this.zoomIn();
          break;
        case '-':
        case '_':
          this.zoomOut();
          break;
        case ' ':
          e.preventDefault();
          this.toggleSlideshow();
          break;
      }
    });
  }

  observeElement(element) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    observer.observe(element);
  }
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
  new ImageGallery();
});
