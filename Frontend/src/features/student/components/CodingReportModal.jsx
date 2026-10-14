import React from 'react';
import '../styles/CodingReportModal.css';

const CodingReportModal = ({ report, problem, onClose, onReturnToPractice }) => {
  if (!report) return null;

  let studentName = 'Student';
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.name) studentName = user.name;
  } catch (_) {}

  const verdict = report.verdict || 'Completed';
  const isAccepted = verdict === 'Accepted';
  const isPartial = verdict === 'Wrong Answer' && (report.passedTests > 0 || report.passedCount > 0);
  const isError = ['Compilation Error', 'Runtime Error', 'Time Limit Exceeded'].includes(verdict);

  const passedCount = report.passedTests ?? report.passedTestCases ?? report.passedCount ?? 0;
  const totalCount = report.totalTests ?? report.totalTestCases ?? report.totalCount ?? 0;
  const score = report.score != null ? report.score : (totalCount > 0 ? Number(((passedCount / totalCount) * 100).toFixed(1)) : 0);
  const passPercent = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
  const runtime = report.runtimeMs ?? report.runtime ?? 0;
  const memory = report.memoryKb ?? report.memory ?? 0;
  const submittedAt = report.submittedAt ? new Date(report.submittedAt).toLocaleString() : new Date().toLocaleString();
  const testResults = report.testResults || report.testCaseResults || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="coding-report-overlay">
      <div className="coding-report-modal printable-report">
        {/* Top Header */}
        <div className="report-header">
          <div className="report-brand">
            <span className="brand-badge"><i className="fas fa-code"></i> QuickHire AI</span>
            <h2>Coding Assessment Report</h2>
          </div>
          <button className="report-close-btn" onClick={onClose} title="Close Report">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Candidate & Problem Meta Banner */}
        <div className="report-meta-grid">
          <div>
            <span className="meta-label">Candidate:</span>
            <strong className="meta-value">{studentName}</strong>
          </div>
          <div>
            <span className="meta-label">Problem:</span>
            <strong className="meta-value">{problem?.title || 'Coding Challenge'}</strong>
          </div>
          <div>
            <span className="meta-label">Difficulty:</span>
            <span className={`diff-pill ${problem?.difficulty || 'Easy'}`}>
              {problem?.difficulty || 'Easy'}
            </span>
          </div>
          <div>
            <span className="meta-label">Language:</span>
            <strong className="meta-value">{report.language || 'Code'}</strong>
          </div>
          <div>
            <span className="meta-label">Submitted:</span>
            <span className="meta-value">{submittedAt}</span>
          </div>
          {report.submissionId && (
            <div>
              <span className="meta-label">Submission ID:</span>
              <span className="meta-value font-mono">#{String(report.submissionId).slice(-8)}</span>
            </div>
          )}
        </div>

        {/* Verdict Hero Banner */}
        <div className={`report-hero-banner ${isAccepted ? 'hero-accepted' : isPartial ? 'hero-partial' : 'hero-failed'}`}>
          <div className="hero-icon">
            <i className={`fas fa-${isAccepted ? 'check-circle' : isPartial ? 'exclamation-triangle' : 'times-circle'}`}></i>
          </div>
          <div className="hero-text">
            <h3>
              {isAccepted ? 'Accepted — Full Score' : isPartial ? 'Partially Accepted' : verdict}
            </h3>
            <p>
              {isAccepted
                ? 'All evaluation test cases passed successfully within time and memory constraints.'
                : isPartial
                ? `${passedCount} of ${totalCount} test cases passed. Review edge cases and constraints.`
                : isError
                ? `The program encountered a ${verdict}. Review the error trace below.`
                : 'None of the evaluation test cases matched expected output.'}
            </p>
          </div>
          <div className="hero-score-badge">
            <span className="score-num">{score}</span>
            <span className="score-denom">/ 100</span>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="report-metrics-row">
          <div className="metric-card">
            <div className="metric-icon testcases"><i className="fas fa-tasks"></i></div>
            <div className="metric-body">
              <span className="metric-num">{passedCount} / {totalCount}</span>
              <span className="metric-lbl">Test Cases Passed ({passPercent}%)</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon score"><i className="fas fa-award"></i></div>
            <div className="metric-body">
              <span className="metric-num">{score}%</span>
              <span className="metric-lbl">Assessment Score</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon runtime"><i className="fas fa-stopwatch"></i></div>
            <div className="metric-body">
              <span className="metric-num">{runtime} ms</span>
              <span className="metric-lbl">Execution Time</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon memory"><i className="fas fa-microchip"></i></div>
            <div className="metric-body">
              <span className="metric-num">{memory > 0 ? `${memory} KB` : 'N/A'}</span>
              <span className="metric-lbl">Memory Consumed</span>
            </div>
          </div>
        </div>

        {/* Compiler / Runtime Errors Section (if any) */}
        {report.stderr && verdict !== 'Accepted' && (
          <div className="report-error-box">
            <h4><i className="fas fa-terminal"></i> Execution Diagnostic Logs</h4>
            <pre className="error-trace-terminal">{report.stderr}</pre>
          </div>
        )}

        {/* Test Case Breakdown Table */}
        <div className="report-breakdown-section">
          <h4><i className="fas fa-list-check"></i> Test Case Evaluation Breakdown</h4>
          {testResults.length === 0 ? (
            <p className="no-tests-note">No test case details recorded.</p>
          ) : (
            <div className="table-responsive">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Case #</th>
                    <th>Status</th>
                    <th>Input</th>
                    <th>Expected Output</th>
                    <th>Actual Output</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.map((tc, idx) => (
                    <tr key={idx} className={tc.passed ? 'row-passed' : 'row-failed'}>
                      <td>
                        <strong>#{idx + 1}</strong>
                        {tc.isHidden && <span className="hidden-pill">Hidden</span>}
                      </td>
                      <td>
                        <span className={`case-badge ${tc.passed ? 'badge-pass' : 'badge-fail'}`}>
                          <i className={`fas fa-${tc.passed ? 'check' : 'times'}`}></i> {tc.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                      <td className="code-cell">
                        <code>{tc.input || (tc.isHidden ? 'Hidden' : '-')}</code>
                      </td>
                      <td className="code-cell">
                        <code>{tc.expectedOutput || (tc.isHidden ? 'Hidden' : '-')}</code>
                      </td>
                      <td className="code-cell">
                        <code className={tc.passed ? 'output-passed' : 'output-failed'}>
                          {tc.actualOutput || (tc.passed ? 'Passed' : 'Failed')}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="report-footer no-print">
          <button className="btn-print-report" onClick={handlePrint}>
            <i className="fas fa-print"></i> Print / Save PDF
          </button>
          <button className="btn-review-code" onClick={onClose}>
            <i className="fas fa-code"></i> Review Solution
          </button>
          {onReturnToPractice && (
            <button className="btn-return-practice" onClick={onReturnToPractice}>
              <i className="fas fa-arrow-left"></i> Exit to Practice
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodingReportModal;
