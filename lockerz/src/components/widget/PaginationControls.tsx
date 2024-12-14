import React from 'react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

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
    const [inputPage, setInputPage] = React.useState(currentPage.toString())

    React.useEffect(() => {
        setInputPage(currentPage.toString())
    }, [currentPage])

    const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputPage(e.target.value)
    }

    const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const newPage = parseInt(inputPage, 10)
            if (!isNaN(newPage) && newPage >= 1 && newPage <= totalPages) {
                onPageChange(newPage)
            } else {
                setInputPage(currentPage.toString())
            }
        }
    }

    const handleFirstPage = () => onPageChange(1)
    const handleLastPage = () => onPageChange(totalPages)
    const handlePrevPage = () => onPageChange(Math.max(currentPage - 1, 1))
    const handleNextPage = () => onPageChange(Math.min(currentPage + 1, totalPages))

    return (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
            <div className="flex items-center space-x-2">
                <Button
                    onClick={handleFirstPage}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="icon"
                    aria-label="First page"
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="icon"
                    aria-label="Previous page"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center space-x-1">
                    <Input
                        type="text"
                        value={inputPage}
                        onChange={handlePageInputChange}
                        onKeyDown={handlePageInputKeyDown}
                        className="w-16 text-center"
                        aria-label="Current page"
                    />
                    <span className="text-sm text-muted-foreground">
                        of {totalPages}
                    </span>
                </div>
                <Button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="icon"
                    aria-label="Next page"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    onClick={handleLastPage}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="icon"
                    aria-label="Last page"
                >
                    <ChevronsRight className="h-4 w-4" />
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
                    <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}

