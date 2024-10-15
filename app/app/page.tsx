'use client'

import React, { useRef, useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { removeBackground } from "@imgly/background-removal";
import { PlusIcon, ReloadIcon } from '@radix-ui/react-icons';
import TextCustomizer from '@/components/editor/text-customizer';
import Image from 'next/image';
import { Accordion } from '@/components/ui/accordion';
import '@/app/fonts.css';

const Page = () => {
    const { user } = useUser();
    const { session } = useSessionContext();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isImageSetupDone, setIsImageSetupDone] = useState<boolean>(false);
    const [removedBgImageUrl, setRemovedBgImageUrl] = useState<string | null>(null);
    const [textSets, setTextSets] = useState<Array<any>>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const BASE_FONT_SIZE = 200; // Base font size for consistent scaling

    const handleUploadImage = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setSelectedImage(imageUrl);
            await setupImage(imageUrl);
        }
    };

    const setupImage = async (imageUrl: string) => {
        try {
            const imageBlob = await removeBackground(imageUrl);
            const url = URL.createObjectURL(imageBlob);
            setRemovedBgImageUrl(url);
            setIsImageSetupDone(true);
        } catch (error) {
            console.error(error);
        }
    };

    const addNewTextSet = () => {
        const newId = Math.max(...textSets.map(set => set.id), 0) + 1;
        setTextSets(prev => [...prev, {
            id: newId,
            text: 'edit',
            fontFamily: 'Inter',
            top: 0,
            left: 0,
            color: 'white',
            fontSize: BASE_FONT_SIZE, // Ensure size consistency
            fontWeight: 800,
            opacity: 1,
            shadowColor: 'rgba(0, 0, 0, 0.8)',
            shadowSize: 4,
            rotation: 0
        }]);
    };

    const handleAttributeChange = (id: number, attribute: string, value: any) => {
        setTextSets(prev => prev.map(set =>
            set.id === id ? { ...set, [attribute]: value } : set
        ));
    };

    const duplicateTextSet = (textSet: any) => {
        const newId = Math.max(...textSets.map(set => set.id), 0) + 1;
        setTextSets(prev => [...prev, { ...textSet, id: newId }]);
    };

    const removeTextSet = (id: number) => {
        setTextSets(prev => prev.filter(set => set.id !== id));
    };

    const saveCompositeImage = () => {
        if (!canvasRef.current || !isImageSetupDone) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bgImg = new window.Image();
        bgImg.crossOrigin = "anonymous";
        bgImg.onload = () => {
            canvas.width = bgImg.width;
            canvas.height = bgImg.height;

            ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

            textSets.forEach(textSet => {
                ctx.save();

                const scale = textSet.fontSize / BASE_FONT_SIZE;
		const previewFontSize = `${scale * 800}%`;

		// Custom scaling function for canvas size
		const fontSize = (scale * 1600) + (scale * scale * 340); // Increase size slightly as scale grows

                console.log(`Preview font size for "${textSet.text}": ${previewFontSize}`); // Debugging log
                console.log(`Canvas font size for "${textSet.text}": ${fontSize}px`); // Debugging log

                ctx.font = `${textSet.fontWeight} ${fontSize}px ${textSet.fontFamily}`;
                ctx.fillStyle = textSet.color;
                ctx.globalAlpha = textSet.opacity;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const x = canvas.width * (textSet.left + 50) / 100;
                const y = canvas.height * (50 - textSet.top) / 100;

                ctx.translate(x, y);
                ctx.rotate((textSet.rotation * Math.PI) / 180);
                ctx.fillText(textSet.text, 0, 0);
                ctx.restore();
            });

            if (removedBgImageUrl) {
                const removedBgImg = new window.Image();
                removedBgImg.crossOrigin = "anonymous";
                removedBgImg.onload = () => {
                    ctx.drawImage(removedBgImg, 0, 0, canvas.width, canvas.height);
                    triggerDownload();
                };
                removedBgImg.src = removedBgImageUrl;
            } else {
                triggerDownload();
            }
        };
        bgImg.src = selectedImage || '';

        function triggerDownload() {
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = 'text-behind-image.png';
            link.href = dataUrl;
            link.click();
        }
    };

    return (
        <>
            <div className='flex flex-col min-h-screen'>
                <div className='flex flex-row items-center justify-between p-5 px-10'>
                    <h2 className="text-2xl font-semibold tracking-tight">
                        Text behind image editor
                    </h2>
                    <div className='flex gap-4'>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                            accept=".jpg, .jpeg, .png"
                        />
                        <Button onClick={handleUploadImage}>
                            Upload image
                        </Button>
                        <Avatar>
                            <AvatarImage src={user?.user_metadata.avatar_url} />
                        </Avatar>
                    </div>
                </div>
                <Separator />
                {selectedImage ? (
                    <div className='flex flex-row items-start justify-start gap-10 w-full h-screen p-10'>
                        <div className="min-h-[400px] w-[80%] p-4 border border-border rounded-lg relative overflow-hidden">
                            {isImageSetupDone ? (
                                <Image
                                    src={selectedImage}
                                    alt="Uploaded"
                                    layout="fill"
                                    objectFit="contain"
                                    objectPosition="center"
                                />
                            ) : (
                                <span className='flex items-center w-full gap-2'><ReloadIcon className='animate-spin' /> Loading, please wait</span>
                            )}
                            {isImageSetupDone && textSets.map(textSet => {
                                const scale = textSet.fontSize / BASE_FONT_SIZE;
                                const previewFontSize = `${scale * 800}%`; // Calculate preview font size

                                console.log(`Preview font size for "${textSet.text}": ${previewFontSize}`); // Debugging log

                                return (
                                    <div
                                        key={textSet.id}
                                        style={{
                                            position: 'absolute',
                                            top: `${50 - textSet.top}%`,
                                            left: `${textSet.left + 50}%`,
                                            transform: `translate(-50%, -50%) rotate(${textSet.rotation}deg)`,
                                            color: textSet.color,
                                            textAlign: 'center',
                                            fontSize: previewFontSize, // Use calculated font size for preview
                                            fontWeight: textSet.fontWeight,
                                            fontFamily: textSet.fontFamily,
                                            opacity: textSet.opacity
                                        }}
                                    >
                                        {textSet.text}
                                    </div>
                                );
                            })}
                            {removedBgImageUrl && (
                                <Image
                                    src={removedBgImageUrl}
                                    alt="Removed bg"
                                    layout="fill"
                                    objectFit="contain"
                                    objectPosition="center"
                                    className="absolute top-0 left-0 w-full h-full"
                                />
                            )}
                        </div>
                        <div className='flex flex-col w-full'>
                            <Button variant={'secondary'} onClick={addNewTextSet}><PlusIcon className='mr-2' /> Add New Text Set</Button>
                            <Accordion type="single" collapsible className="w-full mt-2">
                                {textSets.map(textSet => (
                                    <TextCustomizer
                                        key={textSet.id}
                                        textSet={textSet}
                                        handleAttributeChange={handleAttributeChange}
                                        removeTextSet={removeTextSet}
                                        duplicateTextSet={duplicateTextSet}
                                    />
                                ))}
                            </Accordion>

                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                            <Button onClick={saveCompositeImage}>
                                Save image
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className='flex items-center justify-center min-h-screen w-full'>
                        <h2 className='text-xl font-semibold text-center'>
                            Please upload an image to start editing.
                        </h2>
                    </div>
                )}
            </div>
        </>
    );
};

export default Page;
