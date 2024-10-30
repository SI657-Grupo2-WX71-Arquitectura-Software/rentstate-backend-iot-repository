const fs = require('fs');
const axios = require("axios");
const {HttpStatusCode} = require('axios');
const userDataFilePath = './mobile/userData.json';
const responseClass = require('../shared/responseClass');
const internalCodes = require('../shared/internalCodes');
const iotData = require('../iot/iotData');
const iotMessage = require("../iot/iotMessage");
const severities = require("../iot/severitiesList");
const notificationService = require("../notification/notificationService");
const e = require("express");
let userFetchedData = false

//Tiempo de cacheo de las propiedades en milisegundos
//Milisegundos, Segundos, Minutos, Horas
let cacheTime = 1000 * 60 * 60 * 24; //24 horas
let tickerInterval = 1000 * 5; //5 segundos
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
    if(!userFetchedData) readData();

    // Si no hay usuarios registrados, apaga el ticker
    if(!Object.keys(userFetchedData).length)
        return

    // Llama a la funcion que gestiona el envio de notificaciones
    notificationService.sendMessages(userFetchedData)
}
function stopTicker(){
    clearInterval(ticker);
}

//Crea un cliente axios para cada servidor
const loginRequester = axios.create({
    baseURL: 'http://rentstate.antarticdonkeys.com:8092/auth/api/',
    timeout: 3000,
    //headers: {'X-Custom-Header': 'foobar'}
});
const propertiesRequester = axios.create({
    baseURL: 'http://rentstate.antarticdonkeys.com:8094/api/v1/properties/',
    timeout: 3000,
    //headers: {'X-Custom-Header': 'foobar'}
});
const usersRequester = axios.create({
    baseURL: 'http://rentstate.antarticdonkeys.com:8091/api/v1/users/',
    timeout: 3000,
    //headers: {'X-Custom-Header': 'foobar'}
});

