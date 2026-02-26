import { useMultipartUpload } from "../queries/uploadQueries";
import { useEffect, useState } from "react";
import {
  getAllUploads,
  getUploadState,
} from "../utils/uploadStorage";
import { cancelUpload } from "../utils/uploadMultipart";

export default function Upload() {
  const { mutateAsync, isPending } = useMultipartUpload();

  const [file, setFile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [queueCount, setQueueCount] = useState(0);
  // 🔍 Detect incomplete uploads (on load + live updates)
  useEffect(() => {
    const onQueued = () => {
      setQueueCount((prev) => prev + 1);
    };

    const onStarted = () => {
      setQueueCount((prev) => Math.max(prev - 1, 0));
    };

    window.addEventListener("upload-queued", onQueued);
    window.addEventListener("upload-started", onStarted);

    return () => {
      window.removeEventListener("upload-queued", onQueued);
      window.removeEventListener("upload-started", onStarted);
    };
  }, []);

  useEffect(() => {
    const loadUploads = () => {
      const uploads = getAllUploads();

      if (uploads.length > 0) {
        const u = uploads[0];

        if (u.uploadedCount < u.totalParts) {
          setResumeData(u);
        }
      }
    };

    loadUploads();

    // 🔥 listen for live progress updates
    const handler = (e) => {
      const { fileName, uploadedCount, totalParts } = e.detail;

      const saved = getUploadState(fileName);

      setUploads((prev) => {
        const existing = prev.find((u) => u.fileName === fileName);

        const newData = {
          fileName,
          upload_id: saved?.upload_id,
          key: saved?.key,
          uploadedCount,
          totalParts,
        };

        if (existing) {
          return prev.map((u) =>
            u.fileName === fileName ? newData : u
          );
        }

        return [...prev, newData];
      });
    };

    window.addEventListener("upload-progress", handler);

    return () => {
      window.removeEventListener("upload-progress", handler);
    };
  }, []);

  // 📁 File selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
  };



  // 🚀 Upload / Resume
  const handleUpload = async () => {
    if (!file) return;

    const saved = getUploadState(file.name);

    const payload = saved ? {file, uploadId: saved.upload_id, isResume: true, key: saved.key} : {file, isResume: false};

    mutateAsync(payload); // no await → background upload

    setFile(null); // allow next file
  };
  console.log("Current uploads in progress:", isPending);
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-8">
      

      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Upload Video</h2>
        {uploads.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2">
              Uploading {uploads.length} file(s)
            </h3>

            {uploads.map((u) => {
              const percent = Math.round(
                (u.uploadedCount / u.totalParts) * 100
              );

              return (
                <div key={u.fileName} className="mb-2">
                  <p className="text-xs">{u.fileName}</p>
                  <div className="w-full bg-gray-200 h-2 rounded">
                    <div
                      className="bg-blue-600 h-2 rounded"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-xs">{percent}%</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Resume UI */}
        {resumeData && (
          <div className="bg-yellow-100 p-3 rounded text-gray-600 mb-4">
            <p>
              Incomplete upload: {resumeData.uploadedCount}/
              {resumeData.totalParts}
            </p>

            <p className="text-sm">
              {Math.round(
                (resumeData.uploadedCount / resumeData.totalParts) * 100
              )}
              % uploaded
            </p>
            <div className="w-full bg-gray-200 h-2 rounded">
              <div
                className="bg-blue-600 h-2 rounded"
                style={{
                  width: `${(resumeData.uploadedCount / resumeData.totalParts) * 100}%`,
                }}
              />
            </div>
          </div>
        )}


        <div className="flex items-center justify-center w-full text-gray-800">
          <label 
            htmlFor="dropzone-file" 
            className="flex flex-col items-center justify-center w-full bg-neutral-secondary-medium border border-dashed border-default-strong rounded-lg cursor-pointer hover:bg-neutral-tertiary-medium p-8"
          >
            <div className="flex flex-col items-center justify-center text-body pt-5 pb-6">
              {/* Icon: You can change the icon if a file is attached */}
              <svg className={`w-8 h-8 mb-4 ${file ? 'text-green-500' : ''}`} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h3a3 3 0 0 0 0-6h-.025a5.56 5.56 0 0 0 .025-.5A5.5 5.5 0 0 0 7.207 9.021C7.137 9.017 7.071 9 7 9a4 4 0 1 0 0 8h2.167M12 19v-9m0 0-2 2m2-2 2 2"/>
              </svg>

              {/* Dynamic Text Logic */}
              {file ? (
                <>
                  <p className="mb-2 text-sm font-bold text-primary">Selected File:</p>
                  <p className="text-sm italic">{file.name}</p>
                  <p className="mt-2 text-xs text-gray-500">Click to change file</p>
                </>
              ) : (
                <>
                  <p className="mb-2 text-sm">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs">MP4 or MKV (MAX. 500MB)</p>
                </>
              )}
            </div>
            
            <input 
              id="dropzone-file" 
              name="file" 
              type="file" 
              className="hidden" 
              multiple={true}
              onChange={handleFileChange} 
              accept=".mp4,.mkv" 
            />
          </label>
        </div>
        <button
          onClick={cancelUpload}
          className="mt-2 !bg-white border !border-gray-800 text-gray-800 px-4 py-2 rounded"
          disabled={!isPending}
        >
          Cancel Upload
        </button>
        <button
          onClick={handleUpload}
          disabled={!file}
          className="mt-4 ms-4 bg-blue-600 text-white px-4 py-2 rounded"
        >
          {isPending ? "Uploading..." : "Upload"}
        </button>
        

      </div>
    </div>
  );
}
