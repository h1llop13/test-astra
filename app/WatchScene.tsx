import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildWatch } from './model';
import type { MutableRefObject } from 'react';

export type SceneProps = { progress?: MutableRefObject<number>; reduced?: boolean; mobile?: boolean; active?: boolean; mode?: 'story' | 'art' | 'strap' | 'detail'; detail?: number; strap?: string; onReady?: () => void; onFailure?: () => void };
const smooth = (t: number) => { t = THREE.MathUtils.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const stops = [
  // progress, tilt X, tilt Y, tilt Z, camera Z, explode, center X
  [0, -.17, -.28, -.25, 11.9, 0, 1.35],
  [.16, .08, -.58, -.2, 10.6, 0, 1.35],
  [.37, .45, -.91, -.32, 14.5, 1, 1.45],
  [.56, .1, -.23, -.16, 7.2, 1.25, 1.5],
  [.67, .16, -.3, -.18, 8.8, 1.1, 1.45],
  [.84, -.16, Math.PI * 2 - .3, -.16, 12.2, 0, 1.35],
  [1, -.05, Math.PI * 2 - .15, 0, 12.1, 0, 1.35],
];
function sample(p: number) {
  let i = 0; while (i < stops.length - 2 && p > stops[i + 1][0]) i++;
  const a = stops[i], b = stops[i + 1], t = smooth((p - a[0]) / (b[0] - a[0]));
  return a.map((v, j) => THREE.MathUtils.lerp(v, b[j], t));
}
function World({ progress, reduced = false, mobile = false, active = true, mode = 'story', strap = '#242422', detail = 0, onReady, onFailure }: SceneProps) {
  const { gl, scene, camera, invalidate } = useThree();
  const model = useMemo(() => buildWatch(mobile), [mobile]);
  const state = useRef({ p: progress?.current ?? 0, entered: 0 });
  const detailPose = useRef<number[] | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    // A photographic studio: dark surroundings and long softboxes. Contrast in the
    // environment is what makes real metal read as metal, rather than flat white.
    gl.transmissionResolutionScale = mobile ? .5 : 1;
    const room = new THREE.Scene();room.background = new THREE.Color('#626867');
    const boxes: THREE.Mesh[]=[];
    const softbox=(w:number,h:number,x:number,y:number,z:number,intensity:number,color:string)=>{
      const box=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide}));box.position.set(x,y,z);box.lookAt(0,0,0);room.add(box);boxes.push(box);
    };
    softbox(7,9,1.5,1,8,1.5,'#e7eceb');
    softbox(3,10,-5,3,5,5,'#e1edff');softbox(2,8,5,1,3,3,'#fff2d7');softbox(9,2,0,7,1,4,'#ffffff');softbox(5,5,0,-4,-5,1.4,'#c5d2d4');softbox(1,7,-3,0,-4,2,'#ffffff');
    const pmrem = new THREE.PMREMGenerator(gl); const env = pmrem.fromScene(room,.025); scene.environment=env.texture;scene.environmentIntensity=1;
    boxes.forEach(box=>{box.geometry.dispose();(box.material as THREE.Material).dispose();});pmrem.dispose();
    const contextLost = (event: Event) => { event.preventDefault(); onFailure?.(); };
    gl.domElement.addEventListener('webglcontextlost', contextLost);
    const timer = window.setTimeout(() => onReady?.(), 120);
    invalidate();
    return () => { clearTimeout(timer); scene.environment = null; env.dispose(); gl.domElement.removeEventListener('webglcontextlost', contextLost); };
  }, [gl, scene, invalidate, onReady, onFailure]);
  useEffect(() => {
    clearTimeout(model.root.userData.disposeTimer);
    return () => { model.root.userData.disposeTimer = setTimeout(() => model.dispose(), 0); };
  }, [model]);
  useEffect(() => { model.leather.color.set(strap); invalidate(); }, [model, strap, invalidate]);
  useEffect(() => { invalidate(); }, [active, reduced, detail, invalidate]);
  useFrame((frame, delta) => {
    const dt = Math.min(delta, .05);
    const target = reduced ? 0 : progress?.current ?? 0;
    state.current.p = reduced ? 0 : THREE.MathUtils.damp(state.current.p, target, 6, dt);
    const p = state.current.p;
    let pose = sample(p);
    if (mode === 'art') pose = [0, .26, -.3, -.56, 6.4, .15, 0];
    if (mode === 'strap') pose = [0, -.15, -.26, .2, mobile ? 12.4 : 10.9, 0, 0];
    if (mode === 'detail') pose = detail===0 ? [0,.17,-.18,-.13,4.5,0,-.08] : detail===1 ? [0,.45,-1.12,-.25,4.9,0,-.55] : [0,.17,-.16,-.38,5.1,0,0];
    if(mode==='detail' && !reduced) { if(!detailPose.current) detailPose.current=[...pose]; detailPose.current=pose.map((v,i)=>THREE.MathUtils.damp(detailPose.current![i],v,5,dt)); pose=detailPose.current; }
    const time = frame.clock.elapsedTime;
    pointer.current.x = THREE.MathUtils.damp(pointer.current.x, reduced || mobile ? 0 : frame.pointer.x * .035, 3, dt);
    pointer.current.y = THREE.MathUtils.damp(pointer.current.y, reduced || mobile ? 0 : frame.pointer.y * .025, 3, dt);
    model.root.rotation.set(pose[1] + pointer.current.y, pose[2] + pointer.current.x, pose[3] + (reduced ? 0 : Math.sin(time * .28) * .009));
    model.root.position.set(mode === 'story' && mobile ? 0 : pose[6] + (mode==='story' && (camera as THREE.PerspectiveCamera).aspect<1.35 ? .35 : 0), mode === 'story' && mobile ? -.03 : mode === 'art' ? -.04 : -.05, 0);
    if (!reduced) model.root.position.y += Math.sin(time * .65) * .028;
    const scale = 1; model.root.scale.setScalar(scale);
    camera.position.z = pose[4] + (mode === 'story' && mobile ? 1.8 : 0);
    camera.position.x = mode === 'art' ? -.18 : 0; camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    const inside = mode==='story' ? smooth((p-.42)/.095)*(1-smooth((p-.67)/.065)) : 0;
    for (const [i,l] of model.layers.entries()) { l.object.position.z = l.base + pose[5] * l.travel * (mobile ? .75 : 1) + (i>=7?inside*11:0); l.object.visible = true; }
    // A cutaway presentation in the editorial composition exposes the actual model.
    if (mode === 'art' || (mode==='detail' && detail===2)) model.layers.forEach((l, i) => { l.object.visible = i > 0 && i < 7; });
    const rate = reduced ? 0 : 1;
    for (const g of model.gears) g.object.rotation.z += dt * g.speed * rate;
    if (rate) model.balance.rotation.z = Math.sin(time * Math.PI * 6) * .36;
    else model.balance.rotation.z = 0;
    if (!reduced) {model.seconds.rotation.z=-time*Math.PI/30;model.minuteHand.rotation.z=-Math.PI/3-time*Math.PI/1800;model.hourHand.rotation.z=Math.PI/3-time*Math.PI/21600;}
    if(!reduced) scene.environmentRotation.y=Math.sin(time*.14)*.08+pointer.current.x;
    // Invalidate only visible, animated scenes. Reduced motion renders on demand.
    if (active && !reduced && !document.hidden) invalidate();
  });
  return <><ambientLight intensity={.35} /><directionalLight position={[4, 7, 7]} intensity={1.65} color="#fff6e6" /><directionalLight position={[-5, 1, 5]} intensity={1.1} color="#d9e5ec" /><primitive object={model.root} dispose={null} /></>;
}
export default function WatchScene(props: SceneProps) {
  const canvas = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reset = () => { if (!document.hidden) window.dispatchEvent(new Event('resize')); };
    document.addEventListener('visibilitychange', reset); return () => document.removeEventListener('visibilitychange', reset);
  }, []);
  return <div ref={canvas} className={`watch-canvas mode-${props.mode ?? 'story'}`} role="img" aria-label={props.mode === 'art' ? 'Calibre A01: three-dimensional cutaway of the gold gear train, balance and hand-finished bridges' : 'Interactive three-dimensional AURELIS No. 01, with polished silver case, graphite dial and leather strap'}>
    <Canvas dpr={props.mobile ? [1, 1.25] : [1, 1.75]} frameloop="demand" camera={{ position: [0, 0, 11.9], fov: 36, near: .1, far: 80 }} gl={{ antialias: !props.mobile, alpha: true, powerPreference: props.mobile ? 'low-power' : 'high-performance' }} fallback={<span className="no-webgl">The No. 01 — crafted from the inside out.</span>}>
      <Suspense fallback={null}><World {...props} /></Suspense>
    </Canvas>
  </div>;
}
