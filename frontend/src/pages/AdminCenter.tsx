import { useEffect, useState } from "react";
import {
  getStore,
  subscribeStore,
  updateStore,
  type HXRSystemState,
} from "../syncStore";

export function AdminCenter() {
  const [store, setStore] = useState<HXRSystemState>(() => getStore());
  const [managerPin, setManagerPin] = useState("2026");
  const [receiptFileName, setReceiptFileName] = useState<string>("");
  const [receiptPreview, setReceiptPreview] = useState<string>("");
  const [posNotice, setPosNotice] = useState<string>("");

  useEffect(() => {
    return subscribeStore(setStore);
  }, []);

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
    setPosNotice("");
  };

  const handleLoadSampleReceipt = () => {
    setReceiptFileName(`Xac_Nhan_${store.activeOrderId}.png`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="90">
      <rect width="100%" height="100%" fill="#0b1914"/>
      <rect x="4" y="4" width="192" height="82" rx="5" fill="none" stroke="#10b981" stroke-width="1.5"/>
      <text x="14" y="28" fill="#10b981" font-family="sans-serif" font-size="11" font-weight="bold">ĐÃ XÁC NHẬN TẠI QUẦY</text>
      <text x="14" y="50" fill="#e4cfa3" font-family="monospace" font-size="11">Mã đơn: #${store.activeOrderId}</text>
      <text x="14" y="70" fill="#808894" font-family="sans-serif" font-size="10">Hợp lệ để mở khóa ảnh kỷ niệm</text>
    </svg>`;
    setReceiptPreview(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
    setPosNotice("");
  };

  const handleShiftManagerOverride = () => {
    if (managerPin !== "2026") {
      setPosNotice("Sai mã PIN Quản lý Ca.");
      return;
    }
    if (!receiptFileName) {
      setPosNotice("Vui lòng đính kèm ảnh xác nhận trước khi mở khóa.");
      return;
    }

    updateStore((prev) => {
      const updatedOrders = prev.orders.map((o) =>
        o.id === prev.activeOrderId
          ? {
              ...o,
              status: "pos_override_unlocked" as const,
              receiptImage: receiptFileName,
              overrideBy: "Shift Manager",
            }
          : o
      );
      return {
        ...prev,
        watermarkUnlocked: true,
        phygitalSold: prev.phygitalSold + 1,
        orders: updatedOrders,
      };
    }, `Đã xác nhận & mở khóa ảnh kỷ niệm cho mã #${store.activeOrderId}.`);

    setPosNotice(`✓ Đã mở khóa Watermark cho mã #${store.activeOrderId}.`);
  };

  const totalAccess = Math.max(1, store.arCount + store.catalogCount);
  const arRate = Math.round((store.arCount / totalAccess) * 100);
  const metricsList = Object.values(store.artifactMetrics);
  const totalRagQueries = metricsList.reduce((acc, m) => acc + m.ragQueries, 0);
  const totalSouvenirs = store.digitalSold + store.phygitalSold;

  const cardStyle: React.CSSProperties = {
    background: "#0b0e13",
    border: "1px solid #171c24",
    borderRadius: "10px",
    padding: "18px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#f2f2ee" }}>
          Thống kê Trải nghiệm & Xác nhận tại Quầy
        </h1>
      </div>

      {/* 4 THẺ CHỈ SỐ TƯƠNG TÁC (KHÔNG CÓ TIỀN BẠC) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        <div style={cardStyle}>
          <div style={{ fontSize: "11.5px", color: "#808894" }}>Lượt quét tham quan</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#f2f2ee", margin: "6px 0" }}>
            {store.scans.toLocaleString()}
          </div>
          <div style={{ fontSize: "11px", color: "#10b981" }}>
            AR Camera: {arRate}% · 3D Catalog: {100 - arRate}%
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: "11.5px", color: "#808894" }}>Thời gian lưu trú TB</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#e4cfa3", margin: "6px 0" }}>
            {store.dwellMinutes} phút
          </div>
          <div style={{ fontSize: "11px", color: "#808894" }}>
            Tăng 3.7x so với tham quan truyền thống
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: "11.5px", color: "#808894" }}>Câu hỏi Trợ lý AI</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#f2f2ee", margin: "6px 0" }}>
            {totalRagQueries.toLocaleString()}
          </div>
          <div style={{ fontSize: "11px", color: "#10b981" }}>
            100% trích xuất từ hồ sơ bảo tàng
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: "11.5px", color: "#808894" }}>Kỷ vật & Ưu đãi đã cấp</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#f2f2ee", margin: "6px 0" }}>
            {(totalSouvenirs + store.vouchersClaimed).toLocaleString()}
          </div>
          <div style={{ fontSize: "11px", color: "#808894" }}>
            Ảnh kỷ niệm AI: {totalSouvenirs} · Voucher: {store.vouchersClaimed}
          </div>
        </div>
      </div>

      {/* 2 CỘT CHÍNH: MỞ KHÓA TẠI QUẦY (TRÁI) & THỐNG KÊ HIỆN VẬT (PHẢI) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
        {/* Cột trái: Xác nhận & Mở khóa Watermark tại Quầy */}
        <div
          style={{
            ...cardStyle,
            border: "1px solid rgba(200, 170, 110, 0.4)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "14px",
              }}
            >
              <strong style={{ fontSize: "14px", color: "#f2f2ee" }}>
                Mở khóa Ảnh kỷ niệm tại Quầy (POS Override)
              </strong>
              <span
                style={{
                  fontSize: "11px",
                  padding: "3px 9px",
                  borderRadius: "99px",
                  background: store.watermarkUnlocked
                    ? "rgba(16, 185, 129, 0.14)"
                    : "rgba(245, 158, 11, 0.15)",
                  color: store.watermarkUnlocked ? "#10b981" : "#f59e0b",
                  fontWeight: 600,
                }}
              >
                {store.watermarkUnlocked ? "✓ Đã mở khóa" : "Đang khóa Watermark"}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              <div>
                <label style={{ fontSize: "11px", color: "#808894", display: "block", marginBottom: "5px" }}>
                  Mã ảnh của du khách
                </label>
                <input
                  type="text"
                  value={store.activeOrderId}
                  readOnly
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    background: "#07090c",
                    border: "1px solid #c8aa6e",
                    borderRadius: "7px",
                    color: "#e4cfa3",
                    fontWeight: 700,
                    fontSize: "12.5px",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "#808894", display: "block", marginBottom: "5px" }}>
                  Mã PIN Quản lý (2026)
                </label>
                <input
                  type="password"
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    background: "#07090c",
                    border: "1px solid #1d232d",
                    borderRadius: "7px",
                    color: "#fff",
                    fontSize: "12.5px",
                  }}
                />
              </div>
            </div>

            {/* Khung đính kèm ảnh xác nhận */}
            <div
              style={{
                padding: "12px",
                background: "#07090c",
                border: receiptFileName
                  ? "1px solid rgba(16, 185, 129, 0.4)"
                  : "1px dashed #242b38",
                borderRadius: "8px",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: receiptPreview ? "10px" : "0",
                }}
              >
                <span style={{ fontSize: "12px", color: "#d6d8d2" }}>
                  Ảnh xác nhận tại quầy *
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={handleLoadSampleReceipt}
                    style={{
                      padding: "4px 9px",
                      background: "rgba(200, 170, 110, 0.12)",
                      border: "1px solid #c8aa6e",
                      borderRadius: "5px",
                      color: "#e4cfa3",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ⚡ Nạp ảnh mẫu
                  </button>
                  <label
                    style={{
                      padding: "4px 9px",
                      background: "#121720",
                      border: "1px solid #242b38",
                      borderRadius: "5px",
                      color: "#d6d8d2",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    Chọn ảnh...
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>

              {receiptPreview && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <img
                    src={receiptPreview}
                    alt="Verification"
                    style={{
                      width: "76px",
                      height: "42px",
                      objectFit: "cover",
                      borderRadius: "4px",
                      border: "1px solid #10b981",
                    }}
                  />
                  <span style={{ fontSize: "11.5px", color: "#10b981", fontWeight: 600 }}>
                    ✓ {receiptFileName}
                  </span>
                </div>
              )}
            </div>

            {posNotice && (
              <div
                style={{
                  fontSize: "12px",
                  color: posNotice.startsWith("✓") ? "#10b981" : "#f59e0b",
                  marginBottom: "10px",
                  fontWeight: 600,
                }}
              >
                {posNotice}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleShiftManagerOverride}
            style={{
              width: "100%",
              padding: "11px",
              background: receiptFileName ? "#c8aa6e" : "#171c24",
              color: receiptFileName ? "#07090c" : "#525860",
              border: "none",
              borderRadius: "7px",
              fontWeight: 700,
              fontSize: "12.5px",
              cursor: "pointer",
            }}
          >
            🔓 Xác nhận & Mở khóa Watermark cho Du khách
          </button>
        </div>

        {/* Cột phải: Thống kê theo Hiện vật & Danh sách chờ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={cardStyle}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#f2f2ee", marginBottom: "10px" }}>
              Mức độ quan tâm theo Hiện vật
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #171c24", color: "#808894", fontSize: "11px" }}>
                  <th style={{ padding: "6px 4px" }}>Hiện vật</th>
                  <th style={{ padding: "6px 4px" }}>Lượt xem</th>
                  <th style={{ padding: "6px 4px" }}>Thời gian</th>
                  <th style={{ padding: "6px 4px" }}>Hỏi AI</th>
                </tr>
              </thead>
              <tbody>
                {metricsList.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid #12161e" }}>
                    <td style={{ padding: "8px 4px", fontWeight: 600, color: "#f2f2ee" }}>
                      <span style={{ color: "#c8aa6e" }}>{m.code}</span> {m.name}
                    </td>
                    <td style={{ padding: "8px 4px" }}>{m.views}</td>
                    <td style={{ padding: "8px 4px", color: "#e4cfa3" }}>{m.avgDwellMin}p</td>
                    <td style={{ padding: "8px 4px", color: "#10b981" }}>{m.ragQueries}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ ...cardStyle, flex: 1 }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#f2f2ee", marginBottom: "8px" }}>
              Danh sách Mã ảnh kỷ niệm gần đây
            </div>
            <div style={{ display: "grid", gap: "6px" }}>
              {store.orders.slice(0, 3).map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => updateStore((prev) => ({ ...prev, activeOrderId: ord.id }))}
                  style={{
                    padding: "8px 10px",
                    background: ord.id === store.activeOrderId ? "#121720" : "#07090c",
                    border:
                      ord.id === store.activeOrderId
                        ? "1px solid #c8aa6e"
                        : "1px solid #171c24",
                    borderRadius: "6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  <span>
                    <strong style={{ color: "#e4cfa3" }}>#{ord.id}</strong> — {ord.exhibitName}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color:
                        ord.status === "pending_payment" && !store.watermarkUnlocked
                          ? "#f59e0b"
                          : "#10b981",
                      fontWeight: 600,
                    }}
                  >
                    {ord.status === "pending_payment" && !store.watermarkUnlocked
                      ? "Chờ mở khóa"
                      : "Đã mở khóa"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}