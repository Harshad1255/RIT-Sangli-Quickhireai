import { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { api } from '../../../shared/services/api';
import { getExecutionRequestError, getExecutionServiceMessage } from '../../../shared/services/codingExecutionMessages';
import MarkdownRenderer from '../../../shared/components/MarkdownRenderer';
import CodingReportModal from './CodingReportModal';
import '../styles/CodingWorkspace.css';

const DEFAULT_STARTERS = {
  javascript: `/**
 * Complete the 'solve' function below.
 * 
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
function solve(nums, target) {
  // Write your solution here
  return -1;
}
`,
  python: `# Complete the 'solve' function below.
def solve(nums, target):
    # Write your solution here
    return -1
`,
  java: `import java.util.*;
import java.io.*;

class Solution {
    public int solve(int[] nums, int target) {
        // Write your solution here
        return -1;
    }
}
`,
  cpp: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

class Solution {
public:
    int solve(vector<int>& nums, int target) {
        // Write your solution here
        return -1;
    }
};
`
};

const sanitizeStarterCode = (rawStarter, lang) => {
  if (!rawStarter || typeof rawStarter !== 'string') return (DEFAULT_STARTERS[lang] || '').trim();
  let starter = rawStarter.trim();
  if (lang === 'cpp') {
    if (!starter.includes('<iostream>')) {
      starter = `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n\nusing namespace std;\n\n` + starter.replace(/^#include\s*<vector>\s*/m, '').replace(/^using\s+namespace\s+std;\s*/m, '').trim();
    }
  } else if (lang === 'java') {
    if (!starter.includes('import java.util')) {
      starter = `import java.util.*;\nimport java.io.*;\n\n` + starter.trim();
    }
  } else if (lang === 'python') {
    if (!starter.includes('# Complete the') && !starter.startsWith('#')) {
      starter = `# Complete the 'solve' function below.\n` + starter.trim();
    }
  }
  return starter.trim();
};

