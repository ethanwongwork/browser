/**
 * Motion Animation Utilities
 * Using motion.dev with ease-out-quint easing
 * No scale/size transforms — only opacity, position, and color
 */

const { animate } = Motion;
const ease = [0.22, 1, 0.36, 1];

const motion = {
  fadeIn: (el, duration = 0.25) => animate(el, { opacity: [0, 1] }, { duration, easing: ease }),
  fadeOut: (el, duration = 0.25) => animate(el, { opacity: [1, 0] }, { duration, easing: ease }),
  slideInRight: (el, duration = 0.25) => animate(el, { x: [300, 0], opacity: [0, 1] }, { duration, easing: ease }),
  slideOutRight: (el, duration = 0.25) => animate(el, { x: [0, 300], opacity: [1, 0] }, { duration, easing: ease }),
  slideInUp: (el, duration = 0.25) => animate(el, { y: [8, 0], opacity: [0, 1] }, { duration, easing: ease }),
  slideOutDown: (el, duration = 0.25) => animate(el, { y: [0, 8], opacity: [1, 0] }, { duration, easing: ease }),
};

// Make motion available globally
window.motion = motion;