function readData() {
    try {
        userFetchedData = JSON.parse(fs.readFileSync(userDataFilePath, 'utf8'));
        console.log('Datos de usuario cargados exitosamente.');
    } catch (e) {
        if(e.code === 'ENOENT') {
            userFetchedData = {};
            console.log('Archivo de datos de usuario no existe, se creará uno nuevo.');
            fs.writeFileSync(userDataFilePath, JSON.stringify(userFetchedData, null, 2), 'utf8');

        } else {
            console.error('Error al cargar los datos de usuario:', e);
            process.exit(1);
        }
    }

}
function writeData() {
    fs.writeFileSync(userDataFilePath, JSON.stringify(userFetchedData, null, 2), 'utf8');
}
function get() {
    if(!userFetchedData) readData()
    return userFetchedData;
}
function set(data) {
    userFetchedData = data;
    writeData();
}
function isTokenInvalid(userId, token){
    //Si no hay opciones de configuración de dispositivos IoT, cárgalas desde el archivo
    if(!userFetchedData) readData();

    //Si no se proporcionó un identificador de usuario o un token, responde con un error
    if(!userId || !token)
        return new responseClass('userId and token are required', HttpStatusCode.BadRequest, internalCodes.requestIncomplete);

    if(!userFetchedData[userId])
        return new responseClass('userId has not logged in previously in this app', HttpStatusCode.NotFound, internalCodes.invalidUserId)

    // Si el token no coincide con el token guardado en la base de datos local,
    // responde que el token es inválido
    if(userFetchedData[userId].token !== token)
        return new responseClass('UserId does not match the given token or token has expired', HttpStatusCode.Unauthorized, internalCodes.invalidToken);

    // En caso contrario, indicar que NO es invalido
    return false;
}
function findUserByUsername(username) {
    if(!userFetchedData) readData();
    //search for username in each userFechedData
    return Object.values(userFetchedData).find(user => user.username === username) || false;
}
function deleteUser(userId) {
    if(!userFetchedData) readData();
    delete userFetchedData[userId];
    writeData();
}
async function login(username, password){
    //Si no hay opciones de configuración de dispositivos IoT, cárgalas desde el archivo
    if(!userFetchedData)
        readData();

    // Si no se proporcionó un usuario o contraseña, responde con un error
    if(!username || !password)
        return new responseClass('username and password are required', HttpStatusCode.BadRequest, internalCodes.requestIncomplete);

    // Si se proporcionaron ambas, verifica si existe un usuario con el mismo nombre de usuario
    // en la base de datos local
    let storedUserData = findUserByUsername(username);

    // Si el usuario ya ha iniciado sesión y no ha pasado más de 24 horas desde la última vez que
    // se inició sesión, y la contraseña es la misma que la que había en la última sesión, devuelve
    // los datos del usuario guardados en la base de datos local
    if(storedUserData && storedUserData.password === password && storedUserData.expires > Date.now())
        return new responseClass(storedUserData, HttpStatusCode.Ok);


    try{
        // Intenta iniciar sesión en el servidor de autenticación
        let loginData = await loginRequester.post('login', {username: username, password: password});
        // Si no se pudo iniciar sesión, responde con un error
        if(loginData.status !== HttpStatusCode.Ok || !loginData.data)
            return new responseClass('Invalid username or password', HttpStatusCode.Unauthorized, internalCodes.invalidCredentials);
        // Si los datos obtenidos no tienen el formato correcto, responde con un error
        if(!loginData.data.token || !loginData.data.userId)
            return new responseClass('Invalid response from server', HttpStatusCode.InternalServerError, internalCodes.extServerInvalidResponse);
        // Obtiene los datos del usuario que ha iniciado sesión desde el servidor de usuarios
        let extensiveData = await usersRequester.get(`${loginData.data.userId}`);
        // Si no se pudieron obtener los datos del usuario, responde con un error
        if(extensiveData.status !== HttpStatusCode.Ok || !extensiveData.data)
            return new responseClass('Unable to fetch user data from real server', HttpStatusCode.InternalServerError, internalCodes.extServerNotFound);

        let user = extensiveData.data;
        user.token = loginData.data.token;
        user.userId = loginData.data.userId;
        user.username = username;
        user.password = password;
        user.devices = [];
        user.expires = Date.now() + cacheTime;

        // Una vez que se ha iniciado sesión, verifica si ha iniciado sesion antes creando una copia
        // temporal de los datos del usuario en una variable llamada storedUserData
        if(!storedUserData && userFetchedData[user.userId])
            storedUserData = userFetchedData[user.userId];

        // Si no ha iniciado sesión antes, guarda los datos del usuario
        if(!storedUserData){
            userFetchedData[user.userId] = user;
            writeData();
            return new responseClass(user, HttpStatusCode.Ok);
        }

        // Si ya ha iniciado sesión antes, verifica si los datos son iguales y corrige cualquier discrepancia
        let hasAnyChangeBeenMade = false;

        // Solo es posible ingresar a estas condicionales si existe un usuario guardado en la base de datos local
        // en el cual el usuario coincida con el usuario que se intenta loguear, pero el identificador de usuario
        // sea diferente, o si existe un usuario guardado con el mismo identificador, pero en el que el nombre de
        // usuario no coincida.
        // Esto solo puede ocurrir si el usuario original ha sido eliminado, pues el servidor de producción de
        // autenticación no permite que dos usuarios tengan el mismo nombre de usuario o identificador de usuario,
        // y un usuario no puede cambiar ni de userId ni de username.
        // En tal caso, debemos sobreescribir los datos del usuario del sistema local con los datos del usuario
        // del servidor de producción. Esto borra cualquier dato relevante que se haya guardado localmente, y es
        // necesario para mantener la seguridad y privacidad de los usuarios eliminados.
        if(user.userId !== storedUserData.userId ||
            user.username !== storedUserData.username){
            // Borra el usuario guardado en la base de datos local
            deleteUser(storedUserData.userId)
            // Borra los datos de los dispositivos IoT del usuario
            iotData.detachAllUserDevices(storedUserData.userId);
            // Sobreescribe los datos temporales del usuario con los datos obtenidos del servidor de producción
            storedUserData = user;
            // Guarda los datos del usuario en la base de datos local
            userFetchedData[user.userId] = user;
            hasAnyChangeBeenMade = true;
        }

        // Si el token es diferente, actualiza el token en la copia local temporal y guarda la copia local
        // temporal actualizada en los datos guardados.
        if(user.token !== storedUserData.token){
            storedUserData.token = user.token;
            userFetchedData[storedUserData.userId] = storedUserData;
            hasAnyChangeBeenMade = true;
        }

        // La contraseña si podría llegar a cambiar, por lo tanto, si la contraseña es diferente, actualiza
        // la contraseña en la copia local temporal y actualiza los datos guardados.
        if(user.password !== storedUserData.password){
            storedUserData.password = user.password;
            userFetchedData[storedUserData.userId] = storedUserData;
            hasAnyChangeBeenMade = true;
        }

        // Si se ha realizado algún cambio, guarda los datos actualizados en la base de datos local
        if(hasAnyChangeBeenMade)
            writeData();

        // Y, finalmente, responde con los datos del usuario
        return new responseClass(storedUserData, HttpStatusCode.Ok);
    } catch (error) {
        // Si no se pudo iniciar sesión, responde con un error
        if(error.response)
            return new responseClass('Invalid username or password', HttpStatusCode.Unauthorized, internalCodes.invalidCredentials);
        else
            return new responseClass('Unable to contact real server', HttpStatusCode.InternalServerError, internalCodes.extServerNotFound);
    }
}
async function listProperties(userId, token){
    //Si el token es inválido, responde con un error
    let tokenInvalid = isTokenInvalid(userId, token);
    if(tokenInvalid) return tokenInvalid;

    //Si las propiedades del usuario ya han sido obtenidas y no han pasado más de 24 horas desde
    //la última vez que se cargaron las propiedades de dicho usuario, responde con las propiedades
    //guardadas en la base de datos local
    if(userFetchedData[userId].properties && userFetchedData[userId].properties.expires > Date.now())
        return new responseClass(userFetchedData[userId].properties.data, HttpStatusCode.Ok);

    try{
        //Intenta obtener la lista de propiedades del servidor de propiedades
        let properties = await propertiesRequester.get(`user/${userId}`);
        let actualProperties = userFetchedData[userId].properties || {expires:1, data:[]};

        //Si no se pudo obtener la lista de propiedades, responde con un error
        if(properties.status !== HttpStatusCode.Ok || !properties.data)
            return new responseClass('Unable to fetch properties from real server', HttpStatusCode.InternalServerError, internalCodes.extServerNotFound);

        //Mantiene la lista de dispositivos IoT de las propiedades como estaba
        for (const index in properties.data) {
            const actualProperty = actualProperties.data.find(p => p.id === properties.data[index].id) || false;
            if (actualProperty) {
                properties.data[index].deviceId = actualProperty.deviceId || null;
                properties.data[index].devicePassword = actualProperty.devicePassword || "";
                properties.data[index].enabled = actualProperty.enabled || false;
            }
            else {
                properties.data[index].deviceId = null;
                properties.data[index].devicePassword = "";
                properties.data[index].enabled = false;
            }
        }

        userFetchedData[userId].properties = {
            data: properties.data,
            expires: Date.now() + cacheTime,
        }

        writeData();

        //Y responde con la lista de propiedades
        return new responseClass(properties.data, HttpStatusCode.Ok);
    } catch (error) {
        console.log(error)
        //Si no se pudo obtener la lista de propiedades, responde con un error
        if(error.response)
            return new responseClass('Unable to fetch properties from real server', HttpStatusCode.InternalServerError, internalCodes.extServerNotFound);
        else
            return new responseClass({message:'Unable to contact real server', details: error.toString()}, HttpStatusCode.InternalServerError, internalCodes.extServerNotFound);
    }
}
async function linkDevice(userId, token, deviceId, devicePassword, propertyId){
    // Si no hay datos de usuario, cárgalos desde el archivo
    if(!userFetchedData) readData();

    // Si el token es inválido, responde con un error
    let tokenInvalid = isTokenInvalid(userId, token);
    if(tokenInvalid) return tokenInvalid;

    // Si el dispositivo no es válido, responde con un error
    let deviceInvalid = iotData.isDeviceInvalid(deviceId, devicePassword);
    if(deviceInvalid) return deviceInvalid;

    // Si no se proporcionó un identificador de dispositivo o una contraseña, responde con un error
    if(!deviceId || !devicePassword)
        return new responseClass('deviceId and devicePassword are required', HttpStatusCode.BadRequest, internalCodes.requestIncomplete);

    // Si no se proporcionó un identificador de propiedad, responde con un error
    if(!propertyId)
        return new responseClass('propertyId is required', HttpStatusCode.BadRequest, internalCodes.requestIncomplete);

    // Si no hay un arreglo de dispositivos, crea uno
    if(!userFetchedData[userId].devices)
        userFetchedData[userId].devices = [];

    // Si el dispositivo ya existe, responde con un error
    if(userFetchedData[userId].devices.find(device => device === deviceId))
        return new responseClass('Device already linked', HttpStatusCode.Conflict, internalCodes.deviceAlreadyLinked);

    // Validar el identificador de la propiedad
    let propertiesList = await listProperties(userId, token);
    if(propertiesList.code !== HttpStatusCode.Ok) return propertiesList;
    let propertyIndex = propertiesList.message.findIndex(property => property.id === propertyId)
    if(propertyIndex === -1)
        return new responseClass("Property is not owned by user, or doesn't exist", HttpStatusCode.NotFound, internalCodes.invalidPropertyId);

    // Trata de vincular el dispositivo al usuario. Si no lo consigue, devuelve un error
    let iotImportantData = iotData.linkDeviceToUser(deviceId, devicePassword, userId, propertyId);
    if(iotImportantData.code !== HttpStatusCode.Ok) return iotImportantData;

    // Agrega el dispositivo a la lista de dispositivos del usuario
    userFetchedData[userId].devices.push(deviceId);

    // Vincula el dispositivo a la propiedad
    userFetchedData[userId].properties.data[propertyIndex].deviceId = deviceId || null;
    userFetchedData[userId].properties.data[propertyIndex].devicePassword = devicePassword || "";
    userFetchedData[userId].properties.data[propertyIndex].enabled = iotImportantData.message.enabled || false;

    // Y guarda los datos del usuario en la base de datos local
    writeData();

    return iotImportantData;
}
function unlinkDevice(userId, token, deviceId,devicePassword, propertyId){
    if(!userFetchedData) readData();

    // Si el dispositivo no es válido, responde con un error
    let deviceInvalid = iotData.isDeviceInvalid(deviceId, devicePassword);
    if(deviceInvalid) return deviceInvalid;

    // Si el token es inválido, responde con un error
    let tokenInvalid = isTokenInvalid(userId, token);
    if(tokenInvalid) return tokenInvalid;

    // Si no se proporcionó un identificador de dispositivo o una contraseña, responde con un error
    if(!deviceId || !devicePassword)
        return new responseClass('deviceId and devicePassword are required', HttpStatusCode.BadRequest, internalCodes.requestIncomplete);

    if(!propertyId)
        return new responseClass('propertyId is required', HttpStatusCode.BadRequest, internalCodes.requestIncomplete);

    // Si no hay un arreglo de dispositivos, significa que no hay dispositivos vinculados al usuario
    if(!userFetchedData[userId].devices)
        return new responseClass('No devices linked to this user', HttpStatusCode.NotFound, internalCodes.invalidUserId);

    // Si el dispositivo no está vinculado al usuario, responde con un error
    let deviceIndex = userFetchedData[userId].devices.findIndex(device => device == deviceId);
    if(deviceIndex === -1)
        return new responseClass('Device not linked to actual user', HttpStatusCode.Conflict, internalCodes.deviceAlreadyLinked);

    // Si no hay un arreglo de propiedades, significa que no hay propiedades vinculadas al usuario
    // y para vincular un dispositivo a una propiedad, primero se debe vincular la propiedad al usuario
    // entonces, eso significa que no hay dispositivos vinculados a este usuario
    let actualPropertiesList = userFetchedData[userId].properties;
    if(!actualPropertiesList || !actualPropertiesList.data) return new responseClass('No properties linked to this user', HttpStatusCode.NotFound, internalCodes.invalidUserId);

    // Si la propiedad no está vinculada al usuario, puede ser que no le corresponda, o que nunca se halla
    // vinculado un dispositivo a esa propiedad, por lo que se responde con un error
    let propertyIndex = actualPropertiesList.data.findIndex(p => p.id === propertyId);
    if(propertyIndex === -1)
        return new responseClass('Property not found', HttpStatusCode.NotFound, internalCodes.invalidPropertyId);

    // Si el dispositivo no está vinculado a la propiedad, responde con un error
    if(actualPropertiesList.data[propertyIndex].deviceId != deviceId)
        return new responseClass('Device not linked to actual property', HttpStatusCode.Conflict, internalCodes.deviceAlreadyLinked);

    // Trata de desvincular el dispositivo del usuario. Si no lo consigue, devuelve un error
    let iotImportantData = iotData.unlinkDevice(deviceId, devicePassword);
    if(iotImportantData.code !== HttpStatusCode.Ok) return iotImportantData;


    // Desvincula el dispositivo de la propiedad
    userFetchedData[userId].properties.data[propertyIndex].deviceId = null;
    userFetchedData[userId].properties.data[propertyIndex].devicePassword = "";
    userFetchedData[userId].properties.data[propertyIndex].enabled = false;

    // Lo borra de la lista de dispositivos del usuario
    userFetchedData[userId].devices.splice(deviceIndex, 1);

    // y guarda los cambios
    writeData();

    // Finalmente, responde con un mensaje de éxito con los datos del dispositivo desvinculado
    return iotImportantData;
}
function getDevicesList(userId, token){
    // Si el token es inválido, responde con un error
    let tokenInvalid = isTokenInvalid(userId, token);
    if(tokenInvalid) return tokenInvalid;

    try {
        // Crea una lista vacia de dispositivos
        let myDevices = [];

        // Para cada dispositivo en la lista de dispositivos del usuario, agrega los datos importantes
        // del dispositivo a la lista de dispositivos
        userFetchedData[userId].devices.forEach(deviceId => {
            console.log(deviceId)
            myDevices.push(iotData.getIOTImportantData(deviceId));
        });

        // Y responde con la lista de dispositivos
        return new responseClass(myDevices, HttpStatusCode.Ok);
    } catch (error) {
        // Si ocurre un error al generar la lista de dispositivos a partir de la información disponible,
        // responde con un error
        return new responseClass('Unable to fetch devices from local server', HttpStatusCode.InternalServerError, internalCodes.internalError);
    }
}
function getDeviceFullData(userId, token, deviceId){
    // Si no hay datos de usuario, cárgalos desde el archivo
    if(!userFetchedData) readData();

    // Si el token es inválido, responde con un error
    let tokenInvalid = isTokenInvalid(userId, token);
    if(tokenInvalid) return tokenInvalid;

    // Si no se proporcionó un identificador de dispositivo, responde con un error
    if(!deviceId) return new responseClass('deviceId is required', HttpStatusCode.BadRequest, internalCodes.requestIncomplete);

    // Si el dispositivo no le pertenece a este usuario, responde con un error
    if(!userFetchedData[userId].devices.find(device => device === deviceId))
        return new responseClass('Device is not owned by this user', HttpStatusCode.Unauthorized, internalCodes.invalidDeviceId);

    // Si el identificador de dispositivo proporcionado no es válido, responde con un error
    let deviceData = iotData.getIOTFullData(deviceId);
    if(!deviceData) return new responseClass('Device not found', HttpStatusCode.NotFound, internalCodes.deviceNotFound);

    // Y responde con los datos del dispositivo
    return new responseClass(deviceData, HttpStatusCode.Ok);
}

module.exports = {
    get,
    set,
    login,
    listProperties,
    linkDevice,
    unlinkDevice,
    getDevicesList,
    getDeviceFullData,
    initTicker
};