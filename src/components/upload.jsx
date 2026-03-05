import { uploadFile } from "../queries/uploadQueries";
import { useEffect, useState } from "react";
import {
  getUploadState,
} from "../utils/uploadStorage";
import { cancelUpload } from "../utils/uploadMultipart";
import { listUploads, deleteUpload } from "../services/uploadService";

export default function Upload() {
  const [uploads, setUploads] = useState([]);
  const [completedFiles, setCompletedFiles] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // fetch data effect
  useEffect(() => {
    const fetchUploads = async () => {
      try {
        const data = await listUploads(currentPage);
        setCompletedFiles(data.results);
        setTotalPages(Math.ceil(data.count / 10));
      } catch (err) {
        console.error("Failed to fetch uploads:", err);
      }
    };
    fetchUploads();
  }, [currentPage]);

  // upload progress listeners
  useEffect(() => {

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

    const cancelAllHandler = () => {
      setUploads([]);
    };

    window.addEventListener("upload-progress", handler);
    window.addEventListener("upload-cancelled-all", cancelAllHandler);

    return () => {
      window.removeEventListener("upload-progress", handler);
      window.removeEventListener("upload-cancelled-all", cancelAllHandler);
    };

  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this file?')) return;
    try {
      await deleteUpload(id);
      const data = await listUploads(currentPage);
      setCompletedFiles(data.results);
      setTotalPages(Math.ceil(data.count / 10));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // 📁 File selection
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;
    
    // Immediately add to uploads UI
    selectedFiles.forEach(file => {
      setUploads(prev => {
        if (prev.find(u => u.fileName === file.name)) return prev;
        return [...prev, {
          fileName: file.name,
          uploadedCount: 0,
          totalParts: Math.ceil(file.size / (file.size < 100 * 1024 * 1024 ? 5 * 1024 * 1024 : file.size < 1024 * 1024 * 1024 ? 10 * 1024 * 1024 : 20 * 1024 * 1024))
        }];
      });
    });
    
    // Auto-upload all selected files
    selectedFiles.forEach(file => {
      const saved = getUploadState(file.name);
      const payload = saved 
        ? {file, uploadId: saved.upload_id, isResume: true, key: saved.key} 
        : {file, isResume: false};
      uploadFile(payload).catch(err => console.error('Upload failed:', err));
    });
    
    e.target.value = ''; // Reset input to allow re-selecting same file
  };





  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Google Drive Style New Button */}
      <div className="mb-8">
        <label htmlFor="file-upload" className="inline-flex items-center gap-3 bg-white hover:bg-gray-50 shadow-md hover:shadow-lg transition-all px-6 py-3 rounded-full cursor-pointer border border-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-plus" viewBox="0 0 16 16">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
          </svg>
          <span className="font-medium text-gray-700">New</span>
          <input 
            id="file-upload" 
            type="file" 
            className="hidden" 
            multiple
            onChange={handleFileChange} 
            accept=".mp4,.mkv" 
          />
        </label>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">My Drive</h2>
        
        {completedFiles.length === 0 ? (
          <p className="text-gray-600">No files uploaded yet</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {completedFiles.map((file) => (
                    <tr key={file.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{file.file_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(file.file_size / (1024 * 1024)).toFixed(2)} MB
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(file.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 mr-4">View</a>
                        <button onClick={() => handleDelete(file.id)} className="text-red-600 hover:text-red-800">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Upload Progress Card (Bottom Right) */}
      {uploads.length > 0 && (
        <div className="fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-2xl border border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">
              Uploading {uploads.length} item{uploads.length > 1 ? 's' : ''}
            </h3>
            <button
              onClick={() => cancelUpload()}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Cancel all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Upload Items */}
          <div className="max-h-80 overflow-y-auto">
            {uploads.map((u) => {
              const percent = Math.round((u.uploadedCount / u.totalParts) * 100);
              const isComplete = percent === 100;

              return (
                <div key={u.fileName} className="px-4 py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-start gap-3">
                    {/* File Icon */}
                    <div className="flex-shrink-0 mt-1">
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate" title={u.fileName}>
                        {u.fileName}
                      </p>
                      
                      {/* Progress Bar */}
                      {!isComplete && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div
                              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{percent}%</p>
                        </div>
                      )}

                      {isComplete && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Complete
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
