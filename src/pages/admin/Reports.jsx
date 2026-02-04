import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../Firebase";

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch reports from Firestore
  const fetchReports = async () => {
    setLoading(true);
    try {
      const reportsCollection = collection(db, "reports");
      const snapshot = await getDocs(reportsCollection);
      const reportsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(reportsList);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Mark report as resolved
  const handleResolve = async (report) => {
    try {
      await updateDoc(doc(db, "reports", report.id), { status: "resolved" });
      alert("Report marked as resolved!");
      fetchReports();
    } catch (error) {
      console.error(error);
      alert("Failed to update report.");
    }
  };

  // Delete report
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      await deleteDoc(doc(db, "reports", id));
      alert("Report deleted!");
      fetchReports();
    } catch (error) {
      console.error(error);
      alert("Failed to delete report.");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Reports Management</h1>
      <p>View and manage reported issues, adoption reports, or system feedback.</p>

      {loading ? (
        <p>Loading reports...</p>
      ) : reports.length === 0 ? (
        <p>No reports found.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "20px",
          }}
        >
          <thead>
            <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
              <th style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>Title</th>
              <th style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>Description</th>
              <th style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>Reported By</th>
              <th style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>Status</th>
              <th style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px" }}>{report.title}</td>
                <td style={{ padding: "10px" }}>{report.description}</td>
                <td style={{ padding: "10px" }}>{report.reportedBy}</td>
                <td style={{ padding: "10px", textTransform: "capitalize" }}>{report.status}</td>
                <td style={{ padding: "10px", display: "flex", gap: "10px" }}>
                  {report.status !== "resolved" && (
                    <button
                      onClick={() => handleResolve(report)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "none",
                        background: "#2e7d32",
                        color: "white",
                        cursor: "pointer",
                      }}
                    >
                      Resolve
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(report.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "none",
                      background: "#d32f2f",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Reports;
