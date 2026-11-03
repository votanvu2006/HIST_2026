import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  createExhibitArtifact,
  type ExhibitId,
} from "./InteractiveScene";
import "./InteractiveStructureScene.css";
import type { ListenerPose } from "../audio_ai_engineering/spatialAudio";

type StructurePart = {
  id: string;
  name: string;
  title: string;
  description: string;

  /**
   * Tọa độ tương đối quanh tâm mô hình.
   * Mỗi giá trị thường nằm trong khoảng -0.5 đến 0.5.
   */
  anchor: [number, number, number];

  side: "left" | "right";
  lane: number;
};

type StructureSceneProps = {
  exhibitId: ExhibitId;
  viewAngles?: { yaw: number; pitch: number } | null;
  onViewPose?: (pose: ListenerPose) => void;
};

const structureParts: Record<ExhibitId, StructurePart[]> = {
  drum: [
    {
      id: "head",
      name: "Mặt trống",
      title: "Mặt trống và hoa văn",
      description:
        "Đây là mặt trống được mô hình hóa ở phía trên. Các chi tiết đang hiển thị là bản dựng minh họa, không phải bản quét chính xác của hiện vật.",
      anchor: [0, 0.45, 0],
      side: "left",
      lane: 0.15,
    },
    {
      id: "body",
      name: "Thân trống",
      title: "Thân trống",
      description:
        "Thân trống tạo nên dáng khối chính. Xoay mô hình để quan sát tỷ lệ thân và các dải hoa văn quanh mặt ngoài.",
      anchor: [0.45, 0.02, 0],
      side: "right",
      lane: 0.43,
    },
    {
      id: "inside",
      name: "Khoang bên trong",
      title: "Mặt cắt minh họa",
      description:
        "Điểm này đánh dấu khu vực bên trong mô hình sau khi mở mặt cắt. Đây là minh họa trực quan, không phải dữ liệu CT hay xác nhận độ dày thành trống.",
      anchor: [0, -0.08, -0.12],
      side: "left",
      lane: 0.7,
    },
  ],

  jar: [
    {
      id: "lid",
      name: "Nắp thạp",
      title: "Nắp thạp",
      description:
        "Nắp thạp có dáng hình nón cụt. Mô hình demo giản lược hoa văn để người xem tập trung vào hình dáng tổng thể.",
      anchor: [0, 0.45, 0],
      side: "left",
      lane: 0.15,
    },
    {
      id: "body",
      name: "Thân thạp",
      title: "Thân thạp và các dải hoa văn",
      description:
        "Thân thạp có dáng trụ thuôn dần về phía đáy. Xoay mô hình để quan sát các dải trang trí quanh thân.",
      anchor: [0.36, 0.02, 0],
      side: "right",
      lane: 0.43,
    },
    {
      id: "inside",
      name: "Lòng thạp",
      title: "Lòng thạp",
      description:
        "Điểm này chỉ khu vực lòng thạp trong mô hình. Lát cắt đang xem là minh họa, không tái tạo các dấu tích khảo cổ bên trong hiện vật.",
      anchor: [0, -0.05, -0.14],
      side: "left",
      lane: 0.7,
    },
  ],

  dagger: [
    {
      id: "pommel",
      name: "Đầu chuôi",
      title: "Đầu chuôi",
      description:
        "Mô hình dao găm trong demo đại diện cho một loại hình chung, chưa xác định là mẫu vật cụ thể. Kiểu đầu chuôi có thể khác nhau giữa các hiện vật.",
      anchor: [0, 0.46, 0],
      side: "left",
      lane: 0.15,
    },
    {
      id: "grip",
      name: "Chuôi dao",
      title: "Chuôi và chắn tay",
      description:
        "Một số dao găm Đông Sơn có phần chuôi được tạo hình và trang trí cầu kỳ. Mô hình hiện tại được giản lược để dễ quan sát.",
      anchor: [0, 0.36, 0],
      side: "right",
      lane: 0.43,
    },
    {
      id: "blade",
      name: "Lưỡi dao",
      title: "Lưỡi dao",
      description:
        "Điểm này đánh dấu phần lưỡi dao trên mô hình. Dao găm không có khoang rỗng bên trong như trống hoặc thạp; mặt cắt chỉ nhằm minh họa hình khối.",
      anchor: [0, -0.16, 0],
      side: "left",
      lane: 0.7,
    },
  ],
};

