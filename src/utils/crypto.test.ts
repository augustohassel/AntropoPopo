import { describe, it, expect } from 'vitest';
import {
  encryptPayload,
  decryptPayload,
  createShareableLink,
  extractImportTokenFromHash,
  generateRandomPin,
} from './crypto';

describe('Cifrado y Compartición AES-GCM (Web Crypto)', () => {
  it('cifra y descifra correctamente un payload con PIN', async () => {
    const data = {
      patient: { id: 'p-1', name: 'Augusto' },
      measurements: [{ id: 'm-1', date: '2026-10-10' }],
    };
    const pin = '1234';

    const encrypted = await encryptPayload(data, pin);
    expect(typeof encrypted).toBe('string');
    expect(encrypted.length).toBeGreaterThan(20);

    const decrypted = await decryptPayload<typeof data>(encrypted, pin);
    expect(decrypted).toEqual(data);
  });

  it('falla al descifrar si el PIN es incorrecto', async () => {
    const data = { test: true };
    const encrypted = await encryptPayload(data, '1234');

    await expect(decryptPayload(encrypted, '9999')).rejects.toThrow();
  });

  it('genera y extrae el token de importación en el hash', async () => {
    const data = { hello: 'world' };
    const link = await createShareableLink(data, '4321', 'https://example.com/AntropoPopo/');

    expect(link.startsWith('https://example.com/AntropoPopo/#import=')).toBe(true);

    const hash = link.substring(link.indexOf('#'));
    const token = extractImportTokenFromHash(hash);
    expect(token).toBeTruthy();

    const recovered = await decryptPayload<typeof data>(token!, '4321');
    expect(recovered).toEqual(data);
  });

  it('autogenera un PIN aleatorio de 4 dígitos distinto de 1234', () => {
    for (let i = 0; i < 20; i++) {
      const pin = generateRandomPin();
      expect(pin).toMatch(/^[1-9][0-9]{3}$/);
      expect(pin).not.toBe('1234');
    }
  });
});

