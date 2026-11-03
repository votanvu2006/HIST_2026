import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { CustomHotspot } from "./syncStore";

export type ExhibitId = "drum" | "jar" | "dagger";

type InteractiveSceneProps = {
  selectedId: ExhibitId | null;
  onSelect: (id: ExhibitId) => void;
  hideCase?: boolean;
  customHotspots?: CustomHotspot[];
  onSurfaceClick3D?: (localPos: [number, number, number]) => void;
  onHotspotClick?: (hs: CustomHotspot) => void;
};

type SceneState = {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  models: Map<ExhibitId, THREE.Group>;
  caseParts: THREE.Object3D[];
  artifacts: Map<ExhibitId, THREE.Group>;
  floor: THREE.Mesh;
  focusLight: THREE.PointLight;
};

const exhibitIds: ExhibitId[] = ["drum", "jar", "dagger"];
const pedestalTop = 0.86;

const exhibitLabels: Record<ExhibitId, string> = {
  drum: "Trống đồng Ngọc Lữ",
  jar: "Thạp đồng Đào Thịnh",
  dagger: "Dao găm đồng Đông Sơn",
};

const hotspotAnchors: Record<ExhibitId, [number, number, number]> = {
  drum: [0, pedestalTop + 0.78, 0.74],
  jar: [0, pedestalTop + 0.82, 0.58],
  dagger: [0, pedestalTop + 1.03, 0.08],
};

function addMesh(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  isCasePart = false,
  casePartsList?: THREE.Object3D[]
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (isCasePart && casePartsList) {
    casePartsList.push(mesh);
  }
  group.add(mesh);
  return mesh;
}

function createPedestalFrustum(topRadius: number, bottomRadius: number, height: number) {
  const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 4);
  geometry.rotateY(Math.PI / 4);
  return geometry;
}

