import api from '@/lib/api/axios';

export interface FileMetadata {
  id: string;
  filename: string;
  size: number;
  mime_type: string;
  uploaded_at: string;
  owner_id: string;
}

export class FileService {
  static async uploadFile(file: Blob, filename: string, encryptedKey: string): Promise<FileMetadata> {
    const formData = new FormData();
    formData.append('file', file, filename);
    formData.append('encryption_key', encryptedKey);

    const response = await api.post<FileMetadata>('/files/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  static async downloadFile(fileId: string): Promise<{ encryptedFile: Blob; encryptedKey: string }> {
    const response = await api.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    });

    const encryptedKey = response.headers['x-encryption-key'];
    if (!encryptedKey) {
      throw new Error('No encryption key found in response');
    }

    return {
      encryptedFile: response.data,
      encryptedKey,
    };
  }

  static async listFiles(): Promise<FileMetadata[]> {
    try {
      const response = await api.get('/files/');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  static async deleteFile(fileId: string): Promise<void> {
    await api.delete(`/files/${fileId}/`);
  }  
}
