import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paper, ink, edge, fine } from './art';

/** Original miniature warehouse helper. Geometry is owned per instance; game inks are shared. */
function workshop() {
  const owned = new Set<THREE.BufferGeometry>();
  const own = <T extends THREE.BufferGeometry>(g:T):T => { owned.add(g); return g; };
  function mesh(p:THREE.Group,g:THREE.BufferGeometry,x=0,y=0,z=0,mat:THREE.Material=paper,outline=true) {
    own(g); const m=new THREE.Mesh(g,mat); m.position.set(x,y,z);p.add(m);
    if(outline){const l=new THREE.LineSegments(own(new THREE.EdgesGeometry(g,24)),edge);l.position.copy(m.position);p.add(l);}return m;
  }
  function box(p:THREE.Group,w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material=paper){return mesh(p,new THREE.BoxGeometry(w,h,d),x,y,z,mat);}
  function panel(p:THREE.Group,w:number,h:number,d:number,x:number,y:number,z:number){
    const b=.055,s=new THREE.Shape();s.moveTo(-w/2+b,-h/2);s.lineTo(w/2-b,-h/2);s.lineTo(w/2,-h/2+b);s.lineTo(w/2,h/2-b);s.lineTo(w/2-b,h/2);s.lineTo(-w/2+b,h/2);s.lineTo(-w/2,h/2-b);s.lineTo(-w/2,-h/2+b);s.closePath();
    const g=new THREE.ExtrudeGeometry(s,{depth:d-.024,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:1,steps:1});g.translate(0,0,-d/2+.012);return mesh(p,g,x,y,z);
  }
  function line(p:THREE.Group,pts:number[],mat:THREE.Material=fine){const a:number[]=[];for(let i=3;i<pts.length;i+=3)a.push(...pts.slice(i-3,i+3));const g=own(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));p.add(new THREE.LineSegments(g,mat));}
  function cyl(p:THREE.Group,r:number,d:number,x:number,y:number,z:number,mat:THREE.Material=paper,axis:'x'|'y'|'z'='y',n=16){const g=new THREE.CylinderGeometry(r,r,d,n);if(axis==='x')g.rotateZ(Math.PI/2);if(axis==='z')g.rotateX(Math.PI/2);return mesh(p,g,x,y,z,mat);}
  function screw(p:THREE.Group,x:number,y:number,z:number){cyl(p,.023,.013,x,y,z,ink,'z',6);line(p,[x-.013,y,z+.009,x+.013,y,z+.009],fine);}
  function cable(p:THREE.Group,pts:number[][],r=.012){const curve=new THREE.CatmullRomCurve3(pts.map(v=>new THREE.Vector3(...v as [number,number,number])));mesh(p,new THREE.TubeGeometry(curve,14,r,5,false),0,0,0,ink,false);}
  function batch(p:THREE.Group){
    p.updateMatrixWorld(true);const inv=p.matrixWorld.clone().invert(),sets=new Map<string,{m:THREE.Material,l:boolean,g:THREE.BufferGeometry[]}>(),old=new Set<THREE.BufferGeometry>();
    p.traverse(o=>{if(!(o instanceof THREE.Mesh||o instanceof THREE.LineSegments))return;const m=o.material as THREE.Material,l=o instanceof THREE.LineSegments,k=m.uuid+String(l);const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(inv.clone().multiply(o.matrixWorld));g.deleteAttribute('normal');g.deleteAttribute('uv');if(!sets.has(k))sets.set(k,{m,l,g:[]});sets.get(k)!.g.push(g);old.add(o.geometry);});
    p.clear();for(const s of sets.values()){const g=mergeGeometries(s.g);if(g)p.add(s.l?new THREE.LineSegments(own(g),s.m):new THREE.Mesh(own(g),s.m));for(const v of s.g)v.dispose();}for(const g of old){g.dispose();owned.delete(g);}
  }
  return {mesh,box,panel,line,cyl,screw,cable,batch,dispose(){for(const g of owned)g.dispose();owned.clear();}};
}

