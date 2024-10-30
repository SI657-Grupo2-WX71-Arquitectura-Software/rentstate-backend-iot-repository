const nodemailer = require('nodemailer');
//Configuración del servicio de correo
const smtpHost = 'tarket.site';
const smtpPort = 465;
const smtpUser = 'contacto@tarket.site';
const smtpPassword = 'FernandoDiaz%%%555';
const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: true, // false para puerto 25, true para puerto 465 (SSL)
    auth: {
        user: smtpUser,
        pass: smtpPassword
    },
    tls: {
        rejectUnauthorized: false // Permitir certificados autofirmados
    }
});
/**
 * Envía un correo electrónico utilizando nodemailer.
 * @param {string} to - Dirección de correo electrónico del destinatario.
 * @param {string} subject - Asunto del correo electrónico.
 * @param {string} text - Texto plano del correo electrónico.
 * @param {string} html - Contenido HTML del correo electrónico.
 */
function sendEmail(to, text, subject = "Rentstate Notification Mail", html = "") {
    return console.log('Envio de emails desactivado para no tumbar el servidor de mails')
    // Configura las opciones del correo electrónico
    const mailOptions = {
        from: `"Contacto" <${smtpUser}>`, // Dirección del remitente
        to: to, // Dirección del destinatario
        subject: subject, // Asunto del correo
        text: text, // Texto del mensaje
        html: html // HTML del mensaje
    };

    // Envía el correo
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error al enviar el correo:', error);
        } else {
            console.log('Correo enviado con éxito:', info.response);
        }
    });
}
module.exports = {
    sendEmail
};