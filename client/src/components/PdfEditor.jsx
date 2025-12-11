import { useState, useRef, useEffect } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import samplePdf from "../assets/sample.pdf"
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Rnd } from "react-rnd";
import axios from "axios"

// Set the Global Worker source using the imported URL
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

const PdfEditor = () => {
    const pageNumber = 1
    const [totalPages, setTotalPages] = useState(1)
    const [fields, setFields] = useState([])
    const pageRef = useRef(null);

    const onPageLoadSuccess = (page) => {
        setTotalPages(page.numPages)
    }

    // Function to add a new field when a button is clicked
    const addField = (type) => {
        const newField = {
            id: Date.now(),
            type,
            x: 50, // Initial position
            y: 50,
            width: type === 'signature' || type === 'image' ? 120 : 150,
            height: type === 'radio' ? 20 : 30,
            value: '', // Value handled internally by the rendered input
        }
        setFields(prevFields => [...prevFields, newField])
    }

    const handleRndDragStop = (e, d, id) => {
        setFields(prevFields => 
            prevFields.map(field => field.id === id ? { ...field, x: d.x, y: d.y } : field)
        )
    }

    const handleRndResizeStop = (e, direction, ref, delta, position, id) => {
        setFields(prevFields => 
            prevFields.map(field => field.id === id ? {
                ...field,
                width: parseInt(ref.style.width),
                height: parseInt(ref.style.height),
                x: position.x,
                y: position.y,
            } : field)
        )
    }

    const handleValueChange = (e, id) => {
        // e.stopPropagation(); // Stop Rnd from grabbing the click event
        // setFields(prevFields => 
        //     prevFields.map(field => field.id === id ? { ...field, value: e.target.value } : field)
        // )
    }

    const handleInteraction = (e) => {
        e.stopPropagation(); // Prevents Rnd from blocking focus/clicks/checks
    }

    // Signature upload
    const [base64Image, setBase64Image] = useState(null);
    const hiddenFileInput = useRef(null);
    
      // Expose the base64 string to a parent component if needed
    //   useEffect(() => {
    //     if (onSignatureChange) {
    //       onSignatureChange(base64Image);
    //     }
    //   }, [base64Image, onSignatureChange]);
    
      const handleDivClick = () => {
        hiddenFileInput.current.click();
      };
    
      const handleFileChange = (event) => {
        const file = event.target.files?.[0];
    
        if (file && file.type.substring(0, 5) === "image") {
          // Initialize the FileReader
          const reader = new FileReader();
    
          // Define what happens once the file is read
          reader.onload = () => {
            // reader.result contains the Base64 string
            setBase64Image(reader.result);
          };
    
          // Read the image file as a Data URL (Base64 string)
          reader.readAsDataURL(file);
    
        } else {
          setBase64Image(null);
        }
      }

    // Function to handle the save operation and send data to backend
    const sendEditsToServer = async () => {
        if (!pageRef.current || fields.length === 0) {
            alert("No fields to save or PDF viewer not loaded.");
            return;
        }

        // CRUCIAL STEP: Calculate scaling ratio to match frontend pixels to actual PDF points (e.g., A4: 595w x 842h)
        const actualWidth = pageRef.current.clientWidth;
        const actualHeight = pageRef.current.clientHeight;
        const pdfWidth = 595.28; // Standard A4 width in PostScript points
        const pdfHeight = 841.89; // Standard A4 height in PostScript points

        const scaleX = pdfWidth / actualWidth; 
        const scaleY = pdfHeight / actualHeight;

        const scaledFields = fields.map(field => ({
            ...field,
            // Send scaled coordinates to the backend
            x: Math.round(field.x * scaleX),
            y: Math.round(field.y * scaleY),
            width: Math.round(field.width * scaleX),
            height: Math.round(field.height * scaleY),
        }));
        
        // Use a real PDF ID obtained from the initial upload process
        const actualPdfId = '6937ab754eb85586a508d3a4'; // Use a placeholder/hardcoded ID for assignment if needed

        try {
            // Send the entire payload to the backend endpoint:
            const response = await axios.post(`/api/pdf/sign-pdf`, { 
                pdfId: actualPdfId,
                fieldsArray: scaledFields, // Array of field objects with coordinates
                signatureImageBase64: base64Image // Base64 string of the signature image
            });
            alert(response.data.message + ` File saved at: ${response.data.outputPath}`);
        } catch (error) {
            console.error("Error saving edits:", error.response ? error.response.data : error.message);
            alert("Failed to save edits.");
        }
    }

    const FieldComponent = ({ field }) => {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* The drag handle area */}
                <div className="drag-handle" style={{ background: '#ddd', padding: '2px 5px', cursor: 'grab', fontSize: '10px', textAlign: 'center' }}>
                    Drag
                </div>
                
                {field.type === 'text' && 
                    <input type="text" placeholder="Text Box" onMouseDown={handleInteraction} onChange={(e) => handleValueChange(e, field.id)} style={{ flexGrow: 1, padding: '5px' }} />
                }
                {field.type === 'date' && 
                    <input type="date" onMouseDown={handleInteraction} onChange={(e) => handleValueChange(e, field.id)} style={{ flexGrow: 1, padding: '5px' }} />
                }
                {field.type === 'signature' && 
                    <div>
                        <div
        onMouseDown={handleDivClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed black',
          background: '#fff',
          height: '200px',
          width: '400px',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {base64Image ? (
          // Use the Base64 string as the image source
          <img
            src={base64Image}
            alt="Signature preview"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        ) : (
          <span style={{ color: '#555' }}>Click here to upload signature image</span>
        )}
      </div>

      <input
        type="file"
        ref={hiddenFileInput}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="image/*"
      />
                    </div>
                }
                {field.type === 'radio' && (
                    <div onMouseDown={handleInteraction} style={{ display: 'flex', alignItems: 'center', flexGrow: 1, paddingLeft: '5px' }}>
                        <input type="radio" name="radioGroup" id={`radio-${field.id}`} onClick={handleInteraction} />
                        <label htmlFor={`radio-${field.id}`} style={{marginLeft: '5px', fontSize: '12px'}}>Option</label>
                    </div>
                )}
            </div>
        )
    }

    return <>
        <div id="pdf-editor-section">
            <h2>Edit your PDF</h2>
            {/* Toolbar */}
            <div style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc', display: 'flex', gap: '10px' }}>
                <button onClick={() => addField('text')}>Add Text Box</button>
                <button onClick={() => addField('signature')}>Add Signature Field</button>
                <button onClick={() => addField('date')}>Add Date Selector</button>
                <button onClick={() => addField('radio')}>Add Radio Option</button>
                <button onClick={() => console.log(fields)}>Log Current Fields (for payload check)</button>
                <button onClick={sendEditsToServer}>Save</button>
            </div>
            <div style={{ position: 'relative', width: 'fit-content', margin: '0 auto', border: '1px solid black' }}
                ref={pageRef} >
                <Document file={samplePdf} onLoadSuccess={onPageLoadSuccess}>
                    <Page pageNumber={pageNumber}
                        renderTextLayer={true} 
                        renderAnnotationLayer={true}
                    />
                </Document>
                {/* Overlay for Draggable/Resizable fields */}
                {fields.map(field => (
                    <Rnd
                    default={{
                        x: 0,
                        y: 0,
                        width: 320,
                        height: 200,
                    }}
                    minWidth={100}
                    minHeight={100}
                    id="edit-fields" // Add styling via className
                    >
                    {/* <div className="p-4">
                        <h2 className="text-lg font-semibold">Resize and Drag Me!</h2>
                        <p>I am a draggable and resizable box.</p> */}
                        <FieldComponent field={field} />
                    {/* </div> */}
                    </Rnd>
                ))}
            </div>
        </div>
    </>
}

export default PdfEditor;