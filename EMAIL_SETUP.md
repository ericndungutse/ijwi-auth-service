# Email Configuration Guide

## Gmail SMTP Setup

Your auth service is now configured to send emails using Gmail SMTP. Here's what has been set up:

### Environment Variables

The following environment variables are configured in your `.env` file:

```properties
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=dav.ndungutse@gmail.com
EMAIL_PASS=fvrx wwfv xect bvcz
EMAIL_FROM=noreply@ijwi.com
```

### Gmail App Password

You're using an App Password (`fvrx wwfv xect bvcz`) which is the correct approach for Gmail SMTP authentication. This is more secure than using your regular Gmail password.

### Email Service Features

The `EmailService` class provides three main methods:

1. **sendEmail(to, subject, body)** - Generic email sending
2. **sendVerificationEmail(to, verificationCode)** - Sends a styled verification email with code
3. **sendPasswordResetEmail(to, resetToken)** - Sends a styled password reset email

### Integration

The email service is already integrated into your system:

- ✅ Dependency injection is set up in `container.ts`
- ✅ `AccountService` uses the email service to send verification emails
- ✅ Email templates include professional HTML styling

### Testing

The email service has been tested and is working correctly. Emails are being sent successfully through Gmail SMTP.

### Security Notes

1. Keep your App Password secure and never commit it to version control
2. Consider using environment-specific configuration for different deployment environments
3. The current setup uses TLS encryption for secure communication

### Troubleshooting

If you encounter issues:

1. Verify that 2-factor authentication is enabled on your Gmail account
2. Ensure the App Password is correct and hasn't expired
3. Check that "Less secure app access" is not required (App Passwords should work without this)
4. Verify your Gmail account can send emails normally
