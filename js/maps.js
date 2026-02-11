/**
 * Module Google Maps - Hotel Le Prince
 * Affiche la carte avec marqueur personnalisé
 */

class HotelMap {
  constructor(mapElementId = 'hotelMap') {
    this.mapElement = document.getElementById(mapElementId);
    this.map = null;
    this.marker = null;
    
    // Coordonnées de l'hôtel (à ajuster selon l'emplacement réel)
    this.hotelLocation = API_CONFIG.HOTEL_COORDINATES;
    
    this.init();
  }

  init() {
    if (!this.mapElement) return;

    // Vérifier si Google Maps est chargé
    if (typeof google === 'undefined') {
      console.error('Google Maps n\'est pas chargé');
      this.showFallback();
      return;
    }

    this.initMap();
  }

  async initMap() {
    try {
      // Options de la carte
      const mapOptions = {
        center: this.hotelLocation,
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        styles: this.getMapStyles()
      };

      // Créer la carte
      this.map = new google.maps.Map(this.mapElement, mapOptions);

      // Ajouter le marqueur
      this.addMarker();

      // Ajouter un cercle pour visualiser la zone
      this.addCircle();

      // Ajouter des contrôles personnalisés
      this.addCustomControls();

    } catch (error) {
      console.error('Erreur initialisation carte:', error);
      this.showFallback();
    }
  }

