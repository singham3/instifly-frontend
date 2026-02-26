const PREFIX = "upload_";

export function saveUploadState(fileName, data) {
  localStorage.setItem(`${PREFIX}${fileName}`, JSON.stringify(data));
}

export function getUploadState(fileName) {
  const data = localStorage.getItem(`${PREFIX}${fileName}`);
  return data ? JSON.parse(data) : null;
}

export function clearUploadState(fileName) {
  localStorage.removeItem(`${PREFIX}${fileName}`);
}

export function getAllUploads() {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith(PREFIX))
    .map((key) => ({
      fileName: key.replace(PREFIX, ""),
      ...JSON.parse(localStorage.getItem(key)),
    }));
}
