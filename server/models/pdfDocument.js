import mongoose from "mongoose";

const pdfDocumentSchema = new mongoose.Schema({
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileHash: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now }
});

const PdfDocument = mongoose.model("PdfDocument", pdfDocumentSchema);

export default PdfDocument;
