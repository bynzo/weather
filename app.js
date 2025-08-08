// Note: It's best practice to replace this key with your own from OpenWeatherMap
const API_KEY = '3c3617c6d920dfb72f8d310a95f9d07d';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('Service worker registered successfully', reg))
            .catch(err => console.error('Service worker registration failed:', err));
    });
}

// Wait for the DOM to be fully loaded before running app logic
document.addEventListener('DOMContentLoaded', () => {
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
    
    // New UI Elements
    const themeToggle = document.getElementById('theme-toggle');
    const unitsToggle = document.getElementById('units-toggle');
    const saveLocationBtn = document.getElementById('save-location-btn');
    const savedLocationsSelect = document.getElementById('saved-locations-select');

    // --- STATE MANAGEMENT & SETTINGS ---
    let appState = {
        currentCity: null,
        settings: {
            theme: 'dark', // 'dark' or 'light'
            units: 'metric'  // 'metric' or 'imperial'
        },
        locations: []
    };
    
    // Load settings and locations from localStorage on startup
    const loadState = () => {
        const savedSettings = JSON.parse(localStorage.getItem('weatherAppSettings'));
        if (savedSettings) {
            appState.settings = savedSettings;
        }
        
        const savedLocations = JSON.parse(localStorage.getItem('weatherAppLocations'));
        if (savedLocations) {
            appState.locations = savedLocations;
        }
        
        applySettings();
        populateSavedLocationsDropdown();
    };

    // Save settings to localStorage
    const saveSettings = () => {
        localStorage.setItem('weatherAppSettings', JSON.stringify(appState.settings));
    };

    // Apply theme and unit toggle UI based on loaded settings
    const applySettings = () => {
        // Apply theme
        if (appState.settings.theme === 'light') {
            body.classList.add('light-mode');
            themeToggle.checked = false;
        } else {
            body.classList.remove('light-mode');
            themeToggle.checked = true;
        }
        // Apply units toggle state
        unitsToggle.checked = appState.settings.units === 'imperial';
    };

    // --- LOCATION MANAGEMENT ---
    const populateSavedLocationsDropdown = () => {
        savedLocationsSelect.innerHTML = '<option value="">Select a location</option>';
        appState.locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            savedLocationsSelect.appendChild(option);
        });
    };

    const saveLocations = () => {
        localStorage.setItem('weatherAppLocations', JSON.stringify(appState.locations));
    };

    const toggleSaveLocation = () => {
        const city = appState.currentCity;
        if (!city) return;

        const cityIndex = appState.locations.indexOf(city);
        if (cityIndex > -1) {
            // City is saved, so remove it
            appState.locations.splice(cityIndex, 1);
        } else {
            // City is not saved, so add it
            appState.locations.push(city);
        }
        saveLocations();
        populateSavedLocationsDropdown();
        updateSaveButtonUI();
    };
    
    const updateSaveButtonUI = () => {
        if (appState.currentCity && appState.locations.includes(appState.currentCity)) {
            saveLocationBtn.classList.add('saved');
            saveLocationBtn.textContent = '★'; // Saved star
            saveLocationBtn.title = 'Remove Location';
        } else {
            saveLocationBtn.classList.remove('saved');
            saveLocationBtn.textContent = '☆'; // Unsaved star
            saveLocationBtn.title = 'Save Location';
        }
    };
    
    // --- WEATHER DATA HANDLING ---
    const getWeatherData = async (location) => {
        showLoading();
        
        let url;
        if (typeof location === 'string') {
            url = `${BASE_URL}/weather?q=${location}&appid=${API_KEY}&units=${appState.settings.units}`;
        } else if (location && location.latitude && location.longitude) {
            url = `${BASE_URL}/weather?lat=${location.latitude}&lon=${location.longitude}&appid=${API_KEY}&units=${appState.settings.units}`;
        } else {
            showError('Invalid location provided.');
            return;
        }
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`City not found or API error. Status: ${response.status}`);
            }
            const data = await response.json();
            
            // Save data for offline use
            localStorage.setItem('lastWeatherData', JSON.stringify(data));
            
            updateUI(data);

        } catch (error) {
            console.error('Error fetching weather data:', error);
            // **IMPROVED OFFLINE EXPERIENCE**
            // If fetching fails, try to use the last saved data
            const lastData = JSON.parse(localStorage.getItem('lastWeatherData'));
            if (lastData) {
                console.log('Network failed. Displaying cached data.');
                updateUI(lastData);
                offlineMessage.classList.remove('hidden');
            } else {
                showError();
            }
        }
    };

    const getCurrentLocation = () => {
        // Check for a last-used city or default to geolocation
        const lastCity = appState.currentCity || appState.locations[0];
        if (lastCity) {
            getWeatherData(lastCity);
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const { latitude, longitude } = position.coords;
                getWeatherData({ latitude, longitude });
            }, err => {
                console.error('Geolocation error:', err);
                getWeatherData('New York'); // Fallback
            });
        } else {
            getWeatherData('London'); // Final fallback
        }
    };

    // --- UI UPDATES ---
    const showLoading = () => {
        loadingSpinner.classList.remove('hidden');
        weatherInfo.classList.add('hidden');
        errorMessage.classList.add('hidden');
        offlineMessage.classList.add('hidden');
    };

    const showError = (message = 'Could not fetch weather data. Please try again.') => {
        loadingSpinner.classList.add('hidden');
        errorMessage.querySelector('p').textContent = message;
        errorMessage.classList.remove('hidden');
    };

    const updateUI = (data) => {
        const { name, main, weather, wind, sys } = data;
        
        appState.currentCity = name; // Update current city in state

        // Update background based on weather
        body.className = ''; // Reset classes
        if (appState.settings.theme === 'light') {
            body.classList.add('light-mode');
        }
        const weatherMain = weather[0].main.toLowerCase();
        body.classList.add(weatherMain);

        // Update text content
        cityNameEl.textContent = name;
        dateEl.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric'
        });

        const tempUnit = appState.settings.units === 'metric' ? '°C' : '°F';
        const speedUnit = appState.settings.units === 'metric' ? 'km/h' : 'mph';
        
        temperatureEl.innerHTML = `${Math.round(main.temp)}${tempUnit}`;
        descriptionEl.textContent = weather[0].description;
        humidityValueEl.textContent = `${main.humidity}%`;
        
        // API gives m/s for metric and miles/hr for imperial. Convert m/s to km/h if needed.
        const windSpeed = appState.settings.units === 'metric' ? (wind.speed * 3.6).toFixed(1) : wind.speed.toFixed(1);
        windSpeedValueEl.textContent = `${windSpeed} ${speedUnit}`;
        
        // Set weather icon
        weatherIconEl.src = `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
        weatherIconEl.alt = weather[0].description;
        
        updateSaveButtonUI();

        // Show weather info and hide spinner
        loadingSpinner.classList.add('hidden');
        errorMessage.classList.add('hidden');
        weatherInfo.classList.remove('hidden');
    };

    // --- EVENT LISTENERS ---
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const city = searchInput.value.trim();
        if (city) {
            getWeatherData(city);
            searchInput.value = '';
        }
    });

    themeToggle.addEventListener('change', () => {
        appState.settings.theme = themeToggle.checked ? 'dark' : 'light';
        saveSettings();
        applySettings();
    });

    unitsToggle.addEventListener('change', () => {
        appState.settings.units = unitsToggle.checked ? 'imperial' : 'metric';
        saveSettings();
        // Re-fetch weather data for the current city with new units
        if (appState.currentCity) {
            getWeatherData(appState.currentCity);
        }
    });
    
    saveLocationBtn.addEventListener('click', toggleSaveLocation);
    
    savedLocationsSelect.addEventListener('change', (e) => {
        const selectedCity = e.target.value;
        if (selectedCity) {
            getWeatherData(selectedCity);
        }
    });
    
    window.addEventListener('online', () => {
        offlineMessage.classList.add('hidden');
        getCurrentLocation(); // Refresh data when connection returns
    });
    
    // --- INITIAL LOAD ---
    loadState();
    getCurrentLocation();
});