import { supabase } from './supabase';

export type UploadProgress = (percent: number) => void;

export async function uploadImage(file: File, folder: string, onProgress?: UploadProgress): Promise<string | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('wedding-images')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
      ...(onProgress ? { onUploadProgress: (e: ProgressEvent) => {
        if (e.lengthComputable && e.total > 0) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      } } : {}),
    } as any);
  if (error) {
    console.error('Upload error:', error.message);
    onProgress?.(0);
    return null;
  }
  onProgress?.(100);
  const { data } = supabase.storage.from('wedding-images').getPublicUrl(fileName);
  return data.publicUrl;
}
