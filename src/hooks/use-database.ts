import {invoke} from '@tauri-apps/api/core';

export interface Image {
    id: number;
    relative_path: string;
    category: string;
    filename: string;
}

export class DatabaseService {
    /**
     * Add a new image to the database
     * @param path Path to the image file
     * @param category Category of the image
     * @returns Promise with the new image ID
     */
    async addImage(path: string, category: string): Promise<number> {
        try {
            return await invoke<number>('add_image', {
                path,
                category,
            });
        } catch (error) {
            console.error('Failed to add image:', error);
            throw error;
        }
    }

    /**
     * Add a new tag to the database
     * @param name Name of the tag
     * @returns Promise with the new tag ID
     */
    async addTag(name: string): Promise<number> {
        try {
            return await invoke<number>('add_tag', {
                name,
            });
        } catch (error) {
            console.error('Failed to add tag:', error);
            throw error;
        }
    }

    /**
     * Tag an image with a specific tag
     * @param imageId ID of the image
     * @param tagName Name of the tag
     */
    async tagImage(imageId: number, tagName: string): Promise<void> {
        try {
            await invoke<void>('tag_image', {
                imageId,
                tagName,
            });
        } catch (error) {
            console.error('Failed to tag image:', error);
            throw error;
        }
    }

    /**
     * Get all tags for a specific image
     * @param imageId ID of the image
     * @returns Promise with array of tag names
     */
    async getImageTags(imageId: number): Promise<string[]> {
        try {
            return await invoke<string[]>('get_image_tags', {
                imageId,
            });
        } catch (error) {
            console.error('Failed to get image tags:', error);
            throw error;
        }
    }

    /**
     * Search for images that have all the specified tags
     * @param tags Array of tag names to search for
     * @returns Promise with array of matching images
     */
    async searchImagesByTags(tags: string[]): Promise<Image[]> {
        try {
            return await invoke<Image[]>('search_images_by_tags', {
                tags,
            });
        } catch (error) {
            console.error('Failed to search images by tags:', error);
            throw error;
        }
    }

    /**
     * Get all tags in the database
     * @returns Promise with array of all tag names
     */
    async getAllTags(): Promise<string[]> {
        try {
            return await invoke<string[]>('get_all_tags');
        } catch (error) {
            console.error('Failed to get all tags:', error);
            throw error;
        }
    }

    /**
     * Remove a tag from an image
     * @param imageId ID of the image
     * @param tagName Name of the tag to remove
     */
    async removeImageTag(imageId: number, tagName: string): Promise<void> {
        try {
            await invoke<void>('remove_image_tag', {
                imageId,
                tagName,
            });
        } catch (error) {
            console.error('Failed to remove image tag:', error);
            throw error;
        }
    }
}