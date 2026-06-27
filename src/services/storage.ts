// Storage service — profile picture upload to Supabase Storage (avatars bucket).
// Picks an image, compresses it, uploads under <userId>/avatar.jpg, and returns
// the public URL. The caller persists the URL to the user profile.

import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

const BUCKET = 'avatars';

export interface PickedImage {
  uri: string;
  base64: string;
}

/** Launch the picker (or camera) and return a compressed JPEG + its base64. */
export async function pickAndCompressImage(source: 'library' | 'camera'): Promise<PickedImage | null> {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Permission to access photos was denied.');

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
        });

  if (result.canceled || !result.assets[0]) return null;

  // Compress + resize to a 512px square JPEG.
  const manipulated = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 512, height: 512 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  if (!manipulated.base64) throw new Error('Failed to process image.');
  return { uri: manipulated.uri, base64: manipulated.base64 };
}

// base64 → Uint8Array (RN has no Buffer; atob is polyfilled by Expo).
function base64ToBytes(base64: string): Uint8Array {
  const binary = global.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Upload a compressed avatar for `userId` and return its public URL. */
export async function uploadAvatar(userId: string, image: PickedImage): Promise<string> {
  const path = `${userId}/avatar.jpg`;
  const bytes = base64ToBytes(image.base64);

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;

  // Cache-bust so the UI refreshes after re-upload to the same path.
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
