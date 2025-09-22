/* eslint-disable no-console */
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import path from 'path';
import config from '../../config';

const accessKey = config.do_space.access_key;
const bucket = config.do_space.bucket;
const endpoints = config.do_space.endpoints;
const secretKey = config.do_space.secret_key;
interface UploadResponse {
  Location: string;
}

const s3Client = new S3Client({
  region: 'us-east-1', // Set any valid region
  endpoint: `${endpoints}`,
  credentials: {
    accessKeyId: `${accessKey}`,
    secretAccessKey: `${secretKey}`,
  },
});

export const uploadToDigitalOceanAWS = async (
  file: Express.Multer.File,
): Promise<UploadResponse> => {
  try {

    if (!file || !file.originalname) {
      throw new Error('No file provided or missing originalname');
    }

    // Generate unique filename
    const filename =
      Date.now() +
      '-' +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    // Prepare upload command
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: filename,
      Body: file.buffer, // memoryStorage buffer
      ACL: 'public-read',
      ContentType: file.mimetype,
    });

    // Upload to DigitalOcean
    await s3Client.send(command);

    // Construct public URL
    const Location = `${endpoints}/${bucket}/${filename}`;
    return { Location };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export const deleteFromDigitalOceanAWS = async (
  fileUrl: string,
): Promise<void> => {
  try {
    // Extract the file key from the URL
    const key = fileUrl.replace(
      `${process.env.DO_SPACE_ENDPOINT}/${bucket}/`,
      '',
    );

    // Prepare the delete command
    const command = new DeleteObjectCommand({
      Bucket: `${bucket}`,
      Key: key,
    });

    // Execute the delete command
    await s3Client.send(command);

    console.log(`Successfully deleted file: ${fileUrl}`);
  } catch (error: any) {
    console.error(`Error deleting file: ${fileUrl}`, error);
    throw new Error(`Failed to delete file: ${error?.message}`);
  }
};
