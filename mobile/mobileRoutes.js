const express = require('express');
const userData = require('./userData');
const errorClass = require('../shared/responseClass');
const iotData = require("../iot/iotData");
const internalCodes = require("../shared/internalCodes");
const router = express.Router();

//mobile API


/**
 * @swagger
 *   /api/v1/mobile/:
 *     get:
 *       tags:
 *         - mobile API
 *       summary: Verifica si la API móvil está funcionando
 *       description: Este endpoint permite a los usuarios verificar si la API móvil está funcionando correctamente.
 *       responses:
 *         200:
 *           description: Operación exitosa
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                     description: Mensaje de éxito.
 *                     example: mobile API working
 *                   data:
 *                     type: object
 *                     description: Datos de usuario almacenados en la API.
 *                     example: {1: {userId: 1, token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTcyOTQxNDI2MywiZXhwIjoxNzI5NDE1NzAzfQ.9asVaAHazsdYqLDLdni5EskMlROHI1K31M1JFeGuevM', username:'user123', password:'pass123'}, 2: {userId: 2, token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTcyOTQxNDI2MywiZXhwIjoxNzI5NDE1NzAzfQ.9asVaAHazsdYqLDLdni5EskMlROHI1K31M1JFeGuevM', username: 'user456', password: 'pass456'}}
 */
router.get('/', (req, res) => {
    res.json({message: 'mobile API working'});
});

/**
 * @swagger
 * /api/v1/mobile/login:
 *   post:
 *     tags:
 *     - mobile API
 *     summary: Inicia sesión en el sistema móvil
 *     description: Este endpoint permite a los usuarios móviles iniciar sesión proporcionando un nombre de usuario y una contraseña.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: El nombre de usuario del usuario que intenta iniciar sesión.
 *                 example: admin
 *               password:
 *                 type: string
 *                 description: La contraseña del usuario.
 *                 example: admin
 *     responses:
 *       200:
 *         description: Operación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: integer
 *                   description: El nombre de usuario del usuario que ha iniciado sesión.
 *                   example: user123
 *                 token:
 *                   type: string
 *                   description: Token de autenticación generado para el usuario.
 *                   example: abcdef12345
 *       400:
 *         description: Nombre de usuario o contraseña no proporcionados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que se requieren el nombre de usuario y la contraseña.
 *                   example: username and password are required
 *       401:
 *         description: Nombre de usuario o contraseña inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que el nombre de usuario o la contraseña son incorrectos.
 *                   example: Invalid username or password
 *       500:
 *         description: Error interno del servidor al intentar contactar el servidor de autenticación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que no se pudo contactar con el servidor de autenticación.
 *                   example: Unable to contact real login server
 */
router.post('/login', async (req, res) => {
    //Si no hay usuario o contraseña, responde con un error
    let username = req.body.username;
    let password = req.body.password;

    let response =  await userData.login(username, password);
    if(response.internalCode === internalCodes.success)
        res.status(response.code).json(response.message);
    else
        res.status(response.code).json({message: response.message, internalCode: response.internalCode});
});

/**
 * @swagger
 * /api/v1/mobile/user/:userId/properties/list:
 *   post:
 *     tags:
 *     - mobile API
 *     summary: Obtiene las propiedades del usuario
 *     description: Este endpoint permite a los usuarios obtener información sobre sus propiedades proporcionando un userId y un token.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         description: El ID del usuario cuyas propiedades se desean obtener.
 *         schema:
 *           type: string
 *           example: 12345
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token de autenticación válido para el usuario.
 *                 example: abcdef12345
 *     responses:
 *       200:
 *         description: Operación exitosa, se han recuperado las propiedades del usuario.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 properties:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: El ID de la propiedad.
 *                         example: property123
 *                       name:
 *                         type: string
 *                         description: Nombre de la propiedad.
 *                         example: Casa en la playa
 *                       location:
 *                         type: string
 *                         description: Ubicación de la propiedad.
 *                         example: Lima, Perú
 *       400:
 *         description: El userId o el token no fueron proporcionados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que el userId y el token son requeridos.
 *                   example: userId and token are required
 *       401:
 *         description: El userId no coincide con el token proporcionado o el token ha expirado, o el usuario no tiene propiedades.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que el userId no coincide o el token ha expirado.
 *                   example: UserId does not match the given token or token has expired
 *       500:
 *         description: Error interno del servidor al intentar contactar el servidor de propiedades.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que no se pudo contactar con el servidor de propiedades.
 *                   example: Unable to contact real properties server
 */
