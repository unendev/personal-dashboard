import { useState, useRef, useEffect, useCallback } from 'react';
import { useOssUpload } from '@/app/hooks/useOssUpload';

export interface ImageWithPreview {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  size?: number;
  originalUrl?: string;
  previewUrl?: string;
}

export interface UploadingImage {
  id: string;
  file: File;
  progress: number;
}

export interface MusicData {
  title: string;
  artist: string;
  album: string;
  url: string;
  coverUrl: string;
}

export function useTreasureState(initialData?: any, mode: 'create' | 'edit' = 'create', lastTags?: string[]) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<ImageWithPreview[]>([]);
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const [musicData, setMusicData] = useState<MusicData>({ title: '', artist: '', album: '', url: '', coverUrl: '' });
  
  // Tags
  const [primaryCategories, setPrimaryCategories] = useState<string[]>([]);
  const [topicTags, setTopicTags] = useState<string[]>([]);
  const [defaultTags, setDefaultTags] = useState<string[]>([]);

  const isInitializedRef = useRef(false);
  const lastTreasureIdRef = useRef<string | undefined>(undefined);
  const isCreateModeInitializedRef = useRef(false);

  // 初始化逻辑
  useEffect(() => {
    if (initialData && mode === 'edit') {
      const currentId = initialData.id || 'new';
      if (lastTreasureIdRef.current === currentId && isInitializedRef.current) return;
      
      lastTreasureIdRef.current = currentId;
      isInitializedRef.current = true;
      
      let fullContent = '';
      if (initialData.title) fullContent += initialData.title + '\n\n';
      if (initialData.content) fullContent += initialData.content;
      setContent(fullContent);

      const primaryCategoryList = ['Life', 'Knowledge', 'Thought', 'Root'];
      let initialPrimaryCategories: string[] = [];

      if (initialData.theme && Array.isArray(initialData.theme)) {
        initialPrimaryCategories = initialData.theme
          .map((t: string) => t.charAt(0).toUpperCase() + t.slice(1))
          .filter((t: string) => primaryCategoryList.includes(t));
      }

      if (initialPrimaryCategories.length === 0 && initialData.tags?.length > 0) {
        const found = initialData.tags.filter((tag: string) => primaryCategoryList.includes(tag));
        if (found.length > 0) initialPrimaryCategories = found;
      }
      setPrimaryCategories(initialPrimaryCategories);

      if (initialData.tags) {
        setTopicTags(initialData.tags.filter((tag: string) => !primaryCategoryList.includes(tag)));
      }

      if (initialData.images?.length > 0) {
        setImages(initialData.images.map((img: any) => ({
          ...img,
          url: img.url,
          originalUrl: img.url,
          previewUrl: img.url
        })));
      } else {
        setImages([]);
      }

      if (initialData.type === 'MUSIC' && initialData.musicTitle) {
        setMusicData({
          title: initialData.musicTitle || '',
          artist: initialData.musicArtist || '',
          album: initialData.musicAlbum || '',
          url: initialData.musicUrl || '',
          coverUrl: initialData.musicCoverUrl || ''
        });
      }
    } else if (!initialData) {
      if (isCreateModeInitializedRef.current) return;
      isCreateModeInitializedRef.current = true;
      
      setContent('');
      setImages([]);
      setMusicData({ title: '', artist: '', album: '', url: '', coverUrl: '' });
      
      if (lastTags && lastTags.length > 0) {
        const primaryCategoryList = ['Life', 'Knowledge', 'Thought', 'Root'];
        const primaryTags = lastTags.filter(tag => primaryCategoryList.includes(tag));
        const topicTagsList = lastTags.filter(tag => !primaryCategoryList.includes(tag));
        
        if (primaryTags.length > 0) setDefaultTags([...primaryTags, ...topicTagsList]);
        else setDefaultTags(topicTagsList);
        
        setPrimaryCategories([]);
        setTopicTags([]);
      } else {
        setPrimaryCategories([]);
        setDefaultTags([]);
        setTopicTags([]);
      }
    }
  }, [initialData, mode, lastTags]);

  return {
    content, setContent,
    images, setImages,
    uploadingImages, setUploadingImages,
    musicData, setMusicData,
    primaryCategories, setPrimaryCategories,
    topicTags, setTopicTags,
    defaultTags, setDefaultTags
  };
}
