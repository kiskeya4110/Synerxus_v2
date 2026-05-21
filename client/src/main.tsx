import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import ErrorBoundary from "@/components/error-boundary";
import "./index.css";
import "./service-worker-register";

const rootElement = document.getElementById("root");
const FullAppShell = lazy(() => import("./full-app-shell"));

function showBootstrapError(error: unknown) {
  const message = error instanceof Error ? error.message : "The application failed to start.";

  if (!rootElement) {
    return;
  }

  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FDF8F3;color:#0f172a;">
      <div style="max-width:460px;width:100%;border:1px solid #e7e5e4;border-radius:8px;background:#fff;padding:20px;box-shadow:0 12px 30px rgba(15,23,42,0.08);">
        <p style="margin:0 0 8px;font-size:16px;font-weight:800;">Synerxus could not load</p>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.5;color:#57534e;">The preview server is responding, but the browser failed while starting the app.</p>
        <pre style="white-space:pre-wrap;word-break:break-word;margin:0;padding:12px;border-radius:6px;background:#fef2f2;color:#991b1b;font-size:12px;line-height:1.45;">${message}</pre>
      </div>
    </div>
  `;
}

try {
  if (!rootElement) {
    throw new Error("Missing #root element.");
  }

  createRoot(rootElement).render(
    <ErrorBoundary>
      <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#FDF8F3'}}><div style={{width:36,height:36,border:'3px solid #d6d3d1',borderTopColor:'#0A2463',borderRadius:'999px',animation:'synerxus-spin 900ms linear infinite'}} /></div>}>
        <FullAppShell />
      </Suspense>
    </ErrorBoundary>
  );
} catch (error) {
  console.error("Synerxus bootstrap failed:", error);
  showBootstrapError(error);
}
