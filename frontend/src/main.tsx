import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { UserApp } from "./pages/UserApp";
import { AdminLayout } from "./components/AdminLayout";
import { AdminStudio } from "./pages/AdminStudio";
import { AdminCenter } from "./pages/AdminCenter";

function resolveRoute(pathname: string): "user" | "studio" | "center" {
  const clean = pathname.toLowerCase();
  if (clean.startsWith("/admin/studio")) return "studio";
  if (clean.startsWith("/admin/center") || clean === "/admin") return "center";
  return "user";
}

function RootRouter() {
  const [route, setRoute] = useState<"user" | "studio" | "center">(() =>
    resolveRoute(window.location.pathname)
  );

  useEffect(() => {
    const onPopState = () => setRoute(resolveRoute(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (target: "user" | "studio" | "center") => {
    const path =
      target === "studio"
        ? "/admin/studio"
        : target === "center"
        ? "/admin/center"
        : "/";
    window.history.pushState({}, "", path);
    setRoute(target);
  };

  // Nếu ở đường dẫn "/" -> Chỉ hiển thị đúng Giao diện Du khách (UserApp), không lộ bất kỳ nút Admin nào
  if (route === "user") {
    return <UserApp />;
  }

  // Nếu gõ "/admin/studio" hoặc "/admin/center" -> Hiển thị Hệ thống Quản trị B2B
  return (
    <AdminLayout activePage={route} onNavigate={navigate}>
      {route === "studio" ? <AdminStudio /> : <AdminCenter />}
    </AdminLayout>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootRouter />
  </StrictMode>
);