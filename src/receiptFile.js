export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Não foi possível ler o arquivo.'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

export function dataUrlToBytes(dataUrl) {
  const [, base64 = ''] = String(dataUrl).split(',');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function extensionForMime(mimeType = '') {
  const map = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif'
  };
  return map[mimeType] || 'bin';
}

export async function optimizeForAnalysis(file) {
  if (!file.type.startsWith('image/')) {
    if (file.size > 3000000) throw new Error('PDF acima de 3 MB. Reduza o arquivo ou registre manualmente.');
    return { dataUrl: await fileToDataUrl(file), mimeType: file.type, originalName: file.name };
  }

  const source = await fileToDataUrl(file);
  const image = new Image();
  image.src = source;
  await image.decode();
  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
  if (dataUrl.length > 4000000) throw new Error('A imagem continua grande demais após a otimização. Tente recortar a foto ou registre manualmente.');
  return { dataUrl, mimeType: 'image/jpeg', originalName: file.name };
}
