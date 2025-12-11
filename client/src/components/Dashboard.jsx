import axios from "axios";
import { useState, useEffect } from "react";
import PdfEditor from "./PdfEditor";

function Dashboard() {
    const [File, setFile] = useState(null);
    const [message, setMessage] = useState(null);
    const [uploadedPdfs, setUploadedPdfs] = useState([]);

    useEffect(() => {
        getUploadedPdfs();
    }, []);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) {
            setMessage("Please select a PDF file.");
            return;
        }
        setFile(file);
    };

    const handleUpload = async () => {
        if (!File) {
            setMessage("No file selected for upload.");
            return;
        }

        const formData = new FormData();
        formData.append("pdfFile", File);

        try {
            const response = await axios.post("api/pdf/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            console.log("Upload response:", response.data);
            const responseData = response.data;
            const documentId = responseData.documentId;
            const fileHash = responseData.fileHash;
            if (response.status === 200) {
                setMessage("File uploaded successfully!");
                setFile(null);
            } else {
                setMessage("File upload failed.");
            }
        } catch (error) {
            setMessage("An error occurred during file upload.");
            console.error("Upload error:", error);
        }
    };

    const getUploadedPdfs = async () => {
        console.log("Fetching uploaded PDFs..");
        try {
            const response = await axios.get("/api/pdf/list");
            setUploadedPdfs(response.data);
        } catch (error) {
            console.error("Error fetching uploaded PDFs:", error);
            return [];
        }
    };

    return (
    <div>
        <h1>Welcome to the Signature Injection Engine Dashboard!</h1>
        <p>Select a PDF file to upload and inject a digital signature.</p>
        <div id="upload-pdf-section">
            <h2>Upload PDF for Signature Injection</h2>
            <input type="file" accept="application/pdf" onChange={handleFileChange} />
            <button onClick={handleUpload} disabled={!File}>Upload</button>
            <p>{message}</p>
        </div>
        <PdfEditor />
        <div id="uploaded-pdf-list-section">
            <h2>Uploaded PDFs</h2>
            <form id="uploaded-pdf-list-form">
                <ul>
                    {uploadedPdfs.map((pdf) => (
                        <li key={pdf._id}>
                            <span className="pdf-file-name">{pdf.fileName} - <i>Uploaded on: {new Date(pdf.uploadDate).toLocaleString()}</i></span>
                            <span className="edit-pdf" data-id={pdf._id}>Edit</span>
                        </li>
                    ))}
                </ul>
            </form>
        </div>
    </div>
  )
}

export default Dashboard