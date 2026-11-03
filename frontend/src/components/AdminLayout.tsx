import { useEffect, useState, type ReactNode } from "react";
import { getStore, subscribeStore, type HXRSystemState } from "../syncStore";

interface AdminLayoutProps {
  activePage: "studio" | "center";
  onNavigate: (page: "user" | "studio" | "center" | "split") => void;
  children: ReactNode;
}

export function AdminLayout({
  activePage,
  onNavigate,
  children,
}: AdminLayoutProps) {
  const [store, setStore] = useState<HXRSystemState>(() => getStore());

  useEffect(() => {
    return subscribeStore(setStore);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#07090c",
        color: "#f2f2ee",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* SIDEBAR TỐI GIẢN */}
      <aside
        style={{
          width: "216px",
          background: "#0b0e13",
          borderRight: "1px solid #161b22",
          padding: "20px 14px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          {/* Logo gọn */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "0 6px 18px",
              marginBottom: "18px",
              borderBottom: "1px solid #161b22",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                background: "#c8aa6e",
                color: "#07090c",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: "12px",
              }}
            >
              HX
            </div>
            <div>
              <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#f2f2ee" }}>
                HeritageXR
              </div>
              <div style={{ fontSize: "10.5px", color: "#68707c" }}>
                Quản trị Bảo tàng
              </div>
            </div>
          </div>

          {/* 2 Nút Menu 1 dòng sạch sẽ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <button
              type="button"
              onClick={() => onNavigate("studio")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: "8px",
                border:
                  activePage === "studio"
                    ? "1px solid rgba(200, 170, 110, 0.45)"
                    : "1px solid transparent",
                background:
                  activePage === "studio"
                    ? "rgba(200, 170, 110, 0.1)"
                    : "transparent",
                color: activePage === "studio" ? "#f2f2ee" : "#808894",
                fontWeight: activePage === "studio" ? 600 : 500,
                fontSize: "12.5px",
                cursor: "pointer",
              }}
            >
              <span>✦ AI Studio</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("center")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: "8px",
                border:
                  activePage === "center"
                    ? "1px solid rgba(200, 170, 110, 0.45)"
                    : "1px solid transparent",
                background:
                  activePage === "center"
                    ? "rgba(200, 170, 110, 0.1)"
                    : "transparent",
                color: activePage === "center" ? "#f2f2ee" : "#808894",
                fontWeight: activePage === "center" ? 600 : 500,
                fontSize: "12.5px",
                cursor: "pointer",
              }}
            >
              <span>📊 Thống kê & Quầy</span>
              {!store.watermarkUnlocked && (
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "#f59e0b",
                  }}
                />
              )}
            </button>
          </div>
        </div>

        {/* Lối tắt sang trang Du khách */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <button
            type="button"
            onClick={() => window.open("/", "_blank")}
            style={{
              padding: "9px 12px",
              borderRadius: "7px",
              border: "1px solid #1d232c",
              background: "#10141b",
              color: "#e4cfa3",
              fontSize: "11.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ↗ Mở trang Du khách
          </button>

          <button
            type="button"
            onClick={() => onNavigate("user")}
            style={{
              padding: "7px 12px",
              border: "none",
              background: "transparent",
              color: "#68707c",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            ← Về trang chính
          </button>
        </div>
      </aside>

      {/* NỘI DUNG CHÍNH */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <main
          style={{
            flex: 1,
            padding: "24px 32px",
            overflowY: "auto",
            maxWidth: "1300px",
            width: "100%",
            margin: "0 auto",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}