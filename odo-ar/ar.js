const status = document.querySelector('#status');
const button = document.querySelector('#start');
const container = document.querySelector('#camera');
const aimText = '白い「小戸池」の案内板の文字面を画面に入れてください。';
const modelPath = './Aoki_Odo_Dragon_Silver_Blue_v22.glb';

// Model placement in units of one sign width. Adjust on site.
const placement = { x: 1.55, y: -0.75, z: -1.2, height: 3.0, yaw: 0 };
let instance;

async function buildScene() {
  const [three, { GLTFLoader }, { RoomEnvironment }, { MindARThree }] = await Promise.all([
    import('three'),
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/environments/RoomEnvironment.js'),
    import('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js'),
  ]);
  const gltf = await new GLTFLoader().loadAsync(modelPath);
  const tracking = new MindARThree({
    container,
    imageTargetSrc: './sign.mind',
    uiLoading: 'no',
    uiScanning: 'no',
    uiError: 'no',
  });
  const { scene, renderer, camera } = tracking;
  const room = new RoomEnvironment();
  const reflections = new three.PMREMGenerator(renderer);
  scene.environment = reflections.fromScene(room, 0.04).texture;
  room.dispose();
  reflections.dispose();
  scene.add(new three.HemisphereLight(0xffffff, 0x879fb8, 1.1));
  const sun = new three.DirectionalLight(0xfff3e0, 1.3);
  sun.position.set(2, 4, 5);
  scene.add(sun);

  const anchor = tracking.addAnchor(0);
  const dragon = gltf.scene;
  dragon.rotation.y = placement.yaw;
  dragon.updateMatrixWorld(true);
  const bounds = new three.Box3().setFromObject(dragon);
  const center = bounds.getCenter(new three.Vector3());
  const scale = placement.height / (bounds.max.y - bounds.min.y);
  dragon.scale.multiplyScalar(scale);
  dragon.position.set(placement.x - center.x * scale,
    placement.y - bounds.min.y * scale,
    placement.z - center.z * scale);
  anchor.group.add(dragon);
  anchor.onTargetFound = () => {
    status.textContent = '龍神さまが現れました。案内板を画面に入れたまま池をご覧ください。';
  };
  anchor.onTargetLost = () => { status.textContent = aimText; };
  return { tracking, scene, renderer, camera };
}

button.addEventListener('click', async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    status.textContent = 'カメラを使えるHTTPSのページをSafariまたはChromeで開いてください。';
    return;
  }
  button.disabled = true;
  status.textContent = '龍神さまとカメラを準備しています…';
  try {
    instance ??= await buildScene();
    const { tracking, scene, renderer, camera } = instance;
    await tracking.start();
    renderer.setAnimationLoop(() => renderer.render(scene, camera));
    status.textContent = aimText;
    button.hidden = true;
  } catch (error) {
    console.error(error);
    container.querySelectorAll('video').forEach(video => {
      video.srcObject?.getTracks().forEach(track => track.stop());
      video.remove();
    });
    status.textContent = 'ARを開始できませんでした。通信とカメラの許可を確認して、もう一度お試しください。';
  } finally {
    button.disabled = false;
  }
});

window.addEventListener('pagehide', () => {
  if (!instance || !button.hidden) return;
  instance.renderer.setAnimationLoop(null);
  instance.tracking.stop();
  button.hidden = false;
  status.textContent = aimText;
});
