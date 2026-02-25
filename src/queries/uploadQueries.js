import { useMutation } from "@tanstack/react-query";
import {
  initiateUpload,
  completeUpload,
} from "../services/uploadService";
import { uploadFileMultipart } from "../utils/uploadMultipart";

export function useMultipartUpload() {
  return useMutation({
    mutationFn: async (file) => {
      // 1. INIT
      const { upload_id } = await initiateUpload(file);

      // 2. UPLOAD PARTS
      const parts = await uploadFileMultipart(file, upload_id);

      // 3. COMPLETE
      const res = await completeUpload({
        file_name: file.name,
        upload_id,
        parts,
      });

      return res.file_url;
    },
  });
}
