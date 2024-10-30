const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const iotRoutes = require('./iot/iotRoutes'); // Importa las rutas desde iotRoutes.js
const mobileRoutes = require('./mobile/mobileRoutes'); // Importa las rutas desde mobileRoutes.js
const iotData = require('./iot/iotData');
const userData = require('./mobile/userData');

const port = 3000;
const app = express();
let wereCertificationsFound = false;
let options = {};

// Verificar si existen los certificados SSL
try {
    const keyPath = path.join(__dirname, 'cert', 'key.pem');
    const certPath = path.join(__dirname, 'cert', 'cert.pem');

    fs.accessSync(keyPath);
    fs.accessSync(certPath);
    wereCertificationsFound = true;

    // Configurar las opciones de HTTPS si se encuentran los certificados
    options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
    };

    console.log('Certificados SSL encontrados');
} catch (e) {
    console.log('No se encontraron los certificados SSL, se iniciará el servidor en modo HTTP.');
}

// Inicializa CORS para permitir todas las solicitudes
app.use(cors({ origin: '*', methods: 'GET,HEAD,PUT,PATCH,POST,DELETE' }));

// Middleware para manejar JSON
app.use(express.json());

// Configuración de Swagger
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Mi API Express',
            version: '1.0.0',
            description: 'Documentación de la API generada por Swagger',
        },
        servers: [{ url: wereCertificationsFound?'https://localhost:3000':'http://localhost:3000' }],
    },
    apis: ['./iot/iotRoutes.js', './mobile/mobileRoutes.js'], // Ruta del archivo donde defines tus endpoints
};

// Generar la documentación Swagger
let swaggerDocs = swaggerJsDoc(swaggerOptions);

// Filtrar endpoints con el tag `hidden`
swaggerDocs.tags = swaggerDocs.tags?.filter(tag => tag.name.find('hidden'));
Object.keys(swaggerDocs.paths).forEach((path) => {
    Object.keys(swaggerDocs.paths[path]).forEach((method) => {
        if (swaggerDocs.paths[path][method].tags?.includes('hidden')) {
            delete swaggerDocs.paths[path][method];
        }
    });
});

app.use('/swagger-ui', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Usar las rutas definidas en iotRoutes.js
app.use('/api/v1/iot', iotRoutes);
app.use('/api/v1/mobile', mobileRoutes);
app.get('/', (req, res) => {
    res.redirect('/swagger-ui');
});

iotData.initTicker()
userData.initTicker()

// Crear servidor HTTP o HTTPS según la disponibilidad de los certificados
if (wereCertificationsFound) {
    https.createServer(options, app).listen(port, () => {
        console.log(`Servidor HTTPS iniciado en https://localhost:${port}`);
        console.log(`Swagger API disponible en https://localhost:${port}/swagger-ui`);
    });
} else {
    app.listen(port, () => {
        console.log(`Servidor HTTP iniciado en http://localhost:${port}`);
        console.log(`Swagger API disponible en http://localhost:${port}/swagger-ui`);
    });
}