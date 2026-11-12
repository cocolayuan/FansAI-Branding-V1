import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// One unmodified, user-approved atlas is embedded once in the .riv.
// Each Image uses an ellipse clip and a translation into that atlas.
const atlas = 'assets/approved-atlas.png';
const names = ['Growth', 'Customers', 'Decision', 'Workbench'];
const centers = [140.5, 385.5, 624.5, 866];
const scale = 52 / 234;
let idSeed = 100;
const id = () => `0:${idSeed++}`;
const ease = '<CubicEaseInterpolator x1="0.22" y1="0.75" x2="0.25" y2="1"/>';
const key = (frame, value, interpolation='cubic') => `<KeyFrameDouble frame="${frame}" value="${value}" interpolationType="${interpolation}">${interpolation==='cubic'?ease:''}</KeyFrameDouble>`;
const track = (property, values) => `<KeyedProperty propertyKey="${property}">${values.map(([f,v,i])=>key(f,v,i)).join('')}</KeyedProperty>`;
const object = (target, properties) => `<KeyedObject objectId="${target}">${properties.map(([k,v])=>track(k,v)).join('')}</KeyedObject>`;
const boolCondition = (prop, value) => `<TransitionViewModelCondition opValue="equal"><TransitionPropertyViewModelComparator><BindablePropertyBoolean><DataBindContext sourcePathIds="0:10-${prop}" propertyKey="634"/></BindablePropertyBoolean></TransitionPropertyViewModelComparator><TransitionValueBooleanComparator value="${value}"/></TransitionViewModelCondition>`;
const transition = (to, conditions, duration=100) => `<StateTransition stateToId="${to}" duration="${duration}" enableEarlyExit="true" interpolationType="cubic">${ease}${conditions.map(([prop,value])=>boolCondition(prop,value)).join('')}</StateTransition>`;
const constant = value => [[0,value]];
const animation = (aid,name,duration,tracks) => `<LinearAnimation name="${name}" id="${aid}" fps="60" duration="${duration}">${tracks.join('')}</LinearAnimation>`;
// This is a 2D projection, not a 3D mesh. A positive abs(cos(Y-angle))
// narrows the face, while a separate silver edge remains visible at 90°.
// Swapping atlas faces only while edge-on preserves readable, unmirrored symbols.
const angleKnots = [[0,0],[4,35],[9,90],[14,140],[18,172],[22,188],[26,178],[29,180]];
const projectedWidths = Array.from({length:30},(_,frame)=>{
  const end = angleKnots.findIndex(([f])=>f>=frame);
  const [f1,a1] = angleKnots[Math.max(0,end-1)];
  const [f2,a2] = angleKnots[end];
  const angle = f2===f1 ? a2 : a1+(a2-a1)*(frame-f1)/(f2-f1);
  return [frame,Math.max(0.015,Math.abs(Math.cos(angle*Math.PI/180))).toFixed(6),'linear'];
});
const artboards = names.map((name,index)=>{
  const [art, machine, motion, press, silver, blue, clip, shine, inactiveAnim, activeAnim, releasedAnim, pressedAnim, selectionLayer, pressLayer, inactive, active, released, pressed, staticActiveAnim, staticActive, restAnim, rest, style, face, edge] = Array.from({length:25},id);
  const image = (iid,cy,opacity,label) => `<Image id="${iid}" name="${label}" assetId="0:2" originX="0" originY="0" x="${-centers[index]*scale}" y="${-cy*scale}" scaleX="${scale}" scaleY="${scale}" opacity="${opacity}"><ClippingShape sourceId="${clip}" name="Atlas crop"/></Image>`;
  const visual = `<Node x="32" y="40" name="Press pivot" id="${press}"><Node name="Coin motion" id="${motion}">
    <Node name="Y-axis projected face" id="${face}">
    <Shape name="Specular sweep" id="${shine}" x="-40" rotation="0.30" opacity="0">
      <Rectangle width="17" height="74"/>
      <Fill><LinearGradient startX="-8.5" startY="0" endX="8.5" endY="0"><GradientStop colorValue="00FFFFFF" position="0"/><GradientStop colorValue="75FFFFFF" position="0.5"/><GradientStop colorValue="00FFFFFF" position="1"/></LinearGradient></Fill>
      <ClippingShape sourceId="${clip}"/>
    </Shape>
    ${image(blue,321,0,'Blue selected atlas')}
    ${image(silver,798,1,'Silver idle atlas')}
    <Shape name="Coin silhouette" id="${clip}"><Ellipse width="52" height="54"/></Shape>
    </Node>
    <Shape name="Thin glass edge" id="${edge}" opacity="0">
      <Ellipse width="1.85" height="53.2"/>
      <Fill><LinearGradient startX="-0.925" startY="0" endX="0.925" endY="0"><GradientStop colorValue="B88EA8BB" position="0"/><GradientStop colorValue="F5DAEDFA" position="0.30"/><GradientStop colorValue="FFFFFFFF" position="0.52"/><GradientStop colorValue="E6A9C1D2" position="0.80"/><GradientStop colorValue="88788FA5" position="1"/></LinearGradient></Fill>
    </Shape>
  </Node></Node>`;
  const machineRml = `<StateMachine id="${machine}" name="TabIcon">
    <StateMachineLayer name="Selection" id="${selectionLayer}">
      <AnyState x="0" y="-160"/><ExitState x="620" y="-160"/><EntryState x="0" y="0"><StateTransition stateToId="${inactive}"/></EntryState>
      <AnimationState id="${inactive}" animationId="${inactiveAnim}" reset="true" x="180" y="0">${transition(active,[['0:12',true],['0:14',false]],0)}${transition(staticActive,[['0:12',true],['0:14',true]],0)}</AnimationState>
      <AnimationState id="${active}" animationId="${activeAnim}" reset="true" x="430" y="0">${transition(inactive,[['0:12',false],['0:14',false]],180)}${transition(inactive,[['0:12',false],['0:14',true]],0)}${transition(staticActive,[['0:12',true],['0:14',true]],0)}</AnimationState>
      <AnimationState id="${staticActive}" animationId="${staticActiveAnim}" reset="true" x="430" y="160">${transition(inactive,[['0:12',false]],0)}${transition(active,[['0:12',true],['0:14',false]],0)}</AnimationState>
    </StateMachineLayer>
    <StateMachineLayer name="Touch feedback" id="${pressLayer}">
      <AnyState x="0" y="-160"/><ExitState x="740" y="-160"/><EntryState x="0" y="0"><StateTransition stateToId="${rest}"/></EntryState>
      <AnimationState id="${rest}" animationId="${restAnim}" reset="true" x="180" y="0">${transition(pressed,[['0:13',true],['0:14',false]],60)}</AnimationState>
      <AnimationState id="${released}" animationId="${releasedAnim}" reset="true" x="430" y="160">${transition(pressed,[['0:13',true],['0:14',false]],60)}${transition(rest,[['0:14',true]],0)}<StateTransition stateToId="${rest}" enableExitTime="true" exitTimeIsPercetange="true" exitTime="100" duration="0"/></AnimationState>
      <AnimationState id="${pressed}" animationId="${pressedAnim}" reset="true" x="430" y="0">${transition(rest,[['0:14',true]],0)}${transition(released,[['0:13',false],['0:14',false]],70)}</AnimationState>
    </StateMachineLayer>
  </StateMachine>`;
  const timelines = [
    animation(inactiveAnim,'Silver',1,[object(motion,[[14,constant(0)],[15,constant(0)],[16,constant(1)],[17,constant(1)]]),object(face,[[13,constant(0)],[16,constant(1)]]),object(edge,[[18,constant(0)]]),object(blue,[[18,constant(0)]]),object(silver,[[18,constant(1)]]),object(shine,[[18,constant(0)]])]),
    animation(staticActiveAnim,'Blue static',1,[object(motion,[[14,constant(0)],[15,constant(0)],[16,constant(1)],[17,constant(1)]]),object(face,[[13,constant(0)],[16,constant(1)]]),object(edge,[[18,constant(0)]]),object(blue,[[18,constant(1)]]),object(silver,[[18,constant(0)]]),object(shine,[[18,constant(0)]])]),
    animation(activeAnim,'Blue flip',29,[
      object(motion,[[14,[[0,0],[4,-2],[9,-7],[14,-7],[18,-6.6],[22,-5.4],[26,-6.2],[29,-6]]],[15,[[0,0],[4,-0.012],[9,0],[18,0.052],[22,0.015],[26,-0.009],[29,0]]],[16,constant(1)],[17,[[0,1],[4,0.98],[9,1.015],[18,1.015],[22,0.99],[29,1]]]]),
      object(face,[[16,projectedWidths],[13,[[0,0],[4,-0.5],[7,-0.85],[9,0],[11,0.75],[14,0.45],[18,0],[29,0]]]]),
      object(edge,[[18,[[0,0],[4,0.12],[7,0.6],[8,0.9],[9,1],[10,0.95],[11,0.65],[14,0.12],[18,0],[29,0]]]]),
      object(blue,[[18,[[0,0,'hold'],[9,0,'hold'],[10,1,'hold'],[29,1]]]]),object(silver,[[18,[[0,1,'hold'],[8,1,'hold'],[9,0,'hold'],[29,0]]]]),
      object(shine,[[13,[[0,-40],[12,-40],[25,40],[29,40]]],[18,[[0,0],[12,0],[16,0.25],[23,0.16],[26,0],[29,0]]]])
    ]),
    animation(releasedAnim,'Release bounce',21,[object(press,[[16,[[0,0.94],[7,1.035],[14,0.99],[21,1]]],[17,[[0,0.94],[7,1.035],[14,0.99],[21,1]]]])]),
    animation(pressedAnim,'Pressed',1,[object(press,[[16,constant(0.94)],[17,constant(0.94)]])]),
    animation(restAnim,'Rest',1,[object(press,[[16,constant(1)],[17,constant(1)]])])
  ].join('\n');
  return `<Artboard id="${art}" name="${name}" width="64" height="72" x="${index*96}" y="0" defaultStateMachineId="${machine}" viewModelId="0:10" viewModelInstanceId="0:11" styleId="${style}"><LayoutComponentStyle id="${style}" name="Fixed artboard" layoutWidthScaleType="fixed" layoutHeightScaleType="fixed"/>${visual}${machineRml}${timelines}</Artboard>`;
});
const rml = `<Rive version="1" kind="fragment">
${artboards.join('\n')}
<ImageAsset file="${atlas}" name="Approved glass icon atlas" id="0:2"/>
<ViewModel name="TabIconState" id="0:10" defaultInstanceId="0:11">
  <ViewModelPropertyBoolean name="active" id="0:12"/>
  <ViewModelPropertyBoolean name="pressed" id="0:13"/>
  <ViewModelPropertyBoolean name="reducedMotion" id="0:14"/>
  <ViewModelInstance name="Default" id="0:11" exports="true"><ViewModelInstanceBoolean viewModelPropertyId="0:12" propertyValue="false"/><ViewModelInstanceBoolean viewModelPropertyId="0:13" propertyValue="false"/><ViewModelInstanceBoolean viewModelPropertyId="0:14" propertyValue="false"/></ViewModelInstance>
</ViewModel>
</Rive>\n`;
writeFileSync(join(dirname(fileURLToPath(import.meta.url)),'scene.rml'),rml);
