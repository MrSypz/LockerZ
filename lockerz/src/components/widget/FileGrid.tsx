import React, {useState, useEffect} from 'react'
import {Card, CardContent} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger} from "@/components/ui/drawer"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {Input} from "@/components/ui/input"
import {FileContextMenu} from '@/components/widget/Context-menu'
import {File} from '@/types/file'
import {motion, AnimatePresence} from "framer-motion"
import {useTranslation} from 'react-i18next'
import { ArrowDown, ArrowUp, ArrowUpDown, Clock, FileIcon, Search, Text } from 'lucide-react'
import { ImageViewer } from './Image-viewer';
import {useSharedSettings} from "@/utils/SettingsContext";
import {OptimizedImage} from "@/components/widget/ImageProcessor";

function useColumnCount() {
    const [columnCount, setColumnCount] = useState(5)

    useEffect(() => {
        function updateColumnCount() {
            switch (true) {
                case window.innerWidth >= 1280:
                    setColumnCount(5);
                    break;
                case window.innerWidth >= 768:
                    setColumnCount(4);
                    break;
                case window.innerWidth >= 640:
                    setColumnCount(3);
                    break;
                default:
                    setColumnCount(2);
            }
        }

        updateColumnCount() // Initial call
        window.addEventListener('resize', updateColumnCount)
        return () => window.removeEventListener('resize', updateColumnCount)
    }, [])

    return columnCount
}

interface FileGridProps {
    files: File[]
    allFiles: File[]
    onViewFileAction: (file: File) => void
    onDeleteFileAction: (file: File) => void
    onMoveFileAction: (file: File) => void
    apiUrl: string
    currentPage: number
    imagesPerPage: number
    onPageChange: (page: number) => void
    onTotalPagesChange: (pages: number) => void
}

export function FileGrid({ files, allFiles,onViewFileAction ,onDeleteFileAction, onMoveFileAction, apiUrl , currentPage, imagesPerPage, onPageChange, onTotalPagesChange}: FileGridProps) {
    const totalColumns = useColumnCount()
    const [sortedFiles, setSortedFiles] = useState(files)
    const [sortCriteria, setSortCriteria] = useState<'name' | 'date' | 'size'>('name')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
    const [searchTerm, setSearchTerm] = useState('')
    const {t} = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.code === 'Space') {
                event.preventDefault();
                setIsOpen(prevState => !prevState); // Toggle the isOpen state
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        const filtered = searchTerm
            ? allFiles.filter(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()))
            : allFiles;

        const sorted = [...filtered].sort((a, b) => {
            let comparison = 0;
            switch (sortCriteria) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'date':
                    comparison = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
                    break;
                case 'size':
                    comparison = a.size - b.size;
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        const totalFilteredPages = Math.ceil(sorted.length / imagesPerPage);
        onTotalPagesChange(totalFilteredPages);

        if (currentPage > totalFilteredPages) {
            onPageChange(1);
        }

        const start = (currentPage - 1) * imagesPerPage;
        const end = start + imagesPerPage;
        setSortedFiles(sorted.slice(start, end));
    }, [allFiles, sortCriteria, sortOrder, searchTerm, currentPage, imagesPerPage]);

    const handleSort = (criteria: 'name' | 'date' | 'size', order: 'asc' | 'desc') => {
        setSortCriteria(criteria);
        setSortOrder(order);
    }

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    }
    const handleSelectImage = (index: number) => {
        setSelectedImageIndex(index);
    };

    const handleCloseViewer = () => {
        setSelectedImageIndex(null);
    };

    const getFileUrl = (file: File) => `${apiUrl}${file.url}`;

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-4">
                <div className="relative flex-grow">
                    <Input
                        type="text"
                        placeholder={t('locker.search.placeholder')}
                        value={searchTerm}
                        onChange={handleSearch}
                        className="pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"/>
                </div>
                <Drawer open={isOpen} onOpenChange={setIsOpen}>
                    <DrawerTrigger asChild>
                        <Button variant="outline" size="lg">
                            {t('category.image.sort.button')}
                            <ArrowUpDown className="ml-2 h-5 w-5"/>
                        </Button>
                    </DrawerTrigger>
                    <DrawerContent className="h-[40vh] max-h-[400px]">
                        <DrawerHeader>
                            <DrawerTitle>{t('category.image.sort.title')}</DrawerTitle>
                        </DrawerHeader>
                        <Tabs value={sortCriteria}
                              onValueChange={(value) => setSortCriteria(value as 'name' | 'date' | 'size')}
                              className="w-full p-2">
                            <TabsList className="grid w-full grid-cols-3 mb-2">
                                <TabsTrigger value="name" className="flex items-center justify-center">
                                    <Text className="w-4 h-4 mr-2"/>
                                    {t('category.image.sort.by-name')}
                                </TabsTrigger>
                                <TabsTrigger value="date" className="flex items-center justify-center">
                                    <Clock className="w-4 h-4 mr-2"/>
                                    {t('category.image.sort.by-date')}
                                </TabsTrigger>
                                <TabsTrigger value="size" className="flex items-center justify-center">
                                    <FileIcon className="w-4 h-4 mr-2"/>
                                    {t('category.image.sort.by-size')}
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="name" className="mt-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        onClick={() => handleSort('name', 'asc')}
                                        variant={sortCriteria === 'name' && sortOrder === 'asc' ? 'default' : 'outline'}
                                        className="w-full justify-between py-1 px-2 text-sm"
                                    >
                                        {t('category.image.sort.ascending')}
                                        <ArrowUp className="h-3 w-3"/>
                                    </Button>
                                    <Button
                                        onClick={() => handleSort('name', 'desc')}
                                        variant={sortCriteria === 'name' && sortOrder === 'desc' ? 'default' : 'outline'}
                                        className="w-full justify-between py-1 px-2 text-sm"
                                    >
                                        {t('category.image.sort.descending')}
                                        <ArrowDown className="h-3 w-3"/>
                                    </Button>
                                </div>
                            </TabsContent>
                            <TabsContent value="date" className="mt-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        onClick={() => handleSort('date', 'asc')}
                                        variant={sortCriteria === 'date' && sortOrder === 'asc' ? 'default' : 'outline'}
                                        className="w-full justify-between py-1 px-2 text-sm"
                                    >
                                        {t('category.image.sort.ascending')}
                                        <ArrowUp className="h-3 w-3"/>
                                    </Button>
                                    <Button
                                        onClick={() => handleSort('date', 'desc')}
                                        variant={sortCriteria === 'date' && sortOrder === 'desc' ? 'default' : 'outline'}
                                        className="w-full justify-between py-1 px-2 text-sm"
                                    >
                                        {t('category.image.sort.descending')}
                                        <ArrowDown className="h-3 w-3"/>
                                    </Button>
                                </div>
                            </TabsContent>
                            <TabsContent value="size" className="mt-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        onClick={() => handleSort('size', 'asc')}
                                        variant={sortCriteria === 'size' && sortOrder === 'asc' ? 'default' : 'outline'}
                                        className="w-full justify-between py-1 px-2 text-sm"
                                    >
                                        {t('category.image.sort.ascending')}
                                        <ArrowUp className="h-3 w-3"/>
                                    </Button>
                                    <Button
                                        onClick={() => handleSort('size', 'desc')}
                                        variant={sortCriteria === 'size' && sortOrder === 'desc' ? 'default' : 'outline'}
                                        className="w-full justify-between py-1 px-2 text-sm"
                                    >
                                        {t('category.image.sort.descending')}
                                        <ArrowDown className="h-3 w-3"/>
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </DrawerContent>
                </Drawer>
            </div>
            {
                searchTerm && (
                    <div className="text-sm text-gray-500">
                        {t('locker.search.results', {count: allFiles.filter(file =>
                                file.name.toLowerCase().includes(searchTerm.toLowerCase())
                            ).length})}
                    </div>
                )
            }

            <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 p-4 bg-background/50 backdrop-blur-sm rounded-lg border border-border"
                layout
                key={`${sortCriteria}-${sortOrder}`}
            >
                <AnimatePresence>
                    {sortedFiles.map((file, index) => (
                        <FileCard
                            key={`${file.category}-${file.name}`}
                            file={file}
                            onView={() => onViewFileAction(file)}
                            onDelete={() => onDeleteFileAction(file)}
                            onMove={() => onMoveFileAction(file)}
                            onSelect={() => handleSelectImage(index)}
                            index={index}
                            column={index % totalColumns}
                            totalColumns={totalColumns}
                        />
                    ))}
                </AnimatePresence>
            </motion.div>
            {selectedImageIndex !== null && (
                <ImageViewer
                    files={sortedFiles}
                    initialIndex={selectedImageIndex}
                    onClose={handleCloseViewer}
                    getFileUrl={getFileUrl}
                />
            )}
        </div>
    )
}

