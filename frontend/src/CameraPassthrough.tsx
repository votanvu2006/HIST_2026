import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "./CameraPassthrough.css";

type CameraPassthroughProps = {
  children: ReactNode;
  compactControls?: boolean;
};

export function CameraPassthrough({ children, compactControls = false }: CameraPassthroughProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraOn(false);
  }, []);

  const toggleCamera = useCallback(async () => {
    if (isCameraOn) {
      stopCamera();
      setCameraMessage("Camera đã tắt.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage(
        "Trình duyệt chưa hỗ trợ camera. Hãy mở demo bằng HTTPS hoặc localhost.",
      );
      return;
    }

    try {
      setCameraMessage("");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraOn(true);
    } catch (error) {
      const errorName = error instanceof DOMException ? error.name : "";
      const messages: Record<string, string> = {
        NotAllowedError:
          "Fen chưa cấp quyền camera. Hãy cho phép camera trong trình duyệt rồi thử lại.",
        NotFoundError: "Không tìm thấy camera trên thiết bị này.",
        NotReadableError:
          "Camera đang được ứng dụng khác sử dụng. Đóng ứng dụng đó rồi thử lại.",
        SecurityError:
          "Camera cần trang HTTPS hoặc localhost và quyền truy cập từ trình duyệt.",
      };

      setCameraMessage(
        messages[errorName] ??
          "Chưa mở được camera. Kiểm tra quyền camera của trình duyệt rồi thử lại.",
      );
      stopCamera();
    }
  }, [isCameraOn, stopCamera]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  return (
    <div className="camera-passthrough-shell">
      <video
        ref={videoRef}
        className={`camera-passthrough-video ${
          isCameraOn ? "is-active" : ""
        }`}
        autoPlay
        muted
        playsInline
        aria-hidden="true"
      />

      <div className="camera-passthrough-shade" aria-hidden="true" />
      <div className="camera-passthrough-content">{children}</div>

      <div className={`camera-passthrough-control ${compactControls ? "is-compact" : ""}`}>
        <button
          className={`camera-toggle-button ${
            isCameraOn ? "is-active" : ""
          }`}
          type="button"
          onClick={toggleCamera}
          aria-pressed={isCameraOn}
        >
          <span className="camera-toggle-dot" />
          {isCameraOn ? "Tắt camera" : "Bật camera thật"}
        </button>

        {(!compactControls || cameraMessage) && <span className="camera-passthrough-caption" aria-live="polite">
          {cameraMessage ||
            (isCameraOn
              ? "Cảnh thật đang hiển thị · xoay điện thoại để lia nhìn"
              : "Bật camera để nhìn thấy không gian xung quanh")}
        </span>}
      </div>
    </div>
  );
}
