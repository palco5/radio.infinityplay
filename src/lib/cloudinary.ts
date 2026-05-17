// Cloudinary integration for jingle uploads
// Cloud Name: defyxyt1k

const CLOUDINARY_CLOUD_NAME = 'defyxyt1k';
const CLOUDINARY_UPLOAD_PRESET = 'jingle'; // User created preset

export interface CloudinaryUploadResponse {
    public_id: string;
    secure_url: string;
    url: string;
    format: string;
    resource_type: string;
    bytes: number;
    duration: number;
    created_at: string;
}

export async function uploadJingleToCloudinary(file: File): Promise<CloudinaryUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'radio_jingles');
    formData.append('resource_type', 'video'); // Audio files are uploaded as 'video' in Cloudinary

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Upload failed');
        }

        const data: CloudinaryUploadResponse = await response.json();
        return data;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
}

export async function deleteJingleFromCloudinary(_publicId: string): Promise<void> {
    // Note: Deletion requires signed requests, so this should be done from backend
    // For now, we'll just remove from database and leave file in Cloudinary
    console.warn('Cloudinary deletion should be implemented on backend');
}

export function getOptimizedJingleUrl(publicId: string): string {
    // Return optimized URL for audio playback
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/${publicId}`;
}
