"""Portable CLI. Existing TypeScript app and paid-service clients remain authoritative."""
from pathlib import Path
import argparse,hashlib,json,os,shutil,subprocess,sys,wave,zipfile

def read_json(path):
    try:return json.loads(Path(path).read_text('utf-8-sig'))
    except json.JSONDecodeError as e:raise ValueError(f'Invalid JSON {path}: line {e.lineno}, column {e.colno}') from e

def execute(args,**kwargs):
    p=subprocess.run(args,check=False,**kwargs)
    if p.returncode:raise RuntimeError(f'Command failed with exit code {p.returncode}: {Path(str(args[0])).name}')

def main():
    parser=argparse.ArgumentParser(description='Reusable AnimateMap video toolkit. No implicit TTS, ASR upload, cleanup or paid calls.')
    parser.add_argument('--repo',type=Path,help='AnimateMap checkout; auto-detected when run from this repo')
    parser.add_argument('--node',default=shutil.which('node'),help='Node executable; defaults to PATH')
    commands=parser.add_subparsers(dest='command',required=True)
    p=commands.add_parser('doctor',help='Read-only tools, assets and Python dependency checks');p.add_argument('--core-only',action='store_true',help='Skip optional Vox Director/HyperFrames checks')
    p=commands.add_parser('init',help='Copy a neutral, editable starter; refuse an existing destination');p.add_argument('--output',type=Path,required=True)
    for name in ['validate','render','verify','package']:
        p=commands.add_parser(name,help={'validate':'Check project data and local asset paths','render':'Render with full audit and verify; resume matching checkpoints','verify':'Verify MP4, references, CFR and decoded audio','package':'Package verified editable source, assets and licenses'}[name]);p.add_argument('--project',type=Path,required=True)
        if name in ['render','verify']:p.add_argument('--output',type=Path,required=True,help='Render output/checkpoint directory; use a new path for changed input')
        if name=='package':p.add_argument('--render-dir',type=Path,required=True);p.add_argument('--output',type=Path,required=True,help='New .zip filename')
    p=commands.add_parser('mix',help='Deterministic original music/SFX with envelope ducking, using existing mixer math');p.add_argument('--voice',type=Path,required=True,help='Authorized 48kHz mono signed PCM16 WAV');p.add_argument('--timeline',type=Path,required=True,help='JSON with duration and beats[{start,end,action}]');p.add_argument('--output',type=Path,required=True)
    p=commands.add_parser('align',help='Local faster-whisper ASR; never upload audio');p.add_argument('--audio',type=Path,required=True);p.add_argument('--script',type=Path,required=True,help='Approved plain UTF-8 script as ASR prompt');p.add_argument('--model',default='small');p.add_argument('--revision',help='Explicit model revision; small defaults to config/asr-model.json');p.add_argument('--cache-dir',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--allow-model-download',action='store_true',help='Permit initial public model download; never upload input audio')
    args=parser.parse_args()
    repo=args.repo.resolve() if args.repo else Path(__file__).resolve().parents[3]
    worker=repo/'scripts/video-runtime.mjs'
    if not worker.is_file():raise ValueError('AnimateMap checkout missing; pass --repo /path/to/animatemap-studio')
    if not args.node:raise ValueError('Node not found; install Node 24 and retry')
    if args.command=='doctor':
        execute([args.node,str(worker),'doctor']+(['--core-only'] if args.core_only else []));from importlib.metadata import version,PackageNotFoundError
        missing=[]
        for n in ['numpy','faster-whisper']:
            try:print(json.dumps({'pythonPackage':n,'version':version(n)}))
            except PackageNotFoundError:missing.append(n)
        if missing:raise ValueError('Missing Python packages: '+', '.join(missing)+'. Install scripts/requirements.txt in your venv')
        return
    if args.command=='init':execute([args.node,str(worker),'init',str(args.output.resolve())]);return
    if args.command in ['validate','render','verify']:
        if not args.project.is_dir():raise FileNotFoundError('Project directory not found: '+str(args.project))
        cmd=[args.node,str(worker),args.command,str(args.project.resolve())]
        if args.command!='validate':cmd.append(str(args.output.resolve()))
        execute(cmd);return
    if args.command=='mix':
        from audio_tools import mix_audio
        if not args.voice.is_file():raise FileNotFoundError('Voice WAV not found: '+str(args.voice))
        d=read_json(args.timeline)
        if not isinstance(d,dict) or not isinstance(d.get('duration'),(int,float)) or not .1<=d['duration']<=300 or not isinstance(d.get('beats'),list):raise ValueError('Timeline requires duration in [0.1,300] and beats array')
        for b in d['beats']:
            if not isinstance(b,dict) or not isinstance(b.get('start'),(int,float)) or not isinstance(b.get('end'),(int,float)) or not 0<=b['start']<b['end']<=d['duration'] or not isinstance(b.get('action'),str):raise ValueError('Invalid beat range/action')
        with wave.open(str(args.voice),'rb') as w:
            if (w.getframerate(),w.getnchannels(),w.getsampwidth())!=(48000,1,2):raise ValueError('Voice must be 48kHz mono PCM16; resample a separate copy with FFmpeg')
            if w.getnframes()>round(d['duration']*48000):raise ValueError('Voice exceeds timeline; do not truncate speech')
        if args.output.exists():raise FileExistsError('Output already exists; choose another directory')
        args.output.mkdir(parents=True);print(json.dumps(mix_audio(args.voice,d,args.output)));return
    if args.command=='align':
        for p in [args.audio,args.script]:
            if not p.is_file():raise FileNotFoundError('Input not found: '+str(p))
        if args.output.exists():raise FileExistsError('Output already exists')
        os.environ['HF_HUB_DISABLE_TELEMETRY']='1';os.environ['HF_HUB_DISABLE_XET']='1'
        from faster_whisper import WhisperModel
        import numpy as np
        model_lock=read_json(repo/'config/asr-model.json');revision=args.revision or (model_lock['revision'] if args.model=='small' else None)
        model=WhisperModel(args.model,revision=revision,device='cpu',compute_type='int8',cpu_threads=4,download_root=str(args.cache_dir.resolve()),local_files_only=not args.allow_model_download)
        p=subprocess.run([os.environ.get('FFMPEG_PATH','ffmpeg'),'-v','error','-i',str(args.audio),'-t','301','-ar','16000','-ac','1','-f','f32le','pipe:1'],capture_output=True)
        if p.returncode:raise ValueError('FFmpeg could not decode input: '+p.stderr.decode(errors='replace')[-800:])
        if len(p.stdout)>300*16000*4:raise ValueError('Alignment input exceeds 300 seconds; split explicitly')
        pcm=np.frombuffer(p.stdout,dtype=np.float32);segments,info=model.transcribe(pcm,language='vi',word_timestamps=True,beam_size=5,vad_filter=False,condition_on_previous_text=False,initial_prompt=args.script.read_text('utf-8-sig'))
        rows=[{'text':w.word.strip(),'startSeconds':w.start,'endSeconds':w.end,'probability':w.probability} for s in segments for w in (s.words or [])]
        args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps({'method':f'Local faster-whisper {args.model}/int8; estimated ASR timing, review against approved script; no upload','language':info.language,'duration':info.duration,'model':args.model,'revision':revision,'words':rows},ensure_ascii=False,indent=2),'utf8');print(json.dumps({'words':len(rows),'output':str(args.output)}));return
    if args.command=='package':
        execute([args.node,str(worker),'check-verified',str(args.project.resolve()),str(args.render_dir.resolve())])
        if args.output.exists():raise FileExistsError('Archive already exists')
        report=read_json(args.render_dir/'verification.json');files=[]
        for folder in ['src','public']:
            for p in (args.project/folder).rglob('*'):
                if p.is_symlink():raise ValueError('Symlink in source tree: '+str(p))
                if p.is_file():files.append((p,p.relative_to(args.project).as_posix()))
        for n in ['package.json','package-lock.json','tsconfig.json']:files.append((args.project/n,n))
        files.append((args.render_dir/'verification.json','delivery/verification.json'))
        secrets=[v.encode() for k,v in os.environ.items() if v and k in ['AI33_API_KEY','OPENAI_API_KEY','GITHUB_TOKEN','GH_TOKEN']];entries=[]
        for p,n in files:
            b=p.read_bytes()
            if p.name.startswith('.env') or any(x in b for x in secrets) or b'-----BEGIN PRIVATE KEY-----' in b:raise ValueError('Credential excluded from archive: '+n)
            entries.append({'file':n,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
        args.output.parent.mkdir(parents=True,exist_ok=True)
        with zipfile.ZipFile(args.output,'w',zipfile.ZIP_DEFLATED,compresslevel=5) as z:
            for p,n in files:z.write(p,n)
            z.writestr('manifest.json',json.dumps({'sourceHash':report['sourceHash'],'entries':entries},indent=2))
        with zipfile.ZipFile(args.output) as z:
            if z.testzip():raise ValueError('ZIP CRC check failed')
            for e in entries:
                if hashlib.sha256(z.read(e['file'])).hexdigest()!=e['sha256']:raise ValueError('ZIP hash check failed')
        print(json.dumps({'output':str(args.output),'entries':len(entries)+1,'sha256':hashlib.sha256(args.output.read_bytes()).hexdigest()}))

if __name__=='__main__':
    try:main()
    except (OSError,ValueError,RuntimeError,KeyError,ImportError,wave.Error) as e:
        print('Video tool: '+str(e),file=sys.stderr);sys.exit(2)
