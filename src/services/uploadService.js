import api from "../api/axiosClient";

// Step 1: get presigned URL
export async function getUploadUrl(file) {
  console.log("while fetching uploading URL then the file type is: ", file.name, file.type);
  const res = await api.post("/upload-url/", {
    file_name: file.name,
    content_type: file.type,
  });
  return res.data;
}

// Step 2: upload file to S3
export async function uploadToS3(uploadUrl, file) {
  console.log("while uploading file on s3 then the file is: ", file.type);
  await fetch(uploadUrl, {
    method: "PUT",
    // headers: {
    //   "Content-Type": file.type,
    // },
    body: file,
  });
}

// Step 3: save metadata
export async function saveFileMetadata(data) {
  const res = await api.post("/files/", data);
  return res.data;
}

export async function initiateUpload(file) {
  const res = await api.post("/upload/init/", {
    file_name: file.name,
  });
  return res.data;
}

export async function getPartUploadUrl(data) {
  const res = await api.post("/upload/part-url/", data);
  return res.data;
}

export async function completeUpload(data) {
  const res = await api.post("/upload/complete/", data);
  return res.data;
}
