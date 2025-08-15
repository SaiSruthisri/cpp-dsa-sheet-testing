import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/db/config";
import { User } from "@/models/User.model";
import jwt from "jsonwebtoken";

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

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const blob = file as File;
    const mimeType = blob.type || "";
    const size = (blob as any).size as number | undefined;

    if (!/^image\/(png|jpeg|jpg|webp)$/.test(mimeType)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    if (size && size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    await User.findByIdAndUpdate(userId, { avatar: dataUrl }, { new: true });

    return NextResponse.json({ avatar: dataUrl }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connect();
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await User.findByIdAndUpdate(userId, { avatar: null }, { new: true });

    return NextResponse.json({ avatar: null }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Delete failed" }, { status: 400 });
  }
}