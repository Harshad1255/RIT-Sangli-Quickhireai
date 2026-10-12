import './FullscreenGate.css';

const FullscreenGate = ({ onStart, ready, requesting, error }) => (
  <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f8fafc',padding:24}}>
    <section style={{maxWidth:640,background:'white',padding:40,borderRadius:16,boxShadow:'0 4px 24px #cbd5e1',textAlign:'center'}}>
      <h1>Ready for your interview?</h1>
      <p>Fullscreen is required while answering questions. If you leave fullscreen, your interview will pause until you return. Your answers and progress will be preserved.</p>
      <p>Camera preview requires browser permission. Recording starts only when you choose to record your answer.</p>
      {!ready && <p role="status">Preparing your interview session…</p>}
      {error && <p role="alert" style={{color:'#b91c1c'}}>{error}</p>}
      <button className="fullscreen-button" onClick={onStart} disabled={!ready || requesting}>
        {requesting ? 'Entering fullscreen…' : 'Start Interview in Fullscreen'}
      </button>
      {error && !ready && <button onClick={()=>window.location.reload()}>Retry initialization</button>}
    </section>
  </main>
);
const typedProp = type => (props, name) => props[name] == null || typeof props[name] === type ? null : new Error(`Invalid ${name}`);
FullscreenGate.propTypes = {onStart:typedProp('function'),ready:typedProp('boolean'),requesting:typedProp('boolean'),error:typedProp('string')};
export default FullscreenGate;