router.post('/user/:userId/properties/list', async (req, res) => {
    //Obten el userId de los parámetros de la solicitud
    const userId = req.params.userId;
    const token = req.body.token;

    let response =  await userData.listProperties(userId, token);
    if(response.internalCode === internalCodes.success)
        res.status(response.code).json(response.message);
    else
        res.status(response.code).json({message: response.message, internalCode: response.internalCode});
});

/**
 * @swagger
 * /api/v1/mobile/user/{userId}/devices/link:
 *   post:
 *     tags:
 *     - mobile API
 *     summary: Vincula un dispositivo a un usuario
 *     description: Permite vincular un dispositivo a un usuario específico proporcionando el `userId`, `token`, `deviceId` y `devicePassword`.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: El ID del usuario al que se desea vincular el dispositivo.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token de autenticación del usuario.
 *                 example: kasfngljadfnlkjbnlasnfklkdfsbk.ladmkñlvmnblnaf.aognadllbnllavbl
 *               deviceId:
 *                 type: string
 *                 description: El identificador del dispositivo que se desea vincular.
 *                 example: 1
 *               password:
 *                 type: string
 *                 description: La contraseña del dispositivo que se desea vincular.
 *                 example: string
 *               propertyId:
 *                 type: string
 *                 description: El ID de la propiedad a la que pertenece el dispositivo.
 *                 example: 14
 *     responses:
 *       200:
 *         description: Dispositivo vinculado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   description: ID del usuario.
 *                   example: user123
 *                 deviceId:
 *                   type: string
 *                   description: ID del dispositivo vinculado.
 *                   example: device001
 *                 enabled:
 *                   type: boolean
 *                   description: Estado de activación del dispositivo.
 *                   example: true
 *                 deactivationKey:
 *                   type: string
 *                   description: Clave de desactivación del dispositivo.
 *                   example: key123
 *       400:
 *         description: Faltan parámetros requeridos en la solicitud.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que los parámetros son requeridos.
 *                   example: deviceId and devicePassword are required
 *       401:
 *         description: Token de autenticación inválido o contraseña de dispositivo incorrecta.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que el token es inválido o la contraseña no coincide.
 *                   example: Invalid device password
 *       404:
 *         description: Dispositivo no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que el dispositivo no se encontró.
 *                   example: Device not found
 *       409:
 *         description: El dispositivo ya está vinculado al usuario.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que el dispositivo ya está vinculado.
 *                   example: Device already linked
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error del servidor.
 *                   example: Internal server error
 */
router.post('/user/:userId/devices/link', async (req, res) => {
    let userId = req.params.userId;
    let token = req.body.token;
    let deviceId = req.body.deviceId;
    let devicePassword = req.body.password;
    let propertyId = req.body.propertyId

    let response = await userData.linkDevice(userId, token, deviceId, devicePassword, propertyId);
    if(response.internalCode === internalCodes.success)
        res.status(response.code).json(response.message);
    else
        res.status(response.code).json({message: response.message, internalCode: response.internalCode});
});

