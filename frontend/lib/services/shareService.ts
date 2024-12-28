import { AxiosError } from "axios";
import api from "@/lib/api/axios";
import { ApiError } from "@/types/api";

export interface ShareableLinkRequest {
  permissions: "view" | "download";
  expiresIn?: number;
  guestUserId: number | undefined;
}

export interface SharedFileResponse {
  id: string;
  token: string;
  file_id: string;
  permissions: "view" | "download";
  expires_at: string;
  created_at: string;
  last_accessed_at: string | null;
  access_count: number;
  filename: string;
  mime_type: string;
  size: number;
  shared_by: string;
}

export class ShareService {
  static async generateShareableLink(
    fileId: string,
    request: ShareableLinkRequest
  ): Promise<SharedFileResponse> {
    try {
      const response = await api.post(`/files/${fileId}/share/`, request);
      return response.data;
    } catch (error) {
      console.error("Error generating shareable link:", error);
      if (error instanceof AxiosError && error.response?.data) {
        throw error.response.data as ApiError;
      }
      throw new Error("Failed to generate shareable link");
    }
  }

  static async getSharedFile(token: string): Promise<SharedFileResponse> {
    try {
      const response = await api.get(`/files/shared-file/`, {
        params: { token },
      });
      return response.data;
    } catch (error) {
      console.error("Error getting shared file:", error);
      if (error instanceof AxiosError && error.response?.data) {
        throw error.response.data as ApiError;
      }
      throw new Error("Failed to get shared file");
    }
  }

  static async downloadSharedFile(
    token: string
  ): Promise<{ encryptedFile: Blob; encryptedKey: string }> {
    try {
      const response = await api.get(`/files/shared-file/download`, {
        params: { token },
        responseType: "blob",
      });

      // Get the encryption key from headers
      const encryptedKey = response.headers["x-encryption-key"];
      if (!encryptedKey) {
        throw new Error("No encryption key found in response");
      }

      return {
        encryptedFile: response.data,
        encryptedKey,
      };
    } catch (error) {
      console.error("Error downloading shared file:", error);
      if (error instanceof AxiosError && error.response?.data) {
        throw error.response.data as ApiError;
      }
      throw new Error("Failed to download shared file");
    }
  }
}
