/**
 * Page toast for share links. Built as IIFE; background calls __dropimgToast.
 */
(() => {
  const w = window as unknown as {
    __dropimgToast?: (
      url: string,
      labels: {
        title: string;
        copy: string;
        open: string;
        copied: string;
      },
      durationMs: number,
    ) => void;
  };

  w.__dropimgToast = (url, labels, durationMs) => {
    const ID = "dropimg-share-toast";
    document.getElementById(ID)?.remove();

    const root = document.createElement("div");
    root.id = ID;
    root.setAttribute("role", "status");
    Object.assign(root.style, {
      position: "fixed",
      left: "50%",
      bottom: "28px",
      transform: "translateX(-50%) translateY(12px)",
      zIndex: "2147483647",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      width: "min(420px, calc(100vw - 24px))",
      padding: "14px 16px",
      borderRadius: "14px",
      background: "#0f1b2e",
      color: "#e8eef7",
      fontFamily:
        '"Segoe UI", "Avenir Next", "Helvetica Neue", ui-sans-serif, system-ui, sans-serif',
      boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
      border: "1px solid rgba(255,255,255,0.12)",
      opacity: "0",
      transition: "opacity 180ms ease, transform 180ms ease",
    } as CSSStyleDeclaration);

    const title = document.createElement("div");
    title.textContent = labels.title;
    Object.assign(title.style, {
      fontWeight: "750",
      fontSize: "14px",
      letterSpacing: "-0.02em",
    } as CSSStyleDeclaration);

    const link = document.createElement("div");
    link.textContent = url.replace(/^https?:\/\//, "");
    Object.assign(link.style, {
      fontSize: "12px",
      color: "#8b9bb4",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      userSelect: "all",
    } as CSSStyleDeclaration);
    link.title = url;

    const actions = document.createElement("div");
    Object.assign(actions.style, {
      display: "flex",
      gap: "8px",
    } as CSSStyleDeclaration);

    const mkBtn = (text: string, primary: boolean) => {
      const b = document.createElement(primary ? "button" : "a") as
        | HTMLButtonElement
        | HTMLAnchorElement;
      b.textContent = text;
      Object.assign(b.style, {
        flex: "1",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "34px",
        borderRadius: "10px",
        font: "650 12px/1 inherit",
        cursor: "pointer",
        textDecoration: "none",
        border: primary ? "0" : "1px solid rgba(255,255,255,0.14)",
        background: primary ? "#2563eb" : "transparent",
        color: "#fff",
      } as CSSStyleDeclaration);
      return b;
    };

    const copyBtn = mkBtn(labels.copy, true) as HTMLButtonElement;
    copyBtn.type = "button";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(url);
        copyBtn.textContent = labels.copied;
      } catch {
        // ignore
      }
    });

    const openBtn = mkBtn(labels.open, false) as HTMLAnchorElement;
    openBtn.href = url;
    openBtn.target = "_blank";
    openBtn.rel = "noopener";

    actions.append(copyBtn, openBtn);
    root.append(title, link, actions);
    document.documentElement.append(root);

    requestAnimationFrame(() => {
      root.style.opacity = "1";
      root.style.transform = "translateX(-50%) translateY(0)";
    });

    const hide = () => {
      root.style.opacity = "0";
      root.style.transform = "translateX(-50%) translateY(12px)";
      setTimeout(() => root.remove(), 200);
    };

    const timer = window.setTimeout(hide, durationMs);
    root.addEventListener("click", (e) => {
      if (e.target === root) {
        clearTimeout(timer);
        hide();
      }
    });
  };
})();
