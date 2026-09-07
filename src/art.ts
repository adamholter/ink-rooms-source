import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const CELL = 1.55;
export const paper = new THREE.MeshBasicMaterial({ color: 0xffffff });
export const ink = new THREE.MeshBasicMaterial({ color: 0x151515 });
export const edge = new THREE.LineBasicMaterial({ color: 0x151515 });
export const fine = new THREE.LineBasicMaterial({ color: 0xb8b8b8 });
const red = new THREE.MeshBasicMaterial({ color: 0xc88683 });
const green = new THREE.MeshBasicMaterial({ color: 0x80b99a });
const geometries = new Set<THREE.BufferGeometry>();
const own = <T extends THREE.BufferGeometry>(g: T): T => { geometries.add(g); return g; };
export function disposeRoomArt() { for (const g of geometries) g.dispose(); geometries.clear(); }
export function setArtTheme(dark: boolean) {
  paper.color.setHex(dark ? 0x080808 : 0xffffff);
  ink.color.setHex(dark ? 0xf5f5f5 : 0x151515);
  edge.color.copy(ink.color); fine.color.setHex(dark ? 0x555555 : 0xb8b8b8);
}
function box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, material = paper, outlined = true) {
  const g = own(new THREE.BoxGeometry(w, h, d));
  const m = new THREE.Mesh(g, material); m.position.set(x, y, z); parent.add(m);
  if (outlined) { const l = new THREE.LineSegments(own(new THREE.EdgesGeometry(g)), edge); l.position.copy(m.position); parent.add(l); }
  return m;
}
function stroke(parent: THREE.Object3D, coords: number[], material = fine) {
  const pairs:number[]=[];for(let i=3;i<coords.length;i+=3)pairs.push(...coords.slice(i-3,i+3));
  const g = own(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pairs, 3));
  const line = new THREE.LineSegments(g, material); parent.add(line); return line;
}
function cylinder(parent: THREE.Object3D, radius: number, height: number, y: number, material = paper, segments = 48) {
  const geo = own(new THREE.CylinderGeometry(radius, radius, height, segments));
  const mesh = new THREE.Mesh(geo, material); mesh.position.y = y; parent.add(mesh);
  const lines = new THREE.LineSegments(own(new THREE.EdgesGeometry(geo, 24)), edge); lines.position.y = y; parent.add(lines); return mesh;
}
function ring(parent: THREE.Object3D, inner: number, outer: number, y: number, material = ink) {
  const mesh = new THREE.Mesh(own(new THREE.RingGeometry(inner, outer, 64)), material);
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; parent.add(mesh); return mesh;
}
function bolt(parent: THREE.Object3D, x: number, y: number, z: number, radius = .027) {
  const head = new THREE.Mesh(own(new THREE.CylinderGeometry(radius, radius, .012, 6)), ink);
  head.position.set(x, y, z); parent.add(head);
  stroke(parent, [x - radius * .6, y + .008, z, x + radius * .6, y + .008, z], fine);
}
// Each module has an exposed beveled underside. Internal joints stay hairline thin.
export function floorTile(neighbors: boolean[], surface = paper) {
  const root = new THREE.Group();
  const slab = box(root, CELL, .2, CELL, 0, -.15, 0, paper, false);
  if (surface !== paper) {
    // BoxGeometry's third group is the top face. Replace it instead of layering
    // coplanar surfaces, which flicker at distant camera positions.
    const top = slab.geometry.groups[2];
    const indices = Array.from(slab.geometry.index!.array);
    slab.geometry.setIndex(indices.filter((_, i) => i < top.start || i >= top.start + top.count));
    slab.geometry.clearGroups();
    const geometry = own(new THREE.PlaneGeometry(CELL, CELL));
    geometry.rotateX(-Math.PI / 2);
    const face = new THREE.Mesh(geometry, surface);
    face.position.y = -.05;
    root.add(face);
  }
  stroke(root, [-CELL/2, -.048, -CELL/2, CELL/2, -.048, -CELL/2, CELL/2, -.048, CELL/2, -CELL/2, -.048, CELL/2, -CELL/2, -.048, -CELL/2]);

  neighbors.forEach((solid, i) => {
    if (solid) return;
    const side = new THREE.Group(); side.rotation.y = i * -Math.PI/2;
    box(side, CELL, .075, .045, 0, -.08, -CELL/2, ink, false);
    box(side, CELL-.08, .095, .045, 0, -.22, -CELL/2+.04, paper);
    for(let k=0;k<8;k++) stroke(side, [-.7+k*.19,-.25,-CELL/2+.012,-.62+k*.19,-.18,-CELL/2+.012], edge);
    root.add(side);
  });
  return root;
}
export function obstacle() {
  const root = new THREE.Group();
  box(root, CELL-.07, .52, CELL-.07, 0, .21, 0);
  box(root, CELL-.17, .07, CELL-.17, 0, .505, 0);
  for (let side=0;side<4;side++) {
    const face = new THREE.Group(); face.rotation.y = side*Math.PI/2; root.add(face);
    box(face, 1.12, .24, .018, 0, .24, -.749, ink, false);
    for(let i=0;i<9;i++) stroke(face, [-.48+i*.115,.16,-.763,-.4+i*.115,.32,-.763], fine);
  }
  for(const x of [-.57,.57]) for(const z of [-.57,.57]) bolt(root,x,.548,z,.035);
  return root;
}
// Six separately detailed faces, so grain and joinery hold up when the crate falls.
export function createCrate() {
  const root = new THREE.Group();
  box(root, 1.02, 1.02, 1.02, 0, .56, 0);
  const faceGeometry = (face: THREE.Group) => {
    for(const x of [-.46,.46]) box(face,.09,.96,.055,x,0,.022);
    for(const y of [-.46,.46]) box(face,.85,.085,.055,0,y,.022);
    for (const x of [-.24,0,.24]) stroke(face,[x,-.41,.034,x,.41,.034],edge);
    for(let plank=0;plank<4;plank++) for(let line=0;line<4;line++) {
      const x=-.37+plank*.245+line*.038;
      stroke(face,[x,-.37,.036,x+.011,-.21,.036,x-.008,-.09,.036,x+.008,.05,.036,x-.005,.22,.036,x+.004,.36,.036]);
    }
    // Cross brace with double edge, and four corner straps.
    const brace = box(face,1.16,.075,.052,0,0,.069);
    brace.rotation.z = Math.PI/4;
    // Box outline rotation must follow the brace.
    face.children[face.children.length-1].rotation.z = Math.PI/4;
    for(const x of [-.44,.44]) for(const y of [-.44,.44]) {
      box(face,.115,.115,.035,x,y,.078,ink,false);
      const screw = new THREE.Mesh(own(new THREE.CircleGeometry(.024,12)),paper);
      screw.position.set(x,y,.098);face.add(screw);
      stroke(face,[x-.014,y-.014,.099,x+.014,y+.014,.099],edge);
    }
    // Off-center wood knot, drawn as nested contour lines.
    for(const radius of [.019,.033,.051]) {
      const points:number[]=[]; for(let a=0;a<=24;a++) {const t=a/24*Math.PI*2;points.push(-.29+Math.cos(t)*radius,.12+Math.sin(t)*radius*1.9,.038);} stroke(face,points);
    }
  };
  for(let side=0;side<4;side++) {const face=new THREE.Group(); faceGeometry(face); face.position.set(Math.sin(side*Math.PI/2)*.511,.56,Math.cos(side*Math.PI/2)*.511);face.rotation.y=side*Math.PI/2;root.add(face);}
  for(const top of [true,false]) {const face=new THREE.Group();faceGeometry(face);face.position.y=top?1.071:.049;face.rotation.x=top?-Math.PI/2:Math.PI/2;root.add(face);}
  return root;
}
export type PadArt = {root: THREE.Group; setActive: (active: boolean) => void};
export function createPad(exit = false, switchPlate = false): PadArt {
  if(switchPlate){
    const root=new THREE.Group(),light=ring(root,.65,.705,.125,red);
    return {root,setActive(active:boolean){light.material=active?green:red;}};
  }
  const root = new THREE.Group();
  const radius = exit ? .69 : .72;
  cylinder(root,radius,.055,-.006,ink);
  cylinder(root,radius-.035,.05,.035);
  cylinder(root,radius-.12,.024,.073);
  const light=ring(root,radius-.115,radius-.04,.062,red);
  ring(root,radius-.19,radius-.179,.089);
  for(let i=0;i<8;i++) {const a=i*Math.PI/4;bolt(root,Math.cos(a)*(radius-.025),.065,Math.sin(a)*(radius-.025),.017);}
  const detail = new THREE.Group(); root.add(detail);
  if(!exit) {
    const s=.185;
    stroke(detail,[-s,.09,-s,s,.09,-s,s,.09,s,-s,.09,s,-s,.09,-s],edge);
    for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
      const tick=new THREE.Group();tick.rotation.y=a;root.add(tick);
      box(tick,.05,.012,.09,0,.09,.39,ink,false);
    }
  } else {
    // A low landing dock with an open arch, inset conduits, and machined feet.
    for(const side of [-1,1]) {
      box(root,.22,.12,.4,side*.62,.07,0);
      box(root,.13,1.45,.16,side*.62,.81,0);
      box(root,.035,1.13,.012,side*.62,.83,.09,ink,false);
      for(let k=0;k<6;k++) stroke(root,[side*.62-.047,.32+k*.18,.088,side*.62+.047,.38+k*.18,.088],fine);
      for(const z of [-.12,.12]) bolt(root,side*.62,.137,z,.024);
    }
    const archShape=new THREE.Shape();
    archShape.moveTo(-.685,1.49);archShape.bezierCurveTo(-.685,2.0,.685,2.0,.685,1.49);
    archShape.lineTo(.555,1.49);archShape.bezierCurveTo(.555,1.81,-.555,1.81,-.555,1.49);archShape.closePath();
    const geo=own(new THREE.ExtrudeGeometry(archShape,{depth:.16,bevelEnabled:false,curveSegments:32}));
    const arch=new THREE.Mesh(geo,paper);arch.position.z=-.08;root.add(arch);
    const outlines=new THREE.LineSegments(own(new THREE.EdgesGeometry(geo,25)),edge);outlines.position.z=-.08;root.add(outlines);
    const lamp=new THREE.Mesh(own(new THREE.SphereGeometry(.064,12,8)),red);lamp.position.set(0,1.875,.095);root.add(lamp);
    // Floor arrow is readable without a floating text placard.
    const arrow=new THREE.Shape();arrow.moveTo(-.085,.23);arrow.lineTo(.085,.23);arrow.lineTo(.085,-.02);arrow.lineTo(.22,-.02);arrow.lineTo(0,-.25);arrow.lineTo(-.22,-.02);arrow.lineTo(-.085,-.02);arrow.closePath();
    const am=new THREE.Mesh(own(new THREE.ShapeGeometry(arrow)),ink);am.rotation.x=-Math.PI/2;am.position.y=.092;root.add(am);
    root.userData.lamp=lamp;
  }
  return {root,setActive(active:boolean){light.material=active?green:red;if(root.userData.lamp)root.userData.lamp.material=active?green:red;detail.position.y=active?-.012:0;}};
}

