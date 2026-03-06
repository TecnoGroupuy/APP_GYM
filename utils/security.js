const crypto = require("crypto");

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

const generateTemporaryPassword = (length = 14) => {
  const safeLength = Math.max(10, Number(length) || 14);
  let password = "";

  while (password.length < safeLength) {
    const bytes = crypto.randomBytes(safeLength);
    for (const byte of bytes) {
      password += PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length];
      if (password.length >= safeLength) break;
    }
  }

  return password;
};

module.exports = {
  generateTemporaryPassword
};
