const fs = require('fs');
const iotDataFilePath = './iot/iotData.json';
const iotDevicesFilePath = './iot/iotDevices.json';
const response = require('../shared/responseClass');
const iotMessage = require('./iotMessage');
const { HttpStatusCode } = require('axios');
const internalCodes = require('../shared/internalCodes');
const severities = require("./severitiesList");
const notificationService = require('../notification/notificationService')

const noUserId = 0;
const noPropertyId = 0;
const defaultDeviceTypeId = 1;
const defaultDeactivationCode = '1234';
const defaultEnabledStatus = false;
const tickerInterval = 5 * 1000; // 5 segundos

let iotConfigOptions = false;
let iotDevicesData = false
let ticker = false;

function initTicker(){
    // Si el ticker no está iniciado, inícialo
    if(!ticker){
        ticker = setInterval(() => {
            tick();
        }, tickerInterval);
    }
}
function tick(){
    if(!iotConfigOptions) initializeIOTConfigOptions();

    // Si no hay dispositivos iot registrados, apaga el ticker
    if(!Object.keys(iotConfigOptions).length)
        return;

    // Revisa todos los dispositivos iot cada 30 segundos
    for(const deviceId in iotConfigOptions){
        // Si el dispositivo no está habilitado, reinicia el contador de ticks sin mensajes
        if(!iotConfigOptions[deviceId].enabled){
            iotConfigOptions[deviceId].ticksWithoutMessages = 0;
            continue;
        }

        if(isNaN(iotConfigOptions[deviceId].ticksWithoutMessages)){
            iotConfigOptions[deviceId].ticksWithoutMessages = 0;
            iotConfigOptions[deviceId].hasSentNotification = false;
        }

        // Si no, incrementa el contador de ticks sin mensajes en 1
        iotConfigOptions[deviceId].ticksWithoutMessages++

        // Y si el contador llega a 3, muestra un mensaje de que el dispositivo no está enviando mensajes
        // lo que podría indicar un problema con el dispositivo, o que el dispositivo fue dañado
        // intencionalmente para evitar que envíe mensajes
        if(iotConfigOptions[deviceId].ticksWithoutMessages >= 3 && !iotConfigOptions[deviceId].hasSentNotification){
            // Si no hay una lista de mensajes, crea una
            if(!iotConfigOptions[deviceId].messages)
                iotConfigOptions[deviceId].messages = [];

            // Agrega un mensaje de error a la lista de mensajes del dispositivo
            iotConfigOptions[deviceId].messages.push(new iotMessage(
                severities.error,
                'Se ha perdido comunicación con el dispositivo IoT'
            ));

            // agrega el dispositivo a la lista de dispositivos desconectados
            notificationService.addMessage(
                iotConfigOptions[deviceId].userId,
                deviceId,
                `Se ha perdido la conexión con su dispositivo IoT #${deviceId}`
            )

            // y marca el dispositivo como que ya ha enviado una notificación
            iotConfigOptions[deviceId].hasSentNotification = true;
            console.log('Device', deviceId, 'is not sending messages');
        }
    }
}
function stopTicker(){
    clearInterval(ticker);
}

