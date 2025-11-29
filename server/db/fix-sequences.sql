-- Исправление последовательностей для автоинкремента
-- Этот скрипт синхронизирует последовательности с текущими максимальными значениями id

-- Для таблицы parking
SELECT setval('parking_id_seq', COALESCE((SELECT MAX(id) FROM parking), 1), true);

-- Для таблицы camera
SELECT setval('camera_id_seq', COALESCE((SELECT MAX(id) FROM camera), 1), true);

-- Для таблицы parking_camera
SELECT setval('parking_camera_id_seq', COALESCE((SELECT MAX(id) FROM parking_camera), 1), true);

-- Для таблицы parking_spot
SELECT setval('parking_spot_id_seq', COALESCE((SELECT MAX(id) FROM parking_spot), 1), true);

-- Для таблицы parking_history
SELECT setval('parking_history_id_seq', COALESCE((SELECT MAX(id) FROM parking_history), 1), true);

-- Для таблицы app_user
SELECT setval('app_user_id_seq', COALESCE((SELECT MAX(id) FROM app_user), 1), true);

-- Для таблицы user_parking
SELECT setval('user_parking_id_seq', COALESCE((SELECT MAX(id) FROM user_parking), 1), true);

