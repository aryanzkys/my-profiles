// Common weak passwords and patterns to reject
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '12345678', '123456789', '1234567890',
  'qwerty', 'abc123', 'monkey', 'letmein', 'trustno1', 'dragon', 'baseball',
  'iloveyou', 'master', 'sunshine', 'ashley', 'bailey', 'passw0rd', 'shadow',
  'superman', 'qazwsx', 'michael', 'football', 'welcome', 'admin', 'admin123',
  'root', 'toor', 'pass', 'test', 'guest', 'info', 'adm', 'mysql', 'user',
  'administrator', 'oracle', 'ftp', 'pi', 'puppet', 'ansible', 'ec2-user',
  'vagrant', 'azureuser', 'admin@123', 'Admin@123', 'P@ssw0rd', 'P@ssword',
];

/**
 * Validate password strength according to security requirements
 * @param {string} password - Password to validate
 * @param {string} email - User's email (to prevent using email in password)
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validatePassword(password, email = '') {
  const errors = [];

  // Check minimum length (12 characters)
  if (!password || password.length < 12) {
    errors.push('Password minimal 12 karakter.');
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password harus mengandung minimal 1 huruf besar.');
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password harus mengandung minimal 1 huruf kecil.');
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Password harus mengandung minimal 1 angka.');
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push('Password harus mengandung minimal 1 simbol (!@#$%^&* dll).');
  }

  // Check if password contains email or username
  if (email) {
    const emailLower = email.toLowerCase();
    const passwordLower = password.toLowerCase();
    const username = emailLower.split('@')[0];

    if (passwordLower.includes(emailLower)) {
      errors.push('Password tidak boleh mengandung alamat email.');
    } else if (username.length >= 3 && passwordLower.includes(username)) {
      errors.push('Password tidak boleh mengandung username dari email.');
    }
  }

  // Check against common passwords
  const passwordLower = password.toLowerCase();
  for (const common of COMMON_PASSWORDS) {
    if (passwordLower === common || passwordLower.includes(common)) {
      errors.push('Password terlalu umum. Gunakan kombinasi yang lebih unik.');
      break;
    }
  }

  // Check for sequential characters (123, abc, etc.)
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
    errors.push('Password tidak boleh mengandung karakter berurutan (abc, xyz, dll).');
  }

  if (/(?:012|123|234|345|456|567|678|789|890)/.test(password)) {
    errors.push('Password tidak boleh mengandung angka berurutan (123, 456, dll).');
  }

  // Check for repeated characters (aaa, 111, etc.)
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password tidak boleh mengandung karakter yang berulang berturut-turut.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validatePassword,
};