export function createRobotArt(){
  const w=workshop(),root=new THREE.Group();root.name='ink-helper-robot';
  const chassis=new THREE.Group();root.add(chassis);
  w.panel(chassis,.63,.50,.57,0,.67,0);w.box(chassis,.7,.065,.66,0,.435,0,ink);
  // Front apron, central tow clevis and inset serial bars.
  w.panel(chassis,.48,.22,.035,0,.65,.302);
  for(const x of [-.25,.25])for(const y of [.51,.82])w.screw(chassis,x,y,.302);
  w.box(chassis,.2,.045,.09,0,.49,.35);for(let i=0;i<6;i++)w.box(chassis,i%2?.009:.017,.06,.006,-.09+i*.032,.65,.325,ink);
  // Rear service hatch, louvers, socket and a loop of insulated cable.
  const rear=new THREE.Group();rear.rotation.y=Math.PI;chassis.add(rear);
  w.panel(rear,.48,.34,.035,0,.67,.3);for(let i=0;i<5;i++)w.box(rear,.25,.014,.02,0,.65+i*.036,.327,ink);
  for(const x of [-.195,.195])for(const y of [.55,.79])w.screw(rear,x,y,.326);
  w.cyl(rear,.052,.025,.15,.55,.335,ink,'z');w.cyl(rear,.028,.029,.15,.55,.338,paper,'z');
  w.cable(rear,[[-.2,.55,.34],[-.22,.45,.40],[.12,.43,.4],[.15,.55,.36]]);
  // Side cheeks, embossed ribs, hatch seams and intentional pen hatching.
  for(const sign of [-1,1]){
    const side=new THREE.Group();side.rotation.y=sign*Math.PI/2;chassis.add(side);
    w.panel(side,.4,.26,.03,0,.7,.324);
    for(let i=0;i<7;i++)w.line(side,[-.15+i*.041,.59,.343,-.12+i*.041,.65,.343]);
    for(const x of [-.155,.155])w.screw(side,x,.78,.344);
    w.cable(chassis,[[sign*.30,.78,-.18],[sign*.37,.87,-.15],[sign*.39,.9,.02]],.015);
    // Independent axle bearings and spring links above each rolling wheel.
    for(const z of [-.24,.24]){w.cyl(chassis,.07,.18,sign*.32,.24,z,ink,'x');w.box(chassis,.035,.15,.055,sign*.33,.36,z);for(let k=0;k<5;k++)w.cyl(chassis,.035,.012,sign*.34,.3+k*.021,z,ink);}
  }
  w.cyl(chassis,.12,.09,0,.96,0,ink);w.cyl(chassis,.085,.13,0,1.015,0);
  for(let i=0;i<5;i++)w.line(chassis,[-.22+i*.08,.944,-.20,-.18+i*.08,.944,-.10]);
  w.batch(chassis);
  const head=new THREE.Group();head.position.y=1.10;root.add(head);
  w.panel(head,.65,.36,.40,0,.05,0);
  w.panel(head,.55,.21,.035,0,.07,.22);
  // Two deep circular lens barrels, white glints and a small mouth grille.
  for(const x of [-.15,.15]){w.cyl(head,.094,.045,x,.085,.252,ink,'z',24);w.cyl(head,.069,.053,x,.085,.258,paper,'z',24);w.cyl(head,.044,.058,x,.085,.265,ink,'z',20);w.cyl(head,.014,.062,x-.016,.105,.27,paper,'z',10);}
  for(let i=0;i<4;i++)w.box(head,.026,.013,.012,-.058+i*.038,-.045,.246,ink);
  for(const s of [-1,1]){w.cyl(head,.068,.06,s*.347,.07,0,ink,'x');w.cyl(head,.043,.065,s*.35,.07,0,paper,'x');}
  for(let i=0;i<5;i++)w.line(head,[-.23+i*.092,.249,-.12,-.18+i*.092,.249,-.035]);
  for(let i=0;i<4;i++)w.box(head,.28,.012,.012,0,-.03+i*.045,-.208,ink);
  w.cyl(head,.022,.18,.23,.30,-.09,ink);w.cyl(head,.037,.018,.23,.39,-.09);
  w.batch(head);
  const statusMaterial=new THREE.MeshBasicMaterial({color:0x80b99a});
  const lamp=w.cyl(head,.026,.022,.23,.413,-.09,statusMaterial); // single owned status material
  const arms:{shoulder:THREE.Group;hand:THREE.Group;rails:THREE.Group}[]=[];
  for(const sign of [-1,1]){
    const arm=new THREE.Group();arm.name='robot-shoulder';arm.position.set(sign*.34,.8,.02);root.add(arm);
    w.cyl(arm,.074,.095,sign*.025,0,0,ink,'x');w.cyl(arm,.047,.1,sign*.028,0,0,paper,'x');
    w.panel(arm,.115,.12,.30,sign*.065,-.08,.14);w.cyl(arm,.058,.12,sign*.068,-.1,.29,ink,'x');
    // Fixed bearing block. Twin guided piston rods remain connected throughout extension.
    w.box(arm,.13,.12,.07,sign*.065,-.075,.285);
    for(const dx of [-.042,.042])w.cyl(arm,.027,.075,sign*.065+dx,-.075,.30,ink,'z');
    w.cable(arm,[[sign*.04,.04,-.04],[sign*.11,.075,.13],[sign*.10,.01,.28]],.013);
    w.batch(arm);
    const rails=new THREE.Group();rails.name='robot-telescopic-rods';rails.position.z=.29;
    for(const dx of [-.042,.042])w.cyl(rails,.015,.13,sign*.065+dx,-.075,.065,paper,'z',12);
    w.batch(rails);arm.add(rails);
    const hand=new THREE.Group();hand.name='robot-push-gripper';
    w.box(hand,.15,.16,.055,sign*.065,-.055,.44);
    for(const dx of [-.054,.054]){w.box(hand,.038,.16,.075,sign*.065+dx,-.04,.48);for(let i=0;i<3;i++)w.box(hand,.039,.012,.005,sign*.065+dx,-.09+i*.04,.52,ink);}
    for(const dx of [-.042,.042])w.cyl(hand,.022,.035,sign*.065+dx,-.075,.418,ink,'z');
    w.batch(hand);arm.add(hand);arms.push({shoulder:arm,hand,rails});
  }
  const wheels:THREE.Group[]=[];
  for(const sign of [-1,1])for(const z of [-.24,.24]){
    const wheel=new THREE.Group();wheel.position.set(sign*.365,.215,z);root.add(wheel);wheels.push(wheel);
    w.cyl(wheel,.213,.15,0,0,0,ink,'x',24);w.cyl(wheel,.147,.158,0,0,0,paper,'x',24);w.cyl(wheel,.075,.169,0,0,0,ink,'x');w.cyl(wheel,.037,.175,0,0,0,paper,'x',6);
    for(let k=0;k<16;k++){const t=k*Math.PI/8;const g=new THREE.BoxGeometry(.154,.019,.045);g.rotateX(t);w.mesh(wheel,g,0,Math.cos(t)*.207,Math.sin(t)*.207,paper,false);}
    for(let k=0;k<5;k++){const t=k*Math.PI*2/5;w.cyl(wheel,.015,.172,0,Math.cos(t)*.106,Math.sin(t)*.106,ink,'x',6);}
    w.batch(wheel);
  }
  return {root,update({time,moving,pushing,blocked,distance}:{time:number;moving:number;pushing:number;blocked:boolean;distance:number}){
    const move=THREE.MathUtils.clamp(moving,0,1),push=THREE.MathUtils.clamp(pushing,0,1);
    for(const wheel of wheels)wheel.rotation.x=distance/.213;
    head.rotation.y=Math.sin(time*.62)*.065*(1-move)*(1-push);head.rotation.x=-push*.055;head.position.y=1.1+Math.sin(time*1.6)*.006*(1-move);
    arms.forEach(({shoulder,hand,rails},i)=>{shoulder.rotation.x=push*.10+Math.sin(time*2+i*Math.PI)*.012*(1-move)*(1-push);hand.position.z=push*.46;rails.scale.z=1+push*.46/.13;});
    chassis.rotation.z=Math.sin(time*12)*.007*move;statusMaterial.color.setHex(blocked?0xc88683:0x80b99a);lamp.scale.setScalar(blocked?1+.06*Math.sin(time*5):1);
  },dispose(){w.dispose();statusMaterial.dispose();}};
}

