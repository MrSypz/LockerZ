import React from 'react';
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ArrowUpDown, Clock, ArrowUpIcon as ClockArrowUp, FileIcon, Text } from 'lucide-react';

type SortCriteria = 'name' | 'date' | 'createat' | 'size';
type SortOrder = 'asc' | 'desc';

interface FileSortProps {
    sortCriteria: SortCriteria;
    sortOrder: SortOrder;
    onSort: (criteria: SortCriteria, order: SortOrder) => void;
}

export function FileSort({ sortCriteria, sortOrder, onSort }: FileSortProps) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = React.useState(false);

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.code === 'Space') {
                event.preventDefault();
                setIsOpen(prevState => !prevState);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
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
                      onValueChange={(value) => onSort(value as SortCriteria, sortOrder)}
                      className="w-full p-2">
                    <TabsList className="grid w-full grid-cols-4 mb-2">
                        <TabsTrigger value="name" className="flex items-center justify-center">
                            <Text className="w-4 h-4 mr-2"/>
                            {t('category.image.sort.by-name')}
                        </TabsTrigger>
                        <TabsTrigger value="date" className="flex items-center justify-center">
                            <Clock className="w-4 h-4 mr-2"/>
                            {t('category.image.sort.by-date')}
                        </TabsTrigger>
                        <TabsTrigger value="createat" className="flex items-center justify-center">
                            <ClockArrowUp className="w-4 h-4 mr-2"/>
                            {t('category.image.sort.by-createat')}
                        </TabsTrigger>
                        <TabsTrigger value="size" className="flex items-center justify-center">
                            <FileIcon className="w-4 h-4 mr-2"/>
                            {t('category.image.sort.by-size')}
                        </TabsTrigger>
                    </TabsList>
                    {['name', 'date', 'createat', 'size'].map((criteria) => (
                        <TabsContent key={criteria} value={criteria} className="mt-2">
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    onClick={() => onSort(criteria as SortCriteria, 'asc')}
                                    variant={sortCriteria === criteria && sortOrder === 'asc' ? 'default' : 'outline'}
                                    className="w-full justify-between py-1 px-2 text-sm"
                                >
                                    {t('category.image.sort.ascending')}
                                    <ArrowUp className="h-3 w-3"/>
                                </Button>
                                <Button
                                    onClick={() => onSort(criteria as SortCriteria, 'desc')}
                                    variant={sortCriteria === criteria && sortOrder === 'desc' ? 'default' : 'outline'}
                                    className="w-full justify-between py-1 px-2 text-sm"
                                >
                                    {t('category.image.sort.descending')}
                                    <ArrowDown className="h-3 w-3"/>
                                </Button>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </DrawerContent>
        </Drawer>
    );
}

