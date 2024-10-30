const WhatsappMessage = require('./notificationMessage');
const responseClass = require('../shared/responseClass');
const internalCodes = require('../shared/internalCodes')
const {HttpStatusCode} = require("axios");
const {sendEmail} = require('./mailService');
const {sendWhatsapp} = require('./whatsappService');
let messagesToBeSent = [];

function addMessage(userId, deviceId, message) {
    messagesToBeSent.push(new WhatsappMessage(message, userId, deviceId));
}

function sendMessages(userData) {
    // Mientras queden mensajes por enviar
    while(messagesToBeSent.length) {
        // Coge y elimina el primer mensaje de la lista de mensajes pendientes
        const message = messagesToBeSent.shift();

        // Si no hay datos del usuario al que se quiere contactar, pasa al siguiente mensaje pendiente
        if(!userData[message.userId]){
            console.error(`Error while sending external notification message to user with id ${message.userId}\n` +
                          `    User id associated with device ${message.deviceId} seems to be invalid`)
            continue
        }

        let email = userData[message.userId].email;
        let phone = userData[message.userId].phone

        // Si hay datos, pero no hay ni correo ni teléfono, pasa al siguiente mensaje pendiente
        if(!email && !phone){
            console.error(`Error while sending external notification message to user with id ${message.userId}\n` +
                          `    User has no phone and not email linked to his account`)
            continue
        }
        // Si hay correo, intenta enviar el mensaje por correo
        if(email)
            sendEmail(email, message.message)

        // Si hay teléfono, intenta enviar el mensaje por whatsapp
        if(phone)
            sendWhatsapp(phone, message.message)
    }
}
module.exports = {
    addMessage,
    sendMessages
}