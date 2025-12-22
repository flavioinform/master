import emailjs from '@emailjs/browser';

// CONFIGURACIÓN DE EMAILJS
// Estos valores deben ser obtenidos de https://www.emailjs.com/
const SERVICE_ID = "service_xxxxxx"; // REEMPLAZAR
const PUBLIC_KEY = "xxxxxxxxxxxxxx"; // REEMPLAZAR

/**
 * Envía un correo de notificación al administrador
 * @param {string} templateId ID de la plantilla en EmailJS
 * @param {object} templateParams Parámetros para la plantilla
 */
export const sendAdminNotification = async (templateId, templateParams) => {
    try {
        const response = await emailjs.send(
            SERVICE_ID,
            templateId,
            {
                to_email: 'clubmasteriquique@gmail.com',
                ...templateParams,
            },
            PUBLIC_KEY
        );
        return response;
    } catch (error) {
        console.error('Error enviando email:', error);
        throw error;
    }
};