function initializeIOTConfigOptions() {
    try {
        iotConfigOptions = JSON.parse(fs.readFileSync(iotDataFilePath, 'utf8'));
        console.log('Opciones de configuración de dispositivos IoT cargadas exitosamente.');
    } catch (e) {
        if(e.code === 'ENOENT') {
            iotConfigOptions = {};
            console.log('Archivo de opciones de configuración de dispositivos IoT no encontrado, se creará uno nuevo.');
            fs.writeFileSync(iotDataFilePath, JSON.stringify(iotConfigOptions, null, 2), 'utf8');

        } else {
            console.error('Error al cargar las opciones de configuración de dispositivos IoT:', e);
            process.exit(1);
        }
    }
    if(!iotDevicesData) initializeIOTDevicesData();
}
function initializeIOTDevicesData() {
    try {
        iotDevicesData = JSON.parse(fs.readFileSync(iotDevicesFilePath, 'utf8'));
        console.log('Datos de dispositivos IoT cargados exitosamente.');
    } catch (e) {
        if(e.code === 'ENOENT') {
            iotDevicesData = {};
            console.log('Archivo de datos de dispositivos IoT no encontrado, se creará uno nuevo.');
            fs.writeFileSync(iotDevicesFilePath, JSON.stringify(iotDevicesData, null, 2), 'utf8');
        } else {
            console.error('Error al cargar los datos de dispositivos IoT:', e);
            process.exit(1);
        }
    }
}
function writeIOTConfigOptions() {
    fs.writeFileSync(iotDataFilePath, JSON.stringify(iotConfigOptions, null, 2), 'utf8');
}
function get() {
    if(!iotConfigOptions)
        initializeIOTConfigOptions()
    return iotConfigOptions;
}
function getIOTImportantData(iotDeviceId){
    if(!iotConfigOptions) initializeIOTConfigOptions();
    let data = iotConfigOptions[iotDeviceId];
    return {
        userId: data.userId || noUserId,
        propertyId: data.propertyId || noPropertyId,
        deviceId: data.deviceId,
        enabled: data.enabled,
        deactivationKey: data.deactivationKey,
        deviceTypeId: data.deviceTypeId || defaultDeviceTypeId,
    };
}
function isDeviceInvalid(deviceId, password){
    //Si no hay opciones de configuración de dispositivos IoT, cárgalas desde el archivo
    if(!iotConfigOptions)
        initializeIOTConfigOptions();

    //Si no hay id o contraseña, responde con un error
    if (!deviceId || !password)
        return new response('id and password are required', HttpStatusCode.BadRequest);

    //Si el dispositivo no existe, responde que no se ha encontrado
    if(!iotConfigOptions[deviceId])
        return new response('Device not found', HttpStatusCode.NotFound, internalCodes.deviceNotFound);

    //Si la contraseña no coincide, responde con un error
    if(iotConfigOptions[deviceId].password !== password)
        return new response('Invalid password', HttpStatusCode.Unauthorized, internalCodes.invalidPassword);
    return false;
}
function initDevice(deviceId, password, deviceTypeId = defaultDeviceTypeId){
    //Si no hay opciones de configuración de dispositivos IoT, cárgalas desde el archivo
    if (!iotConfigOptions) initializeIOTConfigOptions();
    if (!deviceTypeId) deviceTypeId = defaultDeviceTypeId;

    //Si no hay id o contraseña, responde con un error
    if (!deviceId || !password)
        return new response('id and password are required', HttpStatusCode.BadRequest, internalCodes.requestIncomplete);

    if(!iotConfigOptions[deviceId]){
        iotConfigOptions[deviceId] = {
            deviceId: deviceId,
            password: password,
            userId: noUserId,
            propertyId: noPropertyId,
            enabled: defaultEnabledStatus,
            deactivationKey: defaultDeactivationCode,
            messages: [],
            ticksWithoutMessages: 0,
            hasSentNotification: false,
            deviceTypeId: deviceTypeId
        }
        writeIOTConfigOptions();
    }
    let deviceInvalid = isDeviceInvalid(deviceId, password);
    if(deviceInvalid) return deviceInvalid;

    return new response(getIOTImportantData(deviceId), HttpStatusCode.Ok, internalCodes.success);
}
function addMessage(deviceId, password, message, severity = severities.report){
    // Si no hay opciones de configuración de dispositivos IoT, cárgalas desde el archivo
    if(!iotConfigOptions)
        initializeIOTConfigOptions();

    // Si no hay id, contraseña o mensaje, responde con un error
    if(!deviceId || !password || !message)
        return new response('id, password and message are required', HttpStatusCode.BadRequest, internalCodes.requestIncomplete);

    // Si la severidad no existe en la lista de severidades, responde con un error
    if(!severity in Object.values(severities))
        return new response('Invalid severity', HttpStatusCode.BadRequest, internalCodes.invalidSeverity);

    // Si el dispositivo no existe, responde que no se ha encontrado
    if(!iotConfigOptions[deviceId])
        return new response('Device not found', HttpStatusCode.NotFound, internalCodes.deviceNotFound);

    // Si la contraseña no coincide, responde con un error
    if(!iotConfigOptions[deviceId].password !== password)
        return new response('Invalid password', HttpStatusCode.Unauthorized, internalCodes.invalidPassword);

    // Si la cantidad de ticks sin mensajes había superado el límite
    // lo elimina de la lista de dispositivos desconectados
    if(iotConfigOptions[deviceId].ticksWithoutMessages < 3)
        disconnectedIotDevices = disconnectedIotDevices.filter(device => device.deviceId !== deviceId);

    // Reinicia la cantidad de ticks sin mensajes y el estado de notificación enviada
    iotConfigOptions[deviceId].ticksWithoutMessages = 0;
    iotConfigOptions[deviceId].hasSentNotification = false;

    // Si no hay una lista de mensajes, crea una
    if(!iotConfigOptions[deviceId].messages)
        iotConfigOptions[deviceId].messages = [];

    // Y si el mensaje no es de severidad report, lo añade a la lista de mensajes
    if(severity !== severities.report){
        iotConfigOptions[deviceId].messages.push(new iotMessage(severity, message));
        notificationService.addMessage(
            iotConfigOptions[deviceId].userId,
            deviceId,
            message
        )
    }

    // Guarda los cambios
    writeIOTConfigOptions();

    // Responde con un mensaje de éxito
    return new response('Message received', HttpStatusCode.Ok, internalCodes.success);
}
function updatePassword(deviceId, newPassword){
    // Si no hay opciones de configuración de dispositivos IoT, cárgalas desde el archivo
    if(!iotConfigOptions)
        initializeIOTConfigOptions();

    // Si no hay id o nueva contraseña, responde con un error
    if(!deviceId || !newPassword)
        return new response('id and new password are required', HttpStatusCode.BadRequest, internalCodes.requestIncomplete);

    // Si el dispositivo no existe, responde que no se ha encontrado
    if(!iotConfigOptions[deviceId])
        return new response('Device not found', HttpStatusCode.NotFound, internalCodes.deviceNotFound);

    // Cambia la contraseña del dispositivo y guarda los cambios
    iotConfigOptions[deviceId].password = newPassword;
    writeIOTConfigOptions();

    // Responde con un mensaje de éxito
    return new response('Password updated', HttpStatusCode.Ok, internalCodes.success);
}
function detachAllUserDevices(userId){
    if(!iotConfigOptions)
        initializeIOTConfigOptions();

    for (const device in iotConfigOptions) {
        if(iotConfigOptions[device].userId === userId)
            iotConfigOptions[device].userId = noUserId;
    }
    writeIOTConfigOptions();
}
function linkDeviceToUser(deviceId, devicePassword, userId, propertyId){
    // Si no hay opciones de configuración de dispositivos IoT, cárgalas desde el archivo
    if(!iotConfigOptions)
        initializeIOTConfigOptions();

    // Si no hay id o contraseña, responde con un error
    if(!deviceId || !devicePassword || !userId || !propertyId)
        return new response('deviceId, devicePassword, userId and propertyId are required', HttpStatusCode.BadRequest, internalCodes.requestIncomplete);

    // Si el dispositivo no existe, responde que no se ha encontrado
    if(!iotConfigOptions[deviceId])
        return new response('Device not found', HttpStatusCode.NotFound, internalCodes.deviceNotFound);

    // Si la contraseña no coincide, responde con un error
    if(iotConfigOptions[deviceId].password !== devicePassword)
        return new response('Invalid device password', HttpStatusCode.Unauthorized, internalCodes.invalidPassword);

    // Vincula el dispositivo al usuario y guarda los cambios
    iotConfigOptions[deviceId].userId = userId;
    iotConfigOptions[deviceId].propertyId = propertyId;
    writeIOTConfigOptions();

    // Responde con un mensaje de éxito con los datos del dispositivo
    return new response(getIOTImportantData(deviceId), HttpStatusCode.Ok);
}
function unlinkDevice(deviceId, devicePassword){
    // Si no hay opciones de configuración de dispositivos IoT, cárgalas desde el archivo
    if(!iotConfigOptions)
        initializeIOTConfigOptions();

    // Si no hay id o contraseña, responde con un error
    if(!deviceId || !devicePassword)
        return new response('deviceId, devicePassword, userId and propertyId are required', HttpStatusCode.BadRequest, internalCodes.requestIncomplete);

    // Si el dispositivo no existe, responde que no se ha encontrado
    if(!iotConfigOptions[deviceId])
        return new response('Device not found', HttpStatusCode.NotFound, internalCodes.deviceNotFound);

    // Si la contraseña no coincide, responde con un error
    if(iotConfigOptions[deviceId].password !== devicePassword)
        return new response('Invalid device password', HttpStatusCode.Unauthorized, internalCodes.invalidPassword);

    // Desvincula el dispositivo del usuario y guarda los cambios
    iotConfigOptions[deviceId].userId = noUserId;
    iotConfigOptions[deviceId].propertyId = noPropertyId;
    writeIOTConfigOptions();

    // Responde con un mensaje de éxito con los datos del dispositivo
    return new response(getIOTImportantData(deviceId), HttpStatusCode.Ok, internalCodes.success);
}
function getIOTFullData(deviceId){
    // Si no hay opciones de configuración de dispositivos IoT, cárgalas desde el archivo
    if(!iotConfigOptions)
        initializeIOTConfigOptions();
    // Si el dispositivo no existe, responde false. Caso contrario devuelve el dispositivo
    let iotDeviceData = iotConfigOptions[deviceId];
    if(!iotDeviceData) return false;
    iotDeviceData.iotDeviceData = iotDevicesData.find(device => device.deviceTypeId === iotDeviceData.deviceTypeId) || {
        name: "Unknown Device Type",
        description: "Unknown Device Type",
        deviceTypeId: iotDeviceData.deviceTypeId,
        image: "/device_types/unknown.png"
    };
    return iotDeviceData
}

module.exports = {
    get,
    initDevice,
    isDeviceInvalid,
    addMessage,
    updatePassword,
    detachAllUserDevices,
    linkDeviceToUser,
    unlinkDevice,
    getIOTImportantData,
    getIOTFullData,
    initTicker
};