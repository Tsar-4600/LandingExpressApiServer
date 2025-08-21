// server.js
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Валидационные функции
const validateName = (name) => {
    if (!name || typeof name !== 'string') return false;
    const trimmedName = name.trim();
    return trimmedName.length >= 2 && trimmedName.length <= 50;
};

const validatePhone = (phone) => {
    if (!phone || typeof phone !== 'string') return false;
    // Российские номера: +7, 8, или без кода (10 цифр)
    const phoneRegex = /^(\+7|8|7)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
};

const validateModel = (model) => {
    return model && typeof model === 'string' && model.trim().length > 0;
};

// Middleware для валидации
const validateRequest = (fields) => {
    return (req, res, next) => {
        const errors = [];
        
        if (fields.includes('name') && !validateName(req.body.name)) {
            errors.push('Имя должно быть от 2 до 50 символов');
        }
        
        if (fields.includes('phone') && !validatePhone(req.body.phone)) {
            errors.push('Неверный формат телефона');
        }
        
        if (fields.includes('model') && !validateModel(req.body.model)) {
            errors.push('Модель не может быть пустой');
        }
        
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ошибка валидации',
                errors: errors
            });
        }
        
        next();
    };
};

// Ваши данные (можно вынести в отдельный файл)
const productsData = require('./products');

// API endpoint для получения продуктов
app.get('/api/products', (req, res) => {
    res.json(productsData);
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Новый endpoint для обработки заявок
app.post('/api/submit-model', validateRequest(['name', 'phone', 'model']), (req, res) => {
    try {
        const { name, phone, model } = req.body;
        
        console.log('📨 Получена новая заявка:');
        console.log('👤 Имя:', name.trim());
        console.log('📞 Телефон:', phone);
        console.log('🚗 Модель:', model.trim());
        console.log('⏰ Время:', new Date().toLocaleString());
        console.log('---');
        
        // Здесь можно добавить сохранение в базу данных
        // или отправку email уведомления
        
        res.status(200).json({
            success: true,
            message: 'Заявка успешно принята',
        });
        
    } catch (error) {
        console.error('❌ Ошибка при обработке заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

app.post('/api/submit-SpeacialLease', validateRequest(['name', 'phone']), (req, res) => {
    try {
        const { name, phone } = req.body;
        
        console.log('📨 Получена новая заявка на специальный лизинг:');
        console.log('👤 Имя:', name.trim());
        console.log('📞 Телефон:', phone);
        console.log('⏰ Время:', new Date().toLocaleString());
        console.log('---');
        
        // Здесь можно добавить:
        // 1. Сохранение в базу данных
        // 2. Отправку email уведомления
        // 3. Интеграцию с CRM системой
        
        res.status(200).json({
            success: true,
            message: 'Заявка на лизинг успешно принята',
        });
        
    } catch (error) {
        console.error('❌ Ошибка при обработке заявки на лизинг:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

app.post('/api/submit-contacts', validateRequest(['name', 'phone']), (req, res) => {
    try {
        const { name, phone } = req.body;
        
        console.log('📨 Получены новые контактные данные:');
        console.log('👤 Имя:', name.trim());
        console.log('📞 Телефон:', phone);
        console.log('⏰ Время:', new Date().toLocaleString());
        console.log('---');
        
        // Здесь можно добавить:
        // 1. Сохранение в базу данных
        // 2. Отправку email уведомления
        // 3. Интеграцию с CRM системой
        
        res.status(200).json({
            success: true,
            message: 'Контактные данные успешно получены',
        });
        
    } catch (error) {
        console.error('❌ Ошибка при обработке контактных данных:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});