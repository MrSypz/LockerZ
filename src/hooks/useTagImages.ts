import { useState, useEffect } from 'react'
import { DatabaseService, Image } from '@/hooks/use-database'

export function useTagImages(tagName: string, shouldFetch: boolean) {
    const [taggedImages, setTaggedImages] = useState<Image[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const db = new DatabaseService()

    useEffect(() => {
        const fetchImagesWithTag = async () => {
            if (shouldFetch) {
                setIsLoading(true)
                try {
                    const images = await db.searchImagesByTags([tagName])
                    setTaggedImages(images)
                } catch (error) {
                    console.error('Failed to fetch images with tag:', error)
                } finally {
                    setIsLoading(false)
                }
            }
        }

        fetchImagesWithTag()
    }, [shouldFetch, tagName])

    return { taggedImages, isLoading }
}

