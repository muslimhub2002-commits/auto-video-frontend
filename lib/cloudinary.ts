export type CloudinaryResourceType = 'image' | 'video';

export type CloudinaryUploadOptions = {
  resourceType: CloudinaryResourceType;
  folder: string;
};

function getCloudinaryConfig() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.',
    );
  }

  return { cloudName, uploadPreset };
}

export async function uploadToCloudinaryUnsigned(
  file: File,
  options: CloudinaryUploadOptions,
): Promise<string> {
  const { cloudName, uploadPreset } = getCloudinaryConfig();

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
    cloudName,
  )}/${options.resourceType}/upload`;

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', uploadPreset);
  form.append('folder', options.folder);

  const res = await fetch(endpoint, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Cloudinary upload failed (${res.status}): ${text || res.statusText}`,
    );
  }

  const data = (await res.json()) as { secure_url?: string };
  if (!data?.secure_url) {
    throw new Error('Cloudinary upload failed: missing secure_url');
  }

  return data.secure_url;
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      results[current] = await mapper(items[current], current);
    }
  });

  await Promise.all(workers);
  return results;
}
