# Security Features - Password Reset System

This document describes the enhanced security features implemented for the password reset system.

## Overview

The password reset system now includes multiple layers of security to protect admin accounts from unauthorized access:

1. **Two-Factor Authentication (2FA) with OTP**
2. **Time-limited reset tokens**
3. **Strong password requirements**
4. **Security logging and monitoring**
5. **Account lockout protection**
6. **Email notifications**

---

## 1. Two-Factor Authentication (OTP)

### How it works:
1. User requests password reset via email
2. System sends a secure reset link (valid 10 minutes)
3. User clicks link and is redirected to reset page
4. System automatically generates and sends a 6-digit OTP via email
5. User must enter OTP to proceed with password reset
6. After OTP verification, user can set new password

### OTP Security Features:
- **6-digit random code** generated using `crypto.randomInt()`
- **5-minute expiration** from generation
- **Single-use only** - OTP cannot be reused after successful verification
- **3 attempt limit** - After 3 failed attempts, account is locked
- **15-minute lockout** - After 3 failed attempts, user must wait 15 minutes before trying again

### API Endpoints:
- `POST /auth/request-otp` - Request OTP code (automatically called when reset page loads)
- `POST /auth/verify-otp` - Verify OTP code before password reset

---

## 2. Token Security Enhancement

### Previous Implementation:
- Token TTL: 30 minutes
- Cryptographically random tokens (crypto.randomBytes)
- Single-use tokens

### Enhanced Implementation:
- **Reduced TTL to 10 minutes** for faster expiration
- Tokens are still cryptographically random using `crypto.randomBytes(32)`
- Tokens are marked as "used" after password reset
- Expired or used tokens are automatically cleaned up
- Tokens are deleted after successful password change

---

## 3. Password Validation Requirements

### Minimum Requirements:
All passwords must meet ALL of the following criteria:

