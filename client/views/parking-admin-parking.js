import PhotoSwipe from 'photoswipe';
import 'photoswipe/dist/photoswipe.css';

class ParkingAdminParkingView {
    constructor() {
        this.user = null;
        this.parkingId = null;
        this.parkingData = null;
        this.pollingTimer = null;
        this.cameras = [];
    }

    render(params) {
        this.parkingId = params.id;
        this.user = authService.getUser();
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        mainContent.innerHTML = `
            <button onclick="router.navigate('/parking-admin')" 
                    style="margin-bottom: 1rem; padding: 0.5rem 1rem; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem;">
                ← Назад к панели
            </button>

            <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
                <h1 style="color: #2c3e50; margin: 0;">Управление парковкой</h1>
            </div>

            <div id="parkingContent" style="display: none;">
                <div class="admin-grid" style="margin-bottom: 2rem;">
                    <div class="admin-card" style="cursor: default; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                        <div class="admin-card-icon" style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔌</div>
                        <h3 style="color: white; margin-bottom: 1rem;">Статус парковки</h3>
                        <div id="parkingStatusCard" style="text-align: center;">
                            <div style="margin-bottom: 1rem;">
                                <span id="parkingStatusText" style="font-size: 1.2rem; font-weight: bold;">—</span>
                            </div>
                            <label style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; cursor: pointer; padding: 0.75rem; background: rgba(255, 255, 255, 0.2); border-radius: 8px; transition: background 0.3s;">
                                <input type="checkbox" id="parkingStatusToggle" style="width: 24px; height: 24px; cursor: pointer;" onchange="window.parkingAdminParkingView.toggleParkingStatus()">
                                <span style="font-weight: bold; font-size: 1rem;">Активна</span>
                            </label>
                        </div>
                    </div>

                    <div class="admin-card" style="cursor: default;">
                        <div class="admin-card-icon">📹</div>
                        <h3>Камеры парковки</h3>
                        <div id="camerasList" style="text-align: left; margin-top: 1rem;">
                            <p style="color: #95a5a6;">Загрузка...</p>
                        </div>
                    </div>

                    <div class="admin-card" onclick="window.parkingAdminParkingView.openEditModal()" style="cursor: pointer;">
                        <div class="admin-card-icon">⚙️</div>
                        <h3>Настройки</h3>
                        <p>Редактировать информацию о парковке</p>
                    </div>
                </div>

                <section class="video-section">
                    <h2 class="video-title">${this.parkingData?.name || 'Парковка'}</h2>
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
            </div>

            <div id="loadingMessage" class="loading-message">Загрузка данных парковки...</div>
        `;

        window.parkingAdminParkingView = this;
        this.init();
    }

    async init() {
        await this.fetchParkingDetails();
        await this.fetchParkingCameras();
        this.renderEditModal();
    }

    async fetchParkingDetails() {
        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();

        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            const response = await fetch(`${API_HOST}/api/parkings/${this.parkingId}`, {
                headers: headers
            });

            if (!response.ok) {
                if (response.status === 403) {
                    toast.error('У вас нет доступа к этой парковке');
                    router.navigate('/parking-admin');
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 'success' && result.data) {
                this.parkingData = result.data;
                this.updateParkingDisplay();
                document.getElementById('parkingContent').style.display = 'block';
                document.getElementById('loadingMessage').style.display = 'none';
                this.startParkingPolling();
            } else {
                throw new Error('Unexpected response');
            }
        } catch (error) {
            console.error('Failed to load parking details:', error);
            toast.error('Не удалось загрузить данные парковки');
            const loadingMessage = document.getElementById('loadingMessage');
            if (loadingMessage) {
                loadingMessage.innerHTML = `
                    <div class="error-message">
                        <p>Не удалось загрузить данные парковки. Попробуйте позже.</p>
                        <button onclick="router.navigate('/parking-admin')" 
                                style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            Вернуться к списку парковок
                        </button>
                    </div>
                `;
            }
        } finally {
            if (window.app) {
                window.app.toggleLoader(false);
            }
        }
    }

