// Process-local override: Remotion otherwise binds its preview to all interfaces.
const {RenderInternals}=require('@remotion/renderer');
RenderInternals.getPortConfig=()=>({host:'127.0.0.1',hostsToTry:['127.0.0.1']});
