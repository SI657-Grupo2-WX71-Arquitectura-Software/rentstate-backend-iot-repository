const internalCodes = require('./internalCodes');
class response {
    message;
    code;
    internalCode
    constructor(message, code, internalCode = internalCodes.success) {
        this.message = message;
        this.code = code;
        this.internalCode = internalCode;
    }
}
module.exports = response;