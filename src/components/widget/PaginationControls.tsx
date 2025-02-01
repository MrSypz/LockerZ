import { useEffect, ChangeEvent, KeyboardEvent, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Image as ImageIcon
} from 'lucide-react'

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
    const [inputPage, setInputPage] = useState(currentPage.toString())

    // Update input field when currentPage changes
    useEffect(() => {
        setInputPage(currentPage.toString())
    }, [currentPage])

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeElement = document.activeElement?.tagName
            if (activeElement === 'INPUT' || activeElement === 'SELECT') return

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault()
                    if (currentPage > 1) onPageChange(currentPage - 1)
                    break
                case 'ArrowRight':
                    e.preventDefault()
                    if (currentPage < totalPages) onPageChange(currentPage + 1)
                    break
                case 'Home':
                    e.preventDefault()
                    if (currentPage !== 1) onPageChange(1)
                    break
                case 'End':
                    e.preventDefault()
                    if (currentPage !== totalPages) onPageChange(totalPages)
                    break
                case 'PageUp':
                    e.preventDefault()
                    if (currentPage > 1) onPageChange(Math.max(1, currentPage - 5))
                    break
                case 'PageDown':
                    e.preventDefault()
                    if (currentPage < totalPages) onPageChange(Math.min(totalPages, currentPage + 5))
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [currentPage, totalPages, onPageChange])

    const handlePageInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^\d]/g, '')
        setInputPage(value)
    }

    const handlePageInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') validateAndSetPage()
    }

    const handlePageInputBlur = () => {
        validateAndSetPage()
    }

    const validateAndSetPage = () => {
        const newPage = parseInt(inputPage, 10)
        if (!isNaN(newPage) && newPage >= 1 && newPage <= totalPages) {
            onPageChange(newPage)
        } else {
            setInputPage(currentPage.toString())
        }
    }

    const handleFirstPage = () => currentPage !== 1 && onPageChange(1)
    const handleLastPage = () => currentPage !== totalPages && onPageChange(totalPages)
    const handlePrevPage = () => currentPage > 1 && onPageChange(currentPage - 1)
    const handleNextPage = () => currentPage < totalPages && onPageChange(currentPage + 1)

    return (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
            <div className="flex items-center gap-2 bg-background/50 p-2 rounded-lg border border-border shadow-sm">
                {/* Navigation Controls */}
                <div className="flex items-center space-x-1">
                    <Button
                        onClick={handleFirstPage}
                        disabled={currentPage === 1}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                        aria-label="First page"
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </div>

                {/* Page Input */}
                <div className="flex items-center gap-2 px-2 min-w-[100px]">
                    <Input
                        type="text"
                        value={inputPage}
                        onChange={handlePageInputChange}
                        onKeyDown={handlePageInputKeyDown}
                        onBlur={handlePageInputBlur}
                        className="w-14 h-8 text-center bg-background border-border focus:ring-primary"
                        aria-label="Current page"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                        / {totalPages}
                    </span>
                </div>

                {/* Forward Navigation */}
                <div className="flex items-center space-x-1">
                    <Button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                        aria-label="Next page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={handleLastPage}
                        disabled={currentPage === totalPages}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                        aria-label="Last page"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Per Page Selector */}
            <Select
                value={imagesPerPage.toString()}
                onValueChange={(value) => onImagesPerPageChange(Number(value))}
            >
                <SelectTrigger className="w-[180px] glass-effect card-shadow hover-lift">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-primary/60" />
                        <SelectValue placeholder="Images per page" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="20">20 per page</SelectItem>
                    <SelectItem value="40">40 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}