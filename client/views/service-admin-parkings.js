class ServiceAdminParkingsView {
    constructor() {
        this.user = null;
        this.parkingData = [];
    }

    render(params) {
        this.user = authService.getUser();
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        mainContent.innerHTML = `
            <div style="margin-bottom: 1rem;">
                <button onclick="router.navigate('/service-admin')" style="padding: 0.5rem 1rem; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem;">
                    ← Назад к панели
                </button>
            </div>
            <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
                <h1 style="color: #2c3e50; margin: 0;">Управление парковками</h1>
                <button onclick="window.logout()" style="padding: 0.5rem 1rem; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Выйти
                </button>
            </div>
            
            <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <p style="color: #666; margin: 0;">Всего парковок: <strong id="totalParkings">—</strong></p>
                    <button onclick="window.serviceAdminParkingsView.openCreateModal()" style="padding: 0.5rem 1rem; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        + Создать парковку
                    </button>
                </div>
            </div>

            <section class="video-section">
                <h2 class="video-title">Список парковок</h2>
                <div id="parkingsList" class="parkings-grid" style="margin-top: 1rem;">
                    <div class="loading-message">Загрузка парковок...</div>
                </div>
            </section>
        `;

        this.renderEditModal();
        this.renderCreateModal();

        window.serviceAdminParkingsView = this;

        this.init();
    }

    renderEditModal() {
        const body = document.body;
        if (document.getElementById('editParkingModal')) return; // Уже существует
        
        const modalHTML = `
            <div class="edit-parking-modal" id="editParkingModal" style="display: none;">
                <div class="edit-parking-modal-content">
                    <div class="edit-parking-modal-header">
                        <h2>Редактирование парковки</h2>
                        <button onclick="window.serviceAdminParkingsView.closeEditModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">×</button>
                    </div>
                    <div class="edit-parking-modal-body" id="editParkingModalBody">
                        <!-- Контент будет загружен динамически -->
                    </div>
                </div>
                <div class="edit-parking-modal-overlay" onclick="window.serviceAdminParkingsView.closeEditModal()"></div>
            </div>
        `;
        body.insertAdjacentHTML('beforeend', modalHTML);
    }

    renderCreateModal() {
        const body = document.body;
        if (document.getElementById('createParkingModal')) return; // Уже существует
        
        const modalHTML = `
            <div class="edit-parking-modal" id="createParkingModal" style="display: none;">
                <div class="edit-parking-modal-content">
                    <div class="edit-parking-modal-header">
                        <h2>Создание парковки</h2>
                        <button onclick="window.serviceAdminParkingsView.closeCreateModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">×</button>
                    </div>
                    <div class="edit-parking-modal-body" id="createParkingModalBody">
                        <!-- Контент будет загружен динамически -->
                    </div>
                </div>
                <div class="edit-parking-modal-overlay" onclick="window.serviceAdminParkingsView.closeCreateModal()"></div>
            </div>
        `;
        body.insertAdjacentHTML('beforeend', modalHTML);
    }

    async openCreateModal() {
        const modal = document.getElementById('createParkingModal');
        const modalBody = document.getElementById('createParkingModalBody');
        if (!modal || !modalBody) return;

        if (!authService.isAuthenticated()) {
            toast.error('Вы не авторизованы. Пожалуйста, войдите в систему.');
            return;
        }

        const currentUser = await authService.getCurrentUser();
        if (!currentUser || !authService.isSuperAdmin()) {
            toast.warning('У вас нет прав для создания парковок.');
            return;
        }

        modal.style.display = 'flex';
        
        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            const users = await this.fetchUsers();
            modalBody.innerHTML = this.renderCreateForm(users);
        } catch (error) {
            console.error('Failed to load users:', error);
            let errorMessage = 'Ошибка загрузки данных';
            let shouldRelogin = false;
            
            if (error.message.includes('Unauthorized') || error.message.includes('401')) {
                const currentUser = await authService.getCurrentUser();
                if (!currentUser) {
                    errorMessage = 'Ошибка авторизации. Пожалуйста, войдите в систему заново.';
                    shouldRelogin = true;
                } else {
                    errorMessage = 'Ошибка доступа. Убедитесь, что у вас есть права суперадминистратора.';
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            modalBody.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <p style="color: #e74c3c;">${errorMessage}</p>
                    ${shouldRelogin ? '<p style="color: #666; margin-top: 0.5rem; font-size: 0.9rem;">Токен истек или недействителен</p>' : ''}
                    <button onclick="window.serviceAdminParkingsView.closeCreateModal()${shouldRelogin ? '; window.app.openAuthModal()' : ''}" 
                            style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Закрыть
                    </button>
                </div>
            `;
        } finally {
            if (window.app) {
                window.app.toggleLoader(false);
            }
        }
    }

    closeCreateModal() {
        const modal = document.getElementById('createParkingModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    renderCreateForm(users) {
        return `
            <form id="createParkingForm" onsubmit="event.preventDefault(); window.serviceAdminParkingsView.createParking()">
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Название парковки *</label>
                    <input type="text" id="newParkingName" required 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Адрес *</label>
                    <input type="text" id="newParkingAddress" required 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Широта</label>
                        <input type="number" step="any" id="newParkingLatitude" 
                               style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Долгота</label>
                        <input type="number" step="any" id="newParkingLongitude" 
                               style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                    </div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Всего мест</label>
                    <input type="number" id="newParkingTotalSpots" value="0" min="0" 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="newParkingIsActive" checked 
                               style="width: 20px; height: 20px; cursor: pointer;">
                        <span style="font-weight: bold; color: #2c3e50;">Парковка активна</span>
                    </label>
                </div>

                <div style="margin-bottom: 1.5rem; padding-top: 1.5rem; border-top: 2px solid #eee;">
                    <label style="display: block; margin-bottom: 1rem; font-weight: bold; color: #2c3e50;">Администраторы парковки</label>
                    <div id="newParkingAdminsList" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px; padding: 1rem;">
                        ${users.length === 0 
                            ? '<p style="color: #999; text-align: center;">Нет доступных администраторов</p>'
                            : users.map(user => `
                                <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; cursor: pointer; border-radius: 5px; margin-bottom: 0.5rem;">
                                    <input type="checkbox" value="${user.id}" 
                                           style="width: 18px; height: 18px; cursor: pointer;">
                                    <span>${user.username} (ID: ${user.id})</span>
                                </label>
                            `).join('')
                        }
                    </div>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem; padding-top: 1.5rem; border-top: 2px solid #eee;">
                    <button type="button" onclick="window.serviceAdminParkingsView.closeCreateModal()" 
                            style="padding: 0.75rem 1.5rem; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem;">
                        Отмена
                    </button>
                    <button type="submit" 
                            style="padding: 0.75rem 1.5rem; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem; font-weight: bold;">
                        Создать
                    </button>
                </div>
            </form>
        `;
    }

    async createParking() {
        const name = document.getElementById('newParkingName').value;
        const address = document.getElementById('newParkingAddress').value;
        const latitude = document.getElementById('newParkingLatitude').value;
        const longitude = document.getElementById('newParkingLongitude').value;
        const totalSpots = document.getElementById('newParkingTotalSpots').value;
        const isActive = document.getElementById('newParkingIsActive').checked;

        // Получаем выбранных администраторов
        const selectedAdmins = Array.from(document.querySelectorAll('#newParkingAdminsList input[type="checkbox"]:checked'))
            .map(cb => parseInt(cb.value));

        const createData = {
            name: name.trim(),
            address: address.trim(),
            is_active: isActive
        };

        if (latitude) createData.latitude = parseFloat(latitude);
        if (longitude) createData.longitude = parseFloat(longitude);
        if (totalSpots) createData.total_spots = parseInt(totalSpots);

        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();

        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            // Создаем парковку
            const response = await fetch(`${API_HOST}/api/parkings`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(createData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка создания парковки');
            }

            const result = await response.json();
            if (result.status === 'success') {
                const newParkingId = result.data.id;

                // Назначаем администраторов
                if (selectedAdmins.length > 0) {
                    await Promise.all(selectedAdmins.map(userId => 
                        fetch(`${API_HOST}/api/user-parkings`, {
                            method: 'POST',
                            headers: headers,
                            body: JSON.stringify({
                                user_id: userId,
                                parking_id: newParkingId
                            })
                        }).then(res => {
                            if (!res.ok) {
                                console.warn(`Failed to assign admin ${userId} to parking ${newParkingId}`);
                            }
                        })
                    ));
                }

                toast.success('Парковка успешно создана!');
                this.closeCreateModal();
                // Обновляем список парковок
                await this.fetchParkings();
            }
        } catch (error) {
            console.error('Failed to create parking:', error);
            toast.error('Ошибка: ' + error.message);
        } finally {
            if (window.app) {
                window.app.toggleLoader(false);
            }
        }
    }

    init() {
        this.fetchParkings();
    }

    async fetchParkings() {
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
                
                // Обновляем счетчик
                const totalElement = document.getElementById('totalParkings');
                if (totalElement) {
                    totalElement.textContent = this.parkingData.length;
                }
            } else {
                throw new Error('Unexpected response');
            }
        } catch (error) {
            console.error('Failed to load parkings:', error);
            const list = document.getElementById('parkingsList');
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
        const list = document.getElementById('parkingsList');
        if (!list) return;

        if (!this.parkingData.length) {
            list.innerHTML = `
                <div class="empty-message">
                    <p>Нет парковок</p>
                </div>
            `;
            return;
        }

        list.innerHTML = this.parkingData.map(parking => this.createParkingCard(parking)).join('');
        
        this.parkingData.forEach(parking => {
            const card = document.getElementById(`parking-card-${parking.id}`);
            if (card) {
                card.addEventListener('click', (e) => {
                    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('button') || e.target.closest('a')) {
                        return;
                    }
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
                <div class="parking-card-footer" style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="view-details" onclick="event.stopPropagation(); router.navigate('/parking/${parking.id}')">Подробнее →</span>
                    <button onclick="event.stopPropagation(); window.serviceAdminParkingsView.openEditModal(${parking.id})" style="padding: 0.4rem 0.8rem; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85rem;">
                        ✏️ Редактировать
                    </button>
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
            name: parking.name || 'Парковка',
            totalSpaces: totalSpots,
            total_spots: parking.total_spots,
            freeSpaces: freeSpots,
            occupiedSpaces: occupiedSpots,
            spotsState: spotsState,
            slotDetails: slotDetails,
            address: parking.address || '—',
            id: parking.id || '—',
            isActive: parking.is_active,
            is_active: parking.is_active,
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

    async openEditModal(parkingId) {
        const modal = document.getElementById('editParkingModal');
        const modalBody = document.getElementById('editParkingModalBody');
        if (!modal || !modalBody) return;

        if (!authService.isAuthenticated()) {
            toast.error('Вы не авторизованы. Пожалуйста, войдите в систему.');
            return;
        }

        const currentUser = await authService.getCurrentUser();
        if (!currentUser || !authService.isSuperAdmin()) {
            toast.warning('У вас нет прав для редактирования парковок.');
            return;
        }

        modal.style.display = 'flex';
        
        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            const [parking, users, parkingAdmins, cameras, parkingCameras, allParkingCameras] = await Promise.all([
                this.fetchParkingDetails(parkingId),
                this.fetchUsers(),
                this.fetchParkingAdmins(parkingId),
                this.fetchCameras(),
                this.fetchParkingCameras(parkingId),
                this.fetchAllParkingCameras() // Получаем все связи для определения занятых камер
            ]);

            modalBody.innerHTML = this.renderEditForm(parking, users, parkingAdmins, cameras, parkingCameras, allParkingCameras);
        } catch (error) {
            console.error('Failed to load parking data:', error);
            let errorMessage = 'Ошибка загрузки данных парковки';
            let shouldRelogin = false;
            
            if (error.message.includes('Unauthorized') || error.message.includes('401')) {
                const currentUser = await authService.getCurrentUser();
                if (!currentUser) {
                    errorMessage = 'Ошибка авторизации. Пожалуйста, войдите в систему заново.';
                    shouldRelogin = true;
                } else {
                    errorMessage = 'Ошибка доступа. Убедитесь, что у вас есть права суперадминистратора.';
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            modalBody.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <p style="color: #e74c3c;">${errorMessage}</p>
                    ${shouldRelogin ? '<p style="color: #666; margin-top: 0.5rem; font-size: 0.9rem;">Токен истек или недействителен</p>' : ''}
                    <button onclick="window.serviceAdminParkingsView.closeEditModal()${shouldRelogin ? '; window.app.openAuthModal()' : ''}" 
                            style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Закрыть
                    </button>
                </div>
            `;
        } finally {
            if (window.app) {
                window.app.toggleLoader(false);
            }
        }
    }

    closeEditModal() {
        const modal = document.getElementById('editParkingModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async fetchParkingDetails(parkingId) {
        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();
        
        const response = await fetch(`${API_HOST}/api/parkings/${parkingId}`, {
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.status === 'success' && result.data) {
            const parking = result.data;
            // Убеждаемся, что is_active правильно обработан
            if (parking.is_active === undefined && parking.isActive !== undefined) {
                parking.is_active = parking.isActive;
            }
            // Преобразуем boolean значения из строк, если нужно
            if (typeof parking.is_active === 'string') {
                parking.is_active = parking.is_active === 'true' || parking.is_active === '1';
            }
            // Если значение null или undefined, устанавливаем false
            if (parking.is_active === null || parking.is_active === undefined) {
                parking.is_active = false;
            }
            return parking;
        }
        throw new Error('Unexpected response');
    }

    async fetchUsers() {
        // Используем тот же API_HOST, что и authService
        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();
        
        console.log('fetchUsers: API_HOST:', API_HOST);
        console.log('fetchUsers: Headers:', headers);
        console.log('fetchUsers: Token exists:', !!authService.getToken());
        
        const response = await fetch(`${API_HOST}/api/users`, {
            headers: headers
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.error('fetchUsers: Unauthorized - token may be invalid');
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Unauthorized: ${errorData.message || 'Токен недействителен или истек'}`);
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || 'Unknown error'}`);
        }

        const result = await response.json();
        if (result.status === 'success' && Array.isArray(result.data)) {
            return result.data.filter(user => user.role === 'parking_administrator');
        }
        return [];
    }

    async fetchParkingAdmins(parkingId) {
        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();
        
        const response = await fetch(`${API_HOST}/api/user-parkings?parking_id=${parkingId}`, {
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.status === 'success' && Array.isArray(result.data)) {
            return result.data.map(rel => rel.user_id);
        }
        return [];
    }

    async fetchCameras() {
        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();
        
        // Запрашиваем только активные камеры для привязки к парковке
        const response = await fetch(`${API_HOST}/api/cameras?is_active=true`, {
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.status === 'success' && Array.isArray(result.data)) {
            return result.data;
        }
        return [];
    }

    async fetchParkingCameras(parkingId) {
        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();
        
        const response = await fetch(`${API_HOST}/api/parking-cameras?parking_id=${parkingId}`, {
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.status === 'success' && Array.isArray(result.data)) {
            return result.data.map(pc => +pc.camera_id).filter(id => !isNaN(id));
        }
        return [];
    }

    async fetchAllParkingCameras() {
        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();
        
        const response = await fetch(`${API_HOST}/api/parking-cameras`, {
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.status === 'success' && Array.isArray(result.data)) {
            return result.data;
        }
        return [];
    }

    renderEditForm(parking, users, parkingAdmins, cameras, parkingCameras, allParkingCameras) {
        const assignedAdminIds = new Set(parkingAdmins);
        const assignedCameraIds = new Set(parkingCameras.map(id => +id));
        const parkingId = +parking.id;
        
        const occupiedCameraIds = new Set();
        allParkingCameras.forEach(pc => {
            const pcParkingId = +pc.parking_id;
            const pcCameraId = +pc.camera_id;
            
            if (pcParkingId !== parkingId) {
                occupiedCameraIds.add(pcCameraId);
            }
        });
        
        const availableCameras = cameras.filter(camera => {
            const cameraId = +camera.id;
            if (assignedCameraIds.has(cameraId)) {
                return true;
            }
            return !occupiedCameraIds.has(cameraId);
        });
        
        return `
            <form id="editParkingForm" onsubmit="event.preventDefault(); window.serviceAdminParkingsView.saveParking(${parking.id})">
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Название парковки</label>
                    <input type="text" id="parkingName" value="${parking.name || ''}" required 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Адрес</label>
                    <input type="text" id="parkingAddress" value="${parking.address || ''}" required 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Широта</label>
                        <input type="number" step="any" id="parkingLatitude" value="${parking.latitude || ''}" 
                               style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Долгота</label>
                        <input type="number" step="any" id="parkingLongitude" value="${parking.longitude || ''}" 
                               style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                    </div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Всего мест</label>
                    <input type="number" id="parkingTotalSpots" value="${parking.total_spots || 0}" min="0" 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                </div>

                <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 5px; border: 1px solid #ddd;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="parkingIsActive" ${parking.is_active === true || parking.isActive === true ? 'checked' : ''} 
                               style="width: 20px; height: 20px; cursor: pointer;">
                        <span style="font-weight: bold; color: #2c3e50;">Парковка активна</span>
                    </label>
                    <p style="margin-top: 0.5rem; margin-bottom: 0; font-size: 0.85rem; color: #666;">
                        ${parking.is_active === true || parking.isActive === true 
                            ? '✅ Парковка отображается пользователям и доступна для управления' 
                            : '❌ Парковка скрыта от пользователей и недоступна для управления'}
                    </p>
                </div>

                <div style="margin-bottom: 1.5rem; padding-top: 1.5rem; border-top: 2px solid #eee;">
                    <label style="display: block; margin-bottom: 1rem; font-weight: bold; color: #2c3e50;">Камеры парковки</label>
                    <div id="parkingCamerasList" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px; padding: 1rem;">
                        ${availableCameras.length === 0 
                            ? '<p style="color: #999; text-align: center;">Нет доступных камер</p>'
                            : availableCameras.map(camera => {
                                const cameraId = +camera.id;
                                const isAssigned = assignedCameraIds.has(cameraId);
                                return `
                                <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; cursor: pointer; border-radius: 5px; margin-bottom: 0.5rem; ${isAssigned ? 'background: #e3f2fd;' : ''}">
                                    <input type="checkbox" class="camera-checkbox" data-camera-id="${cameraId}" value="${cameraId}" ${isAssigned ? 'checked' : ''} 
                                           style="width: 18px; height: 18px; cursor: pointer;">
                                    <span>📹 ${camera.name} (${camera.camera_type || 'rtsp'}) ${camera.is_active ? '✅' : '❌'} ${isAssigned ? '<span style="color: #2196F3; font-weight: bold;">[Привязана]</span>' : ''}</span>
                                </label>
                            `;
                            }).join('')
                        }
                    </div>
                    ${availableCameras.length === 0 
                        ? '<p style="margin-top: 0.5rem; font-size: 0.85rem; color: #666;">Сначала создайте камеры в разделе "Управление камерами" или освободите занятые камеры</p>' 
                        : cameras.length > availableCameras.length 
                            ? `<p style="margin-top: 0.5rem; font-size: 0.85rem; color: #f39c12;">⚠️ ${cameras.length - availableCameras.length} камер(а) уже привязаны к другим парковкам и недоступны</p>`
                            : ''}
                </div>

                <div style="margin-bottom: 1.5rem; padding-top: 1.5rem; border-top: 2px solid #eee;">
                    <label style="display: block; margin-bottom: 1rem; font-weight: bold; color: #2c3e50;">Администраторы парковки</label>
                    <div id="parkingAdminsList" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px; padding: 1rem;">
                        ${users.length === 0 
                            ? '<p style="color: #999; text-align: center;">Нет доступных администраторов</p>'
                            : users.map(user => `
                                <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; cursor: pointer; border-radius: 5px; margin-bottom: 0.5rem; ${assignedAdminIds.has(user.id) ? 'background: #e8f5e9;' : ''}">
                                    <input type="checkbox" value="${user.id}" ${assignedAdminIds.has(user.id) ? 'checked' : ''} 
                                           onchange="window.serviceAdminParkingsView.toggleAdmin(${parking.id}, ${user.id}, this.checked)"
                                           style="width: 18px; height: 18px; cursor: pointer;">
                                    <span>${user.username} (ID: ${user.id})</span>
                                </label>
                            `).join('')
                        }
                    </div>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem; padding-top: 1.5rem; border-top: 2px solid #eee;">
                    <button type="button" onclick="window.serviceAdminParkingsView.closeEditModal()" 
                            style="padding: 0.75rem 1.5rem; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem;">
                        Отмена
                    </button>
                    <button type="submit" 
                            style="padding: 0.75rem 1.5rem; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem; font-weight: bold;">
                        Сохранить
                    </button>
                </div>
            </form>
        `;
    }

    async saveParking(parkingId) {
        const name = document.getElementById('parkingName').value;
        const address = document.getElementById('parkingAddress').value;
        const latitude = document.getElementById('parkingLatitude').value;
        const longitude = document.getElementById('parkingLongitude').value;
        const totalSpots = document.getElementById('parkingTotalSpots').value;
        const isActive = document.getElementById('parkingIsActive').checked;

        const updateData = {
            name: name.trim(),
            address: address.trim(),
            is_active: isActive
        };

        if (latitude) updateData.latitude = parseFloat(latitude);
        if (longitude) updateData.longitude = parseFloat(longitude);
        if (totalSpots) updateData.total_spots = parseInt(totalSpots);

        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();

        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            // Сначала обновляем данные парковки
            const response = await fetch(`${API_HOST}/api/parkings/${parkingId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка обновления парковки');
            }

            // Затем обновляем привязки камер
            await this.updateParkingCameras(parkingId);

            toast.success('Парковка успешно обновлена!');
            this.closeEditModal();
            // Обновляем список парковок
            await this.fetchParkings();
        } catch (error) {
            console.error('Failed to update parking:', error);
            toast.error('Ошибка: ' + error.message);
        } finally {
            if (window.app) {
                window.app.toggleLoader(false);
            }
        }
    }

    async updateParkingCameras(parkingId) {
        const currentCameras = await this.fetchParkingCameras(parkingId);
        const currentCameraIds = new Set(currentCameras.map(id => +id));

        const selectedCheckboxes = document.querySelectorAll('.camera-checkbox:checked');
        const selectedCameraIds = new Set();
        selectedCheckboxes.forEach(checkbox => {
            const cameraId = parseInt(checkbox.dataset.cameraId);
            if (!isNaN(cameraId)) {
                selectedCameraIds.add(cameraId);
            }
        });

        const camerasToAdd = [];
        const camerasToRemove = [];

        selectedCameraIds.forEach(cameraId => {
            if (!currentCameraIds.has(cameraId)) {
                camerasToAdd.push(cameraId);
            }
        });

        currentCameraIds.forEach(cameraId => {
            if (!selectedCameraIds.has(cameraId)) {
                camerasToRemove.push(cameraId);
            }
        });

        console.log('updateParkingCameras:', {
            parkingId,
            currentCameraIds: Array.from(currentCameraIds),
            selectedCameraIds: Array.from(selectedCameraIds),
            camerasToAdd,
            camerasToRemove
        });

        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();

        for (const cameraId of camerasToRemove) {
            try {
                const response = await fetch(`${API_HOST}/api/parking-cameras/relation/remove`, {
                    method: 'DELETE',
                    headers: headers,
                    body: JSON.stringify({
                        parking_id: parkingId,
                        camera_id: cameraId
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.warn(`Failed to remove camera ${cameraId}:`, errorData.message);
                }
            } catch (error) {
                console.warn(`Error removing camera ${cameraId}:`, error);
            }
        }

        for (const cameraId of camerasToAdd) {
            try {
                const response = await fetch(`${API_HOST}/api/parking-cameras`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        parking_id: parkingId,
                        camera_id: cameraId
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    // Игнорируем ошибку дублирования (камера уже привязана)
                    if (response.status !== 409) {
                        console.warn(`Failed to add camera ${cameraId}:`, errorData.message);
                    }
                }
            } catch (error) {
                console.warn(`Error adding camera ${cameraId}:`, error);
            }
        }
    }

    async toggleCamera(parkingId, cameraId, assign) {
        console.warn('toggleCamera is deprecated. Camera binding now happens on form save.');
    }

    async refreshCamerasList(parkingId) {
        try {
            const [cameras, parkingCameras, allParkingCameras] = await Promise.all([
                this.fetchCameras(),
                this.fetchParkingCameras(parkingId),
                this.fetchAllParkingCameras()
            ]);
            
            const camerasList = document.getElementById('parkingCamerasList');
            if (camerasList) {
                const parkingIdNum = +parkingId;
                const assignedCameraIds = new Set(parkingCameras.map(id => +id));
                
                const occupiedCameraIds = new Set();
                allParkingCameras.forEach(pc => {
                    const pcParkingId = +pc.parking_id;
                    const pcCameraId = +pc.camera_id;
                    if (pcParkingId !== parkingIdNum) {
                        occupiedCameraIds.add(pcCameraId);
                    }
                });
                
                const availableCameras = cameras.filter(camera => {
                    const cameraId = +camera.id;
                    if (assignedCameraIds.has(cameraId)) {
                        return true;
                    }
                    return !occupiedCameraIds.has(cameraId);
                });
                
                camerasList.innerHTML = availableCameras.length === 0 
                    ? '<p style="color: #999; text-align: center;">Нет доступных камер</p>'
                    : availableCameras.map(camera => {
                        const cameraId = +camera.id;
                        const isAssigned = assignedCameraIds.has(cameraId);
                        return `
                        <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; cursor: pointer; border-radius: 5px; margin-bottom: 0.5rem; ${isAssigned ? 'background: #e3f2fd;' : ''}">
                            <input type="checkbox" class="camera-checkbox" data-camera-id="${cameraId}" value="${cameraId}" ${isAssigned ? 'checked' : ''} 
                                   style="width: 18px; height: 18px; cursor: pointer;">
                            <span>📹 ${camera.name} (${camera.camera_type || 'rtsp'}) ${camera.is_active ? '✅' : '❌'} ${isAssigned ? '<span style="color: #2196F3; font-weight: bold;">[Привязана]</span>' : ''}</span>
                        </label>
                    `;
                    }).join('');
            }
        } catch (refreshError) {
            console.error('Failed to refresh cameras list:', refreshError);
        }
    }

    async toggleAdmin(parkingId, userId, assign) {
        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();

        try {
            if (assign) {
                // Назначаем администратора
                const response = await fetch(`${API_HOST}/api/user-parkings`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        user_id: userId,
                        parking_id: parkingId
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Ошибка назначения администратора');
                }
            } else {
                // Удаляем администратора
                const response = await fetch(`${API_HOST}/api/user-parkings/relation/remove`, {
                    method: 'DELETE',
                    headers: headers,
                    body: JSON.stringify({
                        user_id: userId,
                        parking_id: parkingId
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Ошибка удаления администратора');
                }
            }

            // Обновляем визуальное состояние
            const checkbox = document.querySelector(`input[type="checkbox"][value="${userId}"]`);
            if (checkbox) {
                const label = checkbox.closest('label');
                if (label) {
                    if (assign) {
                        label.style.background = '#e8f5e9';
                    } else {
                        label.style.background = '';
                    }
                }
            }
        } catch (error) {
            console.error('Failed to toggle admin:', error);
            toast.error('Ошибка: ' + error.message);
            // Возвращаем чекбокс в исходное состояние
            const checkbox = document.querySelector(`input[type="checkbox"][value="${userId}"]`);
            if (checkbox) {
                checkbox.checked = !assign;
            }
        }
    }

    destroy() {
        const editModal = document.getElementById('editParkingModal');
        if (editModal) {
            editModal.remove();
        }
        const createModal = document.getElementById('createParkingModal');
        if (createModal) {
            createModal.remove();
        }
    }
}