function createDisplayCase(artifact: THREE.Group, casePartsList: THREE.Object3D[]) {
  const exhibit = new THREE.Group();
  const caseWidth = 2.1;
  const caseDepth = 1.95;
  const caseBottom = 0.08;
  const caseHeight = 3.12;

  const darkBase = new THREE.MeshStandardMaterial({
    color: 0x121518,
    metalness: 0.42,
    roughness: 0.44,
  });

  const pedestalMaterial = new THREE.MeshStandardMaterial({
    color: 0xe7e4dc,
    metalness: 0.08,
    roughness: 0.72,
  });

  const glassFrame = new THREE.MeshStandardMaterial({
    color: 0x806638,
    metalness: 0.78,
    roughness: 0.27,
  });

  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0xb8d2c6,
    metalness: 0.04,
    roughness: 0.12,
    transparent: true,
    opacity: 0.075,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  addMesh(exhibit, new THREE.BoxGeometry(caseWidth + 0.1, 0.12, caseDepth + 0.1), darkBase, [0, 0.02, 0], true, casePartsList);
  addMesh(exhibit, createPedestalFrustum(1.12, 1.32, 0.52), pedestalMaterial, [0, 0.34, 0], true, casePartsList);
  addMesh(exhibit, createPedestalFrustum(0.98, 1.12, 0.18), pedestalMaterial, [0, 0.69, 0], true, casePartsList);
  addMesh(exhibit, new THREE.BoxGeometry(1.42, 0.08, 1.42), pedestalMaterial, [0, 0.82, 0], true, casePartsList);

  const glassCenterY = caseBottom + caseHeight / 2;

  const frontGlass = addMesh(exhibit, new THREE.PlaneGeometry(caseWidth, caseHeight), glassMaterial, [0, glassCenterY, caseDepth / 2], true, casePartsList);
  const backGlass = addMesh(exhibit, new THREE.PlaneGeometry(caseWidth, caseHeight), glassMaterial, [0, glassCenterY, -caseDepth / 2], true, casePartsList);
  const leftGlass = addMesh(exhibit, new THREE.PlaneGeometry(caseDepth, caseHeight), glassMaterial, [-caseWidth / 2, glassCenterY, 0], true, casePartsList);
  const rightGlass = addMesh(exhibit, new THREE.PlaneGeometry(caseDepth, caseHeight), glassMaterial, [caseWidth / 2, glassCenterY, 0], true, casePartsList);

  leftGlass.rotation.y = Math.PI / 2;
  rightGlass.rotation.y = Math.PI / 2;

  const roofGlass = addMesh(exhibit, new THREE.PlaneGeometry(caseWidth, caseDepth), glassMaterial, [0, caseBottom + caseHeight, 0], true, casePartsList);
  roofGlass.rotation.x = -Math.PI / 2;

  const postPositions: [number, number, number][] = [
    [-caseWidth / 2, glassCenterY, -caseDepth / 2],
    [-caseWidth / 2, glassCenterY, caseDepth / 2],
    [caseWidth / 2, glassCenterY, -caseDepth / 2],
    [caseWidth / 2, glassCenterY, caseDepth / 2],
  ];

  postPositions.forEach((position) => {
    addMesh(exhibit, new THREE.CylinderGeometry(0.018, 0.018, caseHeight, 8), glassFrame, position, true, casePartsList);
  });

  const railThickness = 0.035;
  const railHeight = 0.035;
  const caseTop = caseBottom + caseHeight;

  [-1, 1].forEach((side) => {
    const z = side * (caseDepth / 2);
    const x = side * (caseWidth / 2);

    addMesh(exhibit, new THREE.BoxGeometry(caseWidth, railHeight, railThickness), glassFrame, [0, caseBottom + 0.025, z], true, casePartsList);
    addMesh(exhibit, new THREE.BoxGeometry(caseWidth, railHeight, railThickness), glassFrame, [0, caseTop - 0.02, z], true, casePartsList);
    addMesh(exhibit, new THREE.BoxGeometry(railThickness, railHeight, caseDepth), glassFrame, [x, caseBottom + 0.025, 0], true, casePartsList);
    addMesh(exhibit, new THREE.BoxGeometry(railThickness, railHeight, caseDepth), glassFrame, [x, caseTop - 0.02, 0], true, casePartsList);
  });

  const caseLight = new THREE.PointLight(0xffdfaa, 1.4, 4);
  caseLight.position.set(0, 2.85, 0.15);
  exhibit.add(caseLight);

  artifact.position.y = pedestalTop;
  exhibit.add(artifact);

  frontGlass.renderOrder = 2;
  backGlass.renderOrder = 2;
  leftGlass.renderOrder = 2;
  rightGlass.renderOrder = 2;
  roofGlass.renderOrder = 2;

  return exhibit;
}

function createDrum(casePartsList: THREE.Object3D[], artifactsMap: Map<ExhibitId, THREE.Group>) {
  const artifact = new THREE.Group();
  const bronze = new THREE.MeshStandardMaterial({ color: 0x98703b, metalness: 0.78, roughness: 0.32 });
  const darkBronze = new THREE.MeshStandardMaterial({ color: 0x65451f, metalness: 0.68, roughness: 0.4 });

  addMesh(artifact, new THREE.CylinderGeometry(0.72, 0.72, 1.05, 40), bronze, [0, 0.78, 0]);
  addMesh(artifact, new THREE.CylinderGeometry(0.75, 0.75, 0.1, 40), bronze, [0, 1.34, 0]);
  addMesh(artifact, new THREE.CylinderGeometry(0.62, 0.7, 0.14, 40), darkBronze, [0, 0.16, 0]);

  [0.42, 0.78, 1.12].forEach((height) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.73, 0.025, 8, 40), darkBronze);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = height;
    artifact.add(ring);
  });

  artifactsMap.set("drum", artifact);
  return createDisplayCase(artifact, casePartsList);
}