/**
 * @swagger
 * /api/v1/mobile/user/{userId}/devices/unlink:
 *   post:
 *     tags:
 *     - mobile API
 *     summary: Vincula un dispositivo a un usuario
 *     description: Permite desvincular un dispositivo de un usuario específico proporcionando el `userId`, `token`, `deviceId` y `devicePassword`.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: El ID del usuario al que se desea desvincular el dispositivo.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token de autenticación del usuario.
 *                 example: kasfngljadfnlkjbnlasnfklkdfsbk.ladmkñlvmnblnaf.aognadllbnllavbl
 *               deviceId:
 *                 type: string
 *                 description: El identificador del dispositivo que se desea desvincular.
 *                 example: 1
 *               password:
 *                 type: string
 *                 description: La contraseña del dispositivo que se desea desvincular.
 *                 example: string
 *               propertyId:
 *                 type: string
 *                 description: El ID de la propiedad a la que pertenece el dispositivo.
 *                 example: 14
 *     responses:
 *       200:
 *         description: Dispositivo desvinculado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   description: ID del usuario.
 *                   example: user123
 *                 deviceId:
 *                   type: string
 *                   description: ID del dispositivo desvinculado.
 *                   example: device001
 *                 enabled:
 *                   type: boolean
 *                   description: Estado de activación del dispositivo.
 *                   example: true
 *                 deactivationKey:
 *                   type: string
 *                   description: Clave de desactivación del dispositivo.
 *                   example: key123
 *       400:
 *         description: Faltan parámetros requeridos en la solicitud.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que los parámetros son requeridos.
 *                   example: deviceId and devicePassword are required
 *       401:
 *         description: Token de autenticación inválido o contraseña de dispositivo incorrecta.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que el token es inválido o la contraseña no coincide.
 *                   example: Invalid device password
 *       404:
 *         description: Dispositivo no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que el dispositivo no se encontró.
 *                   example: Device not found
 *       409:
 *         description: El dispositivo no está vinculado actualmente a la propiedad o al usuario indicado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que el dispositivo no está vinculado.
 *                   example: Device not linked
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error del servidor.
 *                   example: Internal server error
 */
router.post('/user/:userId/devices/unlink', async (req, res) => {
    let userId = req.params.userId;
    let token = req.body.token;
    let deviceId = req.body.deviceId;
    let devicePassword = req.body.password;
    let propertyId = req.body.propertyId

    let response = await userData.unlinkDevice(userId, token, deviceId, devicePassword, propertyId);
    if(response.internalCode === internalCodes.success)
        res.status(response.code).json(response.message);
    else
        res.status(response.code).json({message: response.message, internalCode: response.internalCode});
});


/**
 * @swagger
 * /api/v1/mobile/user/{userId}/devices/list:
 *   post:
 *     tags:
 *     - mobile API
 *     summary: Obtiene la lista de dispositivos vinculados a un usuario
 *     description: Este endpoint permite a un usuario obtener una lista de sus dispositivos vinculados proporcionando su `userId` y un `token` de autenticación.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: El ID del usuario cuyos dispositivos se desean obtener.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token de autenticación válido para el usuario.
 *                 example: abc123
 *     responses:
 *       200:
 *         description: Operación exitosa. Lista de dispositivos recuperada.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: string
 *                     description: ID del usuario al que pertenece el dispositivo.
 *                     example: user123
 *                   deviceId:
 *                     type: string
 *                     description: El identificador del dispositivo.
 *                     example: device001
 *                   enabled:
 *                     type: boolean
 *                     description: Estado de activación del dispositivo.
 *                     example: true
 *                   deactivationKey:
 *                     type: string
 *                     description: Clave de desactivación del dispositivo.
 *                     example: key123
 *       400:
 *         description: Token de autenticación faltante o inválido.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que el token es requerido.
 *                   example: Token is required
 *       401:
 *         description: El userId no coincide con el token proporcionado o el token ha expirado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que el userId no coincide con el token o que el token ha expirado.
 *                   example: UserId does not match the given token or token has expired
 *       404:
 *         description: No se encontraron dispositivos para el usuario.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que no se encontraron dispositivos para el usuario.
 *                   example: No devices found for this user
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error del servidor.
 *                   example: Internal server error
 */
