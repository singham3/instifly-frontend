import { getMultiplePartUploadUrl, listUploadedParts } from "../services/uploadService";
import { retry } from "./retry";
import {
  saveUploadState,
  getUploadState,
  clearUploadState,
} from "./uploadStorage";
const getChunkSize = (fileSize) => {
        if (fileSize < 100 * 1024 * 1024) return 5 * 1024 * 1024;
        if (fileSize < 1024 * 1024 * 1024) return 10 * 1024 * 1024;
        return 20 * 1024 * 1024;
    };
let isPaused = false;

export function pauseUpload() {
  isPaused = true;
}

export function resumeUpload() {
  isPaused = false;
}
let abortController = null
export function cancelUpload() {
    if (abortController) {
        abortController.abort();
        window.dispatchEvent(new CustomEvent("upload-cancelled"));
    }
} 
export async function getFileHash(file) {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function uploadFileMultipart(file, uploadId, key) {
    const CHUNK_SIZE = getChunkSize(file.size);
    abortController = new AbortController();

    let uploadedParts = [];

    const saved = getUploadState(file.name);

    if (saved && saved.upload_id === uploadId) {
        try {
            const res = await listUploadedParts({
                key,
                upload_id: uploadId,
            });

            uploadedParts = res.parts || [];
            console.log("Resuming upload:", uploadedParts);
        } catch (err) {
            console.log("Failed to fetch uploaded parts, resuming with local state", err);
            uploadedParts = saved.parts || [];
        }
    }

    const parts = [...uploadedParts];
    const totalParts = Math.ceil(file.size / CHUNK_SIZE);

    const uploadPart = async (partNumber) => {
        if (parts.find((p) => p.PartNumber === partNumber)) return;

        const url = urlMap[partNumber]; // ✅ use pre-fetched URL

        const start = (partNumber - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const blob = file.slice(start, end);

        const res = await retry(() =>
            fetch(url, {
                method: "PUT",
                body: blob,
                signal: abortController.signal,
            })
        );

        if (!res.ok) {
            throw new Error(`Upload failed part ${partNumber}`);
        }

        const etag = res.headers.get("ETag");

        const part = {
            ETag: etag.replaceAll('"', ""),
            PartNumber: partNumber,
        };

        parts.push(part);

        saveUploadState(file.name, {
            upload_id: uploadId,
            key,
            parts,
            totalParts,
            uploadedCount: parts.length,
        });

        window.dispatchEvent(
            new CustomEvent("upload-progress", {
                detail: {
                    fileName: file.name,
                    uploadedCount: parts.length,
                    totalParts,
                },
            })
        );
    };


    const concurrency = Math.min(navigator.hardwareConcurrency || 4, 6);

    let current = 1;

    async function worker() {
        while (current <= totalParts) {
            if (isPaused) {
                await new Promise(res => setTimeout(res, 500));
                continue;
            }

            const partNumber = current++;
            await uploadPart(partNumber);
        }
    }
    // 🔥 generate all remaining part numbers
    const remainingParts = [];
    for (let i = 1; i <= totalParts; i++) {
        if (!parts.find(p => p.PartNumber === i)) {
            remainingParts.push(i);
        }
    }

    // 🔥 fetch all URLs in one API call
    const { urls } = await getMultiplePartUploadUrl({
        key,
        upload_id: uploadId,
        part_numbers: remainingParts,
    });

    // 🔥 convert to map for fast lookup
    const urlMap = {};
    urls.forEach(u => {
        urlMap[u.part_number] = u.url;
    });

    await Promise.all(Array(concurrency).fill(0).map(worker));

    if (!abortController?.signal.aborted) {
        clearUploadState(file.name);
    }
    return parts.sort((a, b) => a.PartNumber - b.PartNumber);
}
