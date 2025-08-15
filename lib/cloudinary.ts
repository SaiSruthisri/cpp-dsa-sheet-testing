import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function uploadAvatar(filePath: string, userId: string) {
  return cloudinary.uploader.upload(filePath, {
    folder: `users/${userId}`,
    public_id: "avatar",
    overwrite: true,
    resource_type: "image",
    transformation: [
      { width: 256, height: 256, crop: "fill", gravity: "face" },
      { fetch_format: "auto", quality: "auto" },
    ],
  });
}

export function deleteAvatarByPublicId(publicId: string) {
  return cloudinary.uploader.destroy(publicId);
}

export { cloudinary };