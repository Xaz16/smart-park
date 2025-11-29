// Страница управления камерами для service_admin
class ServiceAdminCamerasView {
    constructor() {
        this.cameras = [];
    }

    async render(params) {
        // Делаем view доступным глобально
        window.serviceAdminCamerasView = this;

        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            await this.fetchCameras();
            mainContent.innerHTML = this.renderCamerasList();
        } catch (error) {
            console.error('Failed to load cameras:', error);
            mainContent.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <p style="color: #e74c3c;">Ошибка загрузки камер: ${error.message}</p>
                    <button onclick="router.navigate('/service-admin')" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Вернуться
                    </button>
                </div>
            `;
        } finally {
            if (window.app) {
                window.app.toggleLoader(false);
            }
        }
    }

    async fetchCameras() {
        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();

        const response = await fetch(`${API_HOST}/api/cameras`, {
            headers: headers
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.status === 'success' && Array.isArray(result.data)) {
            this.cameras = result.data;
        } else {
            this.cameras = [];
        }
    }

    renderCamerasList() {
        return `
            <div style="margin-bottom: 1rem;">
                <button onclick="router.navigate('/service-admin')" style="padding: 0.5rem 1rem; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem;">
                    ← Назад к панели
                </button>
            </div>
            <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
                <h1 style="color: #2c3e50; margin: 0;">Управление камерами</h1>
                <button onclick="window.serviceAdminCamerasView.openCreateModal()" style="padding: 0.5rem 1rem; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    + Создать камеру
                </button>
            </div>

            <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="margin-bottom: 1rem; color: #666;">
                    Всего камер: <strong>${this.cameras.length}</strong>
                </div>

                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                                <th style="padding: 1rem; text-align: left; font-weight: bold; color: #2c3e50;">ID</th>
                                <th style="padding: 1rem; text-align: left; font-weight: bold; color: #2c3e50;">Название</th>
                                <th style="padding: 1rem; text-align: left; font-weight: bold; color: #2c3e50;">Тип</th>
                                <th style="padding: 1rem; text-align: left; font-weight: bold; color: #2c3e50;">RTSP URL</th>
                                <th style="padding: 1rem; text-align: left; font-weight: bold; color: #2c3e50;">Статус</th>
                                <th style="padding: 1rem; text-align: left; font-weight: bold; color: #2c3e50;">Создана</th>
                                <th style="padding: 1rem; text-align: center; font-weight: bold; color: #2c3e50;">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.cameras.length === 0
                ? `<tr><td colspan="7" style="padding: 2rem; text-align: center; color: #999;">Нет камер</td></tr>`
                : this.cameras.map(camera => this.renderCameraRow(camera)).join('')
            }
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderCameraRow(camera) {
        const statusClass = camera.is_active ? 'active' : 'inactive';
        const statusText = camera.is_active ? 'Активна' : 'Неактивна';
        const statusColor = camera.is_active ? '#27ae60' : '#95a5a6';
        const createdDate = camera.created_at ? new Date(camera.created_at).toLocaleDateString('ru-RU') : '—';
        
        const cameraTypeLabels = {
            'rtsp': 'RTSP',
            'static': 'Статическая',
            'http': 'HTTP',
            'file': 'Файл'
        };
        const cameraTypeLabel = cameraTypeLabels[camera.camera_type] || camera.camera_type || '—';
        const rtspUrl = camera.rtsp_url || '—';

        return `
            <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 1rem;">${camera.id}</td>
                <td style="padding: 1rem; font-weight: 500;">${camera.name}</td>
                <td style="padding: 1rem;">${cameraTypeLabel}</td>
                <td style="padding: 1rem; color: #666; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${rtspUrl}">${rtspUrl}</td>
                <td style="padding: 1rem;">
                    <span style="padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem; background: ${statusColor}20; color: ${statusColor}; font-weight: bold;">
                        ${statusText}
                    </span>
                </td>
                <td style="padding: 1rem; color: #666;">${createdDate}</td>
                <td style="padding: 1rem; text-align: center;">
                    <div style="display: flex; gap: 0.5rem; justify-content: center;">
                        <button onclick="window.serviceAdminCamerasView.openEditModal(${camera.id})" 
                                style="padding: 0.4rem 0.8rem; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85rem;">
                            ✏️ Редактировать
                        </button>
                        <button onclick="window.serviceAdminCamerasView.toggleCameraStatus(${camera.id}, ${String(!camera.is_active)})" 
                                style="padding: 0.4rem 0.8rem; background: ${camera.is_active ? '#f39c12' : '#27ae60'}; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85rem;">
                            ${camera.is_active ? '🔒 Деактивировать' : '✅ Активировать'}
                        </button>
                        <button onclick="window.serviceAdminCamerasView.deleteCamera(${camera.id}, '${camera.name}')" 
                                style="padding: 0.4rem 0.8rem; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85rem;">
                            🗑️ Удалить
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    async openCreateModal() {
        this.renderCreateModal();
        const modal = document.getElementById('createCameraModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    closeCreateModal() {
        const modal = document.getElementById('createCameraModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    renderCreateModal() {
        const body = document.body;
        if (document.getElementById('createCameraModal')) return; // Уже существует

        const modalHTML = `
            <div class="edit-parking-modal" id="createCameraModal" style="display: none;">
                <div class="edit-parking-modal-content">
                    <div class="edit-parking-modal-header">
                        <h2>Создание камеры</h2>
                        <button onclick="window.serviceAdminCamerasView.closeCreateModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">×</button>
                    </div>
                    <div class="edit-parking-modal-body" id="createCameraModalBody">
                        ${this.renderCreateForm()}
                    </div>
                </div>
                <div class="edit-parking-modal-overlay" onclick="window.serviceAdminCamerasView.closeCreateModal()"></div>
            </div>
        `;
        body.insertAdjacentHTML('beforeend', modalHTML);
    }

    renderCreateForm() {
        return `
            <form id="createCameraForm" onsubmit="event.preventDefault(); window.serviceAdminCamerasView.createCamera()">
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Название камеры *</label>
                    <input type="text" id="newCameraName" required 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Тип камеры *</label>
                    <select id="newCameraType" required 
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;"
                            onchange="window.serviceAdminCamerasView.toggleRtspUrlField(this.value)">
                        <option value="">Выберите тип</option>
                        <option value="rtsp">RTSP</option>
                        <option value="static">Статическая</option>
                        <option value="http">HTTP</option>
                        <option value="file">Файл</option>
                    </select>
                </div>

                <div style="margin-bottom: 1.5rem;" id="rtspUrlContainer">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">RTSP URL *</label>
                    <input type="text" id="newCameraRtspUrl" 
                           placeholder="rtsp://example.com:554/stream"
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                    <p style="margin-top: 0.5rem; font-size: 0.85rem; color: #666;">Обязательно для RTSP камер</p>
                </div>

                <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 5px; border: 1px solid #ddd;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="newCameraIsActive" checked 
                               style="width: 20px; height: 20px; cursor: pointer;">
                        <span style="font-weight: bold; color: #2c3e50;">Камера активна</span>
                    </label>
                    <p style="margin-top: 0.5rem; margin-bottom: 0; font-size: 0.85rem; color: #666;">
                        ✅ Активная камера используется для обработки изображений
                    </p>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem; padding-top: 1.5rem; border-top: 2px solid #eee;">
                    <button type="button" onclick="window.serviceAdminCamerasView.closeCreateModal()" 
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

    toggleRtspUrlField(cameraType) {
        // Работает для обеих форм (создание и редактирование)
        const rtspUrlContainer = document.getElementById('rtspUrlContainer');
        const rtspUrlInput = document.getElementById('newCameraRtspUrl') || document.getElementById('cameraRtspUrl');
        
        if (rtspUrlContainer && rtspUrlInput) {
            if (cameraType === 'rtsp') {
                rtspUrlContainer.style.display = 'block';
                rtspUrlInput.required = true;
            } else {
                rtspUrlContainer.style.display = 'none';
                rtspUrlInput.required = false;
                // Не очищаем значение при редактировании, только при создании
                if (rtspUrlInput.id === 'newCameraRtspUrl') {
                    rtspUrlInput.value = '';
                }
            }
        }
    }

    async createCamera() {
        const name = document.getElementById('newCameraName').value.trim();
        const cameraType = document.getElementById('newCameraType').value;
        const rtspUrl = document.getElementById('newCameraRtspUrl').value.trim();
        const isActive = document.getElementById('newCameraIsActive').checked;

        if (!name || !cameraType) {
            toast.error('Заполните все обязательные поля');
            return;
        }

        if (cameraType === 'rtsp' && !rtspUrl) {
            toast.error('RTSP URL обязателен для RTSP камер');
            return;
        }

        const createData = {
            name,
            camera_type: cameraType,
            is_active: isActive
        };

        if (cameraType === 'rtsp' && rtspUrl) {
            createData.rtsp_url = rtspUrl;
        }

        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();

        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            const response = await fetch(`${API_HOST}/api/cameras`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(createData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка создания камеры');
            }

            toast.success('Камера успешно создана!');
            this.closeCreateModal();
            await this.fetchCameras();
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.innerHTML = this.renderCamerasList();
            }
        } catch (error) {
            console.error('Failed to create camera:', error);
            toast.error('Ошибка: ' + error.message);
        } finally {
            if (window.app) {
                window.app.toggleLoader(false);
            }
        }
    }

