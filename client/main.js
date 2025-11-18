const API_HOST = 'https://smartparkistu.ru';
const PARKINGS_ENDPOINT = `${API_HOST}/api/parkings`;
const POLLING_INTERVAL = 15000;
const parkingImageElement = document.getElementById('parkingImage');

let parkingData = [];
let currentVideo = 0;
let selectedParkingId = null;
let pollingTimer = null;

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function lastVideo() {
    currentVideo = (currentVideo - 1 + parkingData.length) % parkingData.length;
    updateVideoDisplay();
}

function nextVideo() {
    currentVideo = (currentVideo + 1) % parkingData.length;
    updateVideoDisplay();
}

function selectParking(parkingNumber) {
    currentVideo = parkingNumber;
    updateVideoDisplay();
    toggleSidebar();
}

function updateVideoDisplay() {
    if (!parkingData.length) {
        return;
    }

    const currentParking = parkingData[currentVideo];
    if (!currentParking) {
        return;
    }

    selectedParkingId = currentParking.id;
    document.querySelector('.video-title').textContent = currentParking.title;
    document.getElementById('totalSpaces').textContent = currentParking.totalSpaces;
    document.getElementById('freeSpaces').textContent = currentParking.freeSpaces;
    document.getElementById('parkingAddress').textContent = currentParking.address;
    document.getElementById('parkingId').textContent = currentParking.id;
    document.getElementById('parkingStatus').textContent = currentParking.isActive ? 'Активна' : 'Неактивна';
    document.getElementById('parkingCoords').textContent = `${currentParking.latitude}, ${currentParking.longitude}`;
    document.getElementById('parkingCreated').textContent = formatDate(currentParking.createdAt);
    updateParkingImage(currentParking.lastPicture);
    startParkingPolling();
}

function updateParkingList() {
    const list = document.getElementById('parkingList');
    list.innerHTML = '';

    if (!parkingData.length) {
        const emptyItem = document.createElement('li');
        emptyItem.textContent = 'Нет данных о парковках';
        emptyItem.style.cursor = 'default';
        list.appendChild(emptyItem);
        return;
    }

    parkingData.forEach((parking, index) => {
        const item = document.createElement('li');
        item.textContent = parking.title;
        item.onclick = () => selectParking(index);
        list.appendChild(item);
    });
}

function toggleLoader(show) {
    const loader = document.getElementById('loader');
    if (show) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('ru-RU');
}

function stopParkingPolling() {
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
    }
}

function startParkingPolling() {
    if (!selectedParkingId) return;
    stopParkingPolling();
    pollingTimer = setInterval(() => {
        fetchParkingDetails(selectedParkingId);
    }, POLLING_INTERVAL);
}

function formatParking(parking) {
    return {
        title: parking.name || 'Парковка',
        totalSpaces: parking.total_spots ?? '—',
        freeSpaces: parking.total_spots ?? '—',
        address: parking.address || '—',
        id: parking.id || '—',
        isActive: parking.is_active,
        latitude: parking.latitude || '—',
        longitude: parking.longitude || '—',
        createdAt: parking.created_at || parking.createdAt || null,
        lastPicture: resolveImageUrl(parking.last_picture || parking.lastPicture)
    };
}

function resolveImageUrl(imagePath) {
    if (!imagePath || typeof imagePath !== 'string') {
        return null;
    }
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    return `${API_HOST}${imagePath}`;
}

function updateParkingImage(imageUrl) {
    if (!parkingImageElement) {
        return;
    }
    if (imageUrl) {
        const cacheBuster = Date.now();
        parkingImageElement.src = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${cacheBuster}`;
        parkingImageElement.alt = 'Последнее изображение парковки';
    } else {
        parkingImageElement.removeAttribute('src');
        parkingImageElement.alt = 'Нет изображения';
    }
}

async function fetchParkingDetails(parkingId) {
    if (!parkingId) return;
    try {
        const response = await fetch(`${API_HOST}/api/parkings/${parkingId}`);
        const result = await response.json();
        if (result.status === 'success' && result.data) {
            const updatedParking = formatParking(result.data);
            const index = parkingData.findIndex((parking) => parking.id === parkingId);
            if (index !== -1) {
                parkingData[index] = updatedParking;
            } else {
                parkingData.push(updatedParking);
            }
            if (selectedParkingId === parkingId) {
                const selectedIndex = parkingData.findIndex((parking) => parking.id === parkingId);
                if (selectedIndex !== -1) {
                    currentVideo = selectedIndex;
                    updateVideoDisplay();
                }
            }
        } else {
            throw new Error('Unexpected response');
        }
    } catch (error) {
        console.error('Failed to refresh parking:', error);
    }
}

async function fetchParkingData(showLoader = false) {
    if (showLoader) {
        toggleLoader(true);
    }
    try {
        const response = await fetch(PARKINGS_ENDPOINT);
        const result = await response.json();
        if (result.status === 'success' && Array.isArray(result.data)) {
            parkingData = result.data.map(formatParking);
        } else {
            throw new Error('Unexpected response');
        }
    } catch (error) {
        console.error('Failed to load parkings:', error);
        alert('Не удалось загрузить список парковок. Попробуйте позже.');
        parkingData = [];
    } finally {
        updateParkingList();
        if (parkingData.length) {
            if (selectedParkingId) {
                const preservedIndex = parkingData.findIndex((parking) => parking.id === selectedParkingId);
                currentVideo = preservedIndex !== -1 ? preservedIndex : 0;
            } else {
                currentVideo = 0;
            }
            updateVideoDisplay();
        } else {
            selectedParkingId = null;
            stopParkingPolling();
        }
        if (showLoader) {
            toggleLoader(false);
        }
    }
}

function openAuthModal() {
    document.getElementById('authModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function closeAuthModal() {
    document.getElementById('authModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

document.getElementById('overlay').addEventListener('click', () => {
    if (document.getElementById('sidebar').classList.contains('active')) {
        toggleSidebar();
    }
    closeAuthModal();
});

document.querySelector('.auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Авторизация выполнена');
    closeAuthModal();
});

fetchParkingData(true);

