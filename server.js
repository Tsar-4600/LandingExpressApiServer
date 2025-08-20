// server.js
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
app.post('/api/submit', (req, res) => {
    try {
        const { name, phone, model } = req.body;
        
        console.log('📨 Получена новая заявка:');
        console.log('👤 Имя:', name);
        console.log('📞 Телефон:', phone);
        console.log('🚗 Модель:', model);
        console.log('⏰ Время:', new Date().toLocaleString());
        console.log('---');
        
        // Здесь можно добавить сохранение в базу данных
        // или отправку email уведомления
        
        res.status(200).json({
            success: true,
            message: 'Заявка успешно принята',
            data: { name, phone }
        });
        
    } catch (error) {
        console.error('❌ Ошибка при обработке заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});
