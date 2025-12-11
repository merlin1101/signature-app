import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import pdfUploadRoutes from "./routes/pdfUpload.js";
import path from "path";

// Load environment variables from .env file
// require('dotenv').config();

// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
const isProduction = process.env.NODE_ENV === 'production'
const appPort = isProduction ? 10000 : 5000;
const PORT = process.env.PORT || appPort;
const MONGO_URI = process.env.MONGO_URI;

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Database connected successfully!'))
.catch(err => console.error('Database connection error:', err));

app.post('/api/pdf/{*path}', pdfUploadRoutes);
app.get('/api/pdf/{*path}', pdfUploadRoutes);

// Basic route to check if server is running
app.get('/', (req, res) => {
    res.send('API Server is running for the PDF App.');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
