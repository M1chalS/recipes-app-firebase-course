import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import {deleteObject, getDownloadURL, getStorage, ref, uploadBytesResumable} from 'firebase/storage';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID,
    measurementId: import.meta.env.VITE_MEASUREMENT_ID
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export const storage = getStorage(app);

export const uploadFile = async (file, fullFilePath, progressCallback) => {
    const storageRef = ref(storage, fullFilePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on("state_changed", (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            progressCallback(progress);
        },
        (error) => {
            alert(error.message);
            throw error;
        }
    );

    return uploadTask.then(() => {
        return getDownloadURL(uploadTask.snapshot.ref);
    });
}

export const deleteFile = async (fileDownloadUrl) => {
    const decodedUrl = decodeURIComponent(fileDownloadUrl);
    const startIndex = decodedUrl.indexOf("/o/") + 3;
    const endIndex = decodedUrl.indexOf("?");
    const filePath = decodedUrl.substring(startIndex, endIndex);

    const fileRef = ref(storage, filePath);
    return deleteObject(fileRef);
}