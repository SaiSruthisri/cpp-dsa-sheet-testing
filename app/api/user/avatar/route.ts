import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/db/config";
import { User } from "@/models/User.model";
import jwt from "jsonwebtoken";
import { uploadAvatar, deleteAvatarByPublicId } from "@/lib/cloudinary";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

async function parseFormDataToTempFile(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    throw new Error("No file uploaded");
  }
  const blob = file as File;
  const buffer = Buffer.from(await blob.arrayBuffer());
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-"));
  const tmpPath = path.join(tmpDir, blob.name || "avatar");
  await fs.writeFile(tmpPath, buffer);
  return { tmpPath };
}

function getUserIdFromRequest(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    return decoded.id;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    await connect();
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { tmpPath } = await parseFormDataToTempFile(req);

    // Basic validation by extension and size is already enforced by browser; still optional
    const result = await uploadAvatar(tmpPath, userId);

    // Cleanup temp file
    try { await fs.unlink(tmpPath); } catch {}

    // Persist URL and public_id
    const avatarUrl = result.secure_url;
    const publicId = result.public_id;

    await User.findByIdAndUpdate(userId, { avatar: avatarUrl }, { new: true });

    return NextResponse.json({ avatar: avatarUrl, publicId }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connect();
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Try to infer existing public id pattern users/{userId}/avatar
    const publicId = `users/${userId}/avatar`;
    await deleteAvatarByPublicId(publicId);

    await User.findByIdAndUpdate(userId, { avatar: null }, { new: true });

    return NextResponse.json({ avatar: null }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Delete failed" }, { status: 400 });
  }
}