    async openEditModal(cameraId) {
        this.renderEditModal();
        const modal = document.getElementById('editCameraModal');
        const modalBody = document.getElementById('editCameraModalBody');
        if (!modal || !modalBody) return;

        modal.style.display = 'flex';

        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            const camera = await this.fetchCameraById(cameraId);
            modalBody.innerHTML = this.renderEditForm(camera);
            // Обновляем видимость поля RTSP URL в зависимости от типа
            this.toggleRtspUrlField(camera.camera_type);
        } catch (error) {
            console.error('Failed to load camera data:', error);
            modalBody.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <p style="color: #e74c3c;">Ошибка загрузки данных камеры: ${error.message}</p>
                    <button onclick="window.serviceAdminCamerasView.closeEditModal()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
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
        const modal = document.getElementById('editCameraModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    renderEditModal() {
        const body = document.body;
        if (document.getElementById('editCameraModal')) return; // Уже существует

        const modalHTML = `
            <div class="edit-parking-modal" id="editCameraModal" style="display: none;">
                <div class="edit-parking-modal-content">
                    <div class="edit-parking-modal-header">
                        <h2>Редактирование камеры</h2>
                        <button onclick="window.serviceAdminCamerasView.closeEditModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">×</button>
                    </div>
                    <div class="edit-parking-modal-body" id="editCameraModalBody">
                        <!-- Контент будет загружен динамически -->
                    </div>
                </div>
                <div class="edit-parking-modal-overlay" onclick="window.serviceAdminCamerasView.closeEditModal()"></div>
            </div>
        `;
        body.insertAdjacentHTML('beforeend', modalHTML);
    }

    async fetchCameraById(cameraId) {
        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();

        const response = await fetch(`${API_HOST}/api/cameras/${cameraId}`, {
            headers: headers
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.status === 'success' && result.data) {
            return result.data;
        }
        throw new Error('Invalid response format');
    }

    renderEditForm(camera) {
        const cameraTypeLabels = {
            'rtsp': 'RTSP',
            'static': 'Статическая',
            'http': 'HTTP',
            'file': 'Файл'
        };

        return `
            <form id="editCameraForm" onsubmit="event.preventDefault(); window.serviceAdminCamerasView.saveCamera(${camera.id})">
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Название камеры *</label>
                    <input type="text" id="cameraName" value="${camera.name || ''}" required 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Тип камеры *</label>
                    <select id="cameraType" required 
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;"
                            onchange="window.serviceAdminCamerasView.toggleRtspUrlField(this.value)">
                        <option value="rtsp" ${camera.camera_type === 'rtsp' ? 'selected' : ''}>RTSP</option>
                        <option value="static" ${camera.camera_type === 'static' ? 'selected' : ''}>Статическая</option>
                        <option value="http" ${camera.camera_type === 'http' ? 'selected' : ''}>HTTP</option>
                        <option value="file" ${camera.camera_type === 'file' ? 'selected' : ''}>Файл</option>
                    </select>
                </div>

                <div style="margin-bottom: 1.5rem;" id="rtspUrlContainer">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">RTSP URL ${camera.camera_type === 'rtsp' ? '*' : ''}</label>
                    <input type="text" id="cameraRtspUrl" value="${camera.rtsp_url || ''}" 
                           placeholder="rtsp://example.com:554/stream"
                           ${camera.camera_type === 'rtsp' ? 'required' : ''}
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                    <p style="margin-top: 0.5rem; font-size: 0.85rem; color: #666;">Обязательно для RTSP камер</p>
                </div>

                <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 5px; border: 1px solid #ddd;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="cameraIsActive" ${camera.is_active === true ? 'checked' : ''} 
                               style="width: 20px; height: 20px; cursor: pointer;">
                        <span style="font-weight: bold; color: #2c3e50;">Камера активна</span>
                    </label>
                    <p style="margin-top: 0.5rem; margin-bottom: 0; font-size: 0.85rem; color: #666;">
                        ${camera.is_active === true
                ? '✅ Камера используется для обработки изображений'
                : '❌ Камера не используется для обработки изображений'}
                    </p>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem; padding-top: 1.5rem; border-top: 2px solid #eee;">
                    <button type="button" onclick="window.serviceAdminCamerasView.closeEditModal()" 
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

    async saveCamera(cameraId) {
        const name = document.getElementById('cameraName').value.trim();
        const cameraType = document.getElementById('cameraType').value;
        const rtspUrl = document.getElementById('cameraRtspUrl').value.trim();
        const isActive = document.getElementById('cameraIsActive').checked;

        if (!name || !cameraType) {
            toast.error('Заполните все обязательные поля');
            return;
        }

        if (cameraType === 'rtsp' && !rtspUrl) {
            toast.error('RTSP URL обязателен для RTSP камер');
            return;
        }

        const updateData = {
            name,
            camera_type: cameraType,
            is_active: isActive
        };

        if (cameraType === 'rtsp' && rtspUrl) {
            updateData.rtsp_url = rtspUrl;
        } else if (cameraType !== 'rtsp') {
            // Удаляем rtsp_url для не-RTSP камер
            updateData.rtsp_url = null;
        }

        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();

        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            const response = await fetch(`${API_HOST}/api/cameras/${cameraId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка обновления камеры');
            }

            toast.success('Камера успешно обновлена!');
            this.closeEditModal();
            await this.fetchCameras();
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.innerHTML = this.renderCamerasList();
            }
        } catch (error) {
            console.error('Failed to update camera:', error);
            toast.error('Ошибка: ' + error.message);
        } finally {
            if (window.app) {
                window.app.toggleLoader(false);
            }
        }
    }

