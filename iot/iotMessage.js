class iotMessage {
    severity
    message
    timestamp
    constructor(severity, message) {
        this.message = message;
        this.severity = severity;
        this.timestamp = Date.now();
    }
}
module.exports = iotMessage;