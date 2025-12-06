class ServiceAdminUsersView {
    constructor() {
        this.users = [];
    }

    async render(params) {
        // Делаем view доступным глобально
        window.serviceAdminUsersView = this;

        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            await this.fetchUsers();
            mainContent.innerHTML = this.renderUsersList();
        } catch (error) {
            console.error('Failed to load users:', error);
            mainContent.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <p style="color: #e74c3c;">Ошибка загрузки пользователей: ${error.message}</p>
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

    async fetchUsers() {
        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();

        const response = await fetch(`${API_HOST}/api/users`, {
            headers: headers
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.status === 'success' && Array.isArray(result.data)) {
            this.users = result.data;
        } else {
            this.users = [];
        }
    }

    renderUsersList() {
        return `
            <div style="margin-bottom: 1rem;">
                <button onclick="router.navigate('/service-admin')" style="padding: 0.5rem 1rem; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem;">
                    ← Назад к панели
                </button>
            </div>
            <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
                <h1 style="color: #2c3e50; margin: 0;">Управление пользователями</h1>
                <button onclick="window.serviceAdminUsersView.openCreateModal()" style="padding: 0.5rem 1rem; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    + Создать пользователя
                </button>
            </div>

            <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="margin-bottom: 1rem; color: #666;">
                    Всего пользователей: <strong>${this.users.length}</strong>
                </div>

                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                                <th style="padding: 1rem; text-align: left; font-weight: bold; color: #2c3e50;">ID</th>
                                <th style="padding: 1rem; text-align: left; font-weight: bold; color: #2c3e50;">Логин</th>
                                <th style="padding: 1rem; text-align: left; font-weight: bold; color: #2c3e50;">Роль</th>
                                <th style="padding: 1rem; text-align: left; font-weight: bold; color: #2c3e50;">Статус</th>
                                <th style="padding: 1rem; text-align: left; font-weight: bold; color: #2c3e50;">Создан</th>
                                <th style="padding: 1rem; text-align: center; font-weight: bold; color: #2c3e50;">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.users.length === 0
                ? `<tr><td colspan="6" style="padding: 2rem; text-align: center; color: #999;">Нет пользователей</td></tr>`
                : this.users.map(user => this.renderUserRow(user)).join('')
            }
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderUserRow(user) {
        const statusClass = user.is_active ? 'active' : 'inactive';
        const statusText = user.is_active ? 'Активен' : 'Неактивен';
        const statusColor = user.is_active ? '#27ae60' : '#95a5a6';
        const roleText = user.role === 'service_admin' ? 'Суперадминистратор' : 'Администратор парковки';
        const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '—';
        
        const currentUser = authService.getUser();
        const currentUserId = currentUser?.id || currentUser?.userId;
        const isCurrentUser = currentUser && currentUserId && +user.id === +currentUserId;

        return `
            <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 1rem;">${user.id}</td>
                <td style="padding: 1rem; font-weight: 500;">${user.username}</td>
                <td style="padding: 1rem;">${roleText}</td>
                <td style="padding: 1rem;">
                    <span style="padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem; background: ${statusColor}20; color: ${statusColor}; font-weight: bold;">
                        ${statusText}
                    </span>
                </td>
                <td style="padding: 1rem; color: #666;">${createdDate}</td>
                <td style="padding: 1rem; text-align: center;">
                    <div style="display: flex; gap: 0.5rem; justify-content: center;">
                        <button onclick="window.serviceAdminUsersView.openEditModal(${user.id})" 
                                style="padding: 0.4rem 0.8rem; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85rem;">
                            ✏️ Редактировать
                        </button>
                        ${isCurrentUser ? `
                            <button disabled
                                    style="padding: 0.4rem 0.8rem; background: #bdc3c7 !important; color: #7f8c8d !important; border: 1px solid #95a5a6 !important; border-radius: 5px; cursor: not-allowed !important; font-size: 0.85rem; opacity: 0.7; pointer-events: none;"
                                    title="Вы не можете деактивировать самого себя"
                                    onmouseover="this.style.opacity='0.7'"
                                    onmouseout="this.style.opacity='0.7'">
                                🔒 Деактивировать
                            </button>
                            <button disabled
                                    style="padding: 0.4rem 0.8rem; background: #bdc3c7 !important; color: #7f8c8d !important; border: 1px solid #95a5a6 !important; border-radius: 5px; cursor: not-allowed !important; font-size: 0.85rem; opacity: 0.7; pointer-events: none;"
                                    title="Вы не можете удалить самого себя"
                                    onmouseover="this.style.opacity='0.7'"
                                    onmouseout="this.style.opacity='0.7'">
                                🗑️ Удалить
                            </button>
                        ` : `
                            <button onclick="window.serviceAdminUsersView.toggleUserStatus(${user.id}, ${String(!user.is_active)})" 
                                    style="padding: 0.4rem 0.8rem; background: ${user.is_active ? '#f39c12' : '#27ae60'}; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85rem;">
                                ${user.is_active ? '🔒 Деактивировать' : '✅ Активировать'}
                            </button>
                            <button onclick="window.serviceAdminUsersView.deleteUser(${user.id}, '${user.username}')" 
                                    style="padding: 0.4rem 0.8rem; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85rem;">
                                🗑️ Удалить
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }

    async openCreateModal() {
        this.renderCreateModal();
        const modal = document.getElementById('createUserModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    closeCreateModal() {
        const modal = document.getElementById('createUserModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    renderCreateModal() {
        const body = document.body;
        if (document.getElementById('createUserModal')) return; // Уже существует

        const modalHTML = `
            <div class="edit-parking-modal" id="createUserModal" style="display: none;">
                <div class="edit-parking-modal-content">
                    <div class="edit-parking-modal-header">
                        <h2>Создание пользователя</h2>
                        <button onclick="window.serviceAdminUsersView.closeCreateModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">×</button>
                    </div>
                    <div class="edit-parking-modal-body" id="createUserModalBody">
                        ${this.renderCreateForm()}
                    </div>
                </div>
                <div class="edit-parking-modal-overlay" onclick="window.serviceAdminUsersView.closeCreateModal()"></div>
            </div>
        `;
        body.insertAdjacentHTML('beforeend', modalHTML);
    }

    renderCreateForm() {
        return `
            <form id="createUserForm" onsubmit="event.preventDefault(); window.serviceAdminUsersView.createUser()">
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Логин *</label>
                    <input type="text" id="newUserUsername" required 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Пароль *</label>
                    <input type="password" id="newUserPassword" required 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                    <p style="margin-top: 0.5rem; font-size: 0.85rem; color: #666;">Минимум 6 символов</p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Роль *</label>
                    <select id="newUserRole" required 
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                        <option value="">Выберите роль</option>
                        <option value="service_admin">Суперадминистратор</option>
                        <option value="parking_administrator">Администратор парковки</option>
                    </select>
                </div>

                <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 5px; border: 1px solid #ddd;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="newUserIsActive" checked 
                               style="width: 20px; height: 20px; cursor: pointer;">
                        <span style="font-weight: bold; color: #2c3e50;">Пользователь активен</span>
                    </label>
                    <p style="margin-top: 0.5rem; margin-bottom: 0; font-size: 0.85rem; color: #666;">
                        ✅ Активный пользователь может войти в систему
                    </p>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem; padding-top: 1.5rem; border-top: 2px solid #eee;">
                    <button type="button" onclick="window.serviceAdminUsersView.closeCreateModal()" 
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

    async createUser() {
        const username = document.getElementById('newUserUsername').value.trim();
        const password = document.getElementById('newUserPassword').value;
        const role = document.getElementById('newUserRole').value;
        const isActive = document.getElementById('newUserIsActive').checked;

        if (!username || !password || !role) {
            toast.error('Заполните все обязательные поля');
            return;
        }

        if (password.length < 6) {
            toast.error('Пароль должен содержать минимум 6 символов');
            return;
        }

        const createData = {
            username,
            password,
            role,
            is_active: isActive
        };

        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();

        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            const response = await fetch(`${API_HOST}/api/users`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(createData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка создания пользователя');
            }

            toast.success('Пользователь успешно создан!');
            this.closeCreateModal();
            await this.fetchUsers();
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.innerHTML = this.renderUsersList();
            }
        } catch (error) {
            console.error('Failed to create user:', error);
            toast.error('Ошибка: ' + error.message);
        } finally {
            if (window.app) {
                window.app.toggleLoader(false);
            }
        }
    }

    async openEditModal(userId) {
        this.renderEditModal();
        const modal = document.getElementById('editUserModal');
        const modalBody = document.getElementById('editUserModalBody');
        if (!modal || !modalBody) return;

        modal.style.display = 'flex';

        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            const user = await this.fetchUserById(userId);
            modalBody.innerHTML = this.renderEditForm(user);
        } catch (error) {
            console.error('Failed to load user data:', error);
            modalBody.innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <p style="color: #e74c3c;">Ошибка загрузки данных пользователя: ${error.message}</p>
                    <button onclick="window.serviceAdminUsersView.closeEditModal()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
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
        const modal = document.getElementById('editUserModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    renderEditModal() {
        const body = document.body;
        if (document.getElementById('editUserModal')) return; // Уже существует

        const modalHTML = `
            <div class="edit-parking-modal" id="editUserModal" style="display: none;">
                <div class="edit-parking-modal-content">
                    <div class="edit-parking-modal-header">
                        <h2>Редактирование пользователя</h2>
                        <button onclick="window.serviceAdminUsersView.closeEditModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">×</button>
                    </div>
                    <div class="edit-parking-modal-body" id="editUserModalBody">
                        <!-- Контент будет загружен динамически -->
                    </div>
                </div>
                <div class="edit-parking-modal-overlay" onclick="window.serviceAdminUsersView.closeEditModal()"></div>
            </div>
        `;
        body.insertAdjacentHTML('beforeend', modalHTML);
    }

    async fetchUserById(userId) {
        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();

        const response = await fetch(`${API_HOST}/api/users/${userId}`, {
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

    renderEditForm(user) {
        return `
            <form id="editUserForm" onsubmit="event.preventDefault(); window.serviceAdminUsersView.saveUser(${user.id})">
                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Логин *</label>
                    <input type="text" id="userUsername" value="${user.username || ''}" required 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Новый пароль</label>
                    <input type="password" id="userPassword" placeholder="Оставьте пустым, чтобы не менять" 
                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                    <p style="margin-top: 0.5rem; font-size: 0.85rem; color: #666;">Оставьте пустым, если не хотите менять пароль. Минимум 6 символов.</p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold; color: #2c3e50;">Роль *</label>
                    <select id="userRole" required 
                            style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem;">
                        <option value="service_admin" ${user.role === 'service_admin' ? 'selected' : ''}>Суперадминистратор</option>
                        <option value="parking_administrator" ${user.role === 'parking_administrator' ? 'selected' : ''}>Администратор парковки</option>
                    </select>
                </div>

                <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 5px; border: 1px solid #ddd;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="userIsActive" ${user.is_active === true ? 'checked' : ''} 
                               style="width: 20px; height: 20px; cursor: pointer;">
                        <span style="font-weight: bold; color: #2c3e50;">Пользователь активен</span>
                    </label>
                    <p style="margin-top: 0.5rem; margin-bottom: 0; font-size: 0.85rem; color: #666;">
                        ${user.is_active === true
                ? '✅ Пользователь может войти в систему'
                : '❌ Пользователь не может войти в систему'}
                    </p>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem; padding-top: 1.5rem; border-top: 2px solid #eee;">
                    <button type="button" onclick="window.serviceAdminUsersView.closeEditModal()" 
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

    async saveUser(userId) {
        const username = document.getElementById('userUsername').value.trim();
        const password = document.getElementById('userPassword').value;
        const role = document.getElementById('userRole').value;
        const isActive = document.getElementById('userIsActive').checked;

        if (!username || !role) {
            toast.error('Заполните все обязательные поля');
            return;
        }

        if (password && password.length < 6) {
            toast.error('Пароль должен содержать минимум 6 символов');
            return;
        }

        const updateData = {
            username,
            role,
            is_active: isActive
        };

        if (password) {
            updateData.password = password;
        }

        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();

        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            const response = await fetch(`${API_HOST}/api/users/${userId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка обновления пользователя');
            }

            toast.success('Пользователь успешно обновлен!');
            this.closeEditModal();
            await this.fetchUsers();
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.innerHTML = this.renderUsersList();
            }
        } catch (error) {
            console.error('Failed to update user:', error);
            toast.error('Ошибка: ' + error.message);
        } finally {
            if (window.app) {
                window.app.toggleLoader(false);
            }
        }
    }

    async toggleUserStatus(userId, newStatus) {
        const user = this.users.find(u => +u.id === +userId);
        if (!user) {
            toast.error('Пользователь не найден');
            return;
        }

        const currentUser = authService.getUser();
        const currentUserId = currentUser?.id || currentUser?.userId;
        if (currentUser && currentUserId && +userId === +currentUserId) {
            toast.error('Вы не можете деактивировать самого себя');
            return;
        }

        // Преобразуем строку в boolean, если нужно
        // newStatus может быть строкой "true" или "false" из onclick
        let isActive;
        if (typeof newStatus === 'string') {
            isActive = newStatus === 'true';
        } else {
            isActive = Boolean(newStatus);
        }

        console.log('toggleUserStatus:', { userId, newStatus, isActive, currentStatus: user.is_active });

        const confirmMessage = isActive
            ? `Вы уверены, что хотите активировать пользователя "${user.username}"?`
            : `Вы уверены, что хотите деактивировать пользователя "${user.username}"?`;

        const confirmed = await confirmDialog.show(confirmMessage, {
            title: isActive ? 'Активация пользователя' : 'Деактивация пользователя',
            confirmText: isActive ? 'Активировать' : 'Деактивировать',
            cancelText: 'Отмена'
        });

        if (!confirmed) {
            return;
        }

        const updateData = {
            username: user.username,
            role: user.role,
            is_active: isActive
        };

        const API_HOST = getAPIHost();
        const headers = authService.getAuthHeaders();

        if (window.app) {
            window.app.toggleLoader(true);
        }

        try {
            const response = await fetch(`${API_HOST}/api/users/${userId}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка обновления статуса пользователя');
            }

            toast.success(`Пользователь успешно ${isActive ? 'активирован' : 'деактивирован'}!`);
            await this.fetchUsers();
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.innerHTML = this.renderUsersList();
            }
        } catch (error) {
            console.error('Failed to toggle user status:', error);
            toast.error('Ошибка: ' + error.message);
        } finally {
            if (window.app) {
                window.app.toggleLoader(false);
            }
        }
    }

    async deleteUser(userId, username) {
        const currentUser = authService.getUser();
        const currentUserId = currentUser?.id || currentUser?.userId;
        if (currentUser && currentUserId && +userId === +currentUserId) {
            toast.error('Вы не можете удалить самого себя');
            return;
        }

        const confirmed = await confirmDialog.danger(
            `Вы уверены, что хотите удалить пользователя "${username}"?\n\nЭто действие нельзя отменить!`,
            {
                title: 'Удаление пользователя',
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
            const response = await fetch(`${API_HOST}/api/users/${userId}`, {
                method: 'DELETE',
                headers: headers
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Ошибка удаления пользователя');
            }

            toast.success('Пользователь успешно удален!');
            await this.fetchUsers();
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.innerHTML = this.renderUsersList();
            }
        } catch (error) {
            console.error('Failed to delete user:', error);
            toast.error('Ошибка: ' + error.message);
        } finally {
            if (window.app) {
                window.app.toggleLoader(false);
            }
        }
    }

    destroy() {
        // Удаляем модальные окна при уничтожении view
        const createModal = document.getElementById('createUserModal');
        if (createModal) {
            createModal.remove();
        }
        const editModal = document.getElementById('editUserModal');
        if (editModal) {
            editModal.remove();
        }
    }
}

export { ServiceAdminUsersView };
window.ServiceAdminUsersView = ServiceAdminUsersView;

// Делаем view доступным глобально
window.serviceAdminUsersView = null;

