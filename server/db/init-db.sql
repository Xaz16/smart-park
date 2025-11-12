-- Создание типа для ролей
CREATE TYPE USER_ROLE AS ENUM ('parking_administrator', 'service_admin');

-- Таблица парковок
CREATE TABLE parking (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    total_spots INTEGER NOT NULL DEFAULT 0,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица камер
CREATE TABLE camera (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rtsp_url VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица связи парковок и камер (многие-ко-многим)
CREATE TABLE parking_camera (
    id BIGSERIAL PRIMARY KEY,
    parking_id BIGINT NOT NULL REFERENCES parking(id) ON DELETE CASCADE,
    camera_id BIGINT NOT NULL REFERENCES camera(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parking_id, camera_id)
);

-- Таблица парковочных мест (статус в реальном времени)
CREATE TABLE parking_spot (
    id BIGSERIAL PRIMARY KEY,
    parking_id BIGINT NOT NULL REFERENCES parking(id) ON DELETE CASCADE,
    spot_number INTEGER NOT NULL,
    is_free BOOLEAN DEFAULT true,
    coordinates JSON NOT NULL, -- { "x": 10.5, "y": 20.3 } или { "points": [[x1,y1], [x2,y2], ...] } для полигонов
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parking_id, spot_number)
);

-- Таблица истории занятости (для отчетов и статистики)
CREATE TABLE parking_history (
    id BIGSERIAL PRIMARY KEY,
    parking_id BIGINT NOT NULL REFERENCES parking(id) ON DELETE CASCADE,
    spots_state JSON NOT NULL, -- массив состояний мест [1,0,1,...] где 1-свободно, 0-занято
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица пользователей
CREATE TABLE app_user (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role USER_ROLE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица связи пользователей и парковок (многие-ко-многим)
CREATE TABLE user_parking (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    parking_id BIGINT NOT NULL REFERENCES parking(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, parking_id)
);

-- Индексы для оптимизации
CREATE INDEX idx_parking_spot_parking_id ON parking_spot(parking_id);
CREATE INDEX idx_parking_spot_is_free ON parking_spot(is_free);
CREATE INDEX idx_parking_history_parking_id ON parking_history(parking_id);
CREATE INDEX idx_parking_history_recorded_at ON parking_history(recorded_at);
CREATE INDEX idx_user_parking_user_id ON user_parking(user_id);
CREATE INDEX idx_user_parking_parking_id ON user_parking(parking_id);
CREATE INDEX idx_user_role ON app_user(role);
CREATE INDEX idx_parking_camera_parking_id ON parking_camera(parking_id);
CREATE INDEX idx_parking_camera_camera_id ON parking_camera(camera_id);