interface FileCardProps {
    file: File
    onDelete: () => void
    onMove: () => void
    onView: () => void
    onSelect: () => void
    index: number
    column: number
    totalColumns: number
}

function FileCard({file, onDelete, onMove,onView, onSelect, index, column, totalColumns}: FileCardProps) {
    const {t} = useTranslation();
    const { settings } = useSharedSettings();


    const row = Math.floor(index / totalColumns)
    const isDarkSquare = (row + column) % 2 === 0

    const getOffset = () => {
        const columnDirection = column % 2 === 0 ? 1 : -1;
        const offsetAmount = 12;
        return columnDirection * offsetAmount;
    };

    return (
        <FileContextMenu
            file={file}
            onViewAction={onView}
            onDeleteAction={onDelete}
            onMoveAction={onMove}
        >
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    y: getOffset(),
                    transition: {
                        type: "spring",
                        stiffness: 300,
                        damping: 24,
                        mass: 0.8,
                    }
                }}
                exit={{ opacity: 0, scale: 0.8, y: 50 }}
                transition={{
                    opacity: { duration: 0.2 },
                    layout: { type: "spring", stiffness: 300, damping: 24 }
                }}
                whileHover={{
                    scale: 1.05,
                    zIndex: 10,
                    transition: { duration: 0.2 }
                }}
                className="relative"
                style={{ zIndex: 1000 - index }}
            >
                <Card
                    className={`overflow-hidden transition-all duration-300 ease-in-out hover:ring-2 hover:ring-primary/50 cursor-pointer ${
                        isDarkSquare
                            ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}
                    onClick={onSelect}
                >
                    <CardContent className="p-0">
                        <div className="relative aspect-[2/3] rounded-t-lg overflow-hidden">
                            <OptimizedImage
                                src={file.filepath}
                                alt={file.name}
                                width={settings.imageWidth}
                                height={settings.imageHeight}
                                quality={settings.imageQuality}
                            />
                        </div>
                        <motion.div
                            className={`p-3 space-y-1.5 ${
                                isDarkSquare
                                    ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}
                            initial={{opacity: 0, y: 20}}
                            animate={{opacity: 1, y: 0}}
                            transition={{delay: 0.1, duration: 0.3}}
                        >
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs opacity-80">{file.category}</p>
                            <p className="text-xs italic truncate opacity-80">
                                {file.tags?.length ? file.tags.join(', ') : t('category.tags-empty')}
                            </p>
                        </motion.div>
                    </CardContent>
                </Card>
            </motion.div>
        </FileContextMenu>
    )
}

