import { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { api } from '../../../shared/services/api';
import { getExecutionRequestError, getExecutionServiceMessage } from '../../../shared/services/codingExecutionMessages';
import '../styles/CodingWorkspace.css';

const DEFAULT_STARTERS = {
  javascript: 'function solve(nums, target) {\n  return [];\n}\n',
  python: 'def solve(nums, target):\n    return []\n',
  java: '// Write Java solution here\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n    }\n}\n',
  cpp: '// Write C++ solution here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n'
};

const CodingWorkspace = ({ problem, testId, onExit, violations = [] }) => {
  const [activeTab, setActiveTab] = useState('description');
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [customStdin, setCustomStdin] = useState('');
  const [loadingAction, setLoadingAction] = useState(''); // 'run' or 'submit'
  const [executionResult, setExecutionResult] = useState(null);
  const [submissionsHistory, setSubmissionsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    if (problem) {
      const starter = problem.starterCode?.[language] || DEFAULT_STARTERS[language];
      setCode(starter);
      if (problem.testCases && problem.testCases.length > 0) {
        setCustomStdin(problem.testCases[0].input || '');
      }
    }
  }, [problem, language]);

  const fetchSubmissionsHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get('/coding/submissions/mine', {
        params: { problemId: problem._id }
      });
      if (res.data && res.data.success) {
        setSubmissionsHistory(res.data.data);
      }
    } catch (err) {
      console.error('Error loading submissions history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'submissions') {
      fetchSubmissionsHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    const handleClipboardKeys = (event) => {
      const isModifier = event.ctrlKey || event.metaKey;
      if (!isModifier) return;
      if (['c', 'v', 'x'].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', handleClipboardKeys);
    return () => document.removeEventListener('keydown', handleClipboardKeys);
  }, []);

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    const handleEditorKeyDown = (event) => {
      const isModifier = event.ctrlKey || event.metaKey;
      if (!isModifier) return;
      if (['c', 'v', 'x'].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
    };
    editor.onKeyDown(handleEditorKeyDown);
  };

  const handleRunCode = async () => {
    try {
      setLoadingAction('run');
      setExecutionResult(null);
      const res = await api.post(`/coding/problems/${problem._id}/run`, {
        code,
        language,
        stdin: customStdin
      });
      if (res.data && res.data.success) {
        setExecutionResult(res.data.data);
      }
    } catch (err) {
      setExecutionResult({
        verdict: err.response?.status === 404 ? 'Problem unavailable' : 'Server Error',
        errorMessage: getExecutionRequestError(err, 'run')
      });
    } finally {
      setLoadingAction('');
    }
  };

  const handleSubmitSolution = async () => {
    try {
      setLoadingAction('submit');
      setExecutionResult(null);
      const res = await api.post(`/coding/problems/${problem._id}/submit`, {
        code,
        language,
        testId,
        violations
      });
      if (res.data && res.data.success) {
        setExecutionResult(res.data.data);
        if (activeTab === 'submissions') {
          fetchSubmissionsHistory();
        }
      }
    } catch (err) {
      setExecutionResult({
        verdict: err.response?.status === 404 ? 'Problem unavailable' : 'Server Error',
        errorMessage: getExecutionRequestError(err, 'submit')
      });
    } finally {
      setLoadingAction('');
    }
  };

  const getVerdictClass = (verdict) => {
    if (!verdict) return '';
    return `verdict-${verdict.replace(/\s+/g, '-')}`;
  };

  return (
    <div className="coding-workspace-container">
      <div className="workspace-topbar">
        <h2>
          <button
            onClick={onExit}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <span>{problem?.title}</span>
          <span className={`badge-difficulty difficulty-${problem?.difficulty}`}>
            {problem?.difficulty}
          </span>
        </h2>
        <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Category: <strong>{problem?.category}</strong>
        </div>
      </div>

      <div className="workspace-body">
        {/* LEFT PANEL */}
        <div className="workspace-left">
          <div className="problem-tabs">
            <button
              className={`problem-tab-btn ${activeTab === 'description' ? 'active' : ''}`}
              onClick={() => setActiveTab('description')}
            >
              Description
            </button>
            <button
              className={`problem-tab-btn ${activeTab === 'submissions' ? 'active' : ''}`}
              onClick={() => setActiveTab('submissions')}
            >
              My Submissions
            </button>
          </div>

          {activeTab === 'description' ? (
            <div>
              <div style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 20 }}>
                {problem?.statementMarkdown || problem?.description}
              </div>

              {problem?.testCases && problem.testCases.filter(t => t.isSample).length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h4 style={{ color: '#cbd5e1', marginBottom: 12 }}>Sample Test Cases</h4>
                  {problem.testCases.filter(t => t.isSample).map((tc, idx) => (
                    <div key={idx} style={{ background: '#334155', padding: 14, borderRadius: 8, marginBottom: 12 }}>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 6 }}>Sample #{idx + 1}</div>
                      <div><strong>Input:</strong> <pre style={{ margin: '4px 0', background: '#0f172a', padding: 8, borderRadius: 4 }}>{tc.input}</pre></div>
                      <div><strong>Expected Output:</strong> <pre style={{ margin: '4px 0', background: '#0f172a', padding: 8, borderRadius: 4 }}>{tc.expectedOutput}</pre></div>
                    </div>
                  ))}
                </div>
              )}

              {problem?.constraints && problem.constraints.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h4 style={{ color: '#cbd5e1', marginBottom: 10 }}>Constraints</h4>
                  <ul style={{ paddingLeft: 20, color: '#94a3b8' }}>
                    {problem.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h4 style={{ marginBottom: 16 }}>Your Past Submissions</h4>
              {loadingHistory ? (
                <div>Loading submissions...</div>
              ) : submissionsHistory.length === 0 ? (
                <p style={{ color: '#94a3b8' }}>You have no submissions for this problem yet.</p>
              ) : (
                <table className="test-results-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Language</th>
                      <th>Runtime</th>
                      <th>Submitted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionsHistory.map(sub => (
                      <tr key={sub._id}>
                        <td>
                          <span className={`verdict-badge ${getVerdictClass(sub.verdict)}`}>
                            {sub.verdict}
                          </span>
                        </td>
                        <td>{sub.language}</td>
                        <td>{sub.runtimeMs} ms</td>
                        <td>{new Date(sub.submittedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="workspace-right">
          <div className="editor-panel">
            <div className="editor-toolbar">
              <select
                className="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="python">Python 3</option>
                <option value="java">Java 17</option>
                <option value="cpp">C++17</option>
              </select>

              <div className="editor-actions">
                <button
                  className="btn-run"
                  disabled={!!loadingAction}
                  onClick={handleRunCode}
                >
                  <i className="fas fa-play"></i> {loadingAction === 'run' ? 'Running...' : 'Run Code'}
                </button>
                <button
                  className="btn-submit"
                  disabled={!!loadingAction}
                  onClick={handleSubmitSolution}
                >
                  <i className="fas fa-check"></i> {loadingAction === 'submit' ? 'Submitting...' : 'Submit Solution'}
                </button>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 300 }}>
              <Editor
                height="100%"
                theme="vs-dark"
                language={language}
                value={code}
                onMount={handleEditorMount}
                onChange={(val) => setCode(val || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  quickSuggestions: true,
                  bracketPairColorization: { enabled: true },
                  formatOnPaste: false,
                  formatOnType: false,
                  contextmenu: false,
                  readOnly: false
                }}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                Custom Stdin Input (for Run Code)
              </label>
              <textarea
                rows={2}
                value={customStdin}
                onChange={(e) => setCustomStdin(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0f172a',
                  color: 'white',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: 8,
                  fontFamily: 'monospace'
                }}
                placeholder="Enter custom input for testing..."
              />
            </div>
          </div>

          {/* CONSOLE / RESULT PANEL */}
          <div className="console-panel">
            <div className="console-header">
              <span>Execution Output</span>
              {executionResult && (
                <span className={`verdict-badge ${getVerdictClass(executionResult.verdict)}`}>
                  {executionResult.verdict}
                </span>
              )}
            </div>

            {executionResult && ['Execution Service Error', 'Server Error'].includes(executionResult.verdict) && (
              <div style={{ background: '#7f1d1d', color: '#fecaca', padding: 15, borderRadius: 8, margin: '15px 0', border: '1px solid #ef4444' }}>
                <div style={{ fontWeight: 'bold', marginBottom: 5 }}><i className="fas fa-exclamation-triangle"></i> {executionResult.verdict === 'Server Error' ? 'Server Error' : 'Execution Service Unavailable'}</div>
                <div style={{ fontSize: '0.9rem' }}>{executionResult.verdict === 'Server Error' ? executionResult.errorMessage : getExecutionServiceMessage(executionResult.serviceReason)}</div>
              </div>
            )}

            {!executionResult && !loadingAction ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>
                Click "Run Code" to test with custom input or "Submit Solution" to run against all test cases.
              </div>
            ) : loadingAction ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>
                <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
                {loadingAction === 'run' ? 'Executing your code...' : 'Evaluating against test cases...'}
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 20, marginBottom: 12, fontSize: '0.9rem', color: '#cbd5e1' }}>
                  <div><strong>Runtime:</strong> {executionResult.runtime || executionResult.runtimeMs || 0} ms</div>
                  <div><strong>Memory:</strong> {executionResult.memory || executionResult.memoryKb || 0} KB</div>
                  {executionResult.isRunOnly || executionResult.totalTests === 0 ? (
                    <div><strong>Mode:</strong> Custom Run</div>
                  ) : (
                    <div>
                      <strong>Score:</strong> {executionResult.score || 0} / 100 ({executionResult.passedTests || executionResult.passedTestCases || 0} / {executionResult.totalTests || executionResult.totalTestCases || 0} passed)
                    </div>
                  )}
                </div>

                {(executionResult.output || executionResult.stdout) && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 4 }}>Stdout:</div>
                    <pre style={{ background: '#0f172a', padding: 10, borderRadius: 6, margin: 0 }}>{executionResult.output || executionResult.stdout}</pre>
                  </div>
                )}

                {executionResult.stderr && executionResult.verdict !== 'Execution Service Error' && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.85rem', color: '#f87171', marginBottom: 4 }}>Stderr / Error:</div>
                    <pre style={{ background: '#450a0a', color: '#fecaca', padding: 10, borderRadius: 6, margin: 0 }}>{executionResult.stderr}</pre>
                  </div>
                )}

                {/* Test case table for submissions */}
                {!executionResult.isRunOnly && (executionResult.testResults || executionResult.testCaseResults) && (
                  <div>
                    <div style={{ fontSize: '0.88rem', color: '#94a3b8', marginTop: 12 }}>Test Case Breakdown:</div>
                    <table className="test-results-table">
                      <thead>
                        <tr>
                          <th>Test #</th>
                          <th>Status</th>
                          <th>Input</th>
                          <th>Expected</th>
                          <th>Actual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(executionResult.testResults || executionResult.testCaseResults).map((tc, idx) => (
                          <tr key={idx}>
                            <td>#{tc.testCaseNumber || (idx + 1)}</td>
                            <td>
                              <span style={{
                                fontWeight: 700,
                                color: tc.passed ? '#34d399' : '#f87171'
                              }}>
                                {tc.passed ? 'PASS' : 'FAIL'}
                              </span>
                            </td>
                            <td><code>{tc.input || 'Hidden'}</code></td>
                            <td><code>{tc.expectedOutput || 'Hidden'}</code></td>
                            <td><code>{tc.actualOutput || (tc.error ? 'Error' : 'Hidden')}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingWorkspace;
