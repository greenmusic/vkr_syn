import multer from "multer";

/** Картинка в память: аватар (2 МБ) или фон доски (4 МБ). */
export const imageUpload = (maxBytes) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes },
    fileFilter: (req, file, callback) =>
      callback(null, file.mimetype.startsWith("image/")),
  });

export const fileToDataUrl = (file) =>
  `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
