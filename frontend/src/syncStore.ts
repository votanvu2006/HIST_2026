import type { ExhibitId } from "./InteractiveScene";

export interface CustomHotspot {
  id: string;
  roman: string;
  localPos: [number, number, number];
  x?: number;
  y?: number;
  title: string;
  description: string;
}

export interface PhygitalOrder {
  id: string;
  exhibitId: ExhibitId;
  exhibitName: string;
  packageType: "digital_30k" | "phygital_50k" | "voucher";
  amount: number;
  status: "pending_payment" | "paid_vietqr" | "pos_override_unlocked";
  timestamp: string;
  receiptImage?: string;
  overrideBy?: string;
}

export interface ArtifactMetric {
  id: ExhibitId;
  code: string;
  name: string;
  views: number;
  avgDwellMin: number;
  ragQueries: number;
  phygitalOrders: number;
  revenue: number;
  aiInsight: string;
}

export interface HXRSystemState {
  scans: number;
  arCount: number;
  catalogCount: number;
  autoFallbackCount: number;
  dwellMinutes: number;
  revenue: number;
  digitalSold: number;
  phygitalSold: number;
  vouchersClaimed: number;
  watermarkUnlocked: boolean;
  activeOrderId: string;
  priceDigital: number;
  pricePhygital: number;
  voucherTitle: string;
  hotspotsByExhibit: Record<ExhibitId, CustomHotspot[]>;
  artifactMetrics: Record<ExhibitId, ArtifactMetric>;
  orders: PhygitalOrder[];
  logs: string[];
}

const STORAGE_KEY = "HERITAGEXR_V21_FINAL_STORE";
const CHANNEL_NAME = "heritagexr_v21_final_sync";

