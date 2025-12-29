/**
 * Utility functions for Chilean RUT formatting and validation
 */

/**
 * Removes all non-alphanumeric characters from RUT
 * @param {string} rut - RUT string to clean
 * @returns {string} - Cleaned RUT with only numbers and 'k'
 */
export function cleanRut(rut) {
    return rut.replace(/[^0-9kK]/g, "").toLowerCase();
}

/**
 * Formats RUT with dots and hyphen (e.g., 11.222.333-k)
 * @param {string} value - RUT string to format
 * @returns {string} - Formatted RUT
 */
export function formatRut(value) {
    // Remove all non-alphanumeric characters
    const cleaned = value.replace(/[^0-9kK]/gi, '');

    // If empty, return empty
    if (!cleaned) return '';

    // Separate body and verifier digit
    const body = cleaned.slice(0, -1);
    const verifier = cleaned.slice(-1).toLowerCase();

    // Format body with dots (reverse, add dots every 3 digits, reverse back)
    let formattedBody = body.split('').reverse().join('');
    formattedBody = formattedBody.match(/.{1,3}/g)?.join('.') || formattedBody;
    formattedBody = formattedBody.split('').reverse().join('');

    // Return formatted RUT
    if (cleaned.length === 1) {
        return verifier;
    }
    return `${formattedBody}-${verifier}`;
}

/**
 * Validates RUT format (basic length check)
 * @param {string} rut - RUT string to validate
 * @returns {boolean} - True if RUT has valid length
 */
export function validateRut(rut) {
    const cleaned = cleanRut(rut);
    return cleaned.length >= 8 && cleaned.length <= 9;
}
