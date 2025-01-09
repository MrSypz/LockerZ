import {useCallback} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {toast} from '@/hooks/use-toast';
import {DBImage} from '@/types/database';

export function useDatabase() {
    const addImage = useCallback(async (path: string, category: string) => {
        try {
            return await invoke<number>('add_image', {
                path,
                category,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to add image to database',
                variant: 'destructive',
            });
            throw error;
        }
    }, []);

    const addTag = useCallback(async (name: string) => {
        try {
            return await invoke<number>('add_tag', {
                name,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to create tag',
                variant: 'destructive',
            });
            throw error;
        }
    }, []);

    const tagImage = useCallback(async (imageId: number, tagName: string) => {
        try {
            await invoke('tag_image', {
                image_id: imageId,
                tag_name: tagName,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to tag image',
                variant: 'destructive',
            });
            throw error;
        }
    }, []);

    const getImageTags = useCallback(async (imageId: number) => {
        try {
            return await invoke<string[]>('get_image_tags', {
                image_id: imageId,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to get image tags',
                variant: 'destructive',
            });
            throw error;
        }
    }, []);

    const searchByTags = useCallback(async (tags: string[]) => {
        try {
            return await invoke<DBImage[]>('search_images_by_tags', {
                tags,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to search images',
                variant: 'destructive',
            });
            throw error;
        }
    }, []);

    return {
        addImage,
        addTag,
        tagImage,
        getImageTags,
        searchByTags,
    };
}