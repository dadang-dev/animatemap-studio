from pathlib import Path
import wave,json,hashlib
import numpy as np

def mix_audio(voice_path,timeline,output_dir):
    r=Path(output_dir);d=timeline;rate=48000;N=round(d['duration']*rate);rng=np.random.default_rng(319);events=[]
    with wave.open(str(voice_path),'rb') as f:v=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)/32768
    voice=np.zeros(N);voice[:len(v)]=v;music=np.zeros(N);sfx=np.zeros(N)
    def put(a,t,x):
     i=max(0,round(t*rate));j=min(N,i+len(x))
     if j>i:a[i:j]+=x[:j-i]
    def tone(t,freq,dur,gain,kind):
     u=np.arange(round(dur*rate))/rate;x=np.sin(2*np.pi*freq*u)*np.exp(-u*5)*np.minimum(1,u/.015)*gain;put(sfx,t,x);events.append({'time':t,'type':kind})
    chords=[[130.81,164.81,196],[110,130.81,164.81],[146.83,174.61,220],[123.47,146.83,185]]
    for i,at in enumerate(np.arange(0,d['duration'],.66)):
     u=np.arange(round(1.1*rate))/rate;ch=chords[(i//8)%4];put(music,at,sum(np.sin(2*np.pi*f*u) for f in ch)*np.exp(-u*3)*np.minimum(1,u/.04)*.008)
    for b in d['beats']:
     at=b['start'];dur=min(2.8,b['end']-at);action=b['action'];u=np.arange(round(dur*rate))/rate;noise=np.convolve(rng.normal(size=len(u)),np.ones(19)/19,'same');env=np.sin(np.pi*np.minimum(1,u/dur))**2
     if action in ['melt','source-water','canyon','canyon-flow','reservoir','middle-flow','lake-season']:
      put(sfx,at,noise*env*.035);events.append({'time':at,'type':'original-water-'+action})
     elif action in ['turbine','dam-build','dam-width']:
      put(sfx,at,(noise*.02+np.sin(2*np.pi*85*u)*.012)*env);tone(at+.1,240,.6,.03,'turbine-metal')
     elif action in ['port-rank','cargo','grain','city-flow']:
      for n in range(3):tone(at+.15+n*.22,320+n*85,.2,.022,'cargo-wood-metal')
     elif action in ['survey','absence']:
      for n in range(3):tone(at+n*.7,900,.5,.026,'sonar-ping')
     elif action in ['snow','porpoise','porpoise-count','fish-recovery','ecology']:
      tone(at+.1,740,.7,.02,'soft-water-chime')
     else:
      dur=.28;u=np.arange(round(dur*rate))/rate;put(sfx,at,np.convolve(rng.normal(size=len(u)),np.ones(23)/23,'same')*np.sin(np.pi*u/dur)**2*.027);events.append({'time':at,'type':'short-map-transition'})
     for k in range(1,3):
      if at+k*.55<b['end']-.15 and action in ['ban','relocation','network','rice']:tone(at+k*.55,620+k*110,.18,.016,'meaningful-detail-cue')
    # Actual voice envelope ducks music and SFX during speech; no source sample music reused.
    env=np.convolve(abs(voice),np.ones(4800)/4800,'same');duck=np.where(env>.008,.48,1.0);music*=duck;sfx*=np.where(env>.012,.75,1)
    times=np.arange(N)/rate;fade=np.minimum(1,np.minimum(times/.25,(d['duration']-times)/.35));music*=fade;sfx*=fade;master=voice+music+sfx;gain=min(1,.83/max(abs(master)));(r/'audio-stems').mkdir(exist_ok=True)
    def save(p,x):
     with wave.open(str(p),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(rate);f.writeframes(np.round(np.column_stack([x,x])*32767).astype('<i2').tobytes())
    for name,x in [('voice',voice),('music',music),('sfx',sfx)]:save(r/f'audio-stems/{name}.wav',x*gain)
    save(r/'master.wav',master*gain)
    (r/'audio-provenance.json').write_text(json.dumps({'voice':'Local input WAV; retain caller provenance separately','noAudioUpload':True,'musicAndSFX':'Original deterministic synthesis, seed 319, no reference soundtrack reused','events':events,'ducking':'Voice envelope >0.008 halves music, >0.012 reduces SFX','gain':gain,'peak':float(max(abs(master*gain))),'duration':d['duration'],'voiceSHA256':hashlib.sha256(Path(voice_path).read_bytes()).hexdigest(),'masterSHA256':hashlib.sha256((r/'master.wav').read_bytes()).hexdigest()},indent=2),'utf8')
    return {'master':str(r/'master.wav'),'events':len(events),'peak':float(max(abs(master*gain)))}
