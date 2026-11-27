const statusLine = document.querySelector('#status');
const startButton = document.querySelector('#start');
const template = document.querySelector('#experience');

const aimText = '白い「小戸池」の案内板の文字面を画面に入れてください。';
const placement = { right: 2.05, depth: -2.6, up: -0.4, height: 3.0 };
const jpegWidth = 640;
const jpegDpi = 72;

startButton.addEventListener('click', () => {
  if (!window.AFRAME || !AFRAME.systems.arjs) {
    statusLine.textContent = 'ARの読み込みに失敗しました。通信を確認してページを開き直してください。';
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    statusLine.textContent = 'HTTPSの公開ページをiPhoneのSafariで開いてください。';
    return;
  }

  const content = template.content.cloneNode(true);
  const marker = content.querySelector('a-nft');
  const holder = content.querySelector('#placement');
  const dragon = content.querySelector('#dragon');
  let markerReady = false;
  let modelReady = false;
  let videoReady = false;
  let found = false;
  let errorMessage = '';
  let signWidth = jpegWidth * 25.4 / jpegDpi;

  function renderStatus() {
    statusLine.textContent = errorMessage || (
      !markerReady || !modelReady || !videoReady
        ? 'カメラ・案内板の認識データ・龍神を準備しています…'
        : found
          ? '龍神さまが現れました。案内板を画面に入れたまま揺れを確認してください。'
          : aimText
    );
  }

  function placeDragon() {
    holder.object3D.position.set(
      placement.right * signWidth,
      placement.depth * signWidth,
      -placement.up * signWidth
    );
    const model = dragon.getObject3D('mesh');
    if (!model) return;

    const bounds = new AFRAME.THREE.Box3().setFromObject(model.clone());
    const height = bounds.max.y - bounds.min.y;
    if (!Number.isFinite(height) || height <= 0) return;
    const center = bounds.getCenter(new AFRAME.THREE.Vector3());
    const scale = placement.height * signWidth / height;
    dragon.object3D.scale.setScalar(scale);
    dragon.object3D.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  }

  window.addEventListener('arjs-nft-init-data', ({ detail }) => {
    if (detail.width > 0 && detail.dpi > 0) {
      signWidth = detail.width * 25.4 / detail.dpi;
      if (modelReady) placeDragon();
    }
  });
  window.addEventListener('arjs-nft-loaded', () => {
    markerReady = true;
    renderStatus();
  });
  window.addEventListener('arjs-video-loaded', () => {
    videoReady = true;
    renderStatus();
  });
  window.addEventListener('camera-error', () => {
    errorMessage = 'カメラを開始できませんでした。Safariでカメラを許可し、ページを開き直してください。';
    renderStatus();
  });
  dragon.addEventListener('model-loaded', () => {
    modelReady = true;
    placeDragon();
    renderStatus();
  });
  dragon.addEventListener('model-error', () => {
    errorMessage = '龍神のGLBを読み込めませんでした。公開ページのファイル配置を確認してください。';
    renderStatus();
  });
  marker.addEventListener('markerFound', () => {
    found = true;
    renderStatus();
  });
  marker.addEventListener('markerLost', () => {
    found = false;
    renderStatus();
  });

  startButton.hidden = true;
  renderStatus();
  document.body.append(content);
  window.setTimeout(() => {
    if ((markerReady && modelReady && videoReady) || errorMessage) return;
    statusLine.textContent = '準備に時間がかかっています。表示が進まない場合は、通信・カメラ許可・ファイル配置を確認してください。';
  }, 25000);
}, { once: true });

window.addEventListener('pagehide', () => {
  document.querySelectorAll('video').forEach(video => {
    video.srcObject?.getTracks().forEach(track => track.stop());
  });
});
window.addEventListener('pageshow', event => {
  if (event.persisted && startButton.hidden) location.reload();
});