    updateParkingDisplay() {
        if (!this.parkingData) return;

        const analysis = this.parkingData.analysis;
        const totalSpots = analysis?.total_spots ?? this.parkingData.total_spots ?? '—';
        const freeSpots = analysis?.free_spots ?? '—';
        const occupiedSpots = analysis?.occupied_spots ?? '—';
        const lastUpdate = analysis?.last_update || null;

        document.getElementById('totalSpaces').textContent = totalSpots;
        document.getElementById('freeSpaces').textContent = freeSpots;
        document.getElementById('occupiedSpaces').textContent = occupiedSpots;

        const isActive = this.parkingData.is_active === true;
        const statusToggle = document.getElementById('parkingStatusToggle');
        const statusText = document.getElementById('parkingStatusText');
        
        if (statusToggle) {
            statusToggle.checked = isActive;
        }
        
        if (statusText) {
            statusText.textContent = isActive ? 'Активна' : 'Неактивна';
            statusText.style.color = isActive ? '#2ecc71' : '#e74c3c';
        }

        if (lastUpdate) {
            const updateDate = new Date(lastUpdate);
            const formattedDate = updateDate.toLocaleString('ru-RU');
            const lastUpdateInfo = document.getElementById('lastUpdateInfo');
            if (lastUpdateInfo) {
                lastUpdateInfo.textContent = `Последнее обновление: ${formattedDate}`;
            }
        } else {
            const lastUpdateInfo = document.getElementById('lastUpdateInfo');
            if (lastUpdateInfo) {
                lastUpdateInfo.textContent = 'Данные анализа недоступны';
            }
        }

        const imageUrl = this.resolveImageUrl(this.parkingData.camera?.image_url || this.parkingData.last_picture);
        const imgElement = document.getElementById('parkingImage');
        if (imgElement && imageUrl) {
            imgElement.src = imageUrl;
            imgElement.style.cursor = 'pointer';
            imgElement.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Image clicked, src:', imgElement.src);
                this.openFullscreenImage(imgElement.src);
            };
            imgElement.onerror = function() {
                this.style.display = 'none';
            };
        }
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

    async fetchParkingCameras() {
        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();

        try {
            const response = await fetch(`${API_HOST}/api/parking-cameras?parking_id=${this.parkingId}`, {
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'success' && Array.isArray(result.data)) {
                const cameraIds = result.data.map(pc => +pc.camera_id).filter(id => !isNaN(id));
                this.cameras = [];
                
                for (const cameraId of cameraIds) {
                    try {
                        const cameraResponse = await fetch(`${API_HOST}/api/cameras/${cameraId}`, {
                            headers: headers
                        });
                        if (cameraResponse.ok) {
                            const cameraResult = await cameraResponse.json();
                            if (cameraResult.status === 'success' && cameraResult.data) {
                                this.cameras.push(cameraResult.data);
                            }
                        }
                    } catch (error) {
                        console.error(`Failed to fetch camera ${cameraId}:`, error);
                    }
                }
                
                this.updateCamerasDisplay();
            }
        } catch (error) {
            console.error('Failed to fetch parking cameras:', error);
            this.updateCamerasDisplay();
        }
    }

    updateCamerasDisplay() {
        const camerasListElement = document.getElementById('camerasList');
        if (!camerasListElement) return;

        if (this.cameras.length === 0) {
            camerasListElement.innerHTML = '<p style="color: #95a5a6;">Камеры не привязаны</p>';
            return;
        }

        const cameraTypeLabels = {
            'rtsp': 'RTSP',
            'static': 'Статическая'
        };

        const camerasHTML = this.cameras.map(camera => {
            const typeLabel = cameraTypeLabels[camera.camera_type] || camera.camera_type || 'Неизвестно';
            const statusColor = camera.is_active ? '#27ae60' : '#e74c3c';
            const statusText = camera.is_active ? 'Активна' : 'Неактивна';
            
            return `
                <div style="margin-bottom: 0.75rem; padding: 0.5rem; background: #f8f9fa; border-radius: 5px;">
                    <p style="margin: 0; font-weight: bold; color: #2c3e50;">${camera.name || `Камера ${camera.id}`}</p>
                    <p style="margin: 0.25rem 0 0 0; font-size: 0.9em; color: #7f8c8d;">
                        Тип: ${typeLabel} | 
                        <span style="color: ${statusColor};">${statusText}</span>
                    </p>
                </div>
            `;
        }).join('');

        camerasListElement.innerHTML = camerasHTML;
    }

    startParkingPolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
        }