router.post('/user/:userId/devices/list', (req, res) => {
    let userId = req.params.userId;
    let token = req.body.token;

    let response = userData.getDevicesList(userId, token);
    if(response.internalCode === internalCodes.success)
        res.status(response.code).json(response.message);
    else
        res.status(response.code).json({message: response.message, internalCode: response.internalCode});
});

/**
 * @swagger
 * /api/v1/mobile/user/{userId}/devices/{deviceId}/get:
 *   post:
 *     tags:
 *     - mobile API
 *     summary: Obtiene los datos completos de un dispositivo vinculado a un usuario
 *     description: Este endpoint permite a un usuario obtener los datos completos de un dispositivo específico vinculado a su cuenta proporcionando su `userId`, `deviceId` y un `token` de autenticación.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: El ID del usuario cuyos dispositivos se desean consultar.
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: El identificador del dispositivo cuyos datos se desean consultar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token de autenticación válido para el usuario.
 *                 example: abc123
 *     responses:
 *       200:
 *         description: Operación exitosa. Datos completos del dispositivo recuperados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   description: ID del usuario al que pertenece el dispositivo.
 *                   example: user123
 *                 deviceId:
 *                   type: string
 *                   description: El identificador del dispositivo.
 *                   example: device001
 *                 enabled:
 *                   type: boolean
 *                   description: Estado de activación del dispositivo.
 *                   example: true
 *                 deactivationKey:
 *                   type: string
 *                   description: Clave de desactivación del dispositivo.
 *                   example: key123
 *                 deviceName:
 *                   type: string
 *                   description: Nombre del dispositivo.
 *                   example: "iPhone 12"
 *                 deviceType:
 *                   type: string
 *                   description: Tipo de dispositivo.
 *                   example: "smartphone"
 *                 lastActivity:
 *                   type: string
 *                   format: date-time
 *                   description: Fecha y hora de la última actividad del dispositivo.
 *                   example: "2024-10-21T14:48:00Z"
 *       400:
 *         description: Token de autenticación faltante o inválido.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que el token es requerido.
 *                   example: Token is required
 *       401:
 *         description: El userId o deviceId no coincide con el token proporcionado o el token ha expirado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que el userId o deviceId no coincide con el token o que el token ha expirado.
 *                   example: UserId or deviceId does not match the given token or token has expired
 *       404:
 *         description: No se encontraron datos para el dispositivo del usuario.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error indicando que no se encontraron datos para el dispositivo del usuario.
 *                   example: No data found for this device
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Mensaje de error del servidor.
 *                   example: Internal server error
 */
router.post('/user/:userId/devices/:deviceId/get', (req, res) => {
    let userId = req.params.userId;
    let token = req.body.token;
    let deviceId = req.params.deviceId;

    let response = userData.getDeviceFullData(userId, token, deviceId);
    if(response.internalCode === internalCodes.success)
        res.status(response.code).json(response.message);
    else
        res.status(response.code).json({message: response.message, internalCode: response.internalCode});
})

/**
 * @swagger
 *   /api/v1/mobile/localdata:
 *     get:
 *       tags:
 *       - mobile API
 *       summary: Verifica si la API móvil está funcionando
 *       description: Este endpoint permite a los usuarios verificar si la API móvil está funcionando correctamente.
 *       responses:
 *         200:
 *           description: Operación exitosa
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   data:
 *                     type: object
 *                     description: Datos de usuario almacenados en la API.
 *                     example: {"1": {userId: 1, token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTcyOTQxNDI2MywiZXhwIjoxNzI5NDE1NzAzfQ.9asVaAHazsdYqLDLdni5EskMlROHI1K31M1JFeGuevM', username:'user123', password:'pass123'}, "2": {userId: 2, token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTcyOTQxNDI2MywiZXhwIjoxNzI5NDE1NzAzfQ.9asVaAHazsdYqLDLdni5EskMlROHI1K31M1JFeGuevM', username: 'user456', password: 'pass456'}}
 */
router.get('/localdata', (req, res) => {
    res.json({data: userData.get()});
});

module.exports = router;