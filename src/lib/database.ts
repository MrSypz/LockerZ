import {invoke} from '@tauri-apps/api/core';
import {DBImage} from "@/types/database";

// Function to add a new image
export async function addImage(path: string, category: string): Promise<number> {
    try {
        return await invoke<number>('add_image', {
            path,
            category
        });
    } catch (error) {
        console.error('Error adding image:', error);
        throw error;
    }
}

// Function to add a new tag
export async function addTag(name: string): Promise<number> {
    try {
        return await invoke<number>('add_tag', {name});
    } catch (error) {
        console.error('Error adding tag:', error);
        throw error;
    }
}

// Function to tag an image
export async function tagImage(imageId: number, tagName: string): Promise<void> {
    try {
        await invoke<void>('tag_image', {
            imageId,
            tagName
        });
    } catch (error) {
        console.error('Error tagging image:', error);
        throw error;
    }
}

// Function to get tags for an image
export async function getImageTags(imageId: number): Promise<string[]> {
    try {
        return await invoke<string[]>('get_image_tags', {imageId});
    } catch (error) {
        console.error('Error getting image tags:', error);
        throw error;
    }
}

// Function to search images by tags
export async function searchByTags(tags: string[]): Promise<DBImage[]> {
    try {
        return await invoke<DBImage[]>('search_images_by_tags', {tags});
    } catch (error) {
        console.error('Error searching images:', error);
        throw error;
    }
}

// Function to get all tags
export async function getAllTags(): Promise<string[]> {
    try {
        return await invoke<string[]>('get_all_tags');
    } catch (error) {
        console.error('Error getting all tags:', error);
        throw error;
    }
}

// Function to remove a tag from an image
export async function removeImageTag(imageId: number, tagName: string): Promise<void> {
    try {
        await invoke<void>('remove_image_tag', {
            imageId,
            tagName
        });
    } catch (error) {
        console.error('Error removing image tag:', error);
        throw error;
    }
}
