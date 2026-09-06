/* Copy buttons for every code block. Nothing else runs on these pages:
   a chapter has to be readable with JavaScript off. */
(() => {
  const blocks = document.querySelectorAll(".codeblock");
  for (const block of blocks) {
    const btn = block.querySelector(".copy-btn");
    if (!btn) continue;
    btn.addEventListener("click", async () => {
      const text = block.dataset.copy ?? block.innerText.replace(/^copy\s*/i, "");
      let ok = false;
      try {
        await navigator.clipboard.writeText(text.trim());
        ok = true;
      } catch {
        /* clipboard blocked: the command is on screen either way */
      }
      btn.textContent = ok ? "copied" : "select it";
      btn.classList.toggle("ok", ok);
      setTimeout(() => {
        btn.textContent = "copy";
        btn.classList.remove("ok");
      }, 1800);
    });
  }
})();
