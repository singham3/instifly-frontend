import {
  initiateUpload,
  completeUpload,
} from "../services/uploadService";
import { uploadFileMultipart, getFileHash } from "../utils/uploadMultipart";
import { addToQueue } from "../utils/uploadQueue";

export async function uploadFile({ file, uploadId, isResume, key }) {
  const fileHash = await getFileHash(file);

  let finalUploadId = uploadId;
  let finalKey = key;

  if (!isResume) {
    const res = await initiateUpload({
      file_name: file.name,
      content_type: file.type,
      file_size: file.size,
      file_hash: fileHash,
    });

    finalUploadId = res.upload_id;
    finalKey = res.key;
  }

  return new Promise((resolve, reject) => {
    addToQueue(async () => {
      try {
        const parts = await uploadFileMultipart(file, finalUploadId, finalKey);

        const res = await completeUpload({
          key: finalKey,
          upload_id: finalUploadId,
          parts,
        });

        resolve(res.file_url);
      } catch (err) {
        reject(err);
      }
    });
  });
}
