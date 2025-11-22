const API_HOST = 'https://smartparkistu.ru';
// const API_HOST = 'http://localhost:3000';
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

    // Используем данные анализа от нейронной сети
    const totalSpaces = currentParking.hasAnalysis
        ? currentParking.totalSpaces
        : (currentParking.totalSpaces || '—');
    const freeSpaces = currentParking.hasAnalysis
        ? currentParking.freeSpaces
        : '—';
    const occupiedSpaces = currentParking.hasAnalysis
        ? currentParking.occupiedSpaces
        : '—';

    const totalSpacesElement = document.getElementById('totalSpaces');
    const freeSpacesElement = document.getElementById('freeSpaces');
    const occupiedSpacesElement = document.getElementById('occupiedSpaces');

    if (totalSpacesElement) {
        totalSpacesElement.textContent = totalSpaces;
    }
    if (freeSpacesElement) {
        freeSpacesElement.textContent = freeSpaces;
    }
    if (occupiedSpacesElement) {
        occupiedSpacesElement.textContent = occupiedSpaces;
    }

    // Обновляем стиль для свободных мест в зависимости от наличия данных анализа
    if (freeSpacesElement) {
        if (currentParking.hasAnalysis) {
            freeSpacesElement.style.color = '#219a52';
            if (freeSpacesElement.parentElement) {
                freeSpacesElement.parentElement.style.color = '#219a52';
            }
        } else {
            freeSpacesElement.style.color = '#999';
            if (freeSpacesElement.parentElement) {
                freeSpacesElement.parentElement.style.color = '#999';
            }
        }
    }

    document.getElementById('parkingAddress').textContent = currentParking.address;
    document.getElementById('parkingId').textContent = currentParking.id;
    document.getElementById('parkingStatus').textContent = currentParking.isActive ? 'Активна' : 'Неактивна';
    document.getElementById('parkingCoords').textContent = `${currentParking.latitude}, ${currentParking.longitude}`;
    document.getElementById('parkingCreated').textContent = formatDate(currentParking.createdAt);

    // Отображаем время последнего обновления анализа, если доступно
    const lastUpdateInfoElement = document.getElementById('lastUpdateInfo');
    if (lastUpdateInfoElement) {
        if (currentParking.hasAnalysis && currentParking.analysisLastUpdate) {
            const lastUpdateDate = new Date(currentParking.analysisLastUpdate);
            const now = new Date();
            const diffMs = now - lastUpdateDate;
            const diffSeconds = Math.floor(diffMs / 1000);
            const diffMinutes = Math.floor(diffSeconds / 60);

            let timeAgo = '';
            if (diffSeconds < 60) {
                timeAgo = `${diffSeconds} сек. назад`;
            } else if (diffMinutes < 60) {
                timeAgo = `${diffMinutes} мин. назад`;
            } else {
                const diffHours = Math.floor(diffMinutes / 60);
                timeAgo = `${diffHours} ч. назад`;
            }

            lastUpdateInfoElement.textContent = `Обновлено: ${timeAgo}`;
            lastUpdateInfoElement.style.color = '#219a52';
        } else {
            lastUpdateInfoElement.textContent = 'Данные анализа недоступны';
            lastUpdateInfoElement.style.color = '#999';
        }
    }

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
    // Используем данные анализа от нейронной сети, если они доступны
    const analysis = parking.analysis;
    const totalSpots = analysis?.total_spots ?? parking.total_spots ?? '—';
    const freeSpots = analysis?.free_spots ?? '—';
    const occupiedSpots = analysis?.occupied_spots ?? '—';
    const spotsState = analysis?.spots_state || null;
    const slotDetails = analysis?.slot_details || null;
    const lastUpdate = analysis?.last_update || null;

    // Используем изображение от камеры, если доступно
    const cameraImageUrl = parking.camera?.image_url
        ? resolveImageUrl(parking.camera.image_url)
        : null;

    // Приоритет: изображение от камеры > last_picture
    const imageUrl = cameraImageUrl || resolveImageUrl(parking.last_picture || parking.lastPicture);

    return {
        title: parking.name || 'Парковка',
        totalSpaces: totalSpots,
        freeSpaces: freeSpots,
        occupiedSpaces: occupiedSpots,
        spotsState: spotsState,
        slotDetails: slotDetails,
        address: parking.address || '—',
        id: parking.id || '—',
        isActive: parking.is_active,
        latitude: parking.latitude || '—',
        longitude: parking.longitude || '—',
        createdAt: parking.created_at || parking.createdAt || null,
        lastPicture: imageUrl,
        camera: parking.camera || null,
        analysisLastUpdate: lastUpdate,
        hasAnalysis: analysis !== null && analysis !== undefined
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
        // Добавляем cache buster для обновления изображения при polling
        // Для static камер изображение меняется каждые 15 секунд
        const cacheBuster = Date.now();
        const separator = imageUrl.includes('?') ? '&' : '?';
        parkingImageElement.src = `${imageUrl}${separator}t=${cacheBuster}`;
        parkingImageElement.alt = 'Изображение с камеры парковки';
        parkingImageElement.onerror = function () {
            // Если изображение не загрузилось, скрываем его
            this.style.display = 'none';
        };
        parkingImageElement.onload = function () {
            // Показываем изображение при успешной загрузке
            this.style.display = '';
        };
    } else {
        parkingImageElement.removeAttribute('src');
        parkingImageElement.alt = 'Нет изображения';
        parkingImageElement.style.display = 'none';
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
        // При ошибке обновления показываем, что данные могут быть устаревшими
        const lastUpdateInfoElement = document.getElementById('lastUpdateInfo');
        if (lastUpdateInfoElement && selectedParkingId === parkingId) {
            lastUpdateInfoElement.textContent = 'Ошибка обновления данных';
            lastUpdateInfoElement.style.color = '#e74c3c';
        }
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

