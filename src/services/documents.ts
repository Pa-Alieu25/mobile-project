import { API_BASE_URL } from '@/constants/config';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export type PickedDocument = {
    uri: string;
    name: string;
    mimeType?: string;
    size?: number;
};

/**
 * Upload a picked document to an assignment as multipart/form-data. Uses
 * XMLHttpRequest so we can report determinate upload progress on both native
 * and web. Resolves on success, rejects with a user-facing message otherwise.
 */
export function uploadAssignmentDocument(
    assignmentId: number,
    file: PickedDocument,
    token: string | null,
    onProgress?: (fraction: number) => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        const form = new FormData();
        // React Native's FormData accepts a { uri, name, type } file descriptor.
        form.append('file', {
            uri: file.uri,
            name: file.name,
            type: file.mimeType || 'application/octet-stream',
        } as unknown as Blob);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/assignments/${assignmentId}/document`);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        if (xhr.upload) {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable && onProgress) {
                    onProgress(event.loaded / event.total);
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
                return;
            }
            let message = 'Upload failed. Please try again.';
            try {
                const parsed = JSON.parse(xhr.responseText);
                if (parsed?.message) message = parsed.message;
            } catch {
                // keep default message
            }
            reject(new Error(message));
        };
        xhr.onerror = () => reject(new Error('Upload failed. Please check your connection and try again.'));
        xhr.send(form);
    });
}

/**
 * Download an assignment's document (authenticated) and hand it to the OS so the
 * student can open or save it. On web it triggers a browser download instead.
 */
export async function openAssignmentDocument(
    assignmentId: number,
    fileName: string,
    token: string | null
): Promise<void> {
    const url = `${API_BASE_URL}/assignments/${assignmentId}/document`;
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

    if (Platform.OS === 'web') {
        const response = await fetch(url, { headers: authHeaders });
        if (!response.ok) throw new Error('Could not download the document. Please try again.');
        const blob = await response.blob();
        const globalAny = globalThis as unknown as {
            URL: { createObjectURL: (b: Blob) => string; revokeObjectURL: (u: string) => void };
            document: { createElement: (t: string) => any; body: any };
        };
        const objectUrl = globalAny.URL.createObjectURL(blob);
        const anchor = globalAny.document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = fileName;
        anchor.click();
        globalAny.URL.revokeObjectURL(objectUrl);
        return;
    }

    const safeName = fileName.replace(/[^\w.\-]+/g, '_') || 'assignment-document';
    const target = (FileSystem.cacheDirectory ?? '') + safeName;
    const result = await FileSystem.downloadAsync(url, target, { headers: authHeaders });
    if (result.status !== 200) {
        throw new Error('Could not download the document. Please try again.');
    }
    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri);
    }
}

/** Human-readable file size, e.g. "1.4 MB". */
export function formatFileSize(bytes?: number | null): string {
    if (!bytes || bytes <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit += 1;
    }
    return `${size >= 10 || unit === 0 ? Math.round(size) : size.toFixed(1)} ${units[unit]}`;
}
