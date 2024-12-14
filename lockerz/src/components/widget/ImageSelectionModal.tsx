import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { API_URL } from "@/lib/zaphire"
import { useTranslation } from "react-i18next"
import { Loader2 } from 'lucide-react'
import { toast } from "@/hooks/use-toast"
import {OptimizedImage} from "@/components/widget/OptimizedImage";

interface ImageSelectionModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (imageUrl: string) => void
    categoryName: string
}

export function ImageSelectionModal({ isOpen, onClose, onSelect, categoryName }: ImageSelectionModalProps) {
    const [images, setImages] = useState<string[]>([])
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const { t } = useTranslation()

    useEffect(() => {
        if (isOpen) {
            fetchCategoryImages()
        }
    }, [isOpen, categoryName])

    const fetchCategoryImages = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(`${API_URL}/category-images?name=${encodeURIComponent(categoryName)}`)
            if (!response.ok) {
                throw new Error('Failed to fetch category images')
            }
            const data = await response.json()
            setImages(data.images || [])
        } catch (error) {
            console.error('Error fetching category images:', error)
            toast({
                title: "Error",
                description: "Failed to fetch category images",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleImageSelect = (imageUrl: string) => {
        setSelectedImage(imageUrl)
    }

    const handleConfirm = () => {
        if (selectedImage) {
            onSelect(selectedImage)
            onClose()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{t('category.imageSelection.title')}</DialogTitle>
                </DialogHeader>
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : images.length === 0 ? (
                    <div className="text-center py-8">
                        <p>{t('category.imageSelection.noImages')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-4 mt-4 max-h-[60vh] overflow-y-auto">
                        {images.map((imageUrl, index) => (
                            <div
                                key={index}
                                className={`relative cursor-pointer border-2 ${
                                    selectedImage === imageUrl ? 'border-primary' : 'border-transparent'
                                }`}
                                onClick={() => handleImageSelect(imageUrl)}
                            >
                                <OptimizedImage
                                    src={`${imageUrl}`}
                                    alt={`Category image ${index + 1}`}
                                    width={350}
                                    height={400}
                                    quality={70}
                                />
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex justify-end mt-4">
                    <Button onClick={onClose} variant="outline" className="mr-2">
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleConfirm} disabled={!selectedImage || images.length === 0}>
                        {t('common.confirm')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