export const INITIAL_STORE: HXRSystemState = {
  scans: 1428,
  arCount: 885,
  catalogCount: 543,
  autoFallbackCount: 64,
  dwellMinutes: 56.4,
  revenue: 24550000,
  digitalSold: 310,
  phygitalSold: 305,
  vouchersClaimed: 312,
  watermarkUnlocked: false,
  activeOrderId: "HXR-892",
  priceDigital: 30000,
  pricePhygital: 50000,
  voucherTitle: "Voucher Giảm 20% Trà Di Sản & Tour Đêm Sài Gòn",
  hotspotsByExhibit: {
    drum: [
      {
        id: "hs-drum-1",
        roman: "I",
        localPos: [0, 2.25, 0.18],
        title: "Mặt trống & Ngôi sao 14 cánh",
        description: "Biểu tượng mặt trời ở tâm mặt trống đồng Ngọc Lữ, đường kính 79,3 cm.",
      },
      {
        id: "hs-drum-2",
        roman: "II",
        localPos: [0.52, 1.88, 0.52],
        title: "Tang trống & Hoa văn thuyền",
        description: "Khắc họa sinh động đời sống cư dân Lạc Việt và lễ hội thời Đông Sơn.",
      },
      {
        id: "hs-drum-3",
        roman: "III",
        localPos: [-0.48, 1.38, 0.54],
        title: "Chân trống dáng loe cân đối",
        description: "Kỹ thuật đúc đồng khuôn hai mang đạt độ tinh xảo bậc nhất.",
      },
    ],
    jar: [
      {
        id: "hs-jar-1",
        roman: "I",
        localPos: [0, 2.66, 0.12],
        title: "Nắp thạp hình nón cụt",
        description: "Chính giữa nắp đúc nổi hình mặt trời 12 tia cùng các vành hoa văn đồng tâm.",
      },
      {
        id: "hs-jar-2",
        roman: "II",
        localPos: [0.36, 1.75, 0.34],
        title: "Thân thạp thuôn dần về đáy",
        description: "Phát hiện năm 1961 tại Đào Thịnh (Yên Bái), niên đại 2.500 năm.",
      },
    ],
    dagger: [
      {
        id: "hs-dagger-1",
        roman: "I",
        localPos: [0, 2.72, 0.08],
        title: "Chuôi dao tạo hình nghệ thuật",
        description: "Kết hợp tinh xảo giữa công năng tự vệ và nghệ thuật tạo hình Đông Sơn.",
      },
      {
        id: "hs-dagger-2",
        roman: "II",
        localPos: [0, 1.78, 0.08],
        title: "Lưỡi dao đồng hình lá tre",
        description: "Đúc bằng hợp kim đồng có độ sắc và độ bền cao qua hàng thiên niên kỷ.",
      },
    ],
  },
  artifactMetrics: {
    drum: {
      id: "drum",
      code: "#01",
      name: "Trống đồng Ngọc Lữ",
      views: 684,
      avgDwellMin: 24.5,
      ragQueries: 412,
      phygitalOrders: 340,
      revenue: 13800000,
      aiInsight: "Chuyển đổi Phygital cao nhất (49.7%)",
    },
    jar: {
      id: "jar",
      code: "#02",
      name: "Thạp đồng Đào Thịnh",
      views: 462,
      avgDwellMin: 18.2,
      ragQueries: 265,
      phygitalOrders: 185,
      revenue: 7450000,
      aiInsight: "Khách xem Tab 2 FPV lâu nhất",
    },
    dagger: {
      id: "dagger",
      code: "#03",
      name: "Dao găm đồng Đông Sơn",
      views: 282,
      avgDwellMin: 13.7,
      ragQueries: 148,
      phygitalOrders: 90,
      revenue: 3300000,
      aiInsight: "Đề xuất đẩy ưu đãi Gói 30k",
    },
  },
  orders: [
    {
      id: "HXR-892",
      exhibitId: "jar",
      exhibitName: "Thạp đồng Đào Thịnh",
      packageType: "phygital_50k",
      amount: 50000,
      status: "pending_payment",
      timestamp: "15:10:02",
    },
    {
      id: "HXR-891",
      exhibitId: "drum",
      exhibitName: "Trống đồng Ngọc Lữ",
      packageType: "phygital_50k",
      amount: 50000,
      status: "paid_vietqr",
      timestamp: "14:52:18",
    },
    {
      id: "HXR-890",
      exhibitId: "drum",
      exhibitName: "Trống đồng Ngọc Lữ",
      packageType: "digital_30k",
      amount: 30000,
      status: "paid_vietqr",
      timestamp: "14:38:05",
    },
  ],
  logs: [
    "[15:10] Đơn #HXR-892: Khách chụp ảnh AI tại tủ kính #02 (Đang khóa Dynamic Watermark).",
    "[15:08] Auto-Fallback (>3s): Tự động chuyển máy khách #890 sang 3D Catalog do góc khuất thiếu sáng.",
    "[14:52] Webhook VietQR: Đơn #HXR-891 thanh toán 50.000đ thành công (Gói In Lụa Phygital).",
    "[14:38] Webhook VietQR: Đơn #HXR-890 thanh toán 30.000đ thành công (Gói File Số HD).",
  ],
};

const channel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel(CHANNEL_NAME)
    : null;

export function getStore(): HXRSystemState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STORE;
    const parsed = JSON.parse(raw);
    return { ...INITIAL_STORE, ...parsed };
  } catch {
    return INITIAL_STORE;
  }
}

export function updateStore(
  updater: (prev: HXRSystemState) => HXRSystemState,
  logMessage?: string
): HXRSystemState {
  const current = getStore();
  const next = updater(current);
  if (logMessage) {
    const time = new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    next.logs = [`[${time}] ${logMessage}`, ...next.logs.slice(0, 29)];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  if (channel) {
    channel.postMessage({ type: "SYNC_UPDATE", state: next });
  }
  window.dispatchEvent(new CustomEvent("hxr-store-updated", { detail: next }));
  return next;
}

export function subscribeStore(
  callback: (state: HXRSystemState) => void
): () => void {
  const onCustom = (e: Event) => {
    const ce = e as CustomEvent<HXRSystemState>;
    callback(ce.detail);
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback(getStore());
  };
  const onChannel = (e: MessageEvent) => {
    if (e.data?.type === "SYNC_UPDATE") callback(e.data.state);
  };

  window.addEventListener("hxr-store-updated", onCustom);
  window.addEventListener("storage", onStorage);
  if (channel) channel.addEventListener("message", onChannel);

  return () => {
    window.removeEventListener("hxr-store-updated", onCustom);
    window.removeEventListener("storage", onStorage);
    if (channel) channel.removeEventListener("message", onChannel);
  };
}