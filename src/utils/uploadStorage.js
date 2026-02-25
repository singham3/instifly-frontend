export function saveUploadState(fileName, data) {
  localStorage.setItem(`upload_${fileName}`, JSON.stringify(data));
}

export function getUploadState(fileName) {
  const data = localStorage.getItem(`upload_${fileName}`);
  return data ? JSON.parse(data) : null;
}

export function clearUploadState(fileName) {
  localStorage.removeItem(`upload_${fileName}`);
}