    async toggleCameraStatus(cameraId, newStatus) {
        const camera = this.cameras.find(c => +c.id === +cameraId);
        if (!camera) {
            toast.error('Камера не найдена');
            return;
        }

        // Преобразуем строку в boolean, если нужно
        let isActive;
        if (typeof newStatus === 'string') {
            isActive = newStatus === 'true';
        } else {
            isActive = Boolean(newStatus);
        }

        console.log('toggleCameraStatus:', { cameraId, newStatus, isActive, currentStatus: camera.is_active });

        const confirmMessage = isActive
            ? `Вы уверены, что хотите активировать камеру "${camera.name}"?`
            : `Вы уверены, что хотите деактивировать камеру "${camera.name}"?`;

        const confirmed = await confirmDialog.show(confirmMessage, {
            title: isActive ? 'Активация камеры' : 'Деактивация камеры',
            confirmText: isActive ? 'Активировать' : 'Деактивировать',
            cancelText: 'Отмена'
        });

        if (!confirmed) {
            return;
        }

        const updateData = {
            name: camera.name,
            camera_type: camera.camera_type,
            is_active: isActive
        };

        if (camera.rtsp_url) {
            updateData.rtsp_url = camera.rtsp_url;
        }

        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();

        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            const response = await fetch(`${API_HOST}/api/cameras/${cameraId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка обновления статуса камеры');
            }

            toast.success(`Камера успешно ${isActive ? 'активирована' : 'деактивирована'}!`);
            await this.fetchCameras();
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.innerHTML = this.renderCamerasList();
            }
        } catch (error) {
            console.error('Failed to toggle camera status:', error);
            toast.error('Ошибка: ' + error.message);
        } finally {
            if (window.app) {
                window.app.toggleLoader(false);
            }
        }
    }

    async deleteCamera(cameraId, cameraName) {
        const confirmed = await confirmDialog.danger(
            `Вы уверены, что хотите удалить камеру "${cameraName}"?\n\nЭто действие нельзя отменить!`,
            {
                title: 'Удаление камеры',
                confirmText: 'Удалить',
                cancelText: 'Отмена'
            }
        );

        if (!confirmed) {
            return;
        }

        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();

        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            const response = await fetch(`${API_HOST}/api/cameras/${cameraId}`, {
                method: 'DELETE',
                headers: headers
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Ошибка удаления камеры');
            }

            toast.success('Камера успешно удалена!');
            await this.fetchCameras();
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.innerHTML = this.renderCamerasList();
            }
        } catch (error) {
            console.error('Failed to delete camera:', error);
            toast.error('Ошибка: ' + error.message);
        } finally {
            if (window.app) {
                window.app.toggleLoader(false);
            }
        }
    }

    destroy() {
        // Удаляем модальные окна при уничтожении view
        const createModal = document.getElementById('createCameraModal');
        if (createModal) {
            createModal.remove();
        }
        const editModal = document.getElementById('editCameraModal');
        if (editModal) {
            editModal.remove();
        }
    }
}