function createJar(casePartsList: THREE.Object3D[], artifactsMap: Map<ExhibitId, THREE.Group>) {
  const artifact = new THREE.Group();
  const bronze = new THREE.MeshStandardMaterial({ color: 0x9a7848, metalness: 0.74, roughness: 0.38 });
  const bronzeHighlight = new THREE.MeshStandardMaterial({ color: 0xb18a50, metalness: 0.78, roughness: 0.34 });
  const darkBronze = new THREE.MeshStandardMaterial({ color: 0x58401f, metalness: 0.68, roughness: 0.44 });

  const bodyProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.34, 0),
    new THREE.Vector2(0.4, 0.08),
    new THREE.Vector2(0.45, 0.22),
    new THREE.Vector2(0.48, 0.48),
    new THREE.Vector2(0.49, 0.92),
    new THREE.Vector2(0.47, 1.24),
    new THREE.Vector2(0.44, 1.48),
  ];

  addMesh(artifact, new THREE.LatheGeometry(bodyProfile, 48), bronze, [0, 0.08, 0]);

  [
    { height: 0.3, radius: 0.46 },
    { height: 0.56, radius: 0.49 },
    { height: 1.02, radius: 0.49 },
    { height: 1.34, radius: 0.46 },
    { height: 1.55, radius: 0.44 },
  ].forEach(({ height, radius }, index) => {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(radius, index === 4 ? 0.018 : 0.012, 8, 48),
      index % 2 === 0 ? bronzeHighlight : darkBronze
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = height;
    artifact.add(band);
  });

  const lidBottomY = 1.56;
  const lidHeight = 0.26;
  const lidTopRadius = 0.2;
  const lidBottomRadius = 0.43;

  addMesh(artifact, new THREE.CylinderGeometry(lidTopRadius, lidBottomRadius, lidHeight, 48, 1, false), bronze, [0, lidBottomY + lidHeight / 2, 0]);

  const lidRim = new THREE.Mesh(new THREE.TorusGeometry(lidBottomRadius, 0.022, 8, 48), darkBronze);
  lidRim.rotation.x = Math.PI / 2;
  lidRim.position.y = lidBottomY;
  artifact.add(lidRim);

  for (let index = 1; index <= 11; index += 1) {
    const t = index / 12;
    const radius = lidBottomRadius + (lidTopRadius - lidBottomRadius) * t + 0.006;
    const band = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.006, 6, 48), index % 2 === 0 ? darkBronze : bronzeHighlight);
    band.rotation.x = Math.PI / 2;
    band.position.y = lidBottomY + lidHeight * t;
    artifact.add(band);
  }

  const lidTopY = lidBottomY + lidHeight;
  addMesh(artifact, new THREE.CylinderGeometry(0.075, 0.075, 0.014, 32), darkBronze, [0, lidTopY + 0.008, 0]);

  const sunRing = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.008, 6, 36), bronzeHighlight);
  sunRing.rotation.x = Math.PI / 2;
  sunRing.position.y = lidTopY + 0.017;
  artifact.add(sunRing);

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const radius = 0.148;
    const ray = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.008, 0.09), bronzeHighlight);
    ray.position.set(Math.sin(angle) * radius, lidTopY + 0.018, Math.cos(angle) * radius);
    ray.rotation.y = angle;
    ray.castShadow = true;
    artifact.add(ray);
  }

  artifactsMap.set("jar", artifact);
  return createDisplayCase(artifact, casePartsList);
}

