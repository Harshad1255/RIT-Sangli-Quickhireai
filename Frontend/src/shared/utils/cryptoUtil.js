// Utility to sign payloads using Web Crypto API

export const generateHmacSignature = async (payloadString, secretHex) => {
  if (!secretHex) return null;
  try {
    const encoder = new TextEncoder();
    const keyData = new Uint8Array(secretHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      encoder.encode(payloadString)
    );

    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.error('Failed to generate HMAC signature:', err);
    return null;
  }
};
