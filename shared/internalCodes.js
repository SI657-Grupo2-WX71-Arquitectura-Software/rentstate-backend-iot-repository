module.exports = {
    //Success codes
    success: 0,
    //Invalid errors
    invalidDeviceId: 100,
    invalidPassword: 101,
    invalidUserId: 102,
    invalidCredentials: 103,
    invalidToken: 104,
    invalidPropertyId: 105,
    //Not found errors
    deviceNotFound: 200,
    //Request errors
    requestIncomplete: 300,
    //Internal errors
    internalError: 400,
    extServerNotFound: 401,
    extServerInvalidResponse: 402,
    //Action already done
    deviceAlreadyLinked: 500,
}