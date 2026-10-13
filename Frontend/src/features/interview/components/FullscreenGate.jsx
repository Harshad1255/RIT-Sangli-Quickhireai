import './FullscreenGate.css';

const FullscreenGate = ({ onPrepare, onStart, ready, requesting, preparing, mediaReady, mediaError, error }) => (
  <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f8fafc',padding:24}}>
    <section style={{maxWidth:640,background:'white',padding:40,borderRadius:16,boxShadow:'0 4px 24px #cbd5e1',textAlign:'center'}}>
      <h1>Ready for your interview?</h1>
      <p>Fullscreen is required while answering questions. If you leave fullscreen, your interview will pause until you return. Your answers and progress will be preserved.</p>
      <p>This interview requires camera and microphone access. Your camera will be used for the on-screen preview. The microphone is used when you choose to record an answer.</p>
      {!ready && <p role="status">Preparing your interview session…</p>}
      {error && <p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
      {mediaReady ? (
        <p role="status" style={{color:'#166534'}}>Camera and microphone are ready.</p>
      ) : (
        <button className="fullscreen-button" onClick={onPrepare} disabled={!ready || preparing}>
          {preparing ? 'Requesting camera and microphone…' : 'Allow Camera and Microphone'}
        </button>
      )}
      {mediaError && <p role="alert" style={{color:'#b91c1c'}}>{mediaError}</p>}
      <button className="fullscreen-button" onClick={onStart} disabled={!ready || !mediaReady || requesting}>
        {requesting ? 'Entering fullscreen…' : 'Start Interview in Fullscreen'}
      </button>
      {error && !ready && <button onClick={()=>window.location.reload()}>Retry initialization</button>}
    </section>
  </main>
);
const typedProp = type => (props, name) => props[name] == null || typeof props[name] === type ? null : new Error(`Invalid ${name}`);
FullscreenGate.propTypes = {onPrepare:typedProp('function'),onStart:typedProp('function'),ready:typedProp('boolean'),requesting:typedProp('boolean'),preparing:typedProp('boolean'),mediaReady:typedProp('boolean'),mediaError:typedProp('string'),error:typedProp('string')};
export default FullscreenGate;
