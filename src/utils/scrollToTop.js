/**
 * Utility function to reset scroll position to the top across the entire application.
 * Handles window, document body, and any specific internal scrollable containers.
 */
export function scrollToTop() {
  const resetScroll = () => {
    // 1. Reset standard window and document scrolling
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (typeof document !== 'undefined') {
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;
      }

      // 2. Target known internal scrollable containers across screens
      const containerSelectors = [
        '.main-content',
        '.app-container',
        '.smart-revision-main',
        '.messages-container',
        '.coding-messages-container',
        '.cards-grid',
        '.step-select-wrapper',
        '.revision-material-view',
        '.quiz-view'
      ];

      containerSelectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          el.scrollTop = 0;
        });
      });

      // 3. Reset any scrollable elements that may currently be scrolled down
      const allElements = document.querySelectorAll('*');
      allElements.forEach((el) => {
        if (el.scrollTop > 0) {
          el.scrollTop = 0;
        }
      });
    }
  };

  // Execute immediately
  resetScroll();

  // Execute in requestAnimationFrame to handle DOM updates after React state renders
  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    window.requestAnimationFrame(resetScroll);
  }
}
