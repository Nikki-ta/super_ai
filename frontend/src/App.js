import React, { useState } from "react";
import axios from "axios";
import './App.css';
import logo from './assets/logo.png'; // Adjust the path based on your image location

const App = () => {
  const [files, setFiles] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [columnNames, setColumnNames] = useState([]);
  const [error, setError] = useState("");
  const [useDuckDB, setUseDuckDB] = useState(true);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false); // Add loading state

  const executeQuery = async () => {
    setLoading(true); // Start loading
    const formData = new FormData();
    for (let file of files) {
      formData.append("files", file);
    }
    formData.append("query", query);

    try {
      const response = await axios.post("https://demo-i7xv.onrender.com/query", formData);
      const { columns, results } = response.data;
      setResults(results || []);
      setColumnNames(columns || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred");
      setResults([]);
      setColumnNames([]);
    } finally {
      setLoading(false); // Stop loading
    }
  };

  return (
    <div className="App">
     <header>
        <div className="flex flex-col gap-3 mt-9 justify-center items-center">
          <img src={logo} alt="Logo" className="logo" />
          <h1 className="text-3xl font-bold">DuckDB Query Interface</h1>
          <div className="text-gray-500 text-lg">
            Analyze your data using natural language queries
          </div>
        </div>
      </header>

      <div className="query-box-container">
  <div className="text-g">
    Enter a query below. To get started, upload a CSV file containing your
    data for analysis. This allows the system to process your dataset,
    enabling you to retrieve insights and run customized queries
    efficiently!
  </div>

  <div className="query-input-box">
    <textarea
      placeholder="Enter your query here..."
      className="query-input"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    ></textarea>
    <div className="bottom-section">
      <div className="file-upload">
        <div className="dow">
        <label htmlFor="file-upload-input" className="upload-btn">
        <i class='bx bx-upload do' ></i>&nbsp;
          Upload File
        </label>
        </div>
        <input
          type="file"
          id="file-upload-input"
          multiple
          accept=".csv"
          style={{ display: "none" }}
          onChange={(e) => {
            const uploadedFiles = Array.from(e.target.files);
            setFiles(uploadedFiles); // Update state with the uploaded files
            setFileName(
              uploadedFiles.map((file) => file.name).join(", ")
            ); // Display file names
          }}
        />
        <span className="file-name">
          {fileName || "No file selected"}
        </span>
      </div>
      <button className="send-btn" onClick={executeQuery}>
        <span className="arrow">➔</span>
      </button>
    </div>
  </div>

  {/* Loader */}
  {loading && (
    <div className="loader-container">
      <div className="loader"></div>
      <p>Loading results...</p>
    </div>
  )}

  {/* Conditional rendering for Download CSV */}
  {results && results.length > 0 && (
    <button
      className="down"
      onClick={() => {
        const csvContent =
          "data:text/csv;charset=utf-8," +
          [columnNames.join(","), ...results.map((row) => row.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "query_results.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }}
    >
      <div className="dow">
      <i class='bx bxs-download do'></i>
      <p>Download CSV</p>
      </div>
    </button>
  )}
</div>


      {error && <p className="error">{error}</p>}
      {results.length > 0 && (
        <table>
          <thead>
            <tr>
              {columnNames.map((col, idx) => (
                <th key={idx}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row, idx) => (
              <tr key={idx}>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default App;
