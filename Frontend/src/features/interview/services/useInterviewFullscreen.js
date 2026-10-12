import { useCallback, useEffect, useRef, useState } from 'react';
export const fullscreenActive = () => !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
export default function useInterviewFullscreen() {
  const [active, setActive] = useState(fullscreenActive);
  const [error, setError] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    const update = () => setActive(fullscreenActive());
    const events = ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange','MSFullscreenChange'];
    events.forEach(event=>document.addEventListener(event,update));
    update();
    return ()=>events.forEach(event=>document.removeEventListener(event,update));
  }, []);
  const request = useCallback(async () => {
    if (pending.current) return false;
    pending.current = true;
    setRequesting(true);
    setError(null);
    try {
      const target = document.documentElement;
      const enter = target.requestFullscreen || target.webkitRequestFullscreen || target.mozRequestFullScreen || target.msRequestFullscreen;
      if (!enter) throw new Error('Fullscreen is not supported. Please use a desktop browser that supports fullscreen.');
      await enter.call(target);
      const confirmed = fullscreenActive();
      setActive(confirmed);
      if (!confirmed) throw new Error('Fullscreen was not confirmed. Please try again.');
      return true;
    } catch (failure) {
      setError(failure.message || 'Fullscreen was blocked. Please allow it and try again.');
      return false;
    } finally {
      pending.current = false;
      setRequesting(false);
    }
  }, []);
  const exit = useCallback(async () => {
    if (!fullscreenActive()) return;
    const leave = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (leave) await leave.call(document);
  }, []);
  return {active, request, exit, error, requesting};
}
