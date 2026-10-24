// Configuration principale de l’API
const API_CONFIG = {
  BASE_URL: 'http://localhost:3000/api', // URL du backend

  // Endpoints disponibles
  ENDPOINTS: {
    reservations: '/reservations',
    reviews: '/reviews',
    contact: '/contact',
    rooms: '/rooms',
    health: '/health'
  },

  // Clé Google Maps
  GOOGLE_MAPS_API_KEY: 'TA_CLE_ICI',

  // Coordonnées de l’hôtel
  HOTEL_COORDINATES: {
    lat: 9.5662457,
    lng: 1.1965787
  }
};


// Classe utilitaire pour appeler l’API
class API {

  // Méthode générique pour les requêtes HTTP
  static async request(endpoint, options = {}) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur requête');
      }

      return data;

    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Réservations
  static async createReservation(data) {
    return this.request(API_CONFIG.ENDPOINTS.reservations, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async getReservations(page = 1, limit = 10) {
    return this.request(`${API_CONFIG.ENDPOINTS.reservations}?page=${page}&limit=${limit}`);
  }

  // Avis clients
  static async createReview(data) {
    return this.request(API_CONFIG.ENDPOINTS.reviews, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async getReviews(page = 1, limit = 10) {
    return this.request(`${API_CONFIG.ENDPOINTS.reviews}?page=${page}&limit=${limit}`);
  }

  // Contact
  static async sendContactMessage(data) {
    return this.request(API_CONFIG.ENDPOINTS.contact, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Chambres
  static async getRooms() {
    return this.request(API_CONFIG.ENDPOINTS.rooms);
  }

  static async getRoomByType(type) {
    return this.request(`${API_CONFIG.ENDPOINTS.rooms}/${type}`);
  }
}


// Export pour Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_CONFIG, API };
}
