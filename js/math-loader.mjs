// Load the self-hosted Math.js browser bundle only when one of the math tools is opened.
let loading;
export function loadMath() {
  if (window.math?.unit && window.math?.evaluate) return Promise.resolve(window.math);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('./vendor/math.js', import.meta.url).href;
    script.async = true;
    script.onload = () => window.math?.unit ? resolve(window.math) : reject(new Error('Math.js did not initialize'));
    script.onerror = () => reject(new Error('The calculator library could not be loaded'));
    document.head.appendChild(script);
  }).catch(error => { loading = null; throw error; });
  return loading;
}