        const interval = window.app?.POLLING_INTERVAL || 15000;
        this.pollingTimer = setInterval(() => {
            this.fetchParkingDetails();
            this.fetchParkingCameras();
        }, interval);
    }

    renderEditModal() {
        if (document.getElementById('editParkingModal')) return;

        const modal = document.createElement('div');
        modal.id = 'editParkingModal';
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>Редактировать парковку</h2>
                    <button class="auth-modal-close" onclick="window.parkingAdminParkingView.closeEditModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="editParkingForm" onsubmit="event.preventDefault(); window.parkingAdminParkingView.saveParking()">
                        <div class="form-group">
                            <label for="parkingNameInput">Название парковки:</label>
                            <input type="text" id="parkingNameInput" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="parkingAddressInput">Адрес:</label>
                            <input type="text" id="parkingAddressInput" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="parkingLatitudeInput">Широта:</label>
                            <input type="number" id="parkingLatitudeInput" class="form-control" step="any" required>
                        </div>
                        <div class="form-group">
                            <label for="parkingLongitudeInput">Долгота:</label>
                            <input type="number" id="parkingLongitudeInput" class="form-control" step="any" required>
                        </div>
                        <div class="form-group">
                            <label for="totalSpotsInput">Общее количество мест:</label>
                            <input type="number" id="totalSpotsInput" class="form-control" min="1" required>
                        </div>
                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input type="checkbox" id="parkingIsActiveInput" style="width: auto; cursor: pointer;">
                                <span>Парковка активна</span>
                            </label>
                        </div>
                        <div id="editParkingError" class="auth-error" style="display: none;"></div>
                        <div class="modal-footer">
                            <button type="button" onclick="window.parkingAdminParkingView.closeEditModal()" 
                                    style="padding: 0.5rem 1rem; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer;">
                                Отмена
                            </button>
                            <button type="submit" 
                                    style="padding: 0.5rem 1rem; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                                Сохранить
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeEditModal();
            }
        });
    }

    openEditModal() {
        if (!authService.isAuthenticated()) {
            toast.error('Вы не авторизованы. Пожалуйста, войдите в систему.');
            return;
        }

        const modal = document.getElementById('editParkingModal');
        if (!modal) return;

        if (this.parkingData) {
            const nameInput = document.getElementById('parkingNameInput');
            const addressInput = document.getElementById('parkingAddressInput');
            const latitudeInput = document.getElementById('parkingLatitudeInput');
            const longitudeInput = document.getElementById('parkingLongitudeInput');
            const totalSpotsInput = document.getElementById('totalSpotsInput');
            const isActiveInput = document.getElementById('parkingIsActiveInput');

            if (nameInput) nameInput.value = this.parkingData.name || '';
            if (addressInput) addressInput.value = this.parkingData.address || '';
            if (latitudeInput) latitudeInput.value = this.parkingData.latitude || '';
            if (longitudeInput) longitudeInput.value = this.parkingData.longitude || '';
            if (totalSpotsInput) totalSpotsInput.value = this.parkingData.total_spots || '';
            if (isActiveInput) isActiveInput.checked = this.parkingData.is_active === true;
        }

        const errorDiv = document.getElementById('editParkingError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeEditModal() {
        const modal = document.getElementById('editParkingModal');
        if (modal) {
            modal.style.display = 'none';
        }
        const errorDiv = document.getElementById('editParkingError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
        document.body.style.overflow = '';
    }

    async saveParking() {
        const nameInput = document.getElementById('parkingNameInput');
        const addressInput = document.getElementById('parkingAddressInput');
        const latitudeInput = document.getElementById('parkingLatitudeInput');
        const longitudeInput = document.getElementById('parkingLongitudeInput');
        const totalSpotsInput = document.getElementById('totalSpotsInput');
        const isActiveInput = document.getElementById('parkingIsActiveInput');
        const errorDiv = document.getElementById('editParkingError');
        const submitBtn = document.querySelector('#editParkingForm button[type="submit"]');

        if (!nameInput || !addressInput || !latitudeInput || !longitudeInput || !totalSpotsInput || !isActiveInput || !errorDiv) return;

        const name = nameInput.value.trim();
        const address = addressInput.value.trim();
        const latitude = parseFloat(latitudeInput.value);
        const longitude = parseFloat(longitudeInput.value);
        const totalSpots = parseInt(totalSpotsInput.value);

        if (!name || name.length === 0) {
            errorDiv.textContent = 'Введите название парковки';
            errorDiv.style.display = 'block';
            return;
        }

        if (!address || address.length === 0) {
            errorDiv.textContent = 'Введите адрес парковки';
            errorDiv.style.display = 'block';
            return;
        }

        if (isNaN(latitude) || latitude < -90 || latitude > 90) {
            errorDiv.textContent = 'Введите корректную широту (от -90 до 90)';
            errorDiv.style.display = 'block';
            return;
        }

        if (isNaN(longitude) || longitude < -180 || longitude > 180) {
            errorDiv.textContent = 'Введите корректную долготу (от -180 до 180)';
            errorDiv.style.display = 'block';
            return;
        }

        if (isNaN(totalSpots) || totalSpots < 1) {
            errorDiv.textContent = 'Введите корректное количество мест (минимум 1)';
            errorDiv.style.display = 'block';
            return;
        }

        const isActive = isActiveInput.checked;

        if (window.app) {
            window.app.toggleLoader(true);
        }

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Сохранение...';

        try {
            const API_HOST = getAPIHost();
            const headers = authService.getAuthHeaders();
            headers['Content-Type'] = 'application/json';

            const response = await fetch(`${API_HOST}/api/parkings/${this.parkingId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({
                    name: name,
                    address: address,
                    latitude: latitude,
                    longitude: longitude,
                    total_spots: totalSpots,
                    is_active: isActive
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'success') {
                toast.success('Информация о парковке успешно обновлена');
                this.closeEditModal();
                await this.fetchParkingDetails();
            } else {
                throw new Error(result.message || 'Ошибка при сохранении');
            }
        } catch (error) {
            console.error('Failed to save parking:', error);
            errorDiv.textContent = error.message || 'Ошибка при сохранении. Попробуйте позже.';
            errorDiv.style.display = 'block';
        } finally {
            if (window.app) {
                window.app.toggleLoader(false);
            }
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }


    destroy() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }

        const editModal = document.getElementById('editParkingModal');
        if (editModal) {
            editModal.remove();
        }
    }

    openFullscreenImage(imageSrc) {
        if (!imageSrc) {
            console.error('No image source provided');
            return;
        }

        console.log('Opening image:', imageSrc);

        const items = [{
            src: imageSrc,
            w: 1920,
            h: 1080
        }];

        try {
            const gallery = new PhotoSwipe({
                dataSource: items,
                index: 0
            });

            gallery.init();
        } catch (error) {
            console.error('Error initializing PhotoSwipe:', error);
            toast.error('Ошибка при открытии изображения: ' + error.message);
        }
    }

    async toggleParkingStatus() {
        const statusToggle = document.getElementById('parkingStatusToggle');
        if (!statusToggle || !this.parkingData) return;

        const newStatus = statusToggle.checked;
        const originalStatus = this.parkingData.is_active;

        if (window.app) {
            window.app.toggleLoader(true);
        }

        statusToggle.disabled = true;

        try {
            const API_HOST = getAPIHost();
            const headers = authService.getAuthHeaders();
            headers['Content-Type'] = 'application/json';

            const response = await fetch(`${API_HOST}/api/parkings/${this.parkingId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({
                    is_active: newStatus
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'success') {
                this.parkingData.is_active = newStatus;
                this.updateParkingDisplay();
                toast.success(newStatus ? 'Парковка активирована' : 'Парковка деактивирована');
            } else {
                throw new Error(result.message || 'Ошибка при сохранении');
            }
        } catch (error) {
            console.error('Failed to toggle parking status:', error);
            statusToggle.checked = originalStatus;
            toast.error(error.message || 'Ошибка при изменении статуса парковки');
        } finally {
            if (window.app) {
                window.app.toggleLoader(false);
            }
            statusToggle.disabled = false;
        }
    }
}

export { ParkingAdminParkingView };
window.ParkingAdminParkingView = ParkingAdminParkingView;

