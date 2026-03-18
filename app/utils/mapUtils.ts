// src/app/utils/mapUtils.ts

export const getProcessedImageData = async (url: string, flip: boolean): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No canvas context');
      if (flip) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.onerror = reject;
    img.src = url;
  });
};

export async function getCoordinates(cityName: string): Promise<[number, number]> {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${cityName}&limit=1`);
  const data = await res.json();
  if (data && data.length > 0) return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
  throw new Error(`Lokasi "${cityName}" tidak ditemukan!`);
}