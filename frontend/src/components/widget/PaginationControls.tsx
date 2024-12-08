import React from 'react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationControlsProps {
    currentPage: number
    totalPages: number
    imagesPerPage: number
    onPageChange: (page: number) => void
    onImagesPerPageChange: (value: number) => void
}

export function PaginationControls({
                                       currentPage,
                                       totalPages,
                                       imagesPerPage,
                                       onPageChange,
                                       onImagesPerPageChange
                                   }: PaginationControlsProps) {
    return (
        <div className="flex justify-between items-center mt-8">
            <div className="flex items-center space-x-2">
                <Button
                    onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="icon"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
                <Button
                    onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="icon"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            <Select
                value={imagesPerPage.toString()}
                onValueChange={(value) => onImagesPerPageChange(Number(value))}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Images per page" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="20">20 per page</SelectItem>
                    <SelectItem value="40">40 per page</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}

