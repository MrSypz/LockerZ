// components/ImagePanel.tsx
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OptimizedImage } from "@/components/widget/ImageProcessor"
import { formatBytes } from "@/components/widget/Dashboard"
import { useSharedSettings } from "@/utils/SettingsContext"
import { File } from "@/types/file"
import { ImageIcon, Tag, FolderIcon, ScaleIcon, CalendarIcon } from "lucide-react"

interface ImagePanelProps {
    file: File
}

interface MetadataItemProps {
    icon: React.ElementType
    label: string
    value: string
}

const MetadataItem = ({ icon: Icon, label, value }: MetadataItemProps) => (
    <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{label}:</span>
        <span className="text-sm text-muted-foreground truncate">{value}</span>
    </div>
)

export function ImagePanel({ file }: ImagePanelProps) {
    const { settings } = useSharedSettings()

    const metadata = [
        { icon: ImageIcon, label: "Name", value: file.name },
        { icon: FolderIcon, label: "Category", value: file.category },
        { icon: ScaleIcon, label: "Size", value: formatBytes(file.size) },
        { icon: CalendarIcon, label: "Modified", value: new Date(file.last_modified).toLocaleString() },
        { icon: CalendarIcon, label: "Created", value: new Date(file.created_at).toLocaleString() }
    ]

    return (
        <Card className="h-full overflow-hidden">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    File Information
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Image Preview */}
                <div className="relative aspect-square rounded-lg overflow-hidden">
                    <OptimizedImage
                        src={file.filepath}
                        alt={file.name}
                        width={settings.imageWidth}
                        height={settings.imageHeight}
                        quality={settings.imageQuality}
                    />
                </div>

                {/* Metadata */}
                <div className="space-y-2">
                    {metadata.map((item) => (
                        <MetadataItem
                            key={item.label}
                            icon={item.icon}
                            label={item.label}
                            value={item.value}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}