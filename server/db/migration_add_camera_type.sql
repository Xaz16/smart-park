-- Миграция: добавление поля camera_type в таблицу camera
-- Выполните этот скрипт, если база данных уже существует

-- Создаем тип для типов камер (если еще не существует)
DO $$ BEGIN
    CREATE TYPE CAMERA_TYPE AS ENUM ('rtsp', 'static', 'http', 'file');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Добавляем поле camera_type в таблицу camera
ALTER TABLE camera 
ADD COLUMN IF NOT EXISTS camera_type CAMERA_TYPE NOT NULL DEFAULT 'rtsp';

-- Делаем rtsp_url опциональным (может быть NULL для static камер)
ALTER TABLE camera 
ALTER COLUMN rtsp_url DROP NOT NULL;

