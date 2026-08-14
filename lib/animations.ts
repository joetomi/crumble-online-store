export function animateCookieToSlot(
  source: HTMLElement,
  target: HTMLElement,
  image: string,
) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const start = source.getBoundingClientRect();
  const end = target.getBoundingClientRect();
  const flying = document.createElement("img");
  const size = Math.min(start.width, 116);

  flying.src = image;
  flying.alt = "";
  flying.className = "flying-cookie";
  Object.assign(flying.style, {
    position: "fixed",
    zIndex: "100",
    pointerEvents: "none",
    width: `${size}px`,
    height: `${size}px`,
    objectFit: "cover",
    borderRadius: "50%",
    left: `${start.left + start.width / 2 - size / 2}px`,
    top: `${start.top + start.height / 2 - size / 2}px`,
  });
  document.body.appendChild(flying);

  const x = end.left + end.width / 2 - (start.left + start.width / 2);
  const y = end.top + end.height / 2 - (start.top + start.height / 2);
  const animation = flying.animate(
    [
      { transform: "translate3d(0,0,0) scale(1) rotate(0deg)", opacity: 0.95 },
      { transform: `translate3d(${x * 0.48}px,${y * 0.32 - 54}px,0) scale(.78) rotate(9deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate3d(${x}px,${y}px,0) scale(.52) rotate(-5deg)`, opacity: 0.86 },
    ],
    { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" },
  );
  animation.onfinish = () => flying.remove();
  animation.oncancel = () => flying.remove();
}
