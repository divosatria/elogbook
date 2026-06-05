// Utility untuk sanitasi input dan logging yang aman
export const sanitizeInput = (input: any): string => {
  if (typeof input !== 'string') {
    input = String(input);
  }
  
  // Remove atau encode karakter berbahaya untuk XSS
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Sanitasi untuk logging (menghapus newline dan karakter kontrol)
export const sanitizeForLog = (input: any): string => {
  if (typeof input !== 'string') {
    input = String(input);
  }
  
  return input
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .substring(0, 200); // Limit panjang log
};

// Safe console logging
export const safeLog = {
  info: (message: string, data?: any) => {
    console.log(sanitizeForLog(message), data ? sanitizeForLog(JSON.stringify(data)) : '');
  },
  error: (message: string, error?: any) => {
    console.error(sanitizeForLog(message), error ? sanitizeForLog(String(error)) : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(sanitizeForLog(message), data ? sanitizeForLog(JSON.stringify(data)) : '');
  }
};

// Escape HTML untuk mencegah XSS
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Validasi URL untuk mencegah open redirect
export const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};