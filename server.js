// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');
const querystring = require('querystring');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3001;

app.set('trust proxy', 1); // Доверяем первому прокси (nginx)

// Middleware
app.use(cors({
    origin: [
        'https://zoomlion.gkvertikal.ru',
    ],
    methods: ['GET', 'POST', 'OPTIONS'], // только необходимые методы
    allowedHeaders: ['Content-Type', 'Authorization'], // только необходимые заголовки
    credentials: false, // true только если используете куки/авторизацию
    optionsSuccessStatus: 200 // для legacy браузеров
}));
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
// Часовой пояс 
const getMoscowTime = () => {
    return new Date().toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
        hour12: false
    });
};
//limiter запросов

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 45 minutes
    limit: 1, // Limit each IP to 100 requests per `window` (here, per 1 minute).
    standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    ipv6Subnet: 64, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
    // store: ... , // Redis, Memcached, etc. See below.
})

// Интеграция заявки с calltouch

const sendToCallTouch = (data) => {
    return new Promise((resolve, reject) => {
        try {
            const params = {
                subject: data.subject || 'Заявка с сайта zoomlion.gkvertikal.ru',
                requestUrl: data.requestUrl || `${process.env.SITE_URL}`,
                fio: data.name || '',
                phoneNumber: data.phone || '',
                ...(data.model && { model: data.model })
            };

            const postData = querystring.stringify(params);

            const options = {
                hostname: `${process.env.CALLTOUCH_HOST}`,
                port: 443,
                path: `${process.env.CALLTOUCH_API_PATH}/${process.env.CALLTOUCH_SITE_ID}/register/`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            console.log('📤 Отправка POST в CallTouch:', params);

            const req = https.request(options, (response) => {
                let responseData = '';

                response.on('data', (chunk) => {
                    responseData += chunk;
                });

                response.on('end', () => {
                    try {
                        const parsedData = JSON.parse(responseData);
                        console.log('✅ CallTouch ответил успешно');
                        resolve({
                            success: true,
                            data: parsedData,
                            statusCode: response.statusCode
                        });
                    } catch (parseError) {
                        console.log('✅ CallTouch ответил (не JSON):', responseData);
                        resolve({
                            success: true,
                            data: responseData,
                            statusCode: response.statusCode
                        });
                    }
                });
            });

            req.on('error', (error) => {
                console.error('❌ Ошибка сети:', error.message);
                resolve({
                    success: false,
                    error: error.message,
                    statusCode: 0
                });
            });

            req.setTimeout(10000, () => {
                req.destroy();
                console.error('⏰ Таймаут запроса к CallTouch');
                resolve({
                    success: false,
                    error: 'Timeout',
                    statusCode: 0
                });
            });

            // Отправляем данные
            req.write(postData);
            req.end();

        } catch (error) {
            console.error('❌ Ошибка формирования запроса:', error.message);
            resolve({
                success: false,
                error: error.message,
                statusCode: 0
            });
        }
    });
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
app.post('/api/submit-model', limiter, validateRequest(['name', 'phone', 'model']), async (req, res) => {
    try {
        const { name, phone, model } = req.body;

        console.log('📨 Получена новая заявка:');
        console.log('👤 Имя:', name.trim());
        console.log('📞 Телефон:', phone);
        console.log('🚗 Модель:', model.trim());
        console.log('⏰ Время:', getMoscowTime())
        console.log('---');

        // Здесь можно добавить сохранение в базу данных
        // или отправку email уведомления

        res.status(200).json({
            success: true,
            message: 'Заявка успешно принята',
        });

        // Отправляем данные в CallTouch через POST
        const calltouchResult = await sendToCallTouch({
            subject: `zoomlion.gkvertikal.ru Заявка на модель: ${model}`,
            name: name.trim(),
            phone: phone,
            model: model.trim(),
            requestUrl: req.headers.referer || 'https://zoomlion.gkvertikal.ru/'
        });
        console.log('📊 Статус отправки в CallTouch:', calltouchResult.success ? 'Успех' : 'Ошибка');

    } catch (error) {
        console.error('❌ Ошибка при обработке заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

app.post('/api/submit-SpeacialLease', limiter, validateRequest(['name', 'phone']), async (req, res) => {
    try {
        const { name, phone } = req.body;

        console.log('📨 Получена новая заявка на специальный лизинг:');
        console.log('👤 Имя:', name.trim());
        console.log('📞 Телефон:', phone);
        console.log('⏰ Время:', getMoscowTime())
        console.log('---');

        // Здесь можно добавить:
        // 1. Сохранение в базу данных
        // 2. Отправку email уведомления
        // 3. Интеграцию с CRM системой

        res.status(200).json({
            success: true,
            message: 'Заявка на лизинг успешно принята',
        });


        // Отправляем данные в CallTouch через POST
        const calltouchResult = await sendToCallTouch({
            subject: `zoomlion.gkvertikal.ru заявка на спец Лизинг`,
            name: name.trim(),
            phone: phone,
            requestUrl: req.headers.referer || 'https://zoomlion.gkvertikal.ru/'
        });
        console.log('📊 Статус отправки в CallTouch:', calltouchResult.success ? 'Успех' : 'Ошибка');

    } catch (error) {
        console.error('❌ Ошибка при обработке заявки на лизинг:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});

app.post('/api/submit-contacts', limiter, validateRequest(['name', 'phone']), async (req, res) => {
    try {
        const { name, phone } = req.body;

        console.log('📨 Получены новые контактные данные:');
        console.log('👤 Имя:', name.trim());
        console.log('📞 Телефон:', phone);
        console.log('⏰ Время:', getMoscowTime())
        console.log('---');

        // Здесь можно добавить:
        // 1. Сохранение в базу данных
        // 2. Отправку email уведомления
        // 3. Интеграцию с CRM системой

        res.status(200).json({
            success: true,
            message: 'Контактные данные успешно получены',
        });


        // Отправляем данные в CallTouch через POST
        const calltouchResult = await sendToCallTouch({
            subject: `zoomlion.gkvertikal.ru заявка из секции контактов`,
            name: name.trim(),
            phone: phone,
            requestUrl: req.headers.referer || 'https://zoomlion.gkvertikal.ru/'
        });
        console.log('📊 Статус отправки в CallTouch:', calltouchResult.success ? 'Успех' : 'Ошибка');
    } catch (error) {
        console.error('❌ Ошибка при обработке контактных данных:', error);
        res.status(500).json({
            success: false,
            message: 'Внутренняя ошибка сервера'
        });
    }
});