1. **Minimum 12 characters** (increased from 8)
2. **At least 1 uppercase letter** (A-Z)
3. **At least 1 lowercase letter** (a-z)
4. **At least 1 number** (0-9)
5. **At least 1 special character** (!@#$%^&*()_+-=[]{};\':"|,.<>/?~`)

### Additional Security Checks:
- **No email/username** - Password cannot contain the user's email or username
- **No common passwords** - Rejects passwords from a list of 50+ common passwords
- **No sequential characters** - Rejects passwords with 4+ sequential characters (e.g., "1234", "abcd")
- **No repeated characters** - Rejects passwords with 3+ repeated characters in a row (e.g., "aaa", "111")

### Examples:
✅ Valid: `MySecure#Pass2024`, `Tr0ng!P@ssw0rd99`, `C0mpl3x&Secure#2024`
❌ Invalid: `Password123!` (common), `MyEmail@test.com123!` (contains email), `Abcd1234!@#$` (sequential)

---

## 4. Security Logging

All password reset activities are logged with the following information:

### Logged Events:
- `password_reset_request` - Initial reset request
- `otp_request` - OTP generation and sending
- `otp_verification` - OTP verification attempt (success/failure)
- `password_reset` - Password change attempt (success/failure)

### Logged Information:
- Email address
- Action type
- IP address
- User agent (browser/device info)
- Status (success/failed)
- Timestamp (ISO 8601 format)
- Additional details

### Storage:
Logs are stored in multiple locations for redundancy:
1. **Supabase table** `security_logs` (primary)
2. **Supabase Storage** `security-logs.json` (fallback)
3. **Local filesystem** `data/security-logs.json` (development)

### Viewing Logs:
Logs can be queried from the Supabase dashboard or via API. The system keeps the last 10,000 log entries.

---

## 5. Email Notifications

### OTP Email:
- Sent when user clicks reset link
- Contains 6-digit OTP code
- Includes expiration warning (5 minutes)
- Warns about 3-attempt limit

### Password Changed Email:
Sent after successful password reset with:
- Confirmation of password change
- Timestamp of change
- IP address used
- Browser/device information
- Warning to contact admin if unauthorized

---

## 6. Session Management

After successful password reset:
- All active sessions for that user should be invalidated (future implementation)
- User must log in again with new password
- This prevents unauthorized access from stolen session tokens

**Note:** Full session invalidation requires integration with your authentication system (Firebase/Supabase Auth).

---

## Migration Scripts

### Supabase Migrations:

1. **Admin Password Reset Tokens Table**
   ```sql
   -- File: supabase/migrations/20251012_admin_password_reset.sql
   CREATE TABLE admin_password_reset_tokens (...)
   ```

2. **Security Logs Table**
   ```sql
   -- File: supabase/migrations/20251015_security_logs.sql
   CREATE TABLE security_logs (...)
   ```

Run migrations using Supabase CLI:
```bash
supabase db push
```

---

## Environment Variables

No new environment variables required! The system uses existing configuration:

```bash
# SMTP for sending emails (required)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Supabase (optional, for storage)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Password hashing (optional, default: 12)
PASSWORD_SALT_ROUNDS=12
```

---

## Testing

### Manual Testing Checklist:

#### Token Expiry:
- [ ] Request reset link
- [ ] Wait 10+ minutes
- [ ] Try to use link - should show "expired" error

#### OTP Flow:
- [ ] Request reset and receive OTP
- [ ] Enter correct OTP - should proceed to password form
- [ ] Enter wrong OTP 3 times - account should lock for 15 minutes
- [ ] Try to reset during lockout - should show lockout message

#### Password Validation:
- [ ] Try weak password (e.g., "Password123!") - should reject
- [ ] Try password with email in it - should reject
- [ ] Try password < 12 chars - should reject
- [ ] Try strong password meeting all criteria - should accept

#### Token Reuse:
- [ ] Complete password reset successfully
- [ ] Try to use same token again - should show "already used" error

#### Email Notifications:
- [ ] Check email for OTP code
- [ ] Check email for password changed notification with details

---

## Security Best Practices

### For Administrators:
1. Use strong, unique passwords for each admin account
2. Don't share OTP codes with anyone
3. Verify the sender email when receiving reset links
4. Report suspicious reset attempts immediately

### For Developers:
1. Keep `SMTP_PASS` and `SUPABASE_SERVICE_ROLE_KEY` secret
2. Use HTTPS for all password reset flows
3. Monitor security logs regularly for suspicious patterns
4. Update common password list periodically
5. Consider adding IP geolocation for location-based verification

---

## Future Enhancements

Potential improvements for consideration:

1. **Location-based verification** - Alert if reset attempt from different country
2. **Biometric authentication** - Add WebAuthn/FIDO2 support
3. **Hardware security keys** - Support YubiKey, Google Titan
4. **Recovery codes** - One-time backup codes for account recovery
5. **Session management** - Track and revoke all active sessions
6. **Rate limiting per IP** - Prevent brute force from specific IPs
7. **CAPTCHA** - Add reCAPTCHA v3 for bot prevention
8. **Audit dashboard** - Admin UI for viewing security logs

---

## Troubleshooting

### OTP not received:
- Check spam/junk folder
- Verify SMTP configuration
- Check security logs for email sending errors
- Try requesting new OTP

### Account locked:
- Wait 15 minutes for automatic unlock
- Contact administrator if urgent
- Check security logs for lockout details

### Password rejected:
- Ensure minimum 12 characters
- Include uppercase, lowercase, number, and symbol
- Avoid email/username in password
- Avoid common passwords and sequential characters

### Token expired:
- Request new reset link
- Complete reset within 10 minutes
- Check email for latest link

---

## API Reference

### Request Password Reset
```http
POST /auth/request-reset
Content-Type: application/json

{
  "email": "admin@example.com"
}
```

**Response:**
```json
{
  "message": "Instruksi reset password berhasil dikirim. Silakan cek inbox Anda."
}
```

### Request OTP
```http
POST /auth/request-otp
Content-Type: application/json

{
  "email": "admin@example.com",
  "token": "reset-token-from-email"
}
```

**Response:**
```json
{
  "message": "Kode OTP telah dikirim ke email Anda. Silakan cek inbox."
}
```

### Verify OTP
```http
POST /auth/verify-otp
Content-Type: application/json

{
  "email": "admin@example.com",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "message": "OTP berhasil diverifikasi. Silakan masukkan password baru."
}
```

**Response (Failed):**
```json
{
  "message": "OTP salah. 2 percobaan tersisa.",
  "locked": false,
  "remainingAttempts": 2
}
```

**Response (Locked):**
```json
{
  "message": "Akun terkunci karena terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.",
  "locked": true,
  "remainingAttempts": 0
}
```

### Reset Password
```http
POST /auth/reset
Content-Type: application/json

{
  "email": "admin@example.com",
  "token": "reset-token-from-email",
  "otp": "123456",
  "password": "MyNewSecure#Pass2024"
}
```

**Response (Success):**
```json
{
  "message": "Password berhasil direset. Silakan login dengan password baru."
}
```

**Response (Weak Password):**
```json
{
  "message": "Password tidak memenuhi persyaratan keamanan.",
  "errors": [
    "Password minimal 12 karakter.",
    "Password harus mengandung minimal 1 simbol (!@#$%^&* dll)."
  ]
}
```

---

## License

This security implementation follows industry best practices and OWASP guidelines for authentication security.