export function createArrowTileArt(direction:number){
  const w=workshop(),root=new THREE.Group(),arrow=new THREE.Group();root.name='robot-direction-plate';
  w.box(root,.90,.035,.90,0,.015,0);for(const x of [-.37,.37])for(const z of [-.37,.37]){w.cyl(root,.027,.012,x,.04,z,ink,'y',6);w.line(root,[x-.015,.047,z,x+.015,.047,z]);}
  // Raised chunky arrow in an inset rotating disc, front tip points north.
  w.cyl(root,.335,.018,0,.04,0,paper,'y',32);w.cyl(root,.06,.022,0,.051,0,ink);
  const s=new THREE.Shape();s.moveTo(-.065,.23);s.lineTo(.065,.23);s.lineTo(.065,-.025);s.lineTo(.19,-.025);s.lineTo(0,-.25);s.lineTo(-.19,-.025);s.lineTo(-.065,-.025);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:.012,bevelEnabled:false});g.rotateX(Math.PI/2);w.mesh(arrow,g,0,.072,0,ink,false);w.batch(root);w.batch(arrow);root.add(arrow);
  const setDirection=(d:number)=>{arrow.rotation.y=-d*Math.PI/2;};setDirection(direction);
  return {root,setDirection,dispose:w.dispose};
}
