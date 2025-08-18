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