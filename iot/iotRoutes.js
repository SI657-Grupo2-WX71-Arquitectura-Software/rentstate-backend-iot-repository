const express = require('express');
const iotData = require('./iotData');
const userData = require('../mobile/userData');
const errorClass = require('../shared/responseClass');
const internalCodes = require('../shared/internalCodes');

const router = express.Router();

//iot API

/**
 * @swagger
 * /api/v1/iot/:
 *   get:
 *     tags:
 *     - IoT API
 *     summary: Devuelve un mensaje para verificar que la API está funcionando correctamente
 *     responses:
 *       200:
 *         description: Operación exitosa
 */
router.get('/', (req, res) => {
    res.json({ message: 'API endpoint funcionando correctamente' });
});

/**
 * @swagger
 * /api/v1/iot/init:
 *   post:
 *     tags:
 *     - IoT API
 *     summary: Permite a los dispositivos IoT obtener su configuración.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: El identificador único del dispositivo IoT.
 *                 example: 1
 *               password:
 *                 type: string
 *                 description: La contraseña asociada al dispositivo.
 *                 example: string
 *               deviceTypeId:
 *                 type: integer
 *                 description: Código del tipo de dispositivo IOT. Se usa para identificarlo por imagen en frontend
 *                 example: 1
 *             required:
 *               - id
 *               - password
 *     responses:
 *       200:
 *         description: Operación exitosa.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deviceId:
 *                   type: integer
 *                   description: El identificador único del dispositivo IoT.
 *                   example: 123456
 *                 password:
 *                   type: string
 *                   description: La contraseña asociada al dispositivo.
 *                   example: mySecurePassword
 *                 userId:
 *                   type: integer
 *                   description: El ID del usuario asociado al dispositivo.
 *                   example: 7890
 *                 enabled:
 *                   type: boolean
 *                   description: Indica si el dispositivo está habilitado.
 *                   example: true
 *                 deactivationKey:
 *                   type: string
 *                   description: La clave para desactivar el dispositivo.
 *                   example: 1234
 *       400:
 *         description: Error de solicitud. Se requiere id y password.
 *       401:
 *         description: Contraseña inválida.
 */
router.post('/init', async (req, res) => {
    const id = req.body.id;
    const password = req.body.password;
    const deviceTypeId = req.body.deviceTypeId;

    //Obtiene las opciones de configuración de los dispositivos IoT
    let response =  await iotData.initDevice(id, password, deviceTypeId);
    if(response.internalCode === internalCodes.success)
        res.status(response.code).json(response.message);
    else
        res.status(response.code).json({message: response.message, internalCode: response.internalCode});
});

/**
 * @swagger
 * /api/v1/iot/message:
 *   post:
 *     tags:
 *     - IoT API
 *     summary: Envía un mensaje a un dispositivo IoT.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: El identificador único del dispositivo IoT.
 *                 example: 1
 *               password:
 *                 type: string
 *                 description: La contraseña asociada al dispositivo.
 *                 example: mySecurePassword
 *               message:
 *                 type: string
 *                 description: El mensaje a enviar al dispositivo IoT.
 *                 example: "Device alert: Temperature threshold exceeded"
 *               severity:
 *                 type: string
 *                 description: Nivel de severidad del mensaje.
 *                 example: "info"
 *                 enum: [info, warning, critical]
 *             required:
 *               - id
 *               - password
 *               - message
 *     responses:
 *       200:
 *         description: Mensaje enviado con éxito.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Confirmación de la operación.
 *                   example: "Message successfully added"
 *                 internalCode:
 *                   type: string
 *                   description: Código interno del mensaje.
 *                   example: "MSG001"
 *       400:
 *         description: Error de solicitud. Se requiere id, password y message.
 *       401:
 *         description: Contraseña inválida.
 */
router.post('/message', (req, res) => {
    //Busca un id y una contraseña en el cuerpo de la solicitud
    const id = req.body.id;
    const password = req.body.password;
    const message = req.body.message;
    let severity = req.body.severity?req.body.severity:'info';

    //Obtiene las opciones de configuración de los dispositivos IoT
    let response = iotData.addMessage(id, password, message, severity);
    if(response.internalCode === internalCodes.success)
        res.status(response.code).json(response.message);
    else
        res.status(response.code).json({message: response.message, internalCode: response.internalCode});
});

/**
 * @swagger
 * /api/v1/iot/experimental-endpoint:
 *   get:
 *     tags:
 *     - hidden
 *     - IoT API
 *     summary: Permite modificar un atributo de userFechedData para pruebas.
 *     description:
 *       Este endpoint es para pruebas y no debe usarse en producción.
 *       Tiene como propósito modificar un atributo de userFechedData para verificar una funcionalidad de javaScript.
 *     responses:
 *       200:
 *         description: Operación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de confirmación.
 *                   example: "Datos de usuario sobreescritos"
 *                 data:
 *                   type: object
 *                   description: Datos de usuario almacenados en userFechedData.
 *                   example: {"1": {userId: 1, username: 'admin', password:'admin', token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTcyOTQxNDI2MywiZXhwIjoxNzI5NDE1NzAzfQ.9asVaAHazsdYqLDLdni5EskMlROHI1K31M1JFeGuevM'}}
 */
router.get('/exp', (req, res) => {
    userData.set({1:{userId: 1, username: 'admin', password:'admin', token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTcyOTQxNDI2MywiZXhwIjoxNzI5NDE1NzAzfQ.9asVaAHazsdYqLDLdni5EskMlROHI1K31M1JFeGuevM'}})
    res.json({ message: 'Datos de usuario sobreescritos', data: userData.get() })
});

/**
 * @swagger
 * /api/v1/iot/localdata:
 *   get:
 *     tags:
 *     - IoT API
 *     summary: Devuelve los datos almacenados en iotData.
 *     description: Este endpoint es para pruebas y no debe usarse en producción. Tiene como propósito obtener los datos actuales almacenados en iotData.
 *     responses:
 *       200:
 *         description: Operación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   description: Datos almacenados en iotData.
 *                   example: {"1": {deviceId: 123456, password: 'mySecurePassword', userId: 7890, enabled: true, deactivationKey: 1234}}
 */
router.get('/localdata', (req, res) => {
    res.json({ data: iotData.get() });
});

// Exporta las rutas
module.exports = router;