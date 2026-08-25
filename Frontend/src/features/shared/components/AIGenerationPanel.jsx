import React, { useState, useEffect } from 'react';
import { api } from '../../../shared/services/api';
import './AIGenerationPanel.css';

const AIGenerationPanel = ({ contentType = 'aptitude', onClose, onSave, isSaving = false, saveError = '' }) => {
  const [step, setStep] = useState('form'); // 'form' | 'generating' | 'review'
  const [isStampAnimating, setIsStampAnimating] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    topic: contentType === 'aptitude' ? 'Quantitative Aptitude' : 'Arrays',
    difficulty: 'Medium',
    count: 5,
    jobContext: '',
    languages: ['javascript']
  });

  const [generatedData, setGeneratedData] = useState(null);
  const [validationWarning, setValidationWarning] = useState('');
  
  // Track single question regeneration
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);

  const isCoding = contentType === 'coding';

  const toRoman = (num) => {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
    return roman[num] || num;
  };

  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

  const handleGenerate = async (e, singleIndex = null) => {
    if (e) e.preventDefault();
    setError('');
    
    if (singleIndex !== null) {
      setRegeneratingIndex(singleIndex);
    } else {
      setStep('generating');
      setGenerationProgress({ current: 0, total: formData.count });
    }
    
    try {
      if (isCoding) {
        const res = await api.post('/coding/problems/generate', {
          topic: formData.topic,
          difficulty: formData.difficulty,
          languages: formData.languages
        });
        if (res.data && res.data.success) {
          setGeneratedData(res.data.data);
          setStep('review');
          setTimeout(() => setIsStampAnimating(true), 100);
        } else {
          throw new Error(res.data.error || 'Generation failed');
        }
      } else {
        // Chunking logic for aptitude tests
        const countToGenerate = singleIndex !== null ? 1 : formData.count;
        let allGenerated = [];
        let chunks = [];
        
        // Chunk sizes of 10 to avoid timeouts and Gemini token limits
        let remaining = countToGenerate;
        while (remaining > 0) {
          chunks.push(Math.min(10, remaining));
          remaining -= Math.min(10, remaining);
        }

        for (let i = 0; i < chunks.length; i++) {
          const res = await api.post('/aptitude/generate', {
            topic: formData.topic,
            difficulty: formData.difficulty,
            count: chunks[i],
            jobContext: formData.jobContext
          });

          if (res.data && res.data.success) {
            allGenerated = [...allGenerated, ...res.data.data];
            setGenerationProgress(prev => ({ ...prev, current: allGenerated.length }));
            if (res.data.data._validationWarning) {
              setValidationWarning(res.data.data._validationWarning);
            }
          } else {
            throw new Error(res.data.error || 'Generation failed');
          }
        }

        if (singleIndex !== null) {
          const newQuestions = [...generatedData];
          newQuestions[singleIndex] = allGenerated[0];
          setGeneratedData(newQuestions);
          setRegeneratingIndex(null);
        } else {
          setGeneratedData(allGenerated);
          setStep('review');
          setTimeout(() => setIsStampAnimating(true), 100);
        }
      }
    } catch (err) {
      setError(err.message || 'Error generating content. Please try again.');
      if (singleIndex === null) setStep('form');
      setRegeneratingIndex(null);
    }
  };

  const handleAccept = () => {
    // Pass true to flag that it should be published immediately
    onSave(generatedData, true);
  };

  const handleUpdateQuestion = (idx, field, value) => {
    const newQuestions = [...generatedData];
    newQuestions[idx] = { ...newQuestions[idx], [field]: value };
    setGeneratedData(newQuestions);
  };

  const handleUpdateOption = (qIdx, optIdx, value) => {
    const newQuestions = [...generatedData];
    const newOptions = [...newQuestions[qIdx].options];
    newOptions[optIdx] = value;
    newQuestions[qIdx] = { ...newQuestions[qIdx], options: newOptions };
    setGeneratedData(newQuestions);
  };

  const handleRemoveQuestion = (idx) => {
    const newQuestions = generatedData.filter((_, i) => i !== idx);
    setGeneratedData(newQuestions);
  };

  const handleAddQuestionManually = () => {
    const newQuestions = [...generatedData, {
      sectionName: formData.topic,
      text: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      marks: 1,
      negativeMarks: 0.25,
      difficulty: 'Medium',
      explanation: ''
    }];
    setGeneratedData(newQuestions);
  };

  return (
    <div className="ai-generation-panel-overlay">
      <div className="ai-generation-panel">
        
        <img src="/rit-logo.png" alt="Watermark" className="ai-watermark" />
        
        <div className="ai-panel-header">
          <img 
            src="/rit-logo.png" 
            alt="RIT Crest" 
            className={`ai-panel-stamp ${isStampAnimating ? 'stamp-animate' : ''}`}
            onAnimationEnd={() => setIsStampAnimating(false)} 
          />
          <h3 className={`ai-panel-title ${isCoding ? 'coding' : ''}`}>
            {isCoding ? 'Draft Coding Problem' : 'Draft Aptitude Assessment'}
          </h3>
        </div>

        <div className="ai-panel-body">
          {error && <div style={{ color: 'var(--seal-maroon)', marginBottom: '15px', fontWeight: 500 }}>{error}</div>}
          
          {step === 'form' && (
            <form id="ai-generate-form" onSubmit={(e) => handleGenerate(e)}>
              <div className="ai-form-group">
                <label>Topic / {isCoding ? 'Pattern' : 'Category'}</label>
                <input
                  type="text"
                  required
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder={isCoding ? "e.g. Arrays, Dynamic Programming" : "e.g. Quantitative Aptitude, Logical Reasoning"}
                />
              </div>
              <div className="ai-form-group">
                <label>Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              {!isCoding && (
                <>
                  <div className="ai-form-group">
                    <label>Number of Questions</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      required
                      value={formData.count}
                      onChange={(e) => setFormData({ ...formData, count: Number(e.target.value) })}
                    />
                  </div>
                  <div className="ai-form-group">
                    <label>Job Context (Optional)</label>
                    <textarea
                      rows="3"
                      value={formData.jobContext}
                      onChange={(e) => setFormData({ ...formData, jobContext: e.target.value })}
                      placeholder="Paste job description or specific skills to tailor questions..."
                    />
                  </div>
                </>
              )}

              {isCoding && (
                <div className="ai-form-group">
                  <label>Target Languages (Optional)</label>
                  <input
                    type="text"
                    value={formData.languages.join(', ')}
                    onChange={(e) => setFormData({ ...formData, languages: e.target.value.split(',').map(l => l.trim()) })}
                    placeholder="e.g. javascript, python"
                  />
                </div>
              )}
            </form>
          )}

          {step === 'generating' && (
            <div className="ai-generating-status">
              <i className="fas fa-feather-alt fa-pulse"></i>
              <h3>Drafting formal document...</h3>
              <p style={{ opacity: 0.7, marginBottom: '10px' }}>Please wait while the AI prepares the assessment.</p>
              {!isCoding && generationProgress.total > 10 && (
                <p style={{ fontWeight: 600, color: 'var(--seal-gold)' }}>
                  Generated {generationProgress.current} / {generationProgress.total} questions...
                </p>
              )}
            </div>
          )}

          {step === 'review' && generatedData && (
            <div className="ai-review-section">
              {validationWarning && (
                <div style={{ padding: '10px', background: 'rgba(122, 31, 31, 0.1)', color: 'var(--seal-maroon)', marginBottom: '20px', borderRadius: '2px', borderLeft: '3px solid var(--seal-maroon)' }}>
                  <strong><i className="fas fa-exclamation-triangle"></i> Validation Note:</strong> {validationWarning}
                </div>
              )}

              {!isCoding && Array.isArray(generatedData) && generatedData.map((q, idx) => (
                <div 
                  key={idx} 
                  className="ai-result-card" 
                  style={{ animationDelay: `${idx * 0.1}s`, opacity: regeneratingIndex === idx ? 0.5 : 1, pointerEvents: regeneratingIndex === idx ? 'none' : 'auto' }}
                >
                  <div className="ai-sequence-numeral">{toRoman(idx + 1)}.</div>
                  <div className="ai-result-content">
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <input 
                        type="text" 
                        value={q.sectionName || q.subtopic || ''} 
                        onChange={e => handleUpdateQuestion(idx, 'sectionName', e.target.value)} 
                        className="ai-edit-input" 
                        style={{ fontSize: '0.85rem', padding: '4px 8px', width: '200px' }} 
                        placeholder="Subtopic"
                      />
                      <div>
                        <button type="button" className="ai-btn ai-btn-cancel" style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: '5px' }} onClick={() => handleGenerate(null, idx)}>
                          {regeneratingIndex === idx ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>} Regenerate
                        </button>
                        <button type="button" className="ai-btn ai-btn-cancel" style={{ padding: '4px 8px', fontSize: '0.8rem', color: 'var(--seal-maroon)' }} onClick={() => handleRemoveQuestion(idx)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>

                    <textarea 
                      value={q.text} 
                      onChange={e => handleUpdateQuestion(idx, 'text', e.target.value)} 
                      rows={3} 
                      className="ai-edit-textarea" 
                      style={{ width: '100%', marginBottom: 10, fontWeight: 'bold' }} 
                      placeholder="Question Text"
                    />

                    <ul style={{ listStyleType: 'none', padding: 0, margin: '10px 0' }}>
                      {q.options.map((opt, i) => (
                        <li key={i} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="radio" 
                            name={`correct_${idx}`} 
                            checked={q.correctIndex === i} 
                            onChange={() => handleUpdateQuestion(idx, 'correctIndex', i)} 
                          />
                          <span style={{ minWidth: '20px' }}>{String.fromCharCode(65 + i)}.</span>
                          <input 
                            type="text" 
                            value={opt} 
                            onChange={e => handleUpdateOption(idx, i, e.target.value)} 
                            className="ai-edit-input" 
                            style={{ flex: 1, padding: '6px' }} 
                          />
                        </li>
                      ))}
                    </ul>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginTop: '10px' }}>
                       <select 
                         value={q.difficulty} 
                         onChange={e => handleUpdateQuestion(idx, 'difficulty', e.target.value)}
                         className="ai-edit-input"
                         style={{ padding: '6px' }}
                       >
                         <option value="Easy">Easy</option>
                         <option value="Medium">Medium</option>
                         <option value="Hard">Hard</option>
                       </select>
                       <textarea 
                         value={q.explanation} 
                         onChange={e => handleUpdateQuestion(idx, 'explanation', e.target.value)} 
                         rows={2} 
                         className="ai-edit-textarea" 
                         style={{ flex: 1, fontSize: '0.85rem' }} 
                         placeholder="Explanation"
                       />
                    </div>

                  </div>
                </div>
              ))}

              {!isCoding && Array.isArray(generatedData) && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <button type="button" className="ai-btn" onClick={handleAddQuestionManually} style={{ background: 'transparent', border: '1px dashed var(--seal-green)', color: 'var(--seal-green)' }}>
                    <i className="fas fa-plus"></i> Add Question Manually
                  </button>
                </div>
              )}

              {isCoding && !Array.isArray(generatedData) && (
                <div className="ai-result-card" style={{ animationDelay: '0.1s' }}>
                   <div className="ai-sequence-numeral">I.</div>
                   <div className="ai-result-content">
                     <h4>{generatedData.title}</h4>
                     <span className={`ai-tag ${generatedData.difficulty.toLowerCase()}`}>{generatedData.difficulty}</span>
                     
                     <h5 style={{ marginTop: '15px' }}>Problem Statement</h5>
                     <p>{generatedData.statementMarkdown}</p>
                     
                     <h5 style={{ marginTop: '15px' }}>Constraints</h5>
                     <p>{generatedData.constraints}</p>

                     <h5 style={{ marginTop: '15px' }}>Sample Test Cases ({generatedData.sampleTestCases?.length || 0})</h5>
                     {generatedData.sampleTestCases?.map((tc, idx) => (
                       <div key={idx} style={{ marginBottom: '10px', fontSize: '0.9rem' }}>
                         <strong>Input:</strong> {tc.input} <br/>
                         <strong>Output:</strong> {tc.expectedOutput}
                       </div>
                     ))}
                   </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="ai-panel-footer">
          {saveError && step === 'review' && (
            <div style={{ flex: 1, color: 'var(--seal-maroon)', fontSize: '0.9rem', alignSelf: 'center' }}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: '5px' }}></i>
              {saveError}
            </div>
          )}
          {step === 'form' && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '15px' }}>
              <button className="ai-btn ai-btn-cancel" onClick={onClose}>Cancel</button>
              <button className="ai-btn ai-btn-submit" type="submit" form="ai-generate-form">Generate</button>
            </div>
          )}
          {step === 'review' && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '15px' }}>
              <button className="ai-btn ai-btn-cancel" onClick={() => setStep('form')} disabled={isSaving}>Discard All & Retry</button>
              <button className="ai-btn ai-btn-submit" onClick={handleAccept} disabled={isSaving}>
                {isSaving ? 'Publishing...' : 'Publish Test'}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AIGenerationPanel;
