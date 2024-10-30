class notificationMessage {
    message;
    userId;
    deviceId;
    constructor(message, userId, deviceId) {
        this.message = message;
        this.userId = userId;
        this.deviceId = deviceId;
    }
}
module.exports = notificationMessage;