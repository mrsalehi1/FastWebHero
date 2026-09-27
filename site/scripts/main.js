const header = document.querySelector(".site-header");
const toggle = document.querySelector(".nav-toggle");

if (header instanceof HTMLElement && toggle instanceof HTMLButtonElement) {
  toggle.addEventListener("click", () => {
    const open = header.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
}
