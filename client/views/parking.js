// Страница деталей парковки
class ParkingView {
    constructor() {
        this.parkingData = null;
        this.pollingTimer = null;
        this.parkingId = null;
    }

    render(params) {
        this.parkingId = params.id;
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        mainContent.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <a href="#" data-route="/" style="color: #3498db; text-decoration: none; font-size: 1rem;">
                    ← Назад к списку парковок
                </a>
            </div>
            <section class="parking-details">
                <p>Адрес: <span id="parkingAddress">—</span></p>
                <p>ID: <span id="parkingId">—</span></p>
                <p>Статус: <span id="parkingStatus">—</span></p>
                <p>Координаты: <span id="parkingCoords">—</span></p>
                <p>Создана: <span id="parkingCreated">—</span></p>
            </section>
            <section class="video-section">
                <h2 class="video-title">Загрузка...</h2>
                
                <div class="parking-info">
                    <div class="parking-stats">
                        <div>Всего мест: <span id="totalSpaces">—</span></div>
                        <div><span style="color: #219a52;"> Свободно: <span id="freeSpaces">—</span></span></div>
                        <div><span style="color: #e74c3c;"> Занято: <span id="occupiedSpaces">—</span></span></div>
                        <div style="font-size: 0.85em; color: #666; margin-top: 5px;">
                            <span id="lastUpdateInfo"></span>
                        </div>
                    </div>
                    <div class="legend">
                        <div class="legend-item">
                            <div class="color-box free"></div>
                            <span style="color:#219a52;">Свободно</span>
                        </div>
                        <div class="legend-item">
                            <div class="color-box occupied"></div>
                            <span style="color: #e74c3c;">Занято</span>
                        </div>
                    </div>
                </div>
                
                <div class="video-container">
                    <div class="video-placeholder">
                        <img id="parkingImage" src="" alt="видеотрансляция">
                    </div>
                </div>
            </section>
        `;

        this.init();
    }

    init() {
        if (this.parkingId) {
            this.fetchParkingDetails(this.parkingId, true);
        }
    }

    updateDisplay() {
        if (!this.parkingData) {
            return;
        }

        const parking = this.parkingData;
        document.querySelector('.video-title').textContent = parking.title;

        const totalSpaces = parking.hasAnalysis
            ? parking.totalSpaces
            : (parking.totalSpaces || '—');
        const freeSpaces = parking.hasAnalysis
            ? parking.freeSpaces
            : '—';
        const occupiedSpaces = parking.hasAnalysis
            ? parking.occupiedSpaces
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

        if (freeSpacesElement) {
            if (parking.hasAnalysis) {
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

        document.getElementById('parkingAddress').textContent = parking.address;
        document.getElementById('parkingId').textContent = parking.id;
        document.getElementById('parkingStatus').textContent = parking.isActive ? 'Активна' : 'Неактивна';
        document.getElementById('parkingCoords').textContent = `${parking.latitude}, ${parking.longitude}`;
        document.getElementById('parkingCreated').textContent = this.formatDate(parking.createdAt);

        const lastUpdateInfoElement = document.getElementById('lastUpdateInfo');
        if (lastUpdateInfoElement) {
            if (parking.hasAnalysis && parking.analysisLastUpdate) {
                const lastUpdateDate = new Date(parking.analysisLastUpdate);
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

        this.updateParkingImage(parking.lastPicture);
        this.startParkingPolling();
    }

    formatDate(dateString) {
        if (!dateString) return '—';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleString('ru-RU');
    }

    stopParkingPolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
    }

    startParkingPolling() {
        if (!this.parkingId) return;
        this.stopParkingPolling();
        const POLLING_INTERVAL = window.app?.POLLING_INTERVAL || 15000;
        this.pollingTimer = setInterval(() => {
            this.fetchParkingDetails(this.parkingId);
        }, POLLING_INTERVAL);
    }

    formatParking(parking) {
        const analysis = parking.analysis;
        const totalSpots = analysis?.total_spots ?? parking.total_spots ?? '—';
        const freeSpots = analysis?.free_spots ?? '—';
        const occupiedSpots = analysis?.occupied_spots ?? '—';
        const spotsState = analysis?.spots_state || null;
        const slotDetails = analysis?.slot_details || null;
        const lastUpdate = analysis?.last_update || null;

        const cameraImageUrl = parking.camera?.image_url
            ? this.resolveImageUrl(parking.camera.image_url)
            : null;

        const imageUrl = cameraImageUrl || this.resolveImageUrl(parking.last_picture || parking.lastPicture);

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

    resolveImageUrl(imagePath) {
        if (!imagePath || typeof imagePath !== 'string') {
            return null;
        }
        const API_HOST = getAPIHost();
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
        }
        return `${API_HOST}${imagePath}`;
    }

    updateParkingImage(imageUrl) {
        const parkingImageElement = document.getElementById('parkingImage');
        if (!parkingImageElement) {
            return;
        }
        if (imageUrl) {
            const cacheBuster = Date.now();
            const separator = imageUrl.includes('?') ? '&' : '?';
            parkingImageElement.src = `${imageUrl}${separator}t=${cacheBuster}`;
            parkingImageElement.alt = 'Изображение с камеры парковки';
            parkingImageElement.onerror = function () {
                this.style.display = 'none';
            };
            parkingImageElement.onload = function () {
                this.style.display = '';
            };
        } else {
            parkingImageElement.removeAttribute('src');
            parkingImageElement.alt = 'Нет изображения';
            parkingImageElement.style.display = 'none';
        }
    }

    async fetchParkingDetails(parkingId, showLoader = false) {
        if (!parkingId) return;
        const API_HOST = getAPIHost();
        
        if (showLoader && window.app) {
            window.app.toggleLoader(true);
        }
        
        try {
            const headers = authService.getAuthHeaders();
            const response = await fetch(`${API_HOST}/api/parkings/${parkingId}`, {
                headers: headers
            });
            const result = await response.json();
            if (result.status === 'success' && result.data) {
                this.parkingData = this.formatParking(result.data);
                this.updateDisplay();
            } else {
                throw new Error('Unexpected response');
            }
        } catch (error) {
            console.error('Failed to load parking:', error);
            toast.error('Не удалось загрузить данные парковки. Попробуйте позже.');
        } finally {
            if (showLoader && window.app) {
                window.app.toggleLoader(false);
            }
        }
    }

    destroy() {
        this.stopParkingPolling();
    }
}

