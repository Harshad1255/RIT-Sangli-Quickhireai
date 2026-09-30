import { useState, useEffect, useRef } from 'react';
import scholasticApi from '../services/scholasticApi';
import { getExecutionRequestError, getExecutionServiceMessage } from '../../../shared/services/codingExecutionMessages';

const CodingIDEModal = ({ problem, onClose }) => {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [activeTab, setActiveTab] = useState('problem'); // 'problem', 'editorial'
  const [consoleTab, setConsoleTab] = useState('testcase'); // 'testcase', 'result'
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [customInput, setCustomInput] = useState('');
  const [history, setHistory] = useState([]);
  const requestLock = useRef(false);

  useEffect(() => {
    if (problem) {
      // Set starter code for default language
      const fallbackCode = {
        javascript: `// Write your JavaScript solution here\nfunction solve(nums, target) {\n  // TODO\n}`,
        python: `# Write your Python solution here\ndef solve(nums, target):\n    pass`,
        java: `// Write your Java solution here\nimport java.util.*;\n\nclass Solution {\n    public int solve(int[] nums) {\n        // TODO\n        return 0;\n    }\n}`,
        cpp: `// Write your C++ solution here\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // TODO\n        return 0;\n    }\n};`
      };
      const starter = problem.starterCode?.[language] || fallbackCode[language] || '';
      setCode(starter);

      setCustomInput('');
      scholasticApi.getCodingSubmissions(problem._id)
        .then((res) => setHistory(res.data?.data || []))
        .catch(() => setHistory([]));
    }
  }, [problem, language]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    const fallbackCode = {
      javascript: `// Write your JavaScript solution here\nfunction solve(nums, target) {\n  // TODO\n}`,
      python: `# Write your Python solution here\ndef solve(nums, target):\n    pass`,
      java: `// Write your Java solution here\nimport java.util.*;\n\nclass Solution {\n    public int solve(int[] nums) {\n        // TODO\n        return 0;\n    }\n}`,
      cpp: `// Write your C++ solution here\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // TODO\n        return 0;\n    }\n};`
    };
    const starter = problem.starterCode?.[newLang] || fallbackCode[newLang] || '';
    setCode(starter);
  };

  const handleRunCode = async () => {
    if (requestLock.current) return;
    requestLock.current = true;
    setRunning(true);
    setConsoleTab('result');
    try {
      const res = await scholasticApi.runCodingSolution(problem._id, {
        sourceCode: code,
        code,
        language,
        stdin: customInput || undefined
      });
      if (res.data?.success) {
        const data = res.data.executionResult || res.data.data || {};
        setResult({
          ...data,
          status: data.verdict,
          serviceReason: data.serviceReason,
          testcasesPassed: data.passedTests ?? data.passedTestCases ?? 0,
          totalTestcases: data.totalTests ?? data.totalTestCases ?? 0,
          executionTimeMs: data.runtime ?? data.runtimeMs ?? 0,
          memoryUsageKb: data.memory ?? data.memoryKb ?? 0,
          output: data.output || data.stdout || '',
          stderr: data.stderr || '',
          results: (data.testResults || data.testCaseResults || []).map(test => ({ ...test, isPassed: test.passed }))
        });
      }
    } catch (err) {
      console.error('Error running code:', err);
      setResult({
        status: err.response?.status === 404 ? 'Problem unavailable' : 'Server Error',
        errorMessage: getExecutionRequestError(err, 'run')
      });
    } finally {
      setRunning(false);
      requestLock.current = false;
    }
  };

  const handleSubmitCode = async () => {
    if (requestLock.current) return;
    requestLock.current = true;
    setSubmitting(true);
    setConsoleTab('result');
    try {
      const res = await scholasticApi.submitCodingSolution(problem._id, {
        sourceCode: code,
        code,
        language
      });
      if (res.data?.success) {
        const data = res.data.executionResult || res.data.data || {};
        setResult({
          ...data,
          status: data.verdict,
          serviceReason: data.serviceReason,
          testcasesPassed: data.passedTests ?? data.passedTestCases ?? 0,
          totalTestcases: data.totalTests ?? data.totalTestCases ?? 0,
          executionTimeMs: data.runtime ?? data.runtimeMs ?? 0,
          memoryUsageKb: data.memory ?? data.memoryKb ?? 0,
          output: data.output || data.stdout || '',
          stderr: data.stderr || '',
          results: (data.testResults || data.testCaseResults || []).map(test => ({ ...test, isPassed: test.passed }))
        });
        const historyRes = await scholasticApi.getCodingSubmissions(problem._id);
        setHistory(historyRes.data?.data || []);
      }
    } catch (err) {
      console.error('Error submitting code:', err);
      setResult({
        status: err.response?.status === 404 ? 'Problem unavailable' : 'Server Error',
        errorMessage: getExecutionRequestError(err, 'submit')
      });
    } finally {
      setSubmitting(false);
      requestLock.current = false;
    }
  };

  if (!problem) return null;

  return (
    <div className="ide-modal-overlay">
      {/* IDE Top Bar */}
      <div className="ide-topbar">
        <div className="ide-logo">
          <i className="fas fa-code" style={{ color: '#3b82f6' }}></i>
          <span>{problem.title}</span>
          <span className={`diff-badge ${problem.difficulty}`} style={{ marginLeft: '8px' }}>
            {problem.difficulty}
          </span>
        </div>
        <div className="ide-actions">
          <button className="ide-btn run" onClick={handleRunCode} disabled={running || submitting}>
            <i className={`fas fa-${running ? 'spinner fa-spin' : 'play'}`}></i>
            <span>{running ? 'Running...' : 'Run Code'}</span>
          </button>
          <button className="ide-btn submit" onClick={handleSubmitCode} disabled={running || submitting}>
            <i className={`fas fa-${submitting ? 'spinner fa-spin' : 'check'}`}></i>
            <span>{submitting ? 'Submitting...' : 'Submit Code'}</span>
          </button>
          <button className="ide-btn close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>

      {/* Split Pane */}
      <div className="ide-body">
        {/* Left Pane: Problem Description */}
        <div className="ide-left-pane">
          <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #334155', marginBottom: '1.25rem', paddingBottom: '0.75rem' }}>
            <button
              onClick={() => setActiveTab('problem')}
              style={{
                background: 'transparent',
                border: 'none',
                color: activeTab === 'problem' ? '#ffffff' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                borderBottom: activeTab === 'problem' ? '2px solid #3b82f6' : 'none',
                paddingBottom: '0.4rem'
              }}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab('editorial')}
              style={{
                background: 'transparent',
                border: 'none',
                color: activeTab === 'editorial' ? '#ffffff' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                borderBottom: activeTab === 'editorial' ? '2px solid #3b82f6' : 'none',
                paddingBottom: '0.4rem'
              }}
            >
              Editorial & Hints
            </button>
          </div>

          {activeTab === 'problem' ? (
            <div>
              <p style={{ lineHeight: '1.7', color: '#cbd5e1', fontSize: '1rem', whiteSpace: 'pre-wrap' }}>
                {problem.description || problem.statementMarkdown || problem.problemStatement}
              </p>

              {problem.testCases && problem.testCases.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '0.75rem' }}>Examples:</h4>
                  {problem.testCases.map((testCase, idx) => (
                    <div key={idx} style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #334155' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}><strong>Input:</strong> {testCase.input}</div>
                      <div style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '0.4rem' }}><strong>Output:</strong> {testCase.expectedOutput}</div>
                      {testCase.explanation && (
                        <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.4rem' }}><em>Explanation: {testCase.explanation}</em></div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {problem.constraints && problem.constraints.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '0.75rem' }}>Constraints:</h4>
                  <ul style={{ color: '#cbd5e1', paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
                    {problem.constraints.map((c, idx) => (
                      <li key={idx} style={{ marginBottom: '0.4rem', fontFamily: 'monospace' }}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '1.05rem', marginBottom: '1rem' }}>Hints</h4>
              {problem.hints && problem.hints.length > 0 ? (
                problem.hints.map((hint, idx) => (
                  <div key={idx} style={{ background: '#0f172a', padding: '1rem', borderRadius: '8px', marginBottom: '0.75rem', border: '1px solid #334155' }}>
                    <strong style={{ color: '#3b82f6' }}>Hint {idx + 1}:</strong>
                    <p style={{ margin: '0.5rem 0 0 0', color: '#cbd5e1' }}>{hint}</p>
                  </div>
                ))
              ) : (
                <p style={{ color: '#94a3b8' }}>No hints available for this problem.</p>
              )}

              <h4 style={{ color: '#ffffff', fontSize: '1.05rem', marginTop: '1.75rem', marginBottom: '1rem' }}>Editorial</h4>
              <p style={{ color: '#cbd5e1', lineHeight: '1.7' }}>
                {problem.editorial || 'Approach: Identify the optimal data structure and iterate with linear or logarithmic time complexity.'}
              </p>
            </div>
          )}
        </div>

        {/* Right Pane: Code Editor & Console */}
        <div className="ide-right-pane">
          {/* Editor Header */}
          <div className="ide-editor-header">
            <select
              value={language}
              onChange={handleLanguageChange}
              className="lang-select"
            >
              <option value="javascript">JavaScript (Node.js)</option>
              <option value="python">Python 3</option>
              <option value="cpp">C++ (GCC 9.2)</option>
              <option value="java">Java (OpenJDK 13)</option>
            </select>
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
              <i className="fas fa-terminal" style={{ marginRight: '6px' }}></i>
              Sandbox Ready
            </span>
          </div>

          {/* Editor Area */}
          <div className="ide-editor-area">
            <textarea
              className="code-textarea"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Write your code here..."
              spellCheck="false"
            />
          </div>

          {/* Console / Testcases Pane */}
          <div className="ide-console-pane">
            <div className="console-tabs">
              <button
                className={`console-tab ${consoleTab === 'testcase' ? 'active' : ''}`}
                onClick={() => setConsoleTab('testcase')}
              >
                Custom Input
              </button>
              <button
                className={`console-tab ${consoleTab === 'result' ? 'active' : ''}`}
                onClick={() => setConsoleTab('result')}
              >
                Execution Result
              </button>
            </div>

            <div className="console-content">
              {consoleTab === 'testcase' ? (
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    TEST INPUT:
                  </label>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter custom stdin test input..."
                    style={{
                      width: '100%',
                      height: '90px',
                      background: '#0f172a',
                      color: '#f8fafc',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      fontFamily: 'monospace',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              ) : (
                <div>
                  {result ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className={`result-badge ${result.status === 'Accepted' ? 'Accepted' : 'Wrong'}`}>
                          <i className={`fas fa-${result.status === 'Accepted' ? 'check-circle' : 'times-circle'}`}></i>
                          {result.status}
                        </span>
                        {result.xpReward && (
                          <span style={{ background: '#e0e7ff', color: '#4f46e5', padding: '0.25rem 0.65rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                            +{result.xpReward.xpGain} XP Earned!
                          </span>
                        )}
                      </div>

                      {result.status === 'Execution Service Error' ? (
                        <div style={{ background: '#7f1d1d', color: '#fecaca', padding: '15px', borderRadius: '8px', margin: '15px 0', border: '1px solid #ef4444' }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}><i className="fas fa-exclamation-triangle"></i> Execution Service Unavailable</div>
                          <div style={{ fontSize: '0.9rem' }}>{getExecutionServiceMessage(result.serviceReason)}</div>
                        </div>
                      ) : result.errorMessage || result.stderr ? (
                        <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '6px', marginTop: '0.5rem' }}>
                          <strong>{result.status}:</strong> {result.errorMessage || result.stderr}
                        </div>
                      ) : (
                        <div style={{ marginTop: '0.5rem' }}>
                          {result.output !== undefined && (
                            <div style={{ background: '#0f172a', color: '#e2e8f0', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.75rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                              <strong style={{ display: 'block', color: '#94a3b8', marginBottom: '0.35rem' }}>Actual Output</strong>
                              {result.output || '(empty output)'}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '1.5rem', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                            <span><strong>Passed:</strong> {result.testcasesPassed} / {result.totalTestcases}</span>
                            <span><strong>Time:</strong> {result.executionTimeMs} ms</span>
                            <span><strong>Memory:</strong> {result.memoryUsageKb} KB</span>
                          </div>

                          {result.results && result.results.map((tc, idx) => (
                            <div key={idx} className="tc-card" style={{ borderColor: tc.isPassed ? '#10b981' : '#ef4444' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                <span style={{ color: '#ffffff', fontWeight: 600 }}>Test Case #{idx + 1}</span>
                                <span style={{ color: tc.isPassed ? '#10b981' : '#ef4444' }}>
                                  {tc.isPassed ? 'PASSED' : 'FAILED'}
                                </span>
                              </div>
                              <div style={{ color: '#94a3b8' }}><strong>Input:</strong> {tc.input}</div>
                              <div style={{ color: '#cbd5e1' }}><strong>Expected:</strong> {tc.expectedOutput}</div>
                              <div style={{ color: tc.isPassed ? '#10b981' : '#ef4444' }}><strong>Actual:</strong> {tc.actualOutput}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem 0' }}>
                      Click "Run Code" or "Submit Code" to view execution results.
                    </div>
                  )}
                  {history.length > 0 && (
                    <div style={{ marginTop: '1.25rem' }}>
                      <h4 style={{ color: '#ffffff', marginBottom: '0.6rem' }}>Submission History</h4>
                      {history.slice(0, 10).map((submission) => (
                        <div key={submission._id} style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', borderBottom: '1px solid #334155', padding: '0.45rem 0', fontSize: '0.8rem' }}>
                          <span>{submission.verdict}</span>
                          <span>{submission.passedTests}/{submission.totalTests} tests</span>
                          <span>{new Date(submission.submittedAt || submission.createdAt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingIDEModal;
