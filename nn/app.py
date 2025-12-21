#!/usr/bin/env python3
"""
Python микросервис для анализа изображений парковки с помощью PyTorch модели.
Использует разметку из slots.json для определения состояния каждого парковочного места.
"""

import os
import io
import json
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from torchvision import transforms, models
from PIL import Image
import numpy as np

app = Flask(__name__)
CORS(app)

# Конфигурация
MODEL_PATH = os.getenv('MODEL_PATH', '/app/parking_classifier.pt')
SLOTS_PATH = os.getenv('SLOTS_PATH', '/app/slots.json')
PORT = int(os.getenv('PORT', 5000))
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Глобальные переменные для модели
model = None
transform = None

def load_model():
    """Загружает PyTorch модель ResNet18"""
    global model, transform
    
    try:
        print(f"Loading model from {MODEL_PATH}...")
        print(f"Using device: {DEVICE}")
        
        # Создаем модель ResNet18 с 2 классами
        model = models.resnet18()
        model.fc = torch.nn.Linear(model.fc.in_features, 2)
        
        # Загружаем веса
        model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
        model.eval()
        model.to(DEVICE)
        
        # Трансформации для изображений (как в предоставленном коде)
        transform = transforms.Compose([
            transforms.Resize((128, 128)),
            transforms.ToTensor(),
            transforms.Normalize([0.5], [0.5])
        ])
        
        print("Model loaded successfully!")
        return True
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def process_image_with_slots(image_bytes, slots_config):
    """Обрабатывает изображение и определяет состояние каждого слота"""
    global model, transform
    
    if model is None:
        raise ValueError("Model not loaded")
    if slots_config is None:
        raise ValueError("Slots configuration not provided")
    
    # Загружаем изображение
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Failed to decode image")
    
    # Получаем размер изображения из разметки
    image_size = slots_config.get('image_size')
    if isinstance(image_size, list) and len(image_size) == 2:
        img = cv2.resize(img, (image_size[0], image_size[1]))
    else:
        raise ValueError("image_size is required in layout configuration and must be [width, height]")
    
    slots = slots_config.get('slots', [])
    spots_state = []
    slot_details = []
    CLASSES = ["free", "occupied"]
    
    # Обработка каждого слота
    for s in slots:
        pts = np.array(s["polygon"], np.int32)
        x_min, y_min = pts[:, 0].min(), pts[:, 1].min()
        x_max, y_max = pts[:, 0].max(), pts[:, 1].max()
        
        # защита от выхода за границы
        x_min, y_min = max(0, x_min), max(0, y_min)
        x_max, y_max = min(img.shape[1], x_max), min(img.shape[0], y_max)
        
        # Вырезаем область слота
        crop = img[y_min:y_max, x_min:x_max]
        
        if crop.size == 0:
            print(f"Warning: Empty crop for slot {s['slot_id']}")
            spots_state.append(0)  # по умолчанию занято
            slot_details.append({
                'slot_id': s['slot_id'],
                'status': 'occupied',
                'confidence': 0.0
            })
            continue
        
        # Конвертируем в PIL Image и применяем трансформации
        im_pil = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
        x = transform(im_pil).unsqueeze(0).to(DEVICE)
        
        # Инференс
        with torch.no_grad():
            pred = model(x)
            class_idx = pred.argmax(1).item()
            cls = CLASSES[class_idx]
            
            # Получаем вероятности для дополнительной информации
            probs = torch.softmax(pred, dim=1)[0]
            confidence = probs[class_idx].item()
        
        # Преобразуем в формат ответа: 1 = free, 0 = occupied
        state = 1 if cls == "free" else 0
        spots_state.append(state)
        
        slot_details.append({
            'slot_id': s['slot_id'],
            'status': cls,
            'confidence': confidence
        })
    
    return spots_state, slot_details

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'model_loaded': model is not None,
        'device': str(DEVICE)
    })

@app.route('/predict', methods=['POST'])
def predict_image():
    """Основной endpoint для анализа изображения"""
    if model is None:
        return jsonify({
            'error': 'Model not loaded'
        }), 500
    
    try:
        # Проверяем наличие файла в запросе
        if 'image' not in request.files:
            return jsonify({
                'error': 'No image file provided. Use "image" field in form-data.'
            }), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({
                'error': 'Empty file provided'
            }), 400
        
        # Получаем разметку из запроса
        layout_json = request.form.get('layout')
        if not layout_json:
            return jsonify({
                'error': 'No layout provided. Use "layout" field in form-data with JSON string.'
            }), 400
        
        try:
            slots_config = json.loads(layout_json)
        except json.JSONDecodeError as e:
            return jsonify({
                'error': f'Invalid layout JSON: {str(e)}'
            }), 400
        
        # Читаем изображение
        image_bytes = file.read()
        
        if len(image_bytes) == 0:
            return jsonify({
                'error': 'Empty image file'
            }), 400
        
        # Обрабатываем изображение с разметкой
        spots_state, slot_details = process_image_with_slots(image_bytes, slots_config)
        
        return jsonify({
            'status': 'success',
            'spots_state': spots_state,
            'total_spots': len(spots_state),
            'free_spots': sum(spots_state),
            'occupied_spots': len(spots_state) - sum(spots_state),
            'slot_details': slot_details
        })
        
    except ValueError as e:
        return jsonify({
            'error': str(e)
        }), 400
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': f'Internal server error: {str(e)}'
        }), 500

@app.route('/predict-base64', methods=['POST'])
def predict_base64():
    """Endpoint для анализа изображения в base64 формате"""
    if model is None:
        return jsonify({
            'error': 'Model not loaded'
        }), 500
    
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({
                'error': 'No image data provided. Send JSON with "image" field containing base64 string.'
            }), 400
        
        if 'layout' not in data:
            return jsonify({
                'error': 'No layout provided. Send JSON with "layout" field containing layout JSON object.'
            }), 400
        
        slots_config = data['layout']
        if not isinstance(slots_config, dict):
            return jsonify({
                'error': 'Layout must be a JSON object.'
            }), 400
        
        import base64
        
        # Декодируем base64
        image_data = data['image']
        if image_data.startswith('data:image'):
            # Убираем префикс data:image/...;base64,
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        
        # Обрабатываем изображение с разметкой
        spots_state, slot_details = process_image_with_slots(image_bytes, slots_config)
        
        return jsonify({
            'status': 'success',
            'spots_state': spots_state,
            'total_spots': len(spots_state),
            'free_spots': sum(spots_state),
            'occupied_spots': len(spots_state) - sum(spots_state),
            'slot_details': slot_details
        })
        
    except ValueError as e:
        return jsonify({
            'error': str(e)
        }), 400
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': f'Internal server error: {str(e)}'
        }), 500

if __name__ == '__main__':
    print("Starting NN Service...")
    
    if not load_model():
        print("Failed to load model. Exiting...")
        exit(1)
    
    print(f"NN Service is running on port {PORT}")
    print("Note: Layout configuration should be provided with each request.")
    app.run(host='0.0.0.0', port=PORT, debug=False)
