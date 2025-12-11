import React, { useState, useRef, useEffect } from 'react';

const SignatureUpload = ({ onSignatureChange }) => {
  // Stores the Base64 string of the image (e.g., "data:image/png;base64,iVBORw...")
  const [base64Image, setBase64Image] = useState(null);
  const hiddenFileInput = useRef(null);

  // Expose the base64 string to a parent component if needed
  useEffect(() => {
    if (onSignatureChange) {
      onSignatureChange(base64Image);
    }
  }, [base64Image, onSignatureChange]);

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
  };

  return (
    <>
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
    </>
  );
};

export default SignatureUpload;
