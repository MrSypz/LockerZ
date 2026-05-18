import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "jp", label: "日本語" },
  { code: "th", label: "ภาษาไทย" },
]

export default function SettingsPage() {
  const [folderPath] = useState("")
  const [newFolderPath, setNewFolderPath] = useState("")
  const [rememberCategory, setRememberCategory] = useState(false)
  const [imageQuality, setImageQuality] = useState(75)
  const [imageWidth, setImageWidth] = useState(1920)
  const [imageHeight, setImageHeight] = useState(1080)
  const [batchProcess, setBatchProcess] = useState(10)
  const [lang, setLang] = useState("en")

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 gradient-text-header">Settings</h1>

      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Root Folder</CardTitle>
          <CardDescription>The folder where your images are stored.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Current Path</label>
            <Input value={folderPath || "Not set"} readOnly disabled className="mt-1 bg-muted cursor-not-allowed" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">New Path</label>
            <div className="flex mt-1 space-x-2">
              <Input value={newFolderPath} onChange={(e) => setNewFolderPath(e.target.value)} placeholder="Select a folder..." className="flex-grow" />
              <Button variant="outline">Browse</Button>
            </div>
          </div>
          <Button disabled={!newFolderPath}>Apply New Path</Button>
        </CardContent>
      </Card>

      <Card className="w-full max-w-2xl mx-auto mt-6">
        <CardHeader>
          <CardTitle>Language</CardTitle>
          <CardDescription>Choose your preferred display language.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="language-select">Language</Label>
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger id="language-select" className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-2xl mx-auto mt-6">
        <CardHeader>
          <CardTitle>Locker Settings</CardTitle>
          <CardDescription>Configure image display and processing options.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch id="remember-category" checked={rememberCategory} onCheckedChange={setRememberCategory} />
            <Label htmlFor="remember-category">Remember last category</Label>
          </div>

          <div className="space-y-2">
            <Label>Image Quality</Label>
            <CardDescription>Thumbnail compression quality.</CardDescription>
            <Slider min={1} max={100} step={1} value={[imageQuality]} onValueChange={([v]) => setImageQuality(v)} />
            <div className="text-sm text-muted-foreground">{imageQuality}%</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image-width">Thumbnail Width</Label>
            <Input id="image-width" type="number" value={imageWidth} onChange={(e) => setImageWidth(Number(e.target.value))} min={100} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image-height">Thumbnail Height</Label>
            <Input id="image-height" type="number" value={imageHeight} onChange={(e) => setImageHeight(Number(e.target.value))} min={250} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch-process">Batch Process Size</Label>
            <CardDescription>How many images to process simultaneously.</CardDescription>
            <Input id="batch-process" type="number" value={batchProcess} onChange={(e) => setBatchProcess(Number(e.target.value))} min={1} max={255} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
