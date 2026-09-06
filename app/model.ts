import * as THREE from 'three';

export type Watch = ReturnType<typeof buildWatch>;
const TAU = Math.PI * 2;
// All geometry and textures are original, generated on-device. No model or HDR download.
export function buildWatch(mobile = false) {
  const root = new THREE.Group();
  const layers: { object: THREE.Group; base: number; travel: number }[] = [];
  const gears: { object: THREE.Group; speed: number }[] = [];
  const resources: (THREE.Material | THREE.BufferGeometry | THREE.Texture)[] = [];
  const keep = <T extends THREE.Material | THREE.BufferGeometry | THREE.Texture>(r: T): T => { resources.push(r); return r; };
  const material = (color: string, metalness = 1, roughness = .25) => keep(new THREE.MeshStandardMaterial({ color, metalness, roughness }));
  const silver = material('#aeb6bc', 1, .27), edge = material('#e1e6e7', 1, .115);
  const gold = material('#b59450', .94, .23), dark = material('#202929', .65, .33);
  const ruby = material('#8e233f', .55, .18), screwMat = material('#4a6070', .9, .23);
  const segments = mobile ? 64 : 112;
  function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) {
    const o = new THREE.Mesh(keep(g), m); o.position.set(x, y, z); return o;
  }
  function disc(r: number, depth: number, m: THREE.Material, x = 0, y = 0, z = 0) {
    const o = mesh(new THREE.CylinderGeometry(r, r, depth, segments), m, x, y, z); o.rotation.x = Math.PI / 2; return o;
  }
  function ring(ro: number, ri: number, depth: number, m: THREE.Material) {
    const shape = new THREE.Shape(); shape.absarc(0, 0, ro, 0, TAU, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, ri, 0, TAU, true); shape.holes.push(hole);
    const o = mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .018, bevelThickness: .018, bevelSegments: 2, curveSegments: segments / 2 }), m);
    o.position.z = -depth / 2; return o;
  }
  function layer(base: number, travel: number) { const object = new THREE.Group(); object.position.z = base; root.add(object); layers.push({ object, base, travel }); return object; }
  function screw(parent: THREE.Group, x: number, y: number, z: number, r = .052) {
    parent.add(disc(r, .024, edge, x, y, z));
    const slot = mesh(new THREE.BoxGeometry(r * 1.45, .013, .004), screwMat, x, y, z + .014); slot.rotation.z = .5; parent.add(slot);
  }
  function texture(draw: (c: CanvasRenderingContext2D, size: number) => void, size = 1024) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    draw(canvas.getContext('2d')!, size);
    const t = keep(new THREE.CanvasTexture(canvas)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  let seed = 73;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const leatherMap = texture((c, s) => {
    c.fillStyle = '#93938e'; c.fillRect(0, 0, s, s);
    // Irregular pores and creases, rather than uniform noise, give calfskin its grain.
    for (let i = 0; i < 42000; i++) { const v = Math.floor(40 + random() * 170); c.fillStyle = `rgba(${v},${v},${v},0.45)`; c.beginPath(); c.ellipse(random() * s, random() * s, random() * 3 + .5, random() * 1.5 + .4, random() * 3, 0, TAU); c.fill(); }
    for (let i = 0; i < 900; i++) { const x = random() * s, y = random() * s; c.strokeStyle = 'rgba(25,25,23,.22)'; c.lineWidth = .6; c.beginPath(); c.moveTo(x,y); c.bezierCurveTo(x+5,y-4,x+12,y+4,x+18,y+2); c.stroke(); }
  }, 512);
  const leather = keep(new THREE.MeshStandardMaterial({ color: '#242422', map: leatherMap, bumpMap: leatherMap, bumpScale: .045, roughness: .69, metalness: .02 }));
  const stitchMat = material('#8a8170', 0, .85);
  const brushMap = texture((c, s) => { c.fillStyle = '#999999'; c.fillRect(0,0,s,s); for(let i=0;i<6000;i++) { const v=Math.floor(90+random()*105); c.strokeStyle=`rgba(${v},${v},${v},.4)`; c.lineWidth=.5; const y=random()*s; c.beginPath();c.moveTo(0,y);c.lineTo(s,y+random()*2);c.stroke(); } },512);
  silver.bumpMap=brushMap; silver.bumpScale=.006; silver.roughnessMap=brushMap;
  const body = layer(0, 0);
  body.add(ring(1.23, 1.075, .32, silver));
  for (let i=0;i<3;i++) { const accent = ring(1.235,1.225,.008,i===1?dark:edge);accent.position.z=-.11+i*.075;body.add(accent); }
  const rim = ring(1.24, 1.215, .07, edge); rim.position.z = .06; body.add(rim);
  for (const side of [-1, 1]) {
    for (const x of [-.67, .67]) {
      const lugShape = new THREE.Shape(); lugShape.moveTo(-.085,-.265);lugShape.lineTo(.085,-.265);lugShape.lineTo(.12,.24);lugShape.lineTo(-.12,.24);lugShape.closePath(); const lug = mesh(new THREE.ExtrudeGeometry(lugShape,{depth:.22,bevelEnabled:true,bevelSize:.028,bevelThickness:.025,bevelSegments:3}),silver,x,side * 1.19,-.17); lug.rotation.x = side * -.18; body.add(lug);
      screw(body, x, side * 1.38, .115, .045);
    }
    // A regular surface grid bends smoothly; a triangulated extruded cap would crease.
    const vertices: number[] = [], uvs: number[] = [], indices: number[] = [];
    const rows = 32, columns = 8;
    for (let face = 0; face < 2; face++) {
      for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
        const t = row / rows, u = col / columns, y = 1.27 + t * 1.9;
        const tip = t > .91 ? Math.sqrt(Math.max(.12, 1 - Math.pow((t - .91) / .1, 2))) : 1;
        const halfWidth = (.55 - t * .08) * tip;
        const x = (u * 2 - 1) * halfWidth;
        const z = -.03 - Math.pow(Math.max(0, y - 1.3), 1.7) * .13 - Math.pow(u * 2 - 1, 6) * .027 - face * .115;
        vertices.push(x, y, z); uvs.push(u, t * 2);
      }
      const base = face * (rows + 1) * (columns + 1);
      for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
        const a = base + row * (columns + 1) + col, b = a + columns + 1;
        if (!face) indices.push(a, a + 1, b, a + 1, b + 1, b);
        else indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const offset = (rows + 1) * (columns + 1);
    for (let row = 0; row < rows; row++) for (const col of [0, columns]) {
      const a = row * (columns + 1) + col, b = a + columns + 1;
      indices.push(a, b, a + offset, b, b + offset, a + offset);
    }
    const strapGeo = new THREE.BufferGeometry(); strapGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); strapGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); strapGeo.setIndex(indices); strapGeo.computeVertexNormals();
    const strap = mesh(strapGeo, leather); strap.material.side = THREE.DoubleSide; strap.rotation.z = side === 1 ? 0 : Math.PI; body.add(strap);
    const stitchGeo = keep(new THREE.BoxGeometry(.012, .06, .009));
    const stitches = new THREE.InstancedMesh(stitchGeo, stitchMat, 52); const m = new THREE.Matrix4();
    for (let i = 0; i < 26; i++) for (let j = 0; j < 2; j++) { const y = 1.39 + i * .061; const x = (j === 0 ? -1 : 1) * (.48 - (y - 1.3) * .039); const z = -.029 - Math.pow(y - 1.3, 1.7) * .13; m.makeTranslation(x * side, y * side, z); stitches.setMatrixAt(i * 2 + j, m); }
    body.add(stitches);
    if (side === -1) for (let i = 0; i < 5; i++) body.add(disc(.034, .007, dark, 0, -2.05 - i * .17, -.028 - Math.pow(.75 + i * .17, 1.7) * .13));
  }
  const crown = new THREE.Group(); crown.position.set(1.34, 0, 0); crown.rotation.y = Math.PI / 2;
  crown.add(disc(.17, .22, silver));
  for (let i = 0; i < 32; i++) { const a = i / 32 * TAU; const ridge = mesh(new THREE.BoxGeometry(.016, .03, .2), edge, Math.cos(a) * .17, Math.sin(a) * .17); ridge.rotation.z = a; crown.add(ridge); }
  crown.add(disc(.145,.012,edge,0,0,.116));
  const crownTexture=texture((c,s)=>{c.fillStyle='#464b4a';c.fillRect(0,0,s,s);c.strokeStyle='#deded3';c.lineWidth=8;c.beginPath();c.moveTo(s*.28,s*.72);c.lineTo(s*.5,s*.22);c.lineTo(s*.72,s*.72);c.moveTo(s*.37,s*.54);c.lineTo(s*.63,s*.54);c.stroke();},256);
  const crownLogo=keep(new THREE.MeshStandardMaterial({map:crownTexture,metalness:.8,roughness:.26})); crown.add(mesh(new THREE.CircleGeometry(.113,32),crownLogo,0,0,.128)); body.add(crown);
  // Spring bars and pin heads are separate from the lugs.
  for(const sign of [-1,1]) {const bar=disc(.055,1.22,edge,0,sign*1.39,-.065);bar.rotation.set(0,0,Math.PI/2);body.add(bar);}
  // Two leather keepers and a rounded steel pin buckle.
  for(const y of [1.7,1.95]) { const loop=mesh(new THREE.BoxGeometry(1.12,.145,.09),leather,0,y,-.032-Math.pow(y-1.3,1.7)*.13);body.add(loop); }
  const buckle=new THREE.Group(); buckle.position.set(0,3.09,-.39);
  for(const sign of [-1,1]) {buckle.add(mesh(new THREE.BoxGeometry(.085,.37,.065),edge,sign*.48,0));buckle.add(mesh(new THREE.BoxGeometry(.99,.075,.065),edge,0,sign*.18));}
  buckle.add(mesh(new THREE.BoxGeometry(.038,.35,.04),edge,0,-.03,.04));body.add(buckle);
  const back = layer(-.21, -1.2); back.add(ring(1.19, .96, .095, silver));
  back.add(disc(.97, .035, dark, 0, 0, -.02));
  for (let i = 0; i < 6; i++) screw(back, Math.cos(i * TAU / 6) * 1.08, Math.sin(i * TAU / 6) * 1.08, .07);
  const plate = layer(-.1, -.65); plate.add(disc(1.06, .055, gold));
  // Concentric engine-turned engraving, batched to keep draw calls bounded.
  const engraving = keep(new THREE.TorusGeometry(.052, .003, 3, 16));
  const perlage = new THREE.InstancedMesh(engraving, silver, mobile ? 100 : 200); const mat = new THREE.Matrix4();
  for (let i = 0; i < perlage.count; i++) { const a = i * 2.39996; const r = Math.sqrt(i / perlage.count) * .99; mat.makeTranslation(Math.cos(a) * r, Math.sin(a) * r, .033); perlage.setMatrixAt(i, mat); } plate.add(perlage);
  for(let i=0;i<9;i++){const a=i*TAU/9;plate.add(disc(.028,.012,dark,Math.cos(a)*.89,Math.sin(a)*.89,.033));}
  const wheelLayer = layer(.015, .15);
  function gear(x: number, y: number, r: number, teeth: number, speed: number, parent = wheelLayer) {
    const g = new THREE.Group(); g.position.set(x, y, .05); parent.add(g); gears.push({ object: g, speed });
    g.add(ring(r * .91, r * .62, .042, gold)); g.add(disc(r * .22, .06, gold));
    for (let j = 0; j < 5; j++) { const a = TAU * j / 5; const spoke = mesh(new THREE.BoxGeometry(r * .13, r * .75, .035), gold, -Math.sin(a) * r * .43, Math.cos(a) * r * .43); spoke.rotation.z = a; g.add(spoke); }
    const teethMesh = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(r * .12, r * .13, .047)), gold, teeth);
    for (let i = 0; i < teeth; i++) { const a = TAU * i / teeth; const m = new THREE.Matrix4().makeRotationZ(a); m.setPosition(-Math.sin(a) * r * .95, Math.cos(a) * r * .95, 0); teethMesh.setMatrixAt(i, m); } g.add(teethMesh);
    g.add(disc(.047,.025,ruby,0,0,.036));g.add(disc(.024, .08, screwMat, 0, 0, .045)); const hubRing=ring(r*.85,r*.83,.005,edge);hubRing.position.z=.027;g.add(hubRing); return g;
  }
  gear(-.4, .4, .38, 40, .18); gear(.18, .33, .22, 24, -.3);
  gear(.52, -.08, .29, 32, .225); gear(.1, -.48, .3, 32, -.225);
  gear(-.4, -.35, .22, 24, .3); gear(-.05, -.01, .16, 18, .4);
  const barrel = layer(-.03, -.32); barrel.add(disc(.35, .085, gold, -.47, .42));
  for (let i = 0; i < 8; i++) { const spiral = mesh(new THREE.TorusGeometry(.06 + i * .034, .004, 3, 48), dark, -.47, .42, .051); barrel.add(spiral); }
  const balanceLayer = layer(.06, .55); const balance = new THREE.Group(); balance.position.set(-.46, -.42, .06); balanceLayer.add(balance);
  balance.add(ring(.29, .255, .032, gold));
  for (let i = 0; i < 3; i++) { const s = mesh(new THREE.BoxGeometry(.04, .52, .025), gold); s.rotation.z = i * Math.PI / 3; balance.add(s); }
  const spiralPoints = Array.from({ length: 240 }, (_, i) => { const t = i / 239; return new THREE.Vector3(Math.cos(t * TAU * 5) * (.025 + t * .2), Math.sin(t * TAU * 5) * (.025 + t * .2), .027); });
  balance.add(new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints(spiralPoints)), keep(new THREE.LineBasicMaterial({ color: '#708b9c' }))));
  for(let i=0;i<12;i++){const a=i*TAU/12;balance.add(disc(.017,.022,edge,Math.cos(a)*.272,Math.sin(a)*.272,.025));}
  balance.add(disc(.039, .06, ruby, 0, 0, .04));
  const bridges = layer(.14, .98);
  for (const [x, y, rot, width] of [[.04, .57, .15, 1.25], [.3, -.39, -.65, .9], [-.53, .08, 1.35, .7]]) {
    const shape = new THREE.Shape(); shape.moveTo(-width / 2, -.095); shape.lineTo(width / 2, -.095); shape.quadraticCurveTo(width / 2 + .1, 0, width / 2, .095); shape.lineTo(-width / 2, .095); shape.quadraticCurveTo(-width / 2 - .1, 0, -width / 2, -.095);
    const b = mesh(new THREE.ExtrudeGeometry(shape, { depth: .055, bevelEnabled: true, bevelSize: .013, bevelThickness: .012, bevelSegments: 2 }), silver, x, y, 0); b.rotation.z = rot; bridges.add(b);
    for (const d of [-1, 1]) { const sx = x + Math.cos(rot) * width * .37 * d; const sy = y + Math.sin(rot) * width * .37 * d; screw(bridges, sx, sy, .079); }
    bridges.add(disc(.052, .012, ruby, x, y, .073));
  }
  const dialTexture = texture((c, s) => {
    const h = s / 2; const grad = c.createRadialGradient(h, h, 0, h, h, h); grad.addColorStop(0, '#36403f'); grad.addColorStop(.6, '#202d2e'); grad.addColorStop(1, '#101c1e'); c.fillStyle = grad; c.fillRect(0, 0, s, s);
    c.translate(h, h);
    for (let i = 0; i < 2400; i++) { const a = i / 2400 * TAU; c.strokeStyle = `rgba(200,215,203,${random() * .036})`; c.lineWidth = .7; c.beginPath(); c.moveTo(Math.cos(a) * 25, Math.sin(a) * 25); c.lineTo(Math.cos(a) * h, Math.sin(a) * h); c.stroke(); }
    c.strokeStyle = '#6d7773'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, s * .453, 0, TAU); c.stroke();
    for (let i = 0; i < 60; i++) { c.save(); c.rotate(i / 60 * TAU); c.fillStyle = '#aeb6ab'; c.fillRect(-1, -s * .435, 2, i % 5 === 0 ? 15 : 7); c.restore(); }
    for(let i=0;i<70;i++){c.strokeStyle='rgba(190,200,185,.065)';c.lineWidth=.65;c.beginPath();c.arc(0,0,s*(.27+i*.0018),0,TAU);c.stroke();}
    c.textAlign = 'center'; c.fillStyle = '#d6c899'; c.font = `${s * .049}px serif`; c.fillText('A U R E L I S', 0, -s * .22);
    c.fillStyle = '#a4aca3'; c.font = `${s * .019}px sans-serif`; c.fillText('N O .  0 1', 0, -s * .172);
    c.font = `${s * .021}px serif`; c.fillText('MECHANICAL', 0, s * .17); c.font = `${s * .016}px sans-serif`; c.fillText('7 2  H O U R S', 0, s * .205);
    c.font = `${s * .012}px sans-serif`; c.fillText('S W I S S   M A D E', 0, s * .395);
    c.strokeStyle = '#7c887f'; c.beginPath(); c.arc(0, s * .285, s * .073, 0, TAU); c.stroke();
    for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; c.beginPath(); c.moveTo(Math.sin(a) * s * .068, s * .285 + Math.cos(a) * s * .068); c.lineTo(Math.sin(a) * s * .06, s * .285 + Math.cos(a) * s * .06); c.stroke(); }
  });
  const dialMat = keep(new THREE.MeshStandardMaterial({ map: dialTexture, color:'#a4b3b1', roughness: .46, metalness: .32, bumpMap:dialTexture,bumpScale:.003 }));
  const dial = layer(.265, 1.8); dial.add(disc(1.071, .04, dark));
  dial.add(mesh(new THREE.CircleGeometry(1.07, segments), dialMat, 0, 0, .024));
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; const marker = mesh(new THREE.BoxGeometry(i % 3 === 0 ? .052 : .033, .143, .02), edge, Math.sin(a) * .9, Math.cos(a) * .9, .04); marker.rotation.z = -a; dial.add(marker); const inset = mesh(new THREE.BoxGeometry(.009, .097, .005), gold, Math.sin(a) * .9, Math.cos(a) * .9, .052); inset.rotation.z = -a; dial.add(inset); }
  const secondsRim=ring(.168,.154,.009,gold);secondsRim.position.set(0,-.61,.038);dial.add(secondsRim);
  const secondFace=disc(.153,.009,dark,0,-.61,.029);dial.add(secondFace);
  for(let i=0;i<30;i++){const a=i*TAU/30;const tick=mesh(new THREE.BoxGeometry(.003,i%5===0?.021:.01,.004),silver,Math.sin(a)*.137,-.61+Math.cos(a)*.137,.038);tick.rotation.z=-a;dial.add(tick);}
  const hands = layer(.347, 2.25);
  function hand(length: number, width: number, angle: number) {
    const shape = new THREE.Shape(); shape.moveTo(-width * .42, -.15); shape.lineTo(-width / 2, length * .36); shape.lineTo(0, length); shape.lineTo(width / 2, length * .36); shape.lineTo(width * .42, -.15); shape.closePath();
    const g = new THREE.Group(); const m = mesh(new THREE.ExtrudeGeometry(shape, { depth: .016, bevelEnabled: true, bevelSize: .007, bevelThickness: .005, bevelSegments: 1 }), edge); g.add(m);
    const inset = mesh(new THREE.BoxGeometry(width * .22, length * .55, .008), gold, 0, length * .38, .025); g.add(inset); g.rotation.z = angle; hands.add(g); return g;
  }
  const hourHand=hand(.62, .082, Math.PI / 3); const minuteHand=hand(.83, .054, -Math.PI / 3); hands.add(disc(.063, .05, gold, 0, 0, .035));
  const seconds = new THREE.Group();seconds.position.set(0,-.61,.054);seconds.add(mesh(new THREE.BoxGeometry(.007,.15,.008),gold,0,.046));seconds.add(disc(.017,.016,edge));dial.add(seconds);
  const bezel = layer(.38, 2.75); bezel.add(ring(1.25, 1.083, .11, edge)); const fineRing = ring(1.1, 1.077, .02, gold); fineRing.position.z = .062; bezel.add(fineRing);
  const glass = layer(.469, 3.45);
  const glassMat = keep(new THREE.MeshPhysicalMaterial({ color:'#ffffff', metalness:0, roughness:0, transmission:mobile?0:1, transparent:mobile, opacity:mobile?.075:1, thickness:.008, ior:1.45, clearcoat:.35, clearcoatRoughness:0, envMapIntensity:.38, depthWrite:false }));
  glass.add(disc(1.078, .027, glassMat));
  const glassEdge = ring(1.084, 1.078, .028, edge); glass.add(glassEdge);
  return { root, layers, gears, balance, leather, seconds, hourHand, minuteHand,
    dispose() { resources.forEach(r => r.dispose()); },
  };
}
