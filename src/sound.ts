export type SoundName = 'step' | 'push' | 'pad' | 'exit' | 'jump' | 'land';
const gains:Record<SoundName,number>={step:.4,push:.5,pad:.42,exit:.42,jump:.3,land:.4};
export class GameSound {
  private context:AudioContext|null=null;
  private bus:GainNode|null=null;
  private music:HTMLAudioElement|null=null;
  private buffers=new Map<SoundName,AudioBuffer>();
  private active=new Set<AudioBufferSourceNode>();
  muted=false;
  constructor(){try{this.muted=localStorage.getItem('ink-rooms-muted')==='true';}catch{}}
  unlock(){
    if(!this.context){
      this.context=new AudioContext();this.bus=this.context.createGain();this.bus.gain.value=this.muted?0:1;this.bus.connect(this.context.destination);
      // Stream one continuous loop through the same mute control as the effects.
      this.music=new Audio('/audio/music.mp3');this.music.loop=true;
      this.context.createMediaElementSource(this.music).connect(this.bus);
      for(const name of Object.keys(gains) as SoundName[])fetch(`/audio/${name}.mp3`).then(r=>{if(!r.ok)throw Error('sound');return r.arrayBuffer();}).then(b=>this.context!.decodeAudioData(b)).then(b=>this.buffers.set(name,b)).catch(()=>{});
    }
    if(this.context.state==='suspended')void this.context.resume();
    if(!document.hidden&&this.music?.paused)void this.music.play().catch(()=>{});
  }
  play(name:SoundName,delay=0,rate=1){
    const buffer=this.buffers.get(name),context=this.context;if(!context||!this.bus||!buffer||this.muted||document.hidden)return;
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.playbackRate.value=rate;gain.gain.value=gains[name];source.connect(gain);gain.connect(this.bus);this.active.add(source);
    source.onended=()=>{this.active.delete(source);source.disconnect();gain.disconnect();};source.start(context.currentTime+delay);
  }
  stop(){for(const source of this.active){try{source.stop();}catch{}}this.active.clear();}
  visibilityChanged(){
    if(document.hidden){this.stop();this.music?.pause();}
    else if(this.context)this.unlock();
  }
  toggle(){this.muted=!this.muted;if(this.bus&&this.context)this.bus.gain.setTargetAtTime(this.muted?0:1,this.context.currentTime,.03);try{localStorage.setItem('ink-rooms-muted',String(this.muted));}catch{}return this.muted;}
  get ready(){return this.buffers.size===6;}
}
