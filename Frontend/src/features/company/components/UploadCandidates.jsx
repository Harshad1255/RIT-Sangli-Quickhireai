import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../shared/services/api";
import "../styles/UploadCandidates.css";

const toSafeCsvCell = (value) => {
  let text = String(value ?? "");
  if (/^[\t\r\n ]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const UploadCandidates = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [interview, setInterview] = useState(null);

  useEffect(() => {
    fetchInterviewDetails();
  }, [interviewId]);

  const fetchInterviewDetails = async () => {
    try {
      const response = await api.get(`/interviews/${interviewId}`);
      setInterview(response.data.interview);
    } catch (err) {
      setError("Failed to fetch interview details");
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    if (selectedFile) {
      if (selectedFile.name.toLowerCase().endsWith(".xlsx")) {
        setFile(selectedFile);
        setError("");
      } else {
        setError("Please upload a valid Excel file (.xlsx)");
        setFile(null);
      }
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    handleFile(selectedFile);
  };

  const uploadCandidates = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(`/interviews/${interviewId}/upload-candidates`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setSuccess(`Successfully uploaded ${response.data.totalProcessed} candidates`);
        
        // Update the candidates state with the uploaded data
        if (response.data.candidates && response.data.candidates.length > 0) {
          setCandidates(response.data.candidates);
          console.log('Uploaded candidates:', response.data.candidates);
        }
        
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('excel-file');
        if (fileInput) fileInput.value = '';
        
        // Show any errors if they occurred during processing
        if (response.data.errors && response.data.errors.length > 0) {
          console.warn('Some errors occurred during upload:', response.data.errors);
        }
      } else {
        throw new Error(response.data.error);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCodes = () => {
    if (!candidates.length) return;

    const csvContent = [
      ["Name", "Email", "Mobile", "Interview Code"],
      ...candidates.map(candidate => [
        candidate.name,
        candidate.email,
        candidate.mobile,
        candidate.code
      ])
    ].map(row => row.map(toSafeCsvCell).join(",")).join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview_codes_${interviewId}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const downloadTemplate = () => {
    const a = document.createElement("a");
    a.href = "/candidate_template.xlsx";
    a.download = "candidate_template.xlsx";
    a.click();
  };

  if (!interviewId) {
    return (
      <div className="upload-candidates">
        <div className="error-message">
          No interview selected. Redirecting to create interview page...
        </div>
      </div>
    );
  }

  return (
    <div className="upload-candidates">
      <h1>Upload Candidates</h1>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="upload-section">
        <button 
          className="download-template" 
          onClick={downloadTemplate}
        >
          <i className="fas fa-download"></i>
          Download Template
        </button>

        <div 
          className={`file-input-container ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <label className="file-input-label" htmlFor="excel-file">
            <i className="fas fa-cloud-upload-alt"></i>
            <span>Drop your Excel file here or click to browse</span>
            <p>Supports .xlsx files</p>
            {file && <div className="selected-file">Selected: {file.name}</div>}
          </label>
          <input
            id="excel-file"
            type="file"
            className="file-input"
            accept=".xlsx"
            onChange={handleFileChange}
          />
        </div>

        <div className="action-buttons">
          <button 
            className="action-button secondary" 
            onClick={() => navigate('/company-dashboard')}
          >
            <i className="fas fa-arrow-left"></i>
            Back
          </button>
          <button 
            className="action-button primary" 
            onClick={uploadCandidates}
            disabled={!file || loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Uploading...
              </>
            ) : (
              <>
                <i className="fas fa-upload"></i>
                Upload Candidates
              </>
            )}
          </button>
        </div>
      </div>

      {candidates.length > 0 && (
        <div className="preview-section">
          <h3>Uploaded Candidates</h3>
          <table className="preview-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Interview Code</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate, index) => (
                <tr key={index}>
                  <td>{candidate.name}</td>
                  <td>{candidate.email}</td>
                  <td>{candidate.mobile}</td>
                  <td><code>{candidate.code}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <button 
            className="action-button primary" 
            onClick={downloadCodes}
          >
            <i className="fas fa-download"></i>
            Download Interview Codes
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadCandidates; 