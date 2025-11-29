// Страница администратора парковки (parking_administrator)
class ParkingAdminView {
    constructor() {
        this.user = null;
        this.parkingData = [];
    }

    render(params) {
        this.user = authService.getUser();
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        mainContent.innerHTML = `
            <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
                <h1 style="color: #2c3e50; margin: 0;">Панель администратора парковки</h1>
                <button onclick="window.logout()" style="padding: 0.5rem 1rem; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Выйти
                </button>
            </div>
            
            <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 2rem;">
                <p style="color: #666; margin-bottom: 0.5rem;">Пользователь: <strong>${this.user?.username || '—'}</strong></p>
                <p style="color: #666; margin: 0;">Роль: <strong>Администратор парковки</strong></p>
            </div>

            <section class="video-section">
                <h2 class="video-title">Мои парковки</h2>
                <div id="myParkingsList" class="parkings-grid" style="margin-top: 1rem;">
                    <div class="loading-message">Загрузка парковок...</div>
                </div>
            </section>
        `;

        this.init();
    }

    init() {
        this.fetchMyParkings();
    }

    async fetchMyParkings() {
        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();
        
        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            const response = await fetch(`${API_HOST}/api/parkings`, {
                headers: headers
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 'success' && Array.isArray(result.data)) {
                this.parkingData = result.data.map(p => this.formatParking(p));
                this.renderParkingsList();
            } else {
                throw new Error('Unexpected response');
            }
        } catch (error) {
            console.error('Failed to load parkings:', error);
            const list = document.getElementById('myParkingsList');
            if (list) {
                list.innerHTML = `
                    <div class="error-message">
                        <p>Не удалось загрузить список парковок. Попробуйте позже.</p>
                    </div>
                `;
            }
            this.parkingData = [];
        } finally {
            if (window.app) {
                window.app.toggleLoader(false);
            }
        }
    }

    renderParkingsList() {
        const list = document.getElementById('myParkingsList');
        if (!list) return;

        if (!this.parkingData.length) {
            list.innerHTML = `
                <div class="empty-message">
                    <p>У вас нет назначенных парковок</p>
                </div>
            `;
            return;
        }

        list.innerHTML = this.parkingData.map(parking => this.createParkingCard(parking)).join('');
        
        // Добавляем обработчики кликов
        this.parkingData.forEach(parking => {
            const card = document.getElementById(`parking-card-${parking.id}`);
            if (card) {
                card.addEventListener('click', () => {
                    router.navigate(`/parking/${parking.id}`);
                });
            }
        });
    }

    createParkingCard(parking) {
        const statusClass = parking.isActive ? 'active' : 'inactive';
        const statusText = parking.isActive ? 'Активна' : 'Неактивна';
        const statusColor = parking.isActive ? '#27ae60' : '#95a5a6';
        
        let occupancyPercent = '—';
        let occupancyColor = '#999';
        if (parking.hasAnalysis && parking.totalSpaces !== '—' && parking.totalSpaces > 0) {
            const occupied = parking.occupiedSpaces !== '—' ? parking.occupiedSpaces : 0;
            const percent = Math.round((occupied / parking.totalSpaces) * 100);
            occupancyPercent = `${percent}%`;
            if (percent < 50) {
                occupancyColor = '#27ae60';
            } else if (percent < 80) {
                occupancyColor = '#f39c12';
            } else {
                occupancyColor = '#e74c3c';
            }
        }

        return `
            <div class="parking-card" id="parking-card-${parking.id}">
                <div class="parking-card-image">
                    ${parking.lastPicture 
                        ? `<img src="${parking.lastPicture}" alt="${parking.title}" onerror="this.style.display='none'">`
                        : '<div class="no-image">Нет изображения</div>'
                    }
                    <div class="parking-card-status" style="background-color: ${statusColor}">
                        ${statusText}
                    </div>
                </div>
                <div class="parking-card-content">
                    <h3 class="parking-card-title">${parking.title}</h3>
                    <p class="parking-card-address">📍 ${parking.address}</p>
                    <div class="parking-card-stats">
                        <div class="stat-item">
                            <span class="stat-label">Всего мест:</span>
                            <span class="stat-value">${parking.totalSpaces}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label" style="color: #27ae60;">Свободно:</span>
                            <span class="stat-value" style="color: #27ae60; font-weight: bold;">${parking.freeSpaces}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label" style="color: #e74c3c;">Занято:</span>
                            <span class="stat-value" style="color: #e74c3c; font-weight: bold;">${parking.occupiedSpaces}</span>
                        </div>
                    </div>
                    ${parking.hasAnalysis 
                        ? `<div class="parking-card-occupancy" style="color: ${occupancyColor};">
                            Заполненность: <strong>${occupancyPercent}</strong>
                           </div>`
                        : '<div class="parking-card-occupancy" style="color: #999;">Данные анализа недоступны</div>'
                    }
                </div>
                <div class="parking-card-footer">
                    <span class="view-details">Подробнее →</span>
                </div>
            </div>
        `;
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

    destroy() {
        // Очистка не требуется
    }
}