// Bake static detail into a handful of draws, keeping each movable prop separate.
export function batchArt(root: THREE.Group) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const groups = new Map<string, {material:THREE.Material, lines:boolean, geometries:THREE.BufferGeometry[]}>();
  root.traverse(o => {
    if (!(o instanceof THREE.Mesh || o instanceof THREE.LineSegments)) return;
    const material=o.material as THREE.Material, lines=o instanceof THREE.LineSegments;
    const key=material.uuid+String(lines);
    if(!groups.has(key))groups.set(key,{material,lines,geometries:[]});
    const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
    geometry.applyMatrix4(inverse.clone().multiply(o.matrixWorld));
    if(!lines){geometry.deleteAttribute('uv');geometry.deleteAttribute('normal');}
    groups.get(key)!.geometries.push(geometry);
  });
  root.clear();
  for(const group of groups.values()) {
    const geometry=mergeGeometries(group.geometries)!;
    group.geometries.forEach(g=>g.dispose());own(geometry);
    root.add(group.lines?new THREE.LineSegments(geometry,group.material):new THREE.Mesh(geometry,group.material));
  }
  return root;
}

export const TIER_HEIGHT = .65;
// Raised decks have solid side faces; the short risers read as climbable steps.
export function terraceTile(tier: number, neighbors: {solid:boolean; tier:number}[], surface = paper) {
  const root = floorTile(neighbors.map(n => n.solid && n.tier >= tier), surface);
  if (tier === 0) return root;
  const depth = tier * TIER_HEIGHT;
  box(root,CELL,depth,CELL,0,-depth/2-.16,0,paper,false);
  neighbors.forEach((n,i) => {
    if(n.solid && n.tier >= tier) return;
    const exposed = n.solid ? (tier-n.tier)*TIER_HEIGHT : depth;
    const side = new THREE.Group(); side.rotation.y=-i*Math.PI/2; root.add(side);
    box(side,CELL-.07,.05,.035,0,-exposed-.15,-CELL/2-.006,ink,false);
    for(const x of [-.64,.64]) {
      box(side,.04,exposed,.025,x,-exposed/2-.14,-CELL/2-.008,ink,false);
      for(let y=.16;y<exposed;y+=.28) stroke(side,[x-.045,-y,-CELL/2-.025,x+.045,-y-.07,-CELL/2-.025],edge);
    }
    // Inset panel edges and a light diagonal hatch separate the two floor heights.
    stroke(side,[-.53,-.23,-CELL/2-.012,.53,-.23,-CELL/2-.012,.53,-exposed-.07,-CELL/2-.012,-.53,-exposed-.07,-CELL/2-.012,-.53,-.23,-CELL/2-.012]);
    for(let k=0;k<9;k++) stroke(side,[-.5+k*.115,-exposed-.04,-CELL/2-.015,-.44+k*.115,-exposed+.08,-CELL/2-.015]);
    if(n.solid && tier-n.tier===1) {
      // Two small ascending chevrons identify an automatic step.
      for(const y of [-.2,-.34]) stroke(side,[-.09,y-.045,-CELL/2-.028,0,y+.015,-CELL/2-.028,.09,y-.045,-CELL/2-.028],edge);
    }
  });
  return root;
}
