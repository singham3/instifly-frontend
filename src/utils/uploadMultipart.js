import { getPartUploadUrl } from "../services/uploadService";
import { retry } from "./retry";
import {
  saveUploadState,
  getUploadState,
  clearUploadState,
} from "./uploadStorage";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadFileMultipart(file, uploadId) {
    let uploadedParts = [];
    const saved = getUploadState(file.name);

    if (saved && saved.upload_id === uploadId) {
        uploadedParts = saved.parts || [];
    }

    const parts = [...uploadedParts];
    const totalParts = Math.ceil(file.size / CHUNK_SIZE);

    const uploadPart = async (partNumber) => {
        // ⛔ Skip if already uploaded (resume logic)
        if (parts.find(p => p.PartNumber === partNumber)) {
            return;
        }

        const start = (partNumber - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);

        const blob = file.slice(start, end);

        const { url } = await getPartUploadUrl({
            file_name: file.name,
            upload_id: uploadId,
            part_number: partNumber,
        });

        const res = await retry(() =>
            fetch(url, {
                method: "PUT",
                body: blob,
            })
        );
        if (res.ok) {
            const etag = res.headers.get("ETag");

            const part = {
                ETag: etag.replaceAll('"', ""),
                PartNumber: partNumber,
            };

            parts.push(part);

            // 💾 Save progress (resume)
            saveUploadState(file.name, {
                upload_id: uploadId,
                parts,
            });
        } else {
            throw new Error(`Failed to upload part ${partNumber}`);
        }

    };
    ;

    // 🔥 Parallel upload (limit concurrency)
    const concurrency = 4;
    let current = 1;

    async function worker() {
        while (current <= totalParts) {
            const partNumber = current++;
            await uploadPart(partNumber);
        }
    }

    await Promise.all(Array(concurrency).fill(0).map(worker));
    clearUploadState(file.name)
    return parts.sort((a, b) => a.PartNumber - b.PartNumber);
}
