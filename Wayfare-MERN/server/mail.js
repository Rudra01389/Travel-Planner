import nodemailer from "nodemailer";
export async function sendOtp(email, code, purpose) {
  const subject =
    purpose === "register"
      ? "Verify your Wayfare email"
      : "Reset your Wayfare password";
  const text = `${subject}\n\nYour verification code is ${code}. It expires in 10 minutes. Never share this code. If you did not request it, ignore this email.`;
  if (process.env.BREVO_API_KEY) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME || "Wayfare",
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [{ email }],
        subject,
        textContent: text,
      }),
    });
    if (!response.ok) {
      const error = new Error("Email delivery failed");
      error.publicMessage =
        {
          400: "Email service rejected the request. Check your verified Brevo sender address.",
          401: "Email service credentials were rejected. Check BREVO_API_KEY in .env.",
          403: "Email service access was denied. Check your Brevo sender and account permissions.",
          429: "Email service rate limit reached. Please try again later.",
        }[response.status] ||
        "Email service is temporarily unavailable. Please try again shortly.";
      throw error;
    }
  } else {
    const transport = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      requireTLS: true,
      connectionTimeout: 15000,
      socketTimeout: 15000,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY,
      },
    });
    await transport.sendMail({
      from: {
        name: process.env.BREVO_SENDER_NAME || "Wayfare",
        address: process.env.BREVO_SENDER_EMAIL,
      },
      to: email,
      subject,
      text,
    });
  }
}
