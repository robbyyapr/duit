const CLASS_NAME = 'duit-privacy-blur';
const MASK_CLASS = 'duit-privacy-mask';

const ensureStyles = () => {
  if (document.getElementById('duit-privacy-style')) return;
  const style = document.createElement('style');
  style.id = 'duit-privacy-style';
  style.textContent = `
    .${CLASS_NAME} {
      filter: blur(12px);
      transition: filter 0.2s ease;
      pointer-events: none;
    }
    .${MASK_CLASS} {
      color: transparent !important;
      text-shadow: 0 0 12px rgba(0,0,0,0.5);
    }
  `;
  document.head.appendChild(style);
};

const applyBlur = (active: boolean) => {
  ensureStyles();
  const root = document.getElementById('root');
  if (!root) return;
  if (active) {
    root.classList.add(CLASS_NAME);
  } else {
    root.classList.remove(CLASS_NAME);
  }
};

const toggleMask = (active: boolean) => {
  ensureStyles();
  const elements = document.querySelectorAll('[data-privacy-mask="true"]');
  elements.forEach(elem => {
    if (active) {
      elem.classList.add(MASK_CLASS);
    } else {
      elem.classList.remove(MASK_CLASS);
    }
  });
};

export const Privacy = {
  applyBlur,
  toggleMask,
};