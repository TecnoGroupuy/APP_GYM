const sgMail = require("@sendgrid/mail");
const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.provider = process.env.EMAIL_SERVICE || "gmail";
    this.transporter = null;

    if (this.provider === "sendgrid" && process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      return;
    }

    if (this.provider === "gmail" && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });
    }
  }

  async send({ to, subject, html, text }) {
    if (!to || !subject) {
      return { success: false, error: new Error("to y subject son requeridos") };
    }

    const fromEmail = process.env.EMAIL_FROM || "noreply@bootcamp.uy";
    const fromName = process.env.EMAIL_FROM_NAME || "Boot Camp Training";

    const msg = {
      to,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject,
      text: text || "",
      html: html || ""
    };

    try {
      if (this.provider === "sendgrid") {
        if (!process.env.SENDGRID_API_KEY) {
          throw new Error("SENDGRID_API_KEY no configurado");
        }
        await sgMail.send(msg);
      } else {
        if (!this.transporter) {
          throw new Error("Proveedor de email no configurado");
        }
        await this.transporter.sendMail(msg);
      }
      return { success: true };
    } catch (error) {
      console.error("Error enviando email:", error.message);
      return { success: false, error };
    }
  }

  async sendClassReminder(user, classData) {
    const bookingId = classData.bookingId || "";
    const frontendUrl = process.env.FRONTEND_URL || "https://app.bootcamp.uy";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ff6b00; font-size: 32px; margin: 0;">BOOT CAMP</h1>
          <p style="color: #888; margin: 10px 0;">Recordatorio de clase</p>
        </div>

        <div style="background: #1a1a1a; padding: 30px; border-left: 4px solid #ff6b00;">
          <h2 style="margin-top: 0;">Hola ${user.name}</h2>
          <p style="font-size: 18px; line-height: 1.6;">
            Tenes una clase reservada en <strong style="color: #ff6b00;">2 horas</strong>.
          </p>

          <div style="background: #0a0a0a; padding: 20px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>${classData.day}</strong></p>
            <p style="margin: 5px 0; font-size: 24px; color: #ff6b00;"><strong>${classData.time}</strong></p>
            <p style="margin: 5px 0;">${classData.name}</p>
            <p style="margin: 5px 0;">Prof: ${classData.trainer || "Staff Boot Camp"}</p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${frontendUrl}/dashboard"
             style="background: #ff6b00; color: white; padding: 15px 30px; text-decoration: none; display: inline-block; font-weight: bold;">
            VER MIS CLASES
          </a>
        </div>

        ${
          bookingId
            ? `<p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
                Si no podes asistir, cancela con anticipacion.<br>
                <a href="${frontendUrl}/cancel/${bookingId}" style="color: #ff6b00;">Cancelar reserva</a>
              </p>`
            : ""
        }
      </div>
    `;

    return this.send({
      to: user.email,
      subject: `Recordatorio: ${classData.name} a las ${classData.time}`,
      html,
      text: `Hola ${user.name}, tenes clase de ${classData.name} hoy a las ${classData.time}.`
    });
  }

  async sendPaymentReminder(user, debt) {
    const frontendUrl = process.env.FRONTEND_URL || "https://app.bootcamp.uy";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ff6b00; font-size: 32px; margin: 0;">BOOT CAMP</h1>
        </div>

        <div style="background: #1a1a1a; padding: 30px; border-left: 4px solid #ff0000;">
          <h2 style="margin-top: 0; color: #ff0000;">Pago vencido</h2>
          <p style="font-size: 18px; line-height: 1.6;">
            Hola ${user.name}, tu plan ${user.plan} ya esta vencido.
          </p>
          <div style="background: #0a0a0a; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: #888;">Monto adeudado</p>
            <p style="margin: 10px 0; font-size: 36px; color: #ff0000; font-weight: bold;">$${debt.amount}</p>
            <p style="margin: 0; color: #ff6666;">${debt.monthsDue} ${debt.monthsDue === 1 ? "mes" : "meses"} vencidos</p>
          </div>
        </div>
      </div>
    `;

    return this.send({
      to: user.email,
      subject: `Pago vencido - $${debt.amount} - Boot Camp`,
      html,
      text: `Hola ${user.name}, debes $${debt.amount}. Regulariza tu pago en ${frontendUrl}/payment`
    });
  }

  async sendWelcome(user, tempPassword) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ff6b00; font-size: 32px; margin: 0;">BOOT CAMP</h1>
          <p style="color: #888;">Bienvenido a la comunidad</p>
        </div>
        <div style="background: #1a1a1a; padding: 30px;">
          <h2 style="margin-top: 0; color: #ff6b00;">Hola ${user.name}</h2>
          <p>Tu cuenta fue creada correctamente.</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Contrasena temporal:</strong> ${tempPassword}</p>
        </div>
      </div>
    `;

    return this.send({
      to: user.email,
      subject: "Bienvenido a Boot Camp - Datos de acceso",
      html,
      text: `Bienvenido ${user.name}. Email: ${user.email}. Contrasena temporal: ${tempPassword}`
    });
  }

  async sendAccountAccess(user, plainPassword) {
    const frontendUrl = process.env.FRONTEND_URL || "https://app.bootcamp.uy";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ff6b00; font-size: 32px; margin: 0;">BOOT CAMP</h1>
          <p style="color: #888;">Acceso habilitado</p>
        </div>
        <div style="background: #1a1a1a; padding: 30px;">
          <h2 style="margin-top: 0; color: #ff6b00;">Hola ${user.name}</h2>
          <p>Tu cuenta fue activada por administracion.</p>
          <p><strong>Usuario:</strong> ${user.documentNumber || user.email}</p>
          <p><strong>Contrasena inicial:</strong> ${plainPassword}</p>
          <p style="color:#ffcc99;">Al iniciar sesion por primera vez, deberas cambiar tu contrasena.</p>
          <div style="margin-top:24px;">
            <a href="${frontendUrl}"
               style="background:#ff6b00;color:white;padding:12px 20px;text-decoration:none;font-weight:bold;display:inline-block;">
              INGRESAR
            </a>
          </div>
        </div>
      </div>
    `;

    return this.send({
      to: user.email,
      subject: "Tu acceso a Boot Camp fue activado",
      html,
      text: `Usuario: ${user.documentNumber || user.email}. Contrasena inicial: ${plainPassword}. Debes cambiarla al primer ingreso.`
    });
  }

  async sendClassCancellation(user, classData, reason) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ff6b00; font-size: 32px; margin: 0;">BOOT CAMP</h1>
        </div>
        <div style="background: #1a1a1a; padding: 30px; border-left: 4px solid #ff0000;">
          <h2 style="margin-top: 0;">Clase cancelada</h2>
          <p>Hola ${user.name}, la clase del ${classData.day} ${classData.time} fue cancelada.</p>
          <p><strong>Motivo:</strong> ${reason || "Fuerza mayor"}</p>
        </div>
      </div>
    `;

    return this.send({
      to: user.email,
      subject: `Clase cancelada - ${classData.day} ${classData.time}`,
      html,
      text: `Hola ${user.name}, tu clase de ${classData.name} fue cancelada.`
    });
  }

  async sendMonthlyReport(user, stats) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ff6b00; font-size: 32px; margin: 0;">BOOT CAMP</h1>
          <p style="color: #888;">Resumen mensual</p>
        </div>
        <div style="background: #1a1a1a; padding: 30px;">
          <h2 style="margin-top: 0;">${user.name}, este fue tu mes</h2>
          <p>Clases: ${stats.classes}</p>
          <p>Racha: ${stats.streak}</p>
          <p>Kcal estimadas: ${stats.calories}</p>
        </div>
      </div>
    `;

    return this.send({
      to: user.email,
      subject: "Tu resumen mensual - Boot Camp",
      html,
      text: `Resumen mensual: ${stats.classes} clases, racha ${stats.streak}, ${stats.calories} kcal estimadas.`
    });
  }
}

module.exports = new EmailService();