function createDagger(casePartsList: THREE.Object3D[], artifactsMap: Map<ExhibitId, THREE.Group>) {
  const artifact = new THREE.Group();
  const bronze = new THREE.MeshStandardMaterial({ color: 0xa18452, metalness: 0.8, roughness: 0.3 });
  const darkBronze = new THREE.MeshStandardMaterial({ color: 0x66502e, metalness: 0.7, roughness: 0.38 });

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.lineTo(0.13, 0.36);
  bladeShape.lineTo(0.09, 1.15);
  bladeShape.lineTo(0.2, 1.23);
  bladeShape.lineTo(0.2, 1.32);
  bladeShape.lineTo(0.07, 1.35);
  bladeShape.lineTo(0.07, 1.68);
  bladeShape.lineTo(-0.07, 1.68);
  bladeShape.lineTo(-0.07, 1.35);
  bladeShape.lineTo(-0.2, 1.32);
  bladeShape.lineTo(-0.2, 1.23);
  bladeShape.lineTo(-0.09, 1.15);
  bladeShape.lineTo(-0.13, 0.36);
  bladeShape.closePath();

  addMesh(
    artifact,
    new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.025,
      bevelThickness: 0.025,
    }),
    bronze,
    [0, 0.08, -0.04]
  );

  addMesh(artifact, new THREE.CylinderGeometry(0.065, 0.065, 0.3, 12), darkBronze, [0, 1.83, 0]);
  addMesh(artifact, new THREE.SphereGeometry(0.09, 12, 8), bronze, [0, 2, 0]);

  artifactsMap.set("dagger", artifact);
  return createDisplayCase(artifact, casePartsList);
}

function tagModel(group: THREE.Group, id: ExhibitId) {
  group.userData.exhibitId = id;
  group.traverse((object) => {
    object.userData.exhibitId = id;
  });
}

