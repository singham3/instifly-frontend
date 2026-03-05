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
const uploadStates = new Map();
const abortControllers = new Map();

export function pauseUpload(fileName) {
  const state = uploadStates.get(fileName);
  if (state) state.isPaused = true;
}

export function resumeUpload(fileName) {
  const state = uploadStates.get(fileName);
  if (state) state.isPaused = false;
}

export function cancelUpload(fileName) {
    console.log("Cancelling upload:", fileName);
    console.log("Active controllers:", abortControllers.size);
  if (fileName) {
    const controller = abortControllers.get(fileName);
    console.log("Abort controller found: ", controller);
    if (controller) {
      controller.abort();
      clearUploadState(fileName);
      window.dispatchEvent(new CustomEvent("upload-cancelled", { detail: { fileName } }));
    }
  } else {
    // Cancel all uploads
    abortControllers.forEach((controller, name) => {
      controller.abort();
      clearUploadState(name);
    });
    console.log("All uploads cancelled");
    abortControllers.clear();
    uploadStates.clear();
    window.dispatchEvent(new CustomEvent("upload-cancelled-all"));
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
    
    const abortController = new AbortController();
    abortControllers.set(file.name, abortController);
    
    uploadStates.set(file.name, { isPaused: false });

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
            console.log("Failed to fetch uploaded parts, starting fresh", err);
            clearUploadState(file.name);
            uploadedParts = [];
        }
    }

    const parts = [...uploadedParts];
    const totalParts = Math.ceil(file.size / CHUNK_SIZE);

    const remainingParts = [];
    for (let i = 1; i <= totalParts; i++) {
        if (!parts.find(p => p.PartNumber === i)) {
            remainingParts.push(i);
        }
    }

    const { urls } = await getMultiplePartUploadUrl({
        key,
        upload_id: uploadId,
        part_numbers: remainingParts,
    });

    const urlMap = {};
    urls.forEach(u => {
        urlMap[u.part_number] = u.url;
    });

    const uploadPart = async (partNumber) => {
        if (parts.find((p) => p.PartNumber === partNumber)) return;

        const url = urlMap[partNumber];

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
            if (abortController.signal.aborted) return;
            
            const state = uploadStates.get(file.name);
            if (state?.isPaused) {
                await new Promise(res => setTimeout(res, 500));
                continue;
            }

            const partNumber = current++;
            try {
                await uploadPart(partNumber);
            } catch (err) {
                if (err.name === 'AbortError') return;
                throw err;
            }
        }
    }

    try {
        await Promise.all(Array(concurrency).fill(0).map(worker));
    } catch (err) {
        if (err.name === 'AbortError') {
            console.log('Upload cancelled:', file.name);
            return [];
        }
        throw err;
    }

    if (!abortController?.signal.aborted) {
        clearUploadState(file.name);
    }
    
    uploadStates.delete(file.name);
    abortControllers.delete(file.name);
    
    return parts.sort((a, b) => a.PartNumber - b.PartNumber);
}
