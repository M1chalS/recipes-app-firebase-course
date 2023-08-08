import {v4 as uuidv4} from 'uuid';
import {useEffect, useRef, useState} from "react";
import {deleteFile, uploadFile} from "../FirebaseConfig.js";

export default function ImageUploadPreview({basePath, existingImageUrl, handleUploadCancel, handleUploadFinish}) {
    const [uploadProgress, setUploadProgress] = useState(-1);
    const [imageUrl, setImageUrl] = useState("");

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (existingImageUrl) {
            setImageUrl(existingImageUrl);
        } else {
            setUploadProgress(-1);
            setImageUrl("");
            fileInputRef.current.value = "";
        }
    }, [existingImageUrl]);

    const handleFileChanged = async (event) => {
        const files = event.target.files;
        const file = files[0];

        if (!file) {
            alert("No file selected");
            return;
        }

        const generatedFileId = uuidv4();

        try {
            const downloadUrl = await uploadFile(file, `${basePath}/${generatedFileId}`, setUploadProgress);
            setImageUrl(downloadUrl);
            handleUploadFinish(downloadUrl);
        } catch (error) {
            setUploadProgress(-1);
            fileInputRef.current.value = null;
            alert("Error uploading file: " + error.message);
            throw error;
        }
    }

    const handleCancelImageClick = () => {
        deleteFile(imageUrl);
        fileInputRef.current.value = null;
        setImageUrl("");
        setUploadProgress(-1);
        handleUploadCancel();
    }

    return <div className="image-upload-preview-container">
        <input
            type="file"
            accept="image/*"
            onChange={handleFileChanged}
            ref={fileInputRef}
            hidden={uploadProgress > -1 || imageUrl}
        />
        {!imageUrl && uploadProgress > -1 ? (
            <div>
                <label htmlFor="file">Upload Progress:</label>
                <progress id="file" value={uploadProgress} max="100">
                    {uploadProgress}%
                </progress>
                <span>{uploadProgress}%</span>
            </div>
        ) : null}
        {imageUrl ? (
            <div className="image-preview">
                <img src={imageUrl} alt={imageUrl} className="image" />
                <button
                    type="button"
                    onClick={handleCancelImageClick}
                    className="primary-button"
                >
                    Cancel Image
                </button>
            </div>
        ) : null}
    </div>
}