const CodingWorkspace = ({ problem, testId, onExit, violations = [] }) => {
  const [currentProblem, setCurrentProblem] = useState(problem);
  const [leftTab, setLeftTab] = useState('description'); // 'description', 'editorial', 'submissions'
  const [consoleTab, setConsoleTab] = useState('testcases'); // 'testcases', 'customInput', 'result'
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(() => {
    const raw = problem?.starterCode?.python || DEFAULT_STARTERS.python || '';
    return sanitizeStarterCode(raw, 'python');
  });
  const [customStdin, setCustomStdin] = useState('');
  const [loadingAction, setLoadingAction] = useState(''); // 'run' or 'submit'
  const [executionResult, setExecutionResult] = useState(null);
  const [submissionsHistory, setSubmissionsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Assessment Report Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeReport, setActiveReport] = useState(null);

  // Mobile View Switcher: 'problem', 'code', 'console'
  const [mobileView, setMobileView] = useState('code');

  const editorRef = useRef(null);
  const requestInFlight = useRef(false);

  useEffect(() => {
    setCurrentProblem(problem);
  }, [problem]);

  useEffect(() => {
    if (problem?._id && (!problem.testCases || problem.testCases.length === 0)) {
      api.get(`/coding/problems/${problem._id}`)
        .then(res => {
          if (res.data?.success && res.data.data) {
            setCurrentProblem(res.data.data);
          }
        })
        .catch(err => {
          console.error('Error fetching full problem details:', err);
        });
    }
  }, [problem?._id]);

  useEffect(() => {
    if (currentProblem) {
      const rawStarter = currentProblem.starterCode?.[language] || DEFAULT_STARTERS[language] || '';
      const starter = sanitizeStarterCode(rawStarter, language);
      setCode(starter);
      const sampleCases = (currentProblem.testCases || []).filter(t => t.isSample || !t.isHidden);
      if (sampleCases.length > 0) {
        setCustomStdin(sampleCases[0].input || '');
      }

      // Explicitly scroll editor back to top line on problem load or language switch
      if (editorRef.current) {
        const resetEditorScroll = () => {
          try {
            const dom = editorRef.current.getDomNode();
            let c = dom;
            while (c && c !== document.body) {
              if (c.scrollTop !== 0) c.scrollTop = 0;
              if (c.scrollLeft !== 0) c.scrollLeft = 0;
              c = c.parentElement;
            }
            editorRef.current.setScrollTop(0);
            editorRef.current.setScrollLeft(0);
            editorRef.current.setPosition({ lineNumber: 1, column: 1 });
            if (typeof editorRef.current.revealLineNearTop === 'function') {
              editorRef.current.revealLineNearTop(1);
            } else {
              editorRef.current.revealLine(1);
            }
          } catch (e) {}
        };
        setTimeout(resetEditorScroll, 30);
        setTimeout(resetEditorScroll, 100);
        setTimeout(resetEditorScroll, 300);
      }
    }
  }, [currentProblem, language]);

  const fetchSubmissionsHistory = async () => {
    if (!currentProblem?._id) return;
    try {
      setLoadingHistory(true);
      const res = await api.get('/coding/submissions/mine', {
        params: { problemId: currentProblem._id }
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
    if (leftTab === 'submissions') {
      fetchSubmissionsHistory();
    }
  }, [leftTab]);

  // Anti-cheat clipboard restriction
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

    let isInitialMount = true;
    setTimeout(() => { isInitialMount = false; }, 2000);

    const forceScrollToTop = () => {
      try {
        const domNode = editor.getDomNode();
        let curr = domNode;
        while (curr && curr !== document.body) {
          if (curr.scrollTop !== 0) curr.scrollTop = 0;
          if (curr.scrollLeft !== 0) curr.scrollLeft = 0;
          curr = curr.parentElement;
        }
        window.scrollTo(0, 0);

        editor.setScrollTop(0);
        editor.setScrollLeft(0);
        editor.setPosition({ lineNumber: 1, column: 1 });
        editor.setSelection({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1
        });
        if (typeof editor.revealLineNearTop === 'function') {
          editor.revealLineNearTop(1);
        } else {
          editor.revealLine(1);
        }
      } catch (e) {}
    };

    forceScrollToTop();
    requestAnimationFrame(forceScrollToTop);
    [20, 50, 100, 200, 400, 800].forEach(ms => setTimeout(forceScrollToTop, ms));

    // Prevent any browser or layout focus auto-scrolling down during initial render
    editor.onDidScrollChange((e) => {
      if (isInitialMount && e.scrollTop > 0) {
        editor.setScrollTop(0);
      }
    });

    editor.onDidFocusEditorText(forceScrollToTop);
    editor.onDidFocusEditorWidget(forceScrollToTop);

    const domNode = editor.getDomNode();
    if (domNode) {
      let p = domNode.parentElement;
      while (p && p !== document.body) {
        p.addEventListener('scroll', () => {
          if (p.scrollTop > 0) p.scrollTop = 0;
          if (p.scrollLeft > 0) p.scrollLeft = 0;
        }, { passive: true });
        p = p.parentElement;
      }
    }

    const handleEditorKeyDown = (event) => {
      const isModifier = event.ctrlKey || event.metaKey;
      if (!isModifier) return;
      if (['c', 'v', 'x'].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
    };
    editor.onKeyDown(handleEditorKeyDown);
  };

  const handleResetCode = () => {
    if (window.confirm('Reset code to initial template? Your current edits will be replaced.')) {
      const rawStarter = currentProblem?.starterCode?.[language] || DEFAULT_STARTERS[language] || '';
      const starter = sanitizeStarterCode(rawStarter, language);
      setCode(starter);
      if (editorRef.current) {
        setTimeout(() => {
          try {
            editorRef.current.setScrollTop(0);
            editorRef.current.setScrollLeft(0);
            editorRef.current.setPosition({ lineNumber: 1, column: 1 });
            if (typeof editorRef.current.revealLineNearTop === 'function') {
              editorRef.current.revealLineNearTop(1);
            } else {
              editorRef.current.revealLine(1);
            }
          } catch (e) {}
        }, 50);
      }
    }
  };

  const handleRunCode = async () => {
    if (requestInFlight.current || !currentProblem?._id) return;
    requestInFlight.current = true;
    try {
      setLoadingAction('run');
      setExecutionResult(null);
      setConsoleTab('result');
      setMobileView('console');

      const res = await api.post(`/coding/problems/${currentProblem._id}/run`, {
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
      requestInFlight.current = false;
      setLoadingAction('');
    }
  };

  const handleSubmitSolution = async () => {
    if (requestInFlight.current || !currentProblem?._id) return;
    requestInFlight.current = true;
    try {
      setLoadingAction('submit');
      setExecutionResult(null);
      setConsoleTab('result');

      const res = await api.post(`/coding/problems/${currentProblem._id}/submit`, {
        code,
        language,
        testId,
        violations
      });
      if (res.data && res.data.success) {
        const submissionData = res.data.data;
        setExecutionResult(submissionData);
        setActiveReport({
          ...submissionData,
          language
        });
        setShowReportModal(true);

        if (leftTab === 'submissions') {
          fetchSubmissionsHistory();
        }
      }
    } catch (err) {
      setExecutionResult({
        verdict: err.response?.status === 404 ? 'Problem unavailable' : 'Server Error',
        errorMessage: getExecutionRequestError(err, 'submit')
      });
    } finally {
      requestInFlight.current = false;
      setLoadingAction('');
    }
  };

  const handleViewHistoricalReport = (submission) => {
    setActiveReport({
      ...submission,
      submissionId: submission._id
    });
    setShowReportModal(true);
  };

  const getVerdictClass = (verdict) => {
    if (!verdict) return '';
    return `verdict-${String(verdict).replace(/\s+/g, '-')}`;
  };

  const sampleCases = (currentProblem?.testCases || []).filter(t => t.isSample || !t.isHidden);

  return (
    <div className="coding-workspace-container">
      {/* Top Navbar */}
      <header className="workspace-topbar">
        <div className="topbar-left">
          <button onClick={onExit} className="btn-back-nav" title="Exit to Practice">
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="brand-logo-tag">
            <i className="fas fa-terminal"></i>
            <span>QuickHire AI</span>
          </div>
          <span className="divider-slash">/</span>
          <h2 className="problem-nav-title">{currentProblem?.title}</h2>
          <span className={`badge-difficulty difficulty-${currentProblem?.difficulty}`}>
            {currentProblem?.difficulty}
          </span>
          {currentProblem?.category && (
            <span className="problem-category-pill">{currentProblem.category}</span>
          )}
        </div>

        <div className="topbar-center">
          {/* Mobile responsive view switcher */}
          <div className="mobile-view-tabs">
            <button
              className={`view-tab ${mobileView === 'problem' ? 'active' : ''}`}
              onClick={() => setMobileView('problem')}
            >
              <i className="fas fa-file-alt"></i> Problem
            </button>
            <button
              className={`view-tab ${mobileView === 'code' ? 'active' : ''}`}
              onClick={() => setMobileView('code')}
            >
              <i className="fas fa-code"></i> Code
            </button>
            <button
              className={`view-tab ${mobileView === 'console' ? 'active' : ''}`}
              onClick={() => setMobileView('console')}
            >
              <i className="fas fa-terminal"></i> Output
            </button>
          </div>
        </div>

        <div className="topbar-right">
          <select
            className="language-select"
            value={language}
            disabled={!!loadingAction}
            onChange={(e) => {
              const newLang = e.target.value;
              setLanguage(newLang);
              const rawStarter = currentProblem?.starterCode?.[newLang] || DEFAULT_STARTERS[newLang] || '';
              const starter = sanitizeStarterCode(rawStarter, newLang);
              setCode(starter);
              if (editorRef.current) {
                const reset = () => {
                  try {
                    editorRef.current.setScrollTop(0);
                    editorRef.current.setScrollLeft(0);
                    editorRef.current.setPosition({ lineNumber: 1, column: 1 });
                    editorRef.current.revealLine(1);
                  } catch (err) {}
                };
                reset();
                requestAnimationFrame(reset);
                setTimeout(reset, 20);
                setTimeout(reset, 100);
                setTimeout(reset, 300);
              }
            }}
          >
            <option value="python">Python 3</option>
            <option value="javascript">JavaScript (Node.js)</option>
            <option value="java">Java (OpenJDK)</option>
            <option value="cpp">C++17 (GCC)</option>
          </select>

          <button
            className="btn-toolbar-icon"
            onClick={handleResetCode}
            disabled={!!loadingAction}
            title="Reset code template"
          >
            <i className="fas fa-undo"></i>
          </button>

          <button
            className="btn-run"
            disabled={!!loadingAction}
            onClick={handleRunCode}
          >
            <i className="fas fa-play"></i>
            <span>{loadingAction === 'run' ? 'Running...' : 'Run Code'}</span>
          </button>

          <button
            className="btn-submit"
            disabled={!!loadingAction}
            onClick={handleSubmitSolution}
          >
            <i className="fas fa-check"></i>
            <span>{loadingAction === 'submit' ? 'Submitting...' : 'Submit'}</span>
          </button>
        </div>
      </header>

      {/* Main Split Body */}
      <div className="workspace-body">
        {/* LEFT PANEL: Problem Details / Editorial / Submissions */}
        <div className={`workspace-left ${mobileView === 'problem' ? 'mobile-visible' : 'mobile-hidden'}`}>
          <div className="panel-tab-bar">
            <button
              className={`panel-tab-btn ${leftTab === 'description' ? 'active' : ''}`}
              onClick={() => setLeftTab('description')}
            >
              <i className="fas fa-file-alt"></i> Description
            </button>
            <button
              className={`panel-tab-btn ${leftTab === 'editorial' ? 'active' : ''}`}
              onClick={() => setLeftTab('editorial')}
            >
              <i className="fas fa-lightbulb"></i> Hints & Editorial
            </button>
            <button
              className={`panel-tab-btn ${leftTab === 'submissions' ? 'active' : ''}`}
              onClick={() => setLeftTab('submissions')}
            >
              <i className="fas fa-history"></i> My Submissions
            </button>
          </div>

          <div className="panel-scroll-content">
            {leftTab === 'description' && (
              <div className="problem-description-content">
                <div className="problem-title-header">
                  <h3>{currentProblem?.title}</h3>
                  <div className="problem-meta-chips">
                    <span className={`diff-tag ${currentProblem?.difficulty}`}>{currentProblem?.difficulty}</span>
                    {currentProblem?.tags && currentProblem.tags.map((t, idx) => (
                      <span key={idx} className="topic-chip">{t}</span>
                    ))}
                  </div>
                </div>

                {/* Markdown-rendered problem statement */}
                <div className="statement-markdown-container">
                  <MarkdownRenderer content={currentProblem?.statementMarkdown || currentProblem?.description} />
                </div>

                {/* Formatted Sample Test Cases */}
                {sampleCases.length > 0 && (
                  <div className="sample-testcases-section">
                    <h4 className="section-subheading">Examples</h4>
                    {sampleCases.map((tc, idx) => (
                      <div key={idx} className="sample-card">
                        <div className="sample-header">Example {idx + 1}:</div>
                        <div className="sample-block">
                          <span className="block-label">Input:</span>
                          <pre className="block-code">{tc.input}</pre>
                        </div>
                        <div className="sample-block">
                          <span className="block-label">Output:</span>
                          <pre className="block-code">{tc.expectedOutput}</pre>
                        </div>
                        {tc.explanation && (
                          <div className="sample-block explanation">
                            <span className="block-label">Explanation:</span>
                            <span className="explanation-text">{tc.explanation}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Constraints */}
                {currentProblem?.constraints && currentProblem.constraints.length > 0 && (
                  <div className="constraints-section">
                    <h4 className="section-subheading">Constraints</h4>
                    <ul className="constraints-list">
                      {currentProblem.constraints.map((c, i) => (
                        <li key={i}><code>{c}</code></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {leftTab === 'editorial' && (
              <div className="editorial-content">
                <h4 className="section-subheading"><i className="fas fa-lightbulb"></i> Hints & Guidance</h4>
                {currentProblem?.hints && currentProblem.hints.length > 0 ? (
                  currentProblem.hints.map((hint, idx) => (
                    <div key={idx} className="hint-card">
                      <strong>Hint {idx + 1}:</strong>
                      <p>{hint}</p>
                    </div>
                  ))
                ) : (
                  <p className="empty-state-text">No specific hints provided for this challenge.</p>
                )}

                <h4 className="section-subheading" style={{ marginTop: '1.5rem' }}>
                  <i className="fas fa-book-open"></i> Editorial Solution Approach
                </h4>
                <div className="editorial-text-box">
                  <MarkdownRenderer
                    content={currentProblem?.editorial || 'Approach: Analyze time and space complexity. Look for opportunities to optimize from $O(N^2)$ to $O(N)$ using hash tables, two pointers, or dynamic programming.'}
                  />
                </div>
              </div>
            )}

            {leftTab === 'submissions' && (
              <div className="submissions-history-content">
                <div className="history-header-row">
                  <h4>Past Submissions</h4>
                  <button className="btn-refresh-history" onClick={fetchSubmissionsHistory}>
                    <i className="fas fa-sync-alt"></i>
                  </button>
                </div>

                {loadingHistory ? (
                  <div className="history-loading"><i className="fas fa-spinner fa-spin"></i> Loading submissions...</div>
                ) : submissionsHistory.length === 0 ? (
                  <div className="empty-state-text">No submissions yet for this problem. Click "Submit" to record one!</div>
                ) : (
                  <div className="table-responsive">
                    <table className="submissions-table">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Language</th>
                          <th>Runtime</th>
                          <th>Score</th>
                          <th>Submitted</th>
                          <th>Report</th>
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
                            <td>{sub.runtimeMs ?? sub.runtime ?? 0} ms</td>
                            <td>
                              <strong>{sub.score != null ? `${sub.score}%` : 'N/A'}</strong>
                            </td>
                            <td className="date-cell">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                            <td>
                              <button
                                className="btn-view-report"
                                onClick={() => handleViewHistoricalReport(sub)}
                                title="View Assessment Report"
                              >
                                <i className="fas fa-file-invoice"></i> Report
                              </button>
                            </td>
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

        {/* RIGHT PANEL: Editor + Bottom Console Panel */}
        <div className={`workspace-right ${mobileView !== 'problem' ? 'mobile-visible' : 'mobile-hidden'}`}>
          {/* Top: Monaco Code Editor */}
          <div className="editor-panel-box">
            <div className="editor-container-wrapper">
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
                  lineNumbers: 'on',
                  lineNumbersMinChars: 3,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  quickSuggestions: true,
                  bracketPairColorization: { enabled: true },
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', monospace",
                  tabSize: 4,
                  formatOnPaste: false,
                  formatOnType: false,
                  readOnly: false,
                  padding: { top: 12, bottom: 12 },
                  overviewRulerBorder: false,
                  smoothScrolling: false,
                  cursorSurroundingLines: 0,
                  cursorSurroundingLinesStyle: 'default',
                  fixedOverflowWidgets: true,
                  renderValidationDecorations: 'off',
                  scrollbar: {
                    vertical: 'visible',
                    horizontal: 'visible',
                    verticalScrollbarSize: 8,
                    horizontalScrollbarSize: 8
                  }
                }}
              />
            </div>
          </div>

          {/* Bottom: Tabbed Testcase & Output Console */}
          <div className="console-panel-box">
            <div className="console-tabs-bar">
              <div className="console-tabs-left">
                <button
                  className={`console-tab-btn ${consoleTab === 'testcases' ? 'active' : ''}`}
                  onClick={() => setConsoleTab('testcases')}
                >
                  <i className="fas fa-vial"></i> Testcases
                </button>
                <button
                  className={`console-tab-btn ${consoleTab === 'customInput' ? 'active' : ''}`}
                  onClick={() => setConsoleTab('customInput')}
                >
                  <i className="fas fa-keyboard"></i> Custom Input
                </button>
                <button
                  className={`console-tab-btn ${consoleTab === 'result' ? 'active' : ''}`}
                  onClick={() => setConsoleTab('result')}
                >
                  <i className="fas fa-poll"></i> Execution Output
                </button>
              </div>

              {executionResult && (
                <div className="console-status-pill">
                  <span className={`verdict-badge ${getVerdictClass(executionResult.verdict)}`}>
                    {executionResult.verdict}
                  </span>
                  {activeReport && (
                    <button
                      className="btn-open-report-pill"
                      onClick={() => setShowReportModal(true)}
                    >
                      <i className="fas fa-file-invoice"></i> View Report
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="console-body">
              {/* TAB 1: Sample Test Cases Selection */}
              {consoleTab === 'testcases' && (
                <div className="testcase-tab-content">
                  {sampleCases.length === 0 ? (
                    <div className="empty-state-text">No sample testcases provided. Use Custom Input tab to test.</div>
                  ) : (
                    <div>
                      <div className="case-selector-buttons">
                        {sampleCases.map((tc, idx) => (
                          <button
                            key={idx}
                            className={`btn-case-selector ${selectedCaseIdx === idx ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedCaseIdx(idx);
                              setCustomStdin(tc.input || '');
                            }}
                          >
                            Case {idx + 1}
                          </button>
                        ))}
                      </div>

                      {sampleCases[selectedCaseIdx] && (
                        <div className="case-preview-box">
                          <div className="case-preview-group">
                            <label>Input:</label>
                            <pre>{sampleCases[selectedCaseIdx].input}</pre>
                          </div>
                          <div className="case-preview-group">
                            <label>Expected Output:</label>
                            <pre>{sampleCases[selectedCaseIdx].expectedOutput}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Custom Stdin */}
              {consoleTab === 'customInput' && (
                <div className="custom-stdin-content">
                  <label className="console-label">Standard Input (stdin):</label>
                  <textarea
                    rows={4}
                    value={customStdin}
                    onChange={(e) => setCustomStdin(e.target.value)}
                    className="custom-stdin-textarea"
                    placeholder="Enter arguments or inputs to pass to your program..."
                  />
                </div>
              )}

              {/* TAB 3: Execution Result */}
              {consoleTab === 'result' && (
                <div className="execution-result-content">
                  {loadingAction ? (
                    <div className="console-loading-state">
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>{loadingAction === 'run' ? 'Compiling and executing your code...' : 'Evaluating against all test cases...'}</span>
                    </div>
                  ) : !executionResult ? (
                    <div className="empty-state-text">
                      Click <strong>"Run Code"</strong> to test custom inputs or <strong>"Submit"</strong> to evaluate against all test cases.
                    </div>
                  ) : (
                    <div>
                      {/* Metric summary banner */}
                      <div className="result-stats-strip">
                        <div>
                          <span className="strip-lbl">Verdict:</span>
                          <span className={`verdict-badge ${getVerdictClass(executionResult.verdict)}`}>
                            {executionResult.verdict}
                          </span>
                        </div>
                        <div>
                          <span className="strip-lbl">Runtime:</span>
                          <strong>{executionResult.runtime ?? executionResult.runtimeMs ?? 0} ms</strong>
                        </div>
                        <div>
                          <span className="strip-lbl">Memory:</span>
                          <strong>{executionResult.memory ?? executionResult.memoryKb ?? 0} KB</strong>
                        </div>
                        {!executionResult.isRunOnly && executionResult.totalTests > 0 && (
                          <div>
                            <span className="strip-lbl">Score:</span>
                            <strong style={{ color: '#34d399' }}>
                              {executionResult.score ?? 0} / 100 ({executionResult.passedTests || executionResult.passedTestCases || 0}/{executionResult.totalTests || executionResult.totalTestCases || 0} passed)
                            </strong>
                          </div>
                        )}
                      </div>

                      {/* Error details if provider service error */}
                      {['Execution Service Error', 'Server Error'].includes(executionResult.verdict) && (
                        <div className="service-error-alert">
                          <i className="fas fa-exclamation-triangle"></i>
                          <div>
                            <strong>Execution Provider Unavailable</strong>
                            <p>{getExecutionServiceMessage(executionResult.serviceReason)}</p>
                          </div>
                        </div>
                      )}

                      {/* Stdout */}
                      {(executionResult.output || executionResult.stdout) && (
                        <div className="output-section-block">
                          <label className="console-label">Standard Output:</label>
                          <pre className="stdout-terminal">{executionResult.output || executionResult.stdout}</pre>
                        </div>
                      )}

                      {/* Stderr / Errors */}
                      {executionResult.stderr && executionResult.verdict !== 'Execution Service Error' && (
                        <div className="output-section-block error-block">
                          <label className="console-label error-label">Standard Error / Stack Trace:</label>
                          <pre className="stderr-terminal">{executionResult.stderr}</pre>
                        </div>
                      )}

                      {/* Test case breakdown table */}
                      {!executionResult.isRunOnly && (executionResult.testResults || executionResult.testCaseResults) && (
                        <div className="output-section-block">
                          <label className="console-label">Test Case Results:</label>
                          <div className="table-responsive">
                            <table className="mini-test-table">
                              <thead>
                                <tr>
                                  <th>Case #</th>
                                  <th>Result</th>
                                  <th>Expected</th>
                                  <th>Actual</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(executionResult.testResults || executionResult.testCaseResults).map((tc, idx) => (
                                  <tr key={idx}>
                                    <td>#{idx + 1}</td>
                                    <td>
                                      <span className={tc.passed ? 'tag-pass' : 'tag-fail'}>
                                        {tc.passed ? 'PASS' : 'FAIL'}
                                      </span>
                                    </td>
                                    <td><code>{tc.expectedOutput || 'Hidden'}</code></td>
                                    <td><code>{tc.actualOutput || (tc.passed ? 'Passed' : 'Failed')}</code></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Automatic Assessment Report Modal */}
      {showReportModal && activeReport && (
        <CodingReportModal
          report={activeReport}
          problem={currentProblem || problem}
          onClose={() => setShowReportModal(false)}
          onReturnToPractice={onExit}
        />
      )}
    </div>
  );
};

export default CodingWorkspace;
