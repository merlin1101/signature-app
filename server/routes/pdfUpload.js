import express from "express";
import multer from "multer";
import fs from "fs";
import crypto from "crypto";
import path, { dirname } from "path";
import { PDFDocument, rgb } from "pdf-lib";
import pdfDocumentModel from "../models/pdfDocument.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post('/api/pdf/upload', upload.single('pdfFile'), async (req, res) => {
    const pdfFile = req.file;
    if (!pdfFile) {
        return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    try {
        // calculate sha-256 hash of the file
        const fileBuffer = fs.readFileSync(pdfFile.path);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        const hexHash = hashSum.digest('hex');

        // Save file info to database
        const newPdfDocument = new pdfDocumentModel({
            fileName: pdfFile.originalname,
            filePath: pdfFile.path,
            fileHash: hexHash,
            uploadDate: new Date()
        });
        await newPdfDocument.save();

        res.status(200).json({ message: 'File uploaded and processed successfully', documentId: newPdfDocument._id, fileHash: hexHash });
    } catch (error) {
        console.error("Error processing PDF file:", error);
        fs.unlinkSync(pdfFile.path); // remove the uploaded file in case of error
        return res.status(500).json({ error: 'An error occurred while processing the PDF file.' });
    }

    return res.json({ status: 'File uploaded successfully!', fileName: pdfFile.originalname });
});

router.get('/api/pdf/list', async (req, res) => {
    try {
        const pdfDocuments = await pdfDocumentModel.find().select('-__v').lean();
        
        return res.json(pdfDocuments);
    } catch (error) {
        console.error("Error fetching PDF list:", error);
        return res.status(500).json({ error: 'An error occurred while fetching the PDF list.' });
    }
});

router.post('/api/pdf/sign-pdf', async (req, res) => {
    const { pdfId, fieldsArray, signatureImageBase64 } = req.body;

    try {
        // Find the PDF document by ID
        const pdfDocument = await pdfDocumentModel.findById(pdfId);
        if (!pdfDocument) {
            return res.status(404).json({ error: 'PDF document not found.' });
        }

        // Load the PDF document
        const existingPdfBytes = fs.readFileSync(pdfDocument.filePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const firstPage = pdfDoc.getPage(0);

        for (const field of fieldsArray) {
            const pageHeight = firstPage.getHeight();
            const pdfY = pageHeight - field.y - field.height;

            if (field.type === 'text' || field.type === 'date' || field.type === 'radio') {
                // Draw text fields
                firstPage.drawText(field.value || '', {
                    x: field.x,
                    y: pdfY,
                    size: field.size ||12,
                    color: rgb(0, 0, 0),
                });
            } else if (field.type === 'signature') {
                // Decode the base64 signature image
                // const signatureImageBytes = Buffer.from(signatureImageBase64.split(',')[1], 'base64');
                // const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
                // const signatureDims = signatureImage.scale(1);
                let signatureImage; // Declare the image variable
                const base64Data = signatureImageBase64.split(','); // Split the prefix from the data
                const mimeType = base64Data[0]; // "data:image/png;base64" or "data:image/jpeg;base64"
                const base64EncodedString = base64Data[1]; // The actual image data

                // Convert the base64 string to a Node.js Buffer (this is correct for Node.js)
                const signatureImageBytes = Buffer.from(base64EncodedString, 'base64');

                // Check the MIME type dynamically and call the correct embed function
                if (mimeType.includes('image/png')) {
                    signatureImage = await pdfDoc.embedPng(signatureImageBytes);
                } else if (mimeType.includes('image/jpeg') || mimeType.includes('image/jpg')) {
                    signatureImage = await pdfDoc.embedJpg(signatureImageBytes);
                } else {
                    // Handle error if the format is neither PNG nor JPG
                    throw new Error('Unsupported image format provided: ' + mimeType);
                }

                const signatureDims = signatureImage.scale(1);

                firstPage.drawImage(signatureImage, {
                    x: field.x,
                    y: pdfY,
                    width: signatureDims.width,
                    height: signatureDims.height,
                });
            }
        }

        const modifiedPdfBytes = await pdfDoc.save();

        const signedFolder = path.join(dirname(pdfDocument.filePath), 'signed');
        if (!fs.existsSync(signedFolder)) {
            fs.mkdirSync(signedFolder);
        }

        const outputFilePath = path.join(signedFolder, `signed_${path.basename(pdfDocument.filePath)}`);
        fs.writeFileSync(outputFilePath, modifiedPdfBytes);
        res.status(200).json({ message: 'PDF signed successfully.', signedPdfPath: outputFilePath });
    } catch (error) {
        console.error("Error signing PDF:", error);
        return res.status(500).json({ error: 'An error occurred while signing the PDF.', details: error.message });
    }
});

export default router;