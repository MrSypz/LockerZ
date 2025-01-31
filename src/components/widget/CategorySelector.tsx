import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
    Check,
    ChevronsUpDown,
    Upload,
    FolderOpen,
    Search,
    Folder,
} from "lucide-react";
import {motion, AnimatePresence} from "framer-motion";
import {useTranslation} from "react-i18next";
import {cn} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {Category} from "@/types/file";

function useDebouncedValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);

        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}

interface CategorySelectorProps {
    selectedCategory: string;
    categories: Category[];
    isCategoriesLoading: boolean;
    onCategoryChange: (category: string) => void;
    uploadImgFiles: (droppedFiles?: string[]) => Promise<void>;
}

export function CategorySelector({
                                     selectedCategory,
                                     categories,
                                     isCategoriesLoading,
                                     onCategoryChange,
                                     uploadImgFiles,
                                 }: CategorySelectorProps) {
    const [open, setOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [searchValue, setSearchValue] = useState("");
    const debouncedSearchValue = useDebouncedValue(searchValue, 1000); // Debounce delay: 1 second
    const {t} = useTranslation();
    const commandGroupRef = useRef<HTMLDivElement>(null);
    const allCategories = useMemo(() => ["all", ...categories], [categories]);

    const filteredCategories = useMemo(() => {
        const searchTerm = debouncedSearchValue.toLowerCase().trim();
        if (!searchTerm) return allCategories;

        return allCategories.filter((category) => {
            if (category === "all") {
                return t("category.allCategories")
                    .toLowerCase()
                    .includes(searchTerm);
            }
            return category.toLowerCase().includes(searchTerm);
        });
    }, [allCategories, debouncedSearchValue, t]);

    const handleSelect = useCallback(
        (category: string) => {
            onCategoryChange(category);
            setOpen(false);
            setSearchValue("");
            setSelectedIndex(0);
        },
        [onCategoryChange]
    );

    const scrollSelectedIntoView = useCallback((index: number) => {
        if (!commandGroupRef.current) return;

        const items = commandGroupRef.current.querySelectorAll('[role="option"]');
        const selectedItem = items[index] as HTMLElement;
        if (!selectedItem) return;

        const container = commandGroupRef.current;
        const containerHeight = container.clientHeight;
        const itemHeight = selectedItem.offsetHeight;
        const itemOffset = selectedItem.offsetTop;
        const idealScrollTop = itemOffset - (containerHeight - itemHeight) / 2;
        const maxScroll = container.scrollHeight - containerHeight;

        container.scrollTop = Math.max(0, Math.min(idealScrollTop, maxScroll));
    }, []);

    useEffect(() => {
        if (!open) return;

        const handleKeyPress = (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex((prev) => {
                        const newIndex = prev - 1;
                        const finalIndex =
                            newIndex < 0 ? filteredCategories.length - 1 : newIndex;
                        setTimeout(() => scrollSelectedIntoView(finalIndex), 0);
                        return finalIndex;
                    });
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex((prev) => {
                        const newIndex = prev + 1;
                        const finalIndex =
                            newIndex >= filteredCategories.length ? 0 : newIndex;
                        setTimeout(() => scrollSelectedIntoView(finalIndex), 0);
                        return finalIndex;
                    });
                    break;
                case "Enter":
                    e.preventDefault();
                    const selectedCategory = filteredCategories[selectedIndex];
                    handleSelect(selectedCategory);
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyPress);
        return () => window.removeEventListener("keydown", handleKeyPress);
    }, [open, filteredCategories, handleSelect, selectedIndex, scrollSelectedIntoView]);


    return (
        <motion.div
            initial={{opacity: 0, y: -20}}
            animate={{opacity: 1, y: 0}}
            className="flex justify-between items-center mb-8"
        >
            <div className="flex items-center gap-4">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className={cn(
                                "w-[250px] justify-between",
                                "bg-white dark:bg-gray-800",
                                "hover:bg-gray-100 dark:hover:bg-gray-700",
                                "focus:ring-2 focus:ring-primary focus:outline-none",
                                "transition-all duration-200",
                                "group"
                            )}
                            disabled={isCategoriesLoading}
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Folder
                                    className="h-4 w-4 text-primary shrink-0 transition-transform group-hover:scale-110"/>
                                <span className="truncate">
                                    {selectedCategory
                                        ? categories.find(
                                        (category) => category === selectedCategory
                                    ) || t("category.allCategories")
                                        : t("category.allCategories")}
                                </span>
                            </div>
                            <ChevronsUpDown
                                className="ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform group-hover:scale-110"/>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0">
                        <Command className="rounded-lg border shadow-lg">
                            <div className="flex items-center px-3 border-b">
                                <Search className="h-4 w-4 text-muted-foreground mr-2"/>
                                <CommandInput
                                    placeholder={t("category.search")}
                                    value={searchValue}
                                    onValueChange={setSearchValue}
                                    className="h-9 focus:outline-none"
                                />
                            </div>
                            <CommandEmpty className="py-4 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <FolderOpen className="h-8 w-8 text-muted-foreground"/>
                                    <p className="text-sm text-muted-foreground">
                                        {t("category.notFound")}
                                    </p>
                                </div>
                            </CommandEmpty>
                            <CommandGroup
                                ref={commandGroupRef}
                                className="max-h-[300px] overflow-y-auto"
                            >
                                <AnimatePresence mode="wait">
                                    {filteredCategories.map((category, index) => (
                                        <motion.div
                                            key={category}
                                            initial={{opacity: 0, y: 5}}
                                            animate={{opacity: 1, y: 0}}
                                            exit={{opacity: 0, y: -5}}
                                            transition={{
                                                duration: 0.15,
                                                delay: index * 0.03,
                                            }}
                                        >
                                            <CommandItem
                                                value={category}
                                                onSelect={() => handleSelect(category)}
                                                className={cn(
                                                    "cursor-pointer py-3 px-2",
                                                    "hover:bg-primary/10 dark:hover:bg-primary/20",
                                                    "transition-colors duration-200",
                                                    selectedIndex === index &&
                                                    "bg-primary/5 dark:bg-primary/15"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 w-full">
                                                    <div className="flex items-center justify-center w-6">
                                                        {selectedCategory === category ? (
                                                            <Check className="h-4 w-4 text-primary"/>
                                                        ) : (
                                                            <Folder className="h-4 w-4 text-muted-foreground"/>
                                                        )}
                                                    </div>
                                                    <span className="flex-grow">
                                                        {category === "all"
                                                            ? t("category.allCategories")
                                                            : category}
                                                    </span>
                                                </div>
                                            </CommandItem>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>

                <Button
                    onClick={() => uploadImgFiles()}
                    variant="default"
                    className="group relative overflow-hidden"
                >
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/20 transition-opacity group-hover:opacity-100 opacity-0"
                    />
                    <div className="relative flex items-center gap-2">
                        <Upload className="h-4 w-4 transition-transform group-hover:scale-110"/>
                        <span>{t("category.upload")}</span>
                    </div>
                </Button>
            </div>
        </motion.div>
    );
}
