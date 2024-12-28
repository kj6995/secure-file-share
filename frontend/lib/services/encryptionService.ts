export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks

  static async generateKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('raw', key);
    const arr = Array.from(new Uint8Array(exported));
    return btoa(String.fromCharCode.apply(null, arr));
  }

  static async importKey(keyString: string): Promise<CryptoKey> {
    try {
      console.log('Importing key, length:', keyString.length);
      const keyData = Array.from(atob(keyString), c => c.charCodeAt(0));
      console.log('Key data length:', keyData.length);
      return await window.crypto.subtle.importKey(
        'raw',
        new Uint8Array(keyData),
        this.ALGORITHM,
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Error importing key:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error('Failed to import encryption key: ' + errorMessage);
    }
  }

  static async encryptFile(file: File): Promise<{ encryptedFile: Blob; encryptedKey: string }> {
    try {
      const key = await this.generateKey();
      const exportedKey = await this.exportKey(key);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const fileData = await file.arrayBuffer();

      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        fileData
      );

      // Combine IV and encrypted data
      const encryptedContent = new Uint8Array(iv.length + encryptedData.byteLength);
      encryptedContent.set(iv, 0);
      encryptedContent.set(new Uint8Array(encryptedData), iv.length);

      // Preserve the original file's MIME type
      const encryptedBlob = new Blob([encryptedContent], { type: file.type });

      return {
        encryptedFile: encryptedBlob,
        encryptedKey: exportedKey,
      };
    } catch (error) {
      console.error('Encryption error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown encryption error occurred';
      throw new Error('Failed to encrypt file: ' + errorMessage);
    }
  }

  static async decryptFile(data: ArrayBuffer, keyString: string): Promise<ArrayBuffer> {
    try {
      const key = await this.importKey(keyString);
      
      // Extract IV from the beginning of the data
      const iv = new Uint8Array(data.slice(0, 12));
      const encryptedData = new Uint8Array(data.slice(12));

      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        encryptedData
      );

      return decryptedData;
    } catch (error) {
      console.error('Decryption error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown decryption error occurred';
      try {
        // Additional error handling and debugging
        console.log('Key string length:', keyString.length);
        const keyBytes = Array.from(atob(keyString), c => c.charCodeAt(0));
        console.log('Key bytes length:', keyBytes.length);
        console.log('First few bytes of encrypted data:', new Uint8Array(data.slice(0, 16)));
        throw new Error('Decryption failed - possible key mismatch or corrupted data: ' + errorMessage);
      } catch (debugError) {
        const debugErrorMessage = debugError instanceof Error ? debugError.message : 'Unknown debug error occurred';
        throw new Error('Failed to decrypt file with debug info: ' + debugErrorMessage);
      }
    }
  }
}
