"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

export default function AvatarSettingsPage() {
  const [streak, setStreak] = useState(0);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get("/api/check-auth");
        setAvatar(res.data?.user?.avatar || null);
      } catch {}
    };
    load();
  }, []);

  const onUpload = async () => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5 MB)");
      return;
    }
    const form = new FormData();
    form.append("file", file);
    setUploading(true);
    try {
      const res = await axios.post("/api/user/avatar", form);
      setAvatar(res.data.avatar);
      toast.success("Avatar updated");
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  const onDelete = async () => {
    setUploading(true);
    try {
      await axios.delete("/api/user/avatar");
      setAvatar(null);
      toast.success("Avatar removed");
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Delete failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-background text-gray-900 dark:text-white px-6 py-28">
      <Navbar streak={streak} />
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Profile Picture</h1>
        <div className="flex items-center gap-6 mb-6">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
            {avatar ? (
              <Image src={avatar} alt="Avatar" width={96} height={96} />
            ) : (
              <Image src="/images/default-avatar.svg" alt="Default" width={96} height={96} />
            )}
          </div>
          <div className="flex-1">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm"
            />
            <div className="flex gap-3 mt-3">
              <button
                onClick={onUpload}
                disabled={!file || uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Save"}
              </button>
              <button
                onClick={onDelete}
                disabled={uploading}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
              >
                Remove photo
              </button>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500">Max 5 MB. Allowed: JPG, PNG, WEBP.</p>
      </div>
    </div>
  );
}