export function InteractiveScene({
  selectedId,
  onSelect,
  hideCase = false,
  customHotspots = [],
  onSurfaceClick3D,
  onHotspotClick,
}: InteractiveSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneStateRef = useRef<SceneState | null>(null);
  const onSelectRef = useRef(onSelect);
  const onSurfaceClick3DRef = useRef(onSurfaceClick3D);
  const selectedIdRef = useRef<ExhibitId | null>(selectedId);
  const customHotspotsRef = useRef<CustomHotspot[]>(customHotspots);

  const hotspotRefs = useRef(new Map<ExhibitId, HTMLButtonElement>());
  const customHotspotRefs = useRef(new Map<string, HTMLButtonElement>());

  onSelectRef.current = onSelect;
  onSurfaceClick3DRef.current = onSurfaceClick3D;
  selectedIdRef.current = selectedId;
  customHotspotsRef.current = customHotspots;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090b);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 4.3, 10.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "three-canvas";
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xe5e4d8, 0x24282c, 2.2));

    const keyLight = new THREE.DirectionalLight(0xffe0a4, 3.4);
    keyLight.position.set(-4, 7, 5);
    scene.add(keyLight);

    const focusLight = new THREE.PointLight(0xd8bd82, 14, 8);
    focusLight.position.set(0, 2, 1.2);
    scene.add(focusLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x0c0f12, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.04;
    scene.add(floor);

    const caseParts: THREE.Object3D[] = [];
    const artifacts = new Map<ExhibitId, THREE.Group>();

    const models = new Map<ExhibitId, THREE.Group>([
      ["drum", createDrum(caseParts, artifacts)],
      ["jar", createJar(caseParts, artifacts)],
      ["dagger", createDagger(caseParts, artifacts)],
    ]);

    const positions: Record<ExhibitId, number> = {
      drum: -2.2,
      jar: 0,
      dagger: 2.2,
    };

    models.forEach((model, id) => {
      model.position.x = positions[id];
      tagModel(model, id);
      scene.add(model);
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 1.8;
    controls.maxDistance = 16;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI * 0.65;
    controls.target.set(0, 1.95, 0);
    controls.update();

    const resize = () => {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pointerStart = new THREE.Vector2();
    let pointerIsDown = false;

    const onPointerDown = (event: PointerEvent) => {
      pointerStart.set(event.clientX, event.clientY);
      pointerIsDown = true;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!pointerIsDown) return;
      pointerIsDown = false;
      const pointerEnd = new THREE.Vector2(event.clientX, event.clientY);
      // Nếu người dùng đang kéo chuột xoay 3D (> 6px) thì không tính là Click
      if (pointerStart.distanceTo(pointerEnd) > 6) return;

      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      // 1. NẾU ĐANG Ở CHẾ ĐỘ GẮN HOTSPOT 3D (BƯỚC 2 ADMIN):
      // Bắn tia Raycaster thẳng vào khối cổ vật 3D để lấy tọa độ 3 chiều (localX, localY, localZ)
      const activeId = selectedIdRef.current;
      if (activeId && onSurfaceClick3DRef.current) {
        const artifactGroup = artifacts.get(activeId);
        const parentModel = models.get(activeId);
        if (artifactGroup && parentModel) {
          const hits = raycaster.intersectObjects(artifactGroup.children, true);
          if (hits.length > 0) {
            const worldPoint = hits[0].point.clone();
            const localPoint = parentModel.worldToLocal(worldPoint);
            onSurfaceClick3DRef.current([
              Number(localPoint.x.toFixed(3)),
              Number(localPoint.y.toFixed(3)),
              Number(localPoint.z.toFixed(3)),
            ]);
            return;
          }
        }
      }

      // 2. NẾU ĐANG Ở CHẾ ĐỘ CHỌN TỦ KÍNH BÌNH THƯỜNG:
      const visibleModels = Array.from(models.values()).filter((m) => m.visible);
      const intersections = raycaster.intersectObjects(visibleModels, true);

      for (const intersection of intersections) {
        let object: THREE.Object3D | null = intersection.object;
        while (object && !object.userData.exhibitId) {
          object = object.parent;
        }
        const id = object?.userData.exhibitId as ExhibitId | undefined;
        if (id) {
          onSelectRef.current(id);
          return;
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    // PHÉP CHIẾU MA TRẬN 3D -> 2D TRONG MỖI KHUNG HÌNH (60 FPS)
    const projectHotspots = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;

      // A. Chiếu 3 điểm chọn tủ kính tổng quan (khi chưa chọn hiện vật nào)
      models.forEach((model, id) => {
        const hotspot = hotspotRefs.current.get(id);
        if (!hotspot) return;

        if (selectedIdRef.current !== null || !model.visible) {
          hotspot.style.visibility = "hidden";
          return;
        }

        const [localX, localY, localZ] = hotspotAnchors[id];
        const worldPos = model.localToWorld(new THREE.Vector3(localX, localY, localZ));
        worldPos.project(camera);

        const isVisible =
          worldPos.z >= -1 &&
          worldPos.z <= 1 &&
          worldPos.x >= -1 &&
          worldPos.x <= 1 &&
          worldPos.y >= -1 &&
          worldPos.y <= 1;

        hotspot.style.visibility = isVisible ? "visible" : "hidden";
        if (!isVisible) return;

        hotspot.style.left = `${(worldPos.x * 0.5 + 0.5) * width}px`;
        hotspot.style.top = `${(-worldPos.y * 0.5 + 0.5) * height}px`;
      });

      // B. Chiếu các điểm Hotspot La Mã (I, II, III) NEO CỨNG TRÊN BỀ MẶT 3D CỦA CỔ VẬT
      const currentSelected = selectedIdRef.current;
      if (currentSelected) {
        const activeModel = models.get(currentSelected);
        if (activeModel) {
          customHotspotsRef.current.forEach((hs) => {
            const btn = customHotspotRefs.current.get(hs.id);
            if (!btn || !hs.localPos) return;

            const [lx, ly, lz] = hs.localPos;
            const worldPos = activeModel.localToWorld(new THREE.Vector3(lx, ly, lz));
            worldPos.project(camera);

            const isVisible =
              worldPos.z >= -1 &&
              worldPos.z <= 1 &&
              worldPos.x >= -1 &&
              worldPos.x <= 1 &&
              worldPos.y >= -1 &&
              worldPos.y <= 1;

            btn.style.visibility = isVisible ? "visible" : "hidden";
            if (!isVisible) return;

            btn.style.left = `${(worldPos.x * 0.5 + 0.5) * width}px`;
            btn.style.top = `${(-worldPos.y * 0.5 + 0.5) * height}px`;
          });
        }
      }
    };

    let animationFrame = 0;
    const render = () => {
      animationFrame = window.requestAnimationFrame(render);
      controls.update();
      camera.updateMatrixWorld();
      projectHotspots();
      renderer.render(scene, camera);
    };
    render();

    sceneStateRef.current = {
      camera,
      controls,
      models,
      caseParts,
      artifacts,
      floor,
      focusLight,
    };

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sceneStateRef.current = null;
    };
  }, []);

  useEffect(() => {
    const state = sceneStateRef.current;
    if (!state) return;

    state.caseParts.forEach((part) => {
      part.visible = !hideCase;
    });
    state.floor.visible = !hideCase;

    state.models.forEach((model, id) => {
      const isSelected = selectedId === id;
      model.visible = selectedId === null || isSelected;
      model.scale.setScalar(isSelected ? (hideCase ? 1.32 : 1.08) : 1);
    });

    if (selectedId === null) {
      const isMobile = window.innerWidth < 760;
      state.camera.fov = isMobile ? 54 : 42;
      state.camera.position.set(0, 4.3, isMobile ? 12.2 : 10.4);
      state.controls.target.set(0, 1.95, 0);
      state.focusLight.position.set(0, 2.6, 1.2);
    } else {
      const selectedModel = state.models.get(selectedId);
      if (!selectedModel) return;

      if (hideCase) {
        state.camera.fov = 36;
        state.controls.target.set(selectedModel.position.x, 1.85, 0);
        state.camera.position.set(selectedModel.position.x + 1.15, 2.35, 3.55);
        state.focusLight.position.set(selectedModel.position.x, 2.5, 2.0);
      } else {
        state.camera.fov = 42;
        state.controls.target.set(selectedModel.position.x, 1.95, 0);
        state.camera.position.set(selectedModel.position.x + 2.6, 3.45, 6.2);
        state.focusLight.position.set(selectedModel.position.x, 2.6, 1.2);
      }
    }

    state.camera.updateProjectionMatrix();
    state.controls.update();
  }, [selectedId, hideCase]);

  return (
    <div
      className="scene-container"
      ref={containerRef}
      style={{ cursor: onSurfaceClick3D ? "crosshair" : "grab" }}
    >
      {/* 3 Điểm chọn tủ kính khi ở màn hình tổng quan */}
      {exhibitIds.map((id) => (
        <button
          key={id}
          ref={(element) => {
            if (element) hotspotRefs.current.set(id, element);
            else hotspotRefs.current.delete(id);
          }}
          className={`exhibit-hotspot ${selectedId === id ? "is-selected" : ""}`}
          type="button"
          aria-label={`Chọn ${exhibitLabels[id]}`}
          style={{ left: "50%", top: "50%" }}
          onClick={() => onSelectRef.current(id)}
        >
          <span className="hotspot-marker" aria-hidden="true" />
        </button>
      ))}

      {/* Các nút Hotspot La Mã (I, II, III) NEO TRỰC TIẾP TRÊN MÔ HÌNH 3D */}
      {selectedId &&
        customHotspots.map((hs) => (
          <button
            key={hs.id}
            ref={(el) => {
              if (el) customHotspotRefs.current.set(hs.id, el);
              else customHotspotRefs.current.delete(hs.id);
            }}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onHotspotClick?.(hs);
            }}
            title={`${hs.roman}. ${hs.title}`}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 18,
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: "rgba(5, 6, 8, 0.92)",
              border: "1.5px solid #c8aa6e",
              color: "#f4f4f0",
              fontFamily: "var(--font-serif)",
              fontWeight: 700,
              fontSize: "13px",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              boxShadow:
                "0 0 0 3px rgba(200, 170, 110, 0.16), 0 4px 14px rgba(0, 0, 0, 0.8)",
              transition: "border-color 0.15s ease, transform 0.15s ease",
            }}
          >
            {hs.roman}
          </button>
        ))}
    </div>
  );
}