import './index.css';

// Views mount single components with mocked routers, so their links are plain anchors; following
// one would navigate the test page away. Navigation itself is covered by the journeys.
document.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('a[href]')) event.preventDefault();
});
