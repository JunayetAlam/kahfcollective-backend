import fs from 'fs';
import path from 'path';

const baseUploadDir = path.join(__dirname, '..', 'upload');

const getSubFolder = (mimetype: string): string => {
  if (mimetype.startsWith('image/')) return 'images';
  if (mimetype.startsWith('video/')) return 'videos';
  if (mimetype === 'application/pdf') return 'pdfs';
  if (
    mimetype === 'application/msword' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) return 'docs';
  return 'others';
};

const normalizePath = (filePath: string) => filePath.replace(/\\/g, '/');

const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

export const deleteFile = (relPath: string): boolean => {
  const filePath = path.join(__dirname, '..', relPath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
};

export const uploadSingleFile = (file: Express.Multer.File): string => {
 
  const subFolder = getSubFolder(file.mimetype);
  const folderPath = path.join(baseUploadDir, subFolder);
  const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);

  ensureDirectoryExists(folderPath);

  const filePath = path.join(folderPath, filename);
  fs.writeFileSync(filePath, file.buffer);

  const relPath = path.join('upload', subFolder, filename);
  return `/${normalizePath(relPath)}`;
};

export const uploadFiles = (files: Express.Multer.File[]): string[] => {
  const keptFiles: string[] = [];

  for (const file of files) {
    const subFolder = getSubFolder(file.mimetype);
    const folderPath = path.join(baseUploadDir, subFolder);
    const existingFiles = fs.readdirSync(folderPath);

    const isDuplicate = existingFiles.some((f) =>
      f.toLowerCase() === file.originalname.toLowerCase()
    );

    if (isDuplicate) {
      fs.unlinkSync(file.path);
    } else {
      const relPath = path.join('upload', subFolder, file.filename);
      keptFiles.push(`/${normalizePath(relPath)}`);
    }
  }

  return keptFiles;
};

export const deleteFiles = (filePaths: string[]): string[] => {
  return filePaths.filter(relPath => deleteFile(relPath));
};

export const updateSingleFile = (
  oldFilePath: string,
  newFile: Express.Multer.File
): string => {
  deleteFile(oldFilePath);
  return uploadSingleFile(newFile);
};

export const updateFiles = (
  oldPaths: string[],
  newFiles: Express.Multer.File[]
): { deleted: string[]; saved: string[] } => {
  const deleted = deleteFiles(oldPaths);
  const saved = uploadFiles(newFiles);
  return { deleted, saved };
};