export function InteractiveStructureScene({
  exhibitId,
  viewAngles = null,
  onViewPose,
}: StructureSceneProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const connectorSvgRef = useRef<SVGSVGElement>(null);
  const viewAnglesRef = useRef(viewAngles);
  const onViewPoseRef = useRef(onViewPose);

  useEffect(() => {
    viewAnglesRef.current = viewAngles;
    onViewPoseRef.current = onViewPose;
  }, [viewAngles, onViewPose]);

  const hotspotRefs = useRef(new Map<string, HTMLButtonElement>());
  const lineRefs = useRef(new Map<string, SVGLineElement>());
  const endpointRefs = useRef(new Map<string, SVGCircleElement>());

  const cutawayTargetRef = useRef(false);
  const activePartIdRef = useRef("");

  const parts = structureParts[exhibitId];

  const [isCutaway, setIsCutaway] = useState(false);
  const [activePartId, setActivePartId] = useState(parts[0]?.id ?? "");

  const activePart =
    parts.find((part) => part.id === activePartId) ?? parts[0];

  cutawayTargetRef.current = isCutaway;
  activePartIdRef.current = activePartId;

  useEffect(() => {
    const viewport = viewportRef.current;
    const connectorSvg = connectorSvgRef.current;

    if (!viewport || !connectorSvg) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.localClippingEnabled = true;
    renderer.domElement.className = "structure-scene-canvas";
    renderer.domElement.setAttribute(
      "aria-label",
      "Mô hình hiện vật 3D có thể xoay và xem mặt cắt minh họa",
    );

    viewport.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xf3ead7, 0x242a27, 2.1));

    const keyLight = new THREE.DirectionalLight(0xffd99a, 3.2);
    keyLight.position.set(-4, 6, 5);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x9aaec1, 13, 12);
    fillLight.position.set(4, 2, -3);
    scene.add(fillLight);

    const artifact = createExhibitArtifact(exhibitId);
    const bounds = new THREE.Box3().setFromObject(artifact);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());

    const radius = Math.max(size.x, size.z, size.y * 0.55, 0.8);

    // Căn tâm mô hình về gốc tọa độ để OrbitControls xoay quanh giữa hiện vật.
    artifact.position.sub(center);
    scene.add(artifact);

    const cutPlane = new THREE.Plane(
      new THREE.Vector3(0, 0, -1),
      radius * 4,
    );

    artifact.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      const meshMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      meshMaterials.forEach((material) => {
        material.clippingPlanes = [cutPlane];
        material.clipShadows = true;
        material.side = THREE.DoubleSide;
        material.needsUpdate = true;
      });
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = radius * 1.7;
    controls.maxDistance = radius * 6;
    controls.target.set(0, 0, 0);

    camera.position.set(radius * 1.35, radius * 0.9, radius * 3.1);
    controls.update();
    const initialPosition = camera.position.clone();
    const initialRotation = camera.quaternion.clone();
    const yawRotation = new THREE.Quaternion();
    const pitchRotation = new THREE.Quaternion();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const worldRight = new THREE.Vector3(1, 0, 0);
    const forward = new THREE.Vector3();
    const listenerUp = new THREE.Vector3();

    const resize = () => {
      const width = viewport.clientWidth || 1;
      const height = viewport.clientHeight || 1;

      renderer.setSize(width, height);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      connectorSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      connectorSvg.setAttribute("width", String(width));
      connectorSvg.setAttribute("height", String(height));
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewport);
    resize();

    const clock = new THREE.Clock();
    const noCutConstant = radius * 4;

    let cutawayProgress = 0;
    let animationFrame = 0;

    const render = () => {
      animationFrame = window.requestAnimationFrame(render);

      const delta = clock.getDelta();

      const view = viewAnglesRef.current;
      controls.enabled = !view;
      if (view) {
        camera.position.copy(initialPosition);
        yawRotation.setFromAxisAngle(worldUp, THREE.MathUtils.degToRad(-view.yaw));
        pitchRotation.setFromAxisAngle(worldRight, THREE.MathUtils.degToRad(view.pitch));
        camera.quaternion.copy(yawRotation).multiply(initialRotation).multiply(pitchRotation);
      } else {
        controls.update();
      }

      cutawayProgress = THREE.MathUtils.damp(
        cutawayProgress,
        cutawayTargetRef.current ? 1 : 0,
        2.5,
        delta,
      );

      cutPlane.constant = THREE.MathUtils.lerp(
        noCutConstant,
        0,
        cutawayProgress,
      );

      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld();
      if (onViewPoseRef.current) {
        camera.getWorldDirection(forward);
        listenerUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
        onViewPoseRef.current({
          position: [camera.position.x / radius, camera.position.y / radius, camera.position.z / radius],
          forward: [forward.x, forward.y, forward.z],
          up: [listenerUp.x, listenerUp.y, listenerUp.z],
        });
      }

      const viewportRect = viewport.getBoundingClientRect();
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      const lineOpacity = Math.min(cutawayProgress, 1);

      parts.forEach((part) => {
        const button = hotspotRefs.current.get(part.id);
        const line = lineRefs.current.get(part.id);
        const endpoint = endpointRefs.current.get(part.id);

        if (!button || !line || !endpoint || !width || !height) return;

        // Điểm được khai báo theo tỷ lệ quanh tâm hiện vật.
        // Cộng center để đổi sang tọa độ gốc của mô hình trước khi áp matrix.
        const point = new THREE.Vector3(
          center.x + part.anchor[0] * size.x,
          center.y + part.anchor[1] * size.y,
          center.z + part.anchor[2] * size.z,
        );

        point.applyMatrix4(artifact.matrixWorld);
        point.project(camera);

        const isOnScreen =
          point.z >= -1 &&
          point.z <= 1 &&
          point.x >= -1 &&
          point.x <= 1 &&
          point.y >= -1 &&
          point.y <= 1;

        const shouldShow =
          cutawayProgress > 0.02 &&
          isOnScreen;

        button.style.visibility = shouldShow ? "visible" : "hidden";
        button.style.opacity = shouldShow ? String(lineOpacity) : "0";

        line.style.visibility = shouldShow ? "visible" : "hidden";
        line.style.opacity = shouldShow ? String(lineOpacity) : "0";

        endpoint.style.visibility = shouldShow ? "visible" : "hidden";
        endpoint.style.opacity = shouldShow ? String(lineOpacity) : "0";

        line.classList.toggle(
          "is-active",
          activePartIdRef.current === part.id,
        );

        if (!shouldShow) return;

        const targetX = (point.x * 0.5 + 0.5) * width;
        const targetY = (-point.y * 0.5 + 0.5) * height;

        const buttonRect = button.getBoundingClientRect();

        const startX =
          part.side === "left"
            ? buttonRect.right - viewportRect.left
            : buttonRect.left - viewportRect.left;

        const startY =
          buttonRect.top -
          viewportRect.top +
          buttonRect.height / 2;

        // Đầu đường chỉ nối chính xác vào hotspot đang chiếu từ tọa độ 3D.
        line.setAttribute("x1", String(startX));
        line.setAttribute("y1", String(startY));
        line.setAttribute("x2", String(targetX));
        line.setAttribute("y2", String(targetY));

        endpoint.setAttribute("cx", String(targetX));
        endpoint.setAttribute("cy", String(targetY));
      });

      renderer.render(scene, camera);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      controls.dispose();

      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();

      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;

        geometries.add(object.geometry);

        const meshMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        meshMaterials.forEach((material) => materials.add(material));
      });

      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());

      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [exhibitId, parts]);

  useEffect(() => {
    setIsCutaway(false);
    setActivePartId(parts[0]?.id ?? "");
  }, [exhibitId, parts]);

  return (
    <section
      className="interactive-structure-scene"
      aria-label={`Khám phá cấu tạo ${exhibitId}`}
    >
      <div className="structure-scene-viewport" ref={viewportRef}>
        <svg
          className="structure-scene-connectors"
          ref={connectorSvgRef}
          aria-hidden="true"
        >
          {parts.map((part) => (
            <g key={part.id}>
              <line
                className="structure-scene-connector-line"
                ref={(element) => {
                  if (element) lineRefs.current.set(part.id, element);
                  else lineRefs.current.delete(part.id);
                }}
              />
              <circle
                className="structure-scene-connector-endpoint"
                r="3"
                ref={(element) => {
                  if (element) endpointRefs.current.set(part.id, element);
                  else endpointRefs.current.delete(part.id);
                }}
              />
            </g>
          ))}
        </svg>

        <div className="structure-scene-heading">
          <span className="structure-scene-eyebrow">KHÁM PHÁ CẤU TẠO</span>
          <strong>
            {isCutaway
              ? "Đang mở mặt cắt minh họa"
              : "Bật mặt cắt để xem tên từng phần"}
          </strong>
        </div>

        <button
          className={`structure-cutaway-toggle ${
            isCutaway ? "is-active" : ""
          }`}
          type="button"
          aria-pressed={isCutaway}
          onClick={() => setIsCutaway((current) => !current)}
        >
          {isCutaway ? "Đóng mặt cắt" : "Mở mặt cắt bên trong"}
        </button>

        {parts.map((part, index) => (
          <button
            className={`structure-hotspot is-${part.side} ${
              activePart?.id === part.id ? "is-active" : ""
            }`}
            key={part.id}
            ref={(element) => {
              if (element) hotspotRefs.current.set(part.id, element);
              else hotspotRefs.current.delete(part.id);
            }}
            type="button"
            aria-label={`Xem ${part.name}`}
            aria-pressed={activePart?.id === part.id}
            style={{ top: `${part.lane * 100}%` }}
            onClick={() => setActivePartId(part.id)}
          >
            <span className="structure-hotspot-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="structure-hotspot-label">{part.name}</span>
          </button>
        ))}

        {isCutaway && activePart && (
          <article className="structure-part-card" aria-live="polite">
            <span className="structure-scene-eyebrow">
              ĐIỂM{" "}
              {String(
                parts.findIndex((part) => part.id === activePart.id) + 1,
              ).padStart(2, "0")}{" "}
              / {String(parts.length).padStart(2, "0")}
            </span>
            <h3>{activePart.title}</h3>
            <p>{activePart.description}</p>
          </article>
        )}

        <p className="structure-scene-footnote">
          Mặt cắt là hiệu ứng minh họa trên mô hình 3D dựng lại, không phải bản
          quét CT của hiện vật.
        </p>
      </div>
    </section>
  );
}
