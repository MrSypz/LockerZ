"use client"

import { useState, useEffect } from "react"
import { getVersion } from "@tauri-apps/api/app"
import { useTranslation } from "react-i18next"
import { Github } from 'lucide-react'

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export default function AboutPage() {
    const { t } = useTranslation()
    const [appVersion, setAppVersion] = useState("Loading...")

    useEffect(() => {
        const fetchVersion = async () => {
            try {
                const version = await getVersion()
                setAppVersion(version)
            } catch (error) {
                setAppVersion("Unknown")
            }
        }
        fetchVersion()
    }, [])

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-4xl font-bold mb-10 gradient-text-header">{t('about.title')}</h1>

            <div className="grid gap-10 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('about.description.title')}</CardTitle>
                        <CardDescription>{t('about.description.subtitle')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>{t('about.description.content1')}</p>
                        <p>{t('about.description.content2')}</p>
                        <p>{t('about.description.content3')}</p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full">
                            <a href="https://github.com/MrSypz/LockerZ/issues/newdep" target="_blank" rel="noopener noreferrer">
                                <Github className="mr-2 h-4 w-4" />
                                {t('about.reportIssue')}
                            </a>
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('about.appDetails.title')}</CardTitle>
                        <CardDescription>{t('about.appDetails.description')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>{t('about.appDetails.version')}</Label>
                            <p className="text-sm text-muted-foreground">{appVersion}</p>
                        </div>
                        <div>
                            <Label>{t('about.appDetails.developer')}</Label>
                            <p className="text-sm text-muted-foreground">MrSypz</p>
                        </div>
                        <div>
                            <Label>{t('about.appDetails.website')}</Label>
                            <p className="text-sm text-muted-foreground">
                                <a href="https://github.com/MrSypz/LockerZ" className="text-primary hover:underline">
                                    https://github.com/MrSypz/LockerZ
                                </a>
                            </p>
                        </div>
                        <div>
                            <Label>{t('about.appDetails.license')}</Label>
                            <p className="text-sm text-muted-foreground">MIT License</p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <p className="text-sm text-muted-foreground">
                            {t('about.appDetails.copyright', { year: new Date().getFullYear() })}
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}

