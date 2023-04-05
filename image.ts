import {
  ImageMagick,
  IMagickImage,
  initializeImageMagick,
  MagickFormat,
} from "imagemagick";

await initializeImageMagick(); // make sure to initialize first!

export const optimizeImage = async (image: File) => {
  const bufar = await image.arrayBuffer();
  const data = new Uint8Array(bufar);
  let optImgData = new Uint8Array();

  ImageMagick.read(data, (img: IMagickImage) => {
    img.resize(720, 720);
    img.write((data: Uint8Array) => {
      optImgData = data;
    }, MagickFormat.Jpeg);
  });

  const optimizedImage = new File([optImgData], image.name, {
    type: "image/jpeg",
  });

  return optimizedImage;
};
