const API_KEY = 'edcafc8a574dc6c95d7ea997c8c0e37f'; // Replace with your OpenWeatherMap API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// DOM elements
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const cityNameEl = document.getElementById('city-name');
const dateEl = document.getElementById('date');
const weatherIconEl = document.getElementById('weather-icon');
const temperatureEl = document.getElementById('temperature');
const descriptionEl = document.getElementById('description');
const humidityValueEl = document.getElementById('humidity-value');
const windSpeedValueEl = document.getElementById('wind-speed-value');
const loadingSpinner = document.getElementById('loading-spinner');
const weatherInfo = document.getElementById('weather-info');
const offlineMessage = document.getElementById('offline-message');
const errorMessage = document.getElementById('error-message');
const body = document.body;

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => {
                console.log('Service worker registered successfully', reg);
            })
            .catch(err => {
                console.error('Service worker registration failed:', err);
            });
    });
}

// Function to fetch weather data from API
const getWeatherData = async (location) => {
    try {
        loadingSpinner.classList.remove('hidden');
        weatherInfo.classList.add('hidden');
        errorMessage.classList.add('hidden');
        offlineMessage.classList.add('hidden');

        let url;
        if (typeof location === 'string') {
            url = `${BASE_URL}/weather?q=${location}&appid=${API_KEY}&units=metric`;
        } else if (location && location.latitude && location.longitude) {
            url = `${BASE_URL}/weather?lat=${location.latitude}&lon=${location.longitude}&appid=${API_KEY}&units=metric`;
        } else {
            throw new Error('Invalid location provided.');
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('City not found or API error.');
        }

        const data = await response.json();
        updateUI(data);

    } catch (error) {
        console.error('Error fetching weather data:', error);
        loadingSpinner.classList.add('hidden');
        errorMessage.classList.remove('hidden');
    }
};

// Function to get user's current location
const getCurrentLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            getWeatherData({ latitude: lat, longitude: lon });
        }, err => {
            console.error('Geolocation error:', err);
            // Fallback to a default city if geolocation fails
            getWeatherData('New York');
        });
    } else {
        console.warn('Geolocation is not supported by this browser.');
        // Fallback to a default city
        getWeatherData('London');
    }
};

// Function to update the UI with new data
const updateUI = (data) => {
    const { name, main, weather, wind } = data;
    const weatherMain = weather[0].main.toLowerCase();

    // Update background and animations based on weather
    body.className = ''; // Reset class
    body.classList.add(weatherMain);

    // Update text content
    cityNameEl.textContent = name;
    dateEl.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    temperatureEl.innerHTML = `${Math.round(main.temp)}&deg;C`;
    descriptionEl.textContent = weather[0].description;
    humidityValueEl.textContent = `${main.humidity}%`;
    windSpeedValueEl.textContent = `${(wind.speed * 3.6).toFixed(1)} km/h`; // Convert m/s to km/h

    // Set weather icon
    const iconCode = weather[0].icon;
    weatherIconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    weatherIconEl.alt = weather[0].description;

    // Show weather info and hide spinner
    loadingSpinner.classList.add('hidden');
    weatherInfo.classList.remove('hidden');
};

// Event listener for the search form
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = searchInput.value.trim();
    if (city) {
        getWeatherData(city);
        searchInput.value = ''; // Clear input
    }
});

// Check network status
window.addEventListener('offline', () => {
    offlineMessage.classList.remove('hidden');
});

window.addEventListener('online', () => {
    offlineMessage.classList.add('hidden');
    // Reload weather data when back online
    getCurrentLocation();
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    getCurrentLocation();
});