import { useMultipartUpload } from "../queries/uploadQueries";
import { useState } from "react";

export default function Upload() {
  const { mutate, isPending } = useMultipartUpload();
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // ✅ Extension validation
    const allowedExtensions = [".mp4", ".mkv"];
    const fileName = selectedFile.name.toLowerCase();

    const isValidExtension = allowedExtensions.some(ext =>
      fileName.endsWith(ext)
    );

    if (!isValidExtension) {
      alert("Invalid file type");
      return;
    }

    // ✅ Size validation
    if (selectedFile.size > 500 * 1024 * 1024) {
      alert("File too large (max 500MB)");
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = () => {
    if (!file) return;

    mutate(file, {
      onSuccess: (url) => {
        console.log("Uploaded:", url);
        alert("Upload completed!");
      },
      onError: (err) => {
        console.error(err);
        alert("Upload failed");
      },
    });
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-8">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Upload Video</h2>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-center w-full text-gray-800">
            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full bg-neutral-secondary-medium border border-dashed border-default-strong rounded-lg cursor-pointer hover:bg-neutral-tertiary-medium p-8">
              <div className="flex flex-col items-center justify-center text-body pt-5 pb-6">
                <svg className="w-8 h-8 mb-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h3a3 3 0 0 0 0-6h-.025a5.56 5.56 0 0 0 .025-.5A5.5 5.5 0 0 0 7.207 9.021C7.137 9.017 7.071 9 7 9a4 4 0 1 0 0 8h2.167M12 19v-9m0 0-2 2m2-2 2 2"/></svg>
                <p className="mb-2 text-sm"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs">SVG, PNG, JPG or GIF (MAX. 800x400px)</p>
              </div>
              <input id="dropzone-file" name="file" type="file" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          <button
            onClick={handleUpload}
            disabled={isPending || !file}
            className="bg-blue-600 text-white py-2 px-4 rounded"
          >
            {isPending ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