  addMarker() {
    // Icône personnalisée (optionnel)
    const icon = {
      url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzAwN2JmZiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM4LjEzIDIgNSA1LjEzIDUgOWMwIDUuMjUgNyAxMyA3IDEzczctNy43NSA3LTEzYzAtMy44Ny0zLjEzLTctNy03em0wIDkuNWMtMS4zOCAwLTIuNS0xLjEyLTIuNS0yLjVzMS4xMi0yLjUgMi41LTIuNSAyLjUgMS4xMiAyLjUgMi41LTEuMTIgMi41LTIuNSAyLjV6Ii8+PC9zdmc+',
      scaledSize: new google.maps.Size(48, 48),
      anchor: new google.maps.Point(24, 48)
    };

    this.marker = new google.maps.Marker({
      position: this.hotelLocation,
      map: this.map,
      icon: icon,
      title: 'Hotel Le Prince',
      animation: google.maps.Animation.DROP
    });

    // InfoWindow avec informations
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 10px; font-family: Arial, sans-serif;">
          <h3 style="margin: 0 0 10px 0; color: #007bff;">Hotel Le Prince</h3>
          <p style="margin: 5px 0;"><strong>📍 Adresse:</strong> Lomé, Togo</p>
          <p style="margin: 5px 0;"><strong>📞 Téléphone:</strong> +228 00 00 00 00</p>
          <p style="margin: 5px 0;"><strong>✉️ Email:</strong> contact@hotelleprince.tg</p>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${this.hotelLocation.lat},${this.hotelLocation.lng}" 
             target="_blank" 
             style="display: inline-block; margin-top: 10px; color: #007bff; text-decoration: none;">
            📍 Obtenir l'itinéraire
          </a>
        </div>
      `
    });

    // Ouvrir l'infoWindow au clic sur le marqueur
    this.marker.addListener('click', () => {
      infoWindow.open(this.map, this.marker);
    });

    // Ouvrir l'infoWindow par défaut
    setTimeout(() => {
      infoWindow.open(this.map, this.marker);
    }, 500);
  }

  addCircle() {
    // Cercle pour montrer la zone autour de l'hôtel
    new google.maps.Circle({
      strokeColor: '#007bff',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#007bff',
      fillOpacity: 0.15,
      map: this.map,
      center: this.hotelLocation,
      radius: 500 // 500 mètres
    });
  }

  addCustomControls() {
    // Bouton "Me localiser"
    const locationButton = document.createElement('button');
    locationButton.textContent = '📍 Ma position';
    locationButton.className = 'map-control-button';
    locationButton.style.cssText = `
      background: white;
      border: 2px solid #fff;
      border-radius: 3px;
      box-shadow: 0 2px 6px rgba(0,0,0,.3);
      cursor: pointer;
      margin: 10px;
      padding: 10px 15px;
      font-size: 14px;
      font-weight: 500;
    `;

    locationButton.addEventListener('click', () => {
      this.showUserLocation();
    });

    this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(locationButton);

    // Bouton "Directions"
    const directionsButton = document.createElement('button');
    directionsButton.textContent = '🚗 Itinéraire';
    directionsButton.className = 'map-control-button';
    directionsButton.style.cssText = locationButton.style.cssText;

    directionsButton.addEventListener('click', () => {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${this.hotelLocation.lat},${this.hotelLocation.lng}`,
        '_blank'
      );
    });

    this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(directionsButton);
  }

  showUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // Ajouter un marqueur pour l'utilisateur
          new google.maps.Marker({
            position: userLocation,
            map: this.map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: 'white',
              strokeWeight: 2
            },
            title: 'Votre position'
          });

          // Ajuster la vue pour montrer les deux points
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(userLocation);
          bounds.extend(this.hotelLocation);
          this.map.fitBounds(bounds);

          // Calculer la distance
          const distance = this.calculateDistance(userLocation, this.hotelLocation);
          this.showDistanceInfo(distance);
        },
        (error) => {
          console.error('Erreur géolocalisation:', error);
          alert('Impossible d\'obtenir votre position');
        }
      );
    } else {
      alert('La géolocalisation n\'est pas supportée par votre navigateur');
    }
  }

  calculateDistance(point1, point2) {
    // Formule de Haversine
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLon = this.toRad(point2.lng - point1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(point1.lat)) * Math.cos(this.toRad(point2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  showDistanceInfo(distance) {
    const infoDiv = document.createElement('div');
    infoDiv.className = 'distance-info';
    infoDiv.style.cssText = `
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      font-family: Arial, sans-serif;
    `;
    
    infoDiv.innerHTML = `
      <strong>Distance:</strong> ${distance.toFixed(2)} km<br>
      <small>Environ ${Math.round(distance * 12)} minutes en voiture</small>
    `;

    this.mapElement.parentElement.style.position = 'relative';
    this.mapElement.parentElement.appendChild(infoDiv);

    setTimeout(() => {
      infoDiv.style.transition = 'opacity 0.5s';
      infoDiv.style.opacity = '0';
      setTimeout(() => infoDiv.remove(), 500);
    }, 5000);
  }

  getMapStyles() {
    // Style personnalisé pour la carte (optionnel)
    return [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'on' }]
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#a2daf2' }]
      }
    ];
  }

  showFallback() {
    // Afficher une image statique ou un message en cas d'erreur
    this.mapElement.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        background: #f5f5f5;
        text-align: center;
        padding: 20px;
      ">
        <div>
          <p style="font-size: 18px; margin-bottom: 10px;">📍 Hotel Le Prince</p>
          <p>Lomé, Togo</p>
          <a href="https://www.google.com/maps/search/?api=1&query=${this.hotelLocation.lat},${this.hotelLocation.lng}" 
             target="_blank"
             style="
               display: inline-block;
               margin-top: 15px;
               padding: 10px 20px;
               background: #007bff;
               color: white;
               text-decoration: none;
               border-radius: 5px;
             ">
            Ouvrir dans Google Maps
          </a>
        </div>
      </div>
    `;
  }
}

// Fonction de chargement de Google Maps
function loadGoogleMaps() {
  if (typeof google !== 'undefined') {
    new HotelMap();
    return;
  }

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${API_CONFIG.GOOGLE_MAPS_API_KEY}&callback=initMap`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

// Callback pour Google Maps
window.initMap = function() {
  new HotelMap();
};

// Initialiser au chargement si l'élément carte existe
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('hotelMap')) {
    loadGoogleMaps();
  }
});
