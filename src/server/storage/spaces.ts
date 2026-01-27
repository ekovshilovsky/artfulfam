import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/env";

const spacesClient = new S3Client({
  region: env.DO_SPACES_REGION,
  endpoint: env.DO_SPACES_ENDPOINT,
  credentials: {
    accessKeyId: env.DO_SPACES_KEY,
    secretAccessKey: env.DO_SPACES_SECRET,
  },
});

const baseUrl = env.DO_SPACES_PUBLIC_BASE_URL.replace(/\/$/, "");

export const buildSpacesPublicUrl = (key: string) => `${baseUrl}/${key}`;

export const createSpacesUploadUrl = async (input: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}) => {
  const command = new PutObjectCommand({
    Bucket: env.DO_SPACES_BUCKET,
    Key: input.key,
    ContentType: input.contentType,
  });

  return getSignedUrl(spacesClient, command, {
    expiresIn: input.expiresInSeconds ?? 300,
  });
};
