import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const EXAMPLES = {
  py_sort: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr

result = bubble_sort([64, 34, 25, 12, 22, 11, 90])
print(result)`,
  js_async: `async function fetchUserData(userId) {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);
    if (!response.ok) throw new Error('HTTP error: ' + response.status);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed:', error);
    return null;
  }
}`,
  java_null: `public class UserService {
    private Database db;
    public String getUserName(int id) {
        User user = db.findById(id);
        return user.getName();
    }
    public void processUsers(List<User> users) {
        for (User u : users) {
            System.out.println(getUserName(u.getId()));
        }
    }
}`,
  cpp_mem: `#include <iostream>
using namespace std;
class Node {
public:
    int data; Node* next;
    Node(int d) : data(d), next(nullptr) {}
};
void addNode(Node* head, int val) {
    Node* newNode = new Node(val);
    head->next = newNode;
}
int main() {
    Node* head = new Node(1);
    addNode(head, 2); addNode(head, 3);
    return 0;
}`,
  rust_own: `fn main() {
    let s1 = String::from("hello");
    let s2 = s1;
    let s3 = s2.clone();
    println!("{} {}", s2, s3);
    let len = calculate_length(&s2);
    println!("Length: {}", len);
}
fn calculate_length(s: &String) -> usize { s.len() }`,
  go_goroutine: `package main
import ("fmt"; "sync")
func worker(id int, wg *sync.WaitGroup, results chan<- int) {
    defer wg.Done()
    results <- id * id
}
func main() {
    var wg sync.WaitGroup
    results := make(chan int, 5)
    for i := 1; i <= 5; i++ { wg.Add(1); go worker(i, &wg, results) }
    go func() { wg.Wait(); close(results) }()
    for r := range results { fmt.Println(r) }
}`
};

const LANG_COLORS = {
  python:"#3572A5", javascript:"#f1e05a", java:"#b07219",
  cpp:"#f34b7d", c:"#555555", rust:"#dea584", go:"#00ADD8",
  typescript:"#2b7489", auto:"#8890aa", unknown:"#8890aa"
};

const CHAIN_ORDER   = ["concept","error","fix","explanation"];
const NODE_COLORS   = { concept:"#7c6ff7", error:"#ff6b6b", fix:"#29d4a8", explanation:"#ffa94d" };
const NODE_GLOW     = { concept:"rgba(124,111,247,.3)", error:"rgba(255,107,107,.3)", fix:"rgba(41,212,168,.3)", explanation:"rgba(255,169,77,.3)" };
const NODE_ICONS    = { concept:"⬡", error:"⚠", fix:"✦", explanation:"◎" };
const COL_LABELS    = { concept:"CONCEPT", error:"ERROR", fix:"FIX", explanation:"EXPLANATION" };

function detectLang(code) {
  if (/^\s*(import|from\s+\w+\s+import|def |class |print\(|:\s*$)/m.test(code)) return "python";
  if (/^\s*(public\s+class|import\s+java\.|System\.out)/m.test(code)) return "java";
  if (/^\s*(#include|using namespace|std::|cout<<)/m.test(code)) return "cpp";
  if (/^\s*(fn\s+\w+|let\s+mut|use\s+std::|println!)/m.test(code)) return "rust";
  if (/^\s*(package\s+main|func\s+\w+|fmt\.|go\s+func)/m.test(code)) return "go";
  if (/^\s*(async\s+function|const\s+\w+\s*=|=>|console\.log|require\()/m.test(code)) return "javascript";
  if (/^\s*(#include|int\s+main\s*\()/m.test(code)) return "c";
  return "unknown";
}

function computeLayout(allNodes, W, H) {
  const cols = { concept:[], error:[], fix:[], explanation:[] };
  allNodes.forEach(n => { (cols[n.type] || cols.concept).push(n); });
  const PAD_X  = 110;
  const colGap = (W - PAD_X * 2) / 3;
  const NODE_H = 110;
  const positions = {};
  CHAIN_ORDER.forEach((type, ci) => {
    const nodes  = cols[type] || [];
    const totalH = nodes.length * NODE_H;
    const startY = H / 2 - totalH / 2 + NODE_H / 2;
    const x      = PAD_X + ci * colGap;
    nodes.forEach((n, ri) => {
      positions[n.id] = { x, y: startY + ri * NODE_H };
    });
  });
  return positions;
}

// ─── Saved Graphs Drawer ──────────────────────────────────────────────────────
function SavedGraphsDrawer({ open, onClose, onLoad, currentGraphId }) {
  const [graphs, setGraphs]   = useState([]);
  const [fetching, setFetching] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [err, setErr]          = useState(null);

  const fetchGraphs = useCallback(async () => {
    setFetching(true); setErr(null);
    try {
      const res = await fetch("/api/graphs");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setGraphs(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { if (open) fetchGraphs(); }, [open, fetchGraphs]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      await fetch(`/api/graphs/${id}`, { method: "DELETE" });
      setGraphs(g => g.filter(x => x.id !== id));
    } catch (e) {
      setErr(e.message);
    } finally {
      setDeleting(null);
    }
  };

  const langDot = lang => {
    const col = LANG_COLORS[lang?.toLowerCase()] || "#8890aa";
    return <span style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background:col, marginRight:5 }} />;
  };

  return (
    <>
      <div onClick={onClose} style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:199,
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
        transition:"opacity .22s"
      }} />

      <div style={{
        position:"fixed", top:0, right:0, width:320, height:"100vh",
        background:"#10121a", borderLeft:"1px solid #2a2f45",
        zIndex:200, display:"flex", flexDirection:"column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition:"transform .26s cubic-bezier(.4,0,.2,1)",
        boxShadow:"-8px 0 40px rgba(0,0,0,.6)"
      }}>
        <div style={{ padding:"18px 20px 14px", borderBottom:"1px solid #2a2f45", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:"#e8eaf2", letterSpacing:"-.2px" }}>Saved Graphs</div>
            <div style={{ fontSize:10, color:"#5a6080", marginTop:2, fontWeight:600, letterSpacing:".06em", textTransform:"uppercase" }}>Neo4j Storage</div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <button onClick={fetchGraphs} title="Refresh" style={{ background:"none", border:"1px solid #2a2f45", borderRadius:7, color:"#8890aa", cursor:"pointer", fontSize:12, padding:"4px 9px", fontFamily:"'Syne',sans-serif", fontWeight:600 }}>↻</button>
            <button onClick={onClose} style={{ background:"none", border:"none", color:"#5a6080", cursor:"pointer", fontSize:18, lineHeight:1 }}>✕</button>
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
          {fetching && (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#5a6080", fontSize:12 }}>
              <div style={{ width:20, height:20, border:"2px solid #2a2f45", borderTopColor:"#7c6ff7", borderRadius:"50%", animation:"spin .7s linear infinite", margin:"0 auto 12px" }} />
              Loading from Neo4j...
            </div>
          )}
          {err && !fetching && (
            <div style={{ background:"#1a1020", border:"1px solid #ff6b6b44", borderRadius:8, padding:"12px 14px", fontSize:11, color:"#ff6b6b", marginTop:8 }}>
              ⚠ {err}
            </div>
          )}
          {!fetching && !err && graphs.length === 0 && (
            <div style={{ textAlign:"center", padding:"48px 16px", color:"#3a4060" }}>
              <div style={{ fontSize:32, marginBottom:12, opacity:.4 }}>◈</div>
              <div style={{ fontSize:12, fontWeight:700, color:"#5a6080", marginBottom:6 }}>No saved graphs yet</div>
              <div style={{ fontSize:11, color:"#3a4060", lineHeight:1.7 }}>Analyze some code and hit<br/>Save Graph to persist it here</div>
            </div>
          )}
          {!fetching && graphs.map(g => {
            const isActive = g.id === currentGraphId;
            return (
              <div key={g.id} onClick={() => onLoad(g)}
                style={{
                  padding:"11px 13px", borderRadius:9, marginBottom:7, cursor:"pointer",
                  border:`1px solid ${isActive ? "#7c6ff766" : "#2a2f45"}`,
                  background: isActive ? "rgba(124,111,247,.08)" : "rgba(255,255,255,.02)",
                  transition:"all .15s", position:"relative"
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor="#7c6ff744"; e.currentTarget.style.background="rgba(124,111,247,.05)"; }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor="#2a2f45"; e.currentTarget.style.background="rgba(255,255,255,.02)"; }}}
              >
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#e8eaf2", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:190 }}>
                    {langDot(g.language)}{g.name || g.language || "Untitled"}
                  </div>
                  <button onClick={e => handleDelete(g.id, e)}
                    disabled={deleting === g.id}
                    title="Delete"
                    style={{ background:"none", border:"1px solid transparent", borderRadius:5, color:"#5a6080", cursor:"pointer", fontSize:11, padding:"2px 6px", lineHeight:1, fontFamily:"'Syne',sans-serif", transition:"all .12s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor="#ff6b6b66"; e.currentTarget.style.color="#ff6b6b"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor="transparent"; e.currentTarget.style.color="#5a6080"; }}
                  >
                    {deleting === g.id ? "…" : "✕"}
                  </button>
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {["concept","error","fix","explanation"].map(t => (
                    <span key={t} style={{ fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:8, background:NODE_COLORS[t]+"18", color:NODE_COLORS[t], letterSpacing:".04em" }}>
                      {(g.counts?.[t] || 0)} {t}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize:10, color:"#3a4060", marginTop:6, fontFamily:"'JetBrains Mono',monospace" }}>
                  {g.savedAt ? new Date(g.savedAt).toLocaleString() : ""}
                </div>
                {isActive && <div style={{ position:"absolute", top:10, right:38, width:6, height:6, borderRadius:"50%", background:"#29d4a8" }} />}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function KnowledgeGraphEngine() {
  const navigate     = useNavigate();
  const canvasRef    = useRef(null);
  const graphAreaRef = useRef(null);
  const stateRef     = useRef({
    nodes:[], edges:[],
    camX:0, camY:0, camScale:1,
    dragging:null, dragOffX:0, dragOffY:0,
    hoveredNode:null, selectedNode:null,
    panning:false, panStartX:0, panStartY:0, camStartX:0, camStartY:0,
  });

  const [code,          setCode]          = useState("");
  const [forcedLang,    setForcedLang]    = useState("auto");
  const [loading,       setLoading]       = useState(false);
  const [loadingStep,   setLoadingStep]   = useState("Detecting language & structure");
  const [lang,          setLang]          = useState("Waiting for code...");
  const [stats,         setStats]         = useState({ nodes:0, edges:0, errors:0 });
  const [tooltip,       setTooltip]       = useState({ show:false, x:0, y:0, node:null });
  const [nodePanel,     setNodePanel]     = useState({ show:false, node:null });
  const [showEmpty,     setShowEmpty]     = useState(true);
  const [apiError,      setApiError]      = useState(null);
  const [analyzeDone,   setAnalyzeDone]   = useState(false);

  const [currentGraph,  setCurrentGraph]  = useState(null);
  const [savedGraphId,  setSavedGraphId]  = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [saveMsg,       setSaveMsg]       = useState(null);
  const [drawerOpen,    setDrawerOpen]    = useState(false);

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s   = stateRef.current;
    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.width / dpr, H = canvas.height / dpr;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    const wts = (x,y) => ({ x: x*s.camScale+s.camX, y: y*s.camScale+s.camY });

    // Grid
    ctx.save();
    ctx.strokeStyle="rgba(42,47,69,.4)"; ctx.lineWidth=0.5;
    const gs=40*s.camScale;
    const ox=((s.camX%gs)+gs)%gs, oy=((s.camY%gs)+gs)%gs;
    for (let x=ox;x<W;x+=gs){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for (let y=oy;y<H;y+=gs){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.restore();

    // Column headers
    CHAIN_ORDER.forEach((type, ci) => {
      const col = stateRef.current.nodes.filter(n => n.type === type);
      if (!col.length) return;
      const xs = col.map(n => wts(n.x, n.y).x);
      const avgX = xs.reduce((a,b)=>a+b,0)/xs.length;
      const topY = Math.min(...col.map(n => wts(n.x, n.y).y)) - 55 * s.camScale;
      if (topY < 10 || topY > H - 10) return;
      ctx.save();
      ctx.font = `700 ${Math.round(9*s.camScale)}px Syne,sans-serif`;
      ctx.textAlign="center"; ctx.fillStyle = NODE_COLORS[type]+"99";
      ctx.letterSpacing = "0.06em";
      ctx.fillText(COL_LABELS[type], avgX, topY);
      ctx.restore();
    });

    // Chain arrows between column headers
    if (s.nodes.length > 0 && s.camScale > 0.5) {
      const cols = CHAIN_ORDER.map(type => s.nodes.filter(n => n.type === type));
      for (let ci = 0; ci < cols.length - 1; ci++) {
        if (!cols[ci].length || !cols[ci+1].length) continue;
        const ax = cols[ci].map(n=>wts(n.x,n.y).x).reduce((a,b)=>a+b,0)/cols[ci].length;
        const bx = cols[ci+1].map(n=>wts(n.x,n.y).x).reduce((a,b)=>a+b,0)/cols[ci+1].length;
        const midY = 28;
        ctx.save();
        ctx.strokeStyle="rgba(58,64,96,.35)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(ax+40,midY); ctx.lineTo(bx-40,midY); ctx.stroke();
        ctx.fillStyle="rgba(58,64,96,.35)";
        ctx.beginPath();
        ctx.moveTo(bx-40,midY); ctx.lineTo(bx-50,midY-5); ctx.lineTo(bx-50,midY+5);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }

    // Edges
    s.edges.forEach(e => {
      const a=s.nodes.find(n=>n.id===e.from), b=s.nodes.find(n=>n.id===e.to);
      if (!a||!b) return;
      const ap=wts(a.x,a.y), bp=wts(b.x,b.y);
      const dx=bp.x-ap.x;
      const cx1=ap.x+dx*0.45, cy1=ap.y, cx2=bp.x-dx*0.45, cy2=bp.y;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ap.x,ap.y);
      ctx.bezierCurveTo(cx1,cy1,cx2,cy2,bp.x,bp.y);
      const isChain=e.chain;
      ctx.strokeStyle = isChain ? NODE_COLORS[a.type]+"aa" : "rgba(58,64,96,.4)";
      ctx.lineWidth   = isChain ? 2 : 0.8;
      if (!isChain) ctx.setLineDash([3,5]);
      ctx.stroke(); ctx.setLineDash([]);
      const ang=Math.atan2(bp.y-cy2, bp.x-cx2);
      const ar=8*s.camScale*0.85;
      ctx.beginPath();
      ctx.moveTo(bp.x-ar*Math.cos(ang-0.35), bp.y-ar*Math.sin(ang-0.35));
      ctx.lineTo(bp.x,bp.y);
      ctx.lineTo(bp.x-ar*Math.cos(ang+0.35), bp.y-ar*Math.sin(ang+0.35));
      ctx.strokeStyle = isChain ? NODE_COLORS[a.type]+"cc" : "rgba(88,96,140,.5)";
      ctx.lineWidth=isChain?2:0.8; ctx.stroke();
      if (e.label && s.camScale>0.55) {
        const mx=(ap.x+bp.x)/2, my=(ap.y+bp.y)/2-10;
        ctx.fillStyle="rgba(136,144,170,.6)";
        ctx.font=`${Math.round(9*s.camScale)}px Syne,sans-serif`;
        ctx.textAlign="center"; ctx.fillText(e.label,mx,my);
      }
      ctx.restore();
    });

    // Nodes
    s.nodes.forEach(n => {
      const p   = wts(n.x,n.y);
      const col = NODE_COLORS[n.type]||"#7c6ff7";
      const glow= NODE_GLOW[n.type]||"rgba(124,111,247,.25)";
      const r   = (n.radius||40)*s.camScale;
      const isHov=s.hoveredNode===n, isSel=s.selectedNode===n;
      ctx.save();
      if (isHov||isSel) {
        const gl=ctx.createRadialGradient(p.x,p.y,r*0.2,p.x,p.y,r*2.5);
        gl.addColorStop(0,glow); gl.addColorStop(1,"transparent");
        ctx.fillStyle=gl; ctx.beginPath(); ctx.arc(p.x,p.y,r*2.5,0,Math.PI*2); ctx.fill();
      }
      const grad=ctx.createRadialGradient(p.x-r*0.25,p.y-r*0.25,r*0.05,p.x,p.y,r);
      grad.addColorStop(0,col+"dd"); grad.addColorStop(1,col+"44");
      ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2);
      ctx.fillStyle=grad; ctx.fill();
      ctx.strokeStyle=isSel?col:(isHov?col+"cc":col+"66");
      ctx.lineWidth=isSel?2.5:1.5; ctx.stroke();
      if (s.camScale>0.45) {
        ctx.font=`${Math.round(17*s.camScale)}px sans-serif`;
        ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillStyle="rgba(255,255,255,.9)";
        ctx.fillText(NODE_ICONS[n.type]||"●",p.x,p.y-r*0.2);
      }
      if (s.camScale>0.35) {
        const fs=Math.min(Math.round(10.5*s.camScale),13);
        ctx.font=`700 ${fs}px Syne,sans-serif`;
        ctx.textAlign="center"; ctx.textBaseline="top";
        ctx.fillStyle=isHov||isSel?"#ffffff":"rgba(232,234,242,.92)";
        const lbl=n.label.length>16?n.label.slice(0,14)+"…":n.label;
        ctx.fillText(lbl,p.x,p.y+r*0.22);
      }
      ctx.restore();
    });
  }, []);

  const resize = useCallback(() => {
    const canvas=canvasRef.current, area=graphAreaRef.current;
    if (!canvas||!area) return;
    const dpr=window.devicePixelRatio||1;
    canvas.width=area.clientWidth*dpr; canvas.height=area.clientHeight*dpr;
    canvas.style.width=area.clientWidth+"px"; canvas.style.height=area.clientHeight+"px";
    canvas.getContext("2d").scale(dpr,dpr);
    draw();
  }, [draw]);

  useEffect(() => {
    resize();
    window.addEventListener("resize",resize);
    return () => window.removeEventListener("resize",resize);
  },[resize]);

  const getMousePos   = e => { const r=canvasRef.current.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; };
  const screenToWorld = (x,y) => { const s=stateRef.current; return {x:(x-s.camX)/s.camScale,y:(y-s.camY)/s.camScale}; };
  const worldToScreen = (x,y) => { const s=stateRef.current; return {x:x*s.camScale+s.camX,y:y*s.camScale+s.camY}; };
  const findNodeAt    = (mx,my) => {
    const s=stateRef.current, w=screenToWorld(mx,my);
    for (let i=s.nodes.length-1;i>=0;i--) {
      const n=s.nodes[i],dx=n.x-w.x,dy=n.y-w.y;
      if (dx*dx+dy*dy<(n.radius||40)**2) return n;
    }
    return null;
  };

  const handleMouseDown = useCallback(e => {
    const p=getMousePos(e),s=stateRef.current,n=findNodeAt(p.x,p.y);
    if (n){s.dragging=n;const sp=worldToScreen(n.x,n.y);s.dragOffX=p.x-sp.x;s.dragOffY=p.y-sp.y;}
    else {s.panning=true;s.panStartX=p.x;s.panStartY=p.y;s.camStartX=s.camX;s.camStartY=s.camY;}
  },[]);

  const handleMouseMove = useCallback(e => {
    const p=getMousePos(e),s=stateRef.current;
    if (s.dragging){const w=screenToWorld(p.x-s.dragOffX,p.y-s.dragOffY);s.dragging.x=w.x;s.dragging.y=w.y;draw();return;}
    if (s.panning){s.camX=s.camStartX+(p.x-s.panStartX);s.camY=s.camStartY+(p.y-s.panStartY);draw();return;}
    const n=findNodeAt(p.x,p.y);
    s.hoveredNode=n;
    canvasRef.current.style.cursor=n?"pointer":"grab";
    if (n) setTooltip({show:true,x:p.x+18,y:p.y-10,node:n});
    else   setTooltip(t=>({...t,show:false}));
    draw();
  },[draw]);

  const handleMouseUp = useCallback(()=>{const s=stateRef.current;s.dragging=null;s.panning=false;},[]);
  const handleClick   = useCallback(e=>{
    const p=getMousePos(e),s=stateRef.current,n=findNodeAt(p.x,p.y);
    s.selectedNode=n;
    if (n) setNodePanel({show:true,node:n});
    else   setNodePanel(prev=>({...prev,show:false}));
    draw();
  },[draw]);

  const handleWheel = useCallback(e=>{
    e.preventDefault();
    const p=getMousePos(e),s=stateRef.current;
    const factor=e.deltaY<0?1.1:0.91;
    const wx=(p.x-s.camX)/s.camScale,wy=(p.y-s.camY)/s.camScale;
    s.camScale=Math.max(0.2,Math.min(3,s.camScale*factor));
    s.camX=p.x-wx*s.camScale; s.camY=p.y-wy*s.camScale;
    draw();
  },[draw]);

  useEffect(()=>{
    const canvas=canvasRef.current; if (!canvas) return;
    canvas.addEventListener("wheel",handleWheel,{passive:false});
    return ()=>canvas.removeEventListener("wheel",handleWheel);
  },[handleWheel]);

  const zoomIn  = ()=>{stateRef.current.camScale=Math.min(3,stateRef.current.camScale*1.2);draw();};
  const zoomOut = ()=>{stateRef.current.camScale=Math.max(0.2,stateRef.current.camScale*0.83);draw();};
  const resetView = useCallback(()=>{
    const s=stateRef.current; if (!s.nodes.length) return;
    const canvas=canvasRef.current,dpr=window.devicePixelRatio||1;
    const W=canvas.width/dpr,H=canvas.height/dpr;
    const xs=s.nodes.map(n=>n.x),ys=s.nodes.map(n=>n.y);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const pad=100;
    const scaleX=(W-pad*2)/((maxX-minX)||1), scaleY=(H-pad*2)/((maxY-minY)||1);
    s.camScale=Math.min(scaleX,scaleY,1.5);
    s.camX=W/2-((minX+maxX)/2)*s.camScale;
    s.camY=H/2-((minY+maxY)/2)*s.camScale;
    draw();
  },[draw]);

  const buildGraph = useCallback((graph) => {
    const s=stateRef.current; s.nodes=[]; s.edges=[];
    const canvas=canvasRef.current,dpr=window.devicePixelRatio||1;
    const W=canvas.width/dpr,H=canvas.height/dpr;
    const allRaw=[
      ...(graph.concepts||[]),
      ...(graph.errors||[]),
      ...(graph.fixes||[]),
      ...(graph.explanations||[])
    ];
    if (!allRaw.length) return;
    const positions=computeLayout(allRaw,W,H);
    allRaw.forEach(n=>{
      const pos=positions[n.id]||{x:W/2,y:H/2};
      s.nodes.push({
        id:n.id, label:n.label, type:n.type||"concept", desc:n.desc,
        x:pos.x, y:pos.y,
        radius:40+Math.min((n.label||"").length,8)*1.2
      });
    });
    allRaw.forEach(n=>{
      (n.connections||[]).forEach(tid=>{
        if (s.nodes.find(x=>x.id===tid))
          s.edges.push({from:n.id,to:tid,chain:true,label:""});
      });
    });
    const byType=type=>s.nodes.filter(n=>n.type===type);
    const linked=(a,b)=>s.edges.some(e=>(e.from===a&&e.to===b)||(e.from===b&&e.to===a));
    const concepts=byType("concept"), errors=byType("error"), fixes=byType("fix"), explanations=byType("explanation");
    concepts.forEach((c,i)=>{const e=errors[i]||errors[0];if(e&&!linked(c.id,e.id))s.edges.push({from:c.id,to:e.id,chain:true,label:"causes"});});
    errors.forEach((e,i)=>{const f=fixes[i]||fixes[0];if(f&&!linked(e.id,f.id))s.edges.push({from:e.id,to:f.id,chain:true,label:"fix"});});
    fixes.forEach((f,i)=>{const x=explanations[i]||explanations[0];if(x&&!linked(f.id,x.id))s.edges.push({from:f.id,to:x.id,chain:true,label:"why"});});
    concepts.forEach((c,i)=>{if(concepts[i+1]&&!linked(c.id,concepts[i+1].id))s.edges.push({from:c.id,to:concepts[i+1].id,chain:false,label:""});});
    errors.forEach((e,i)=>{if(errors[i+1]&&!linked(e.id,errors[i+1].id))s.edges.push({from:e.id,to:errors[i+1].id,chain:false,label:""});});
    const errCount = errors.length;
    setStats({nodes:s.nodes.length,edges:s.edges.length,errors:errCount});
    setShowEmpty(false);
    s.camX=0; s.camY=0; s.camScale=1;
    draw();
    setTimeout(()=>resetView(),60);
  },[draw,resetView]);

  // ── Analyze — routes through /api/chat backend proxy ────────────────────────
  // This FIXES the "Failed to fetch" error. The browser cannot call Anthropic/Groq
  // directly due to CORS. All AI calls must go through the Express server at /api/chat.
  const analyze = useCallback(async()=>{
    const trimmed=code.trim(); if (!trimmed) return;
    setLoading(true); setApiError(null); setAnalyzeDone(false);
    setSavedGraphId(null); setCurrentGraph(null); setSaveMsg(null);
    const detectedLang=forcedLang==="auto"?detectLang(trimmed):forcedLang;
    setLang(detectedLang==="unknown"?"Detecting...":detectedLang);
    const steps=["Detecting language & structure","Extracting concepts & patterns","Identifying errors & bugs","Generating fixes & solutions","Building knowledge graph..."];
    let si=0;
    const stepTimer=setInterval(()=>setLoadingStep(steps[Math.min(si++,steps.length-1)]),700);

    const systemMsg = "You are a code knowledge graph analyzer. Respond ONLY with raw JSON. No markdown, no backticks, no explanation text before or after.";
    const userMsg = `Analyze the following ${detectedLang} code and return ONLY a raw JSON object.

The graph must follow this chain: Concept → Error → Fix → Explanation
- concepts = what the code does (loops, functions, data structures)
- errors = bugs, risks, or issues in the code
- fixes = how to fix each error
- explanations = deeper insight, complexity, best practices

Use this EXACT JSON structure (no other text, no markdown fences):
{
  "language": "python",
  "concepts": [
    {"id":"c1","label":"Bubble Sort","type":"concept","desc":"Repeatedly swaps adjacent elements if out of order.","connections":["e1"]},
    {"id":"c2","label":"Loop","type":"concept","desc":"Nested loops iterate through array pairs.","connections":["e2"]}
  ],
  "errors": [
    {"id":"e1","label":"No Early Exit","type":"error","desc":"Algorithm doesn't stop even when array is already sorted.","connections":["f1"]},
    {"id":"e2","label":"O(n²) Always","type":"error","desc":"Worst and average case are always quadratic.","connections":["f2"]}
  ],
  "fixes": [
    {"id":"f1","label":"Add Flag","type":"fix","desc":"Use a swapped boolean flag to exit early if no swaps in a pass.","connections":["x1"]},
    {"id":"f2","label":"Use Tim Sort","type":"fix","desc":"Python's built-in sort is Tim Sort — O(n log n) average.","connections":["x1"]}
  ],
  "explanations": [
    {"id":"x1","label":"Complexity","type":"explanation","desc":"Bubble sort is O(n²) — fine for small arrays, slow for large ones.","connections":[]}
  ]
}

Rules:
- connections link to IDs in the NEXT column only (concept→error id, error→fix id, fix→explanation id)
- Labels: 1-3 words MAX
- Generate 2-4 items per category
- Base everything on the actual code provided

Code:
${trimmed}`;

    try {
      // ✅ FIX: Call /api/chat (Express proxy) instead of Anthropic/Groq directly.
      // Direct browser calls to external AI APIs are blocked by CORS.
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemMsg },
            { role: "user",   content: userMsg   }
          ]
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server error ${res.status}: ${errText}`);
      }

      const data = await res.json();

      // Groq returns OpenAI-shaped: data.choices[0].message.content
      const raw = data?.choices?.[0]?.message?.content?.trim();
      if (!raw) throw new Error("Empty response from AI — check GROQ_API_KEY on the server");

      // Strip any accidental markdown fences the model may have added
      const clean = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      let graph;
      try {
        graph = JSON.parse(clean);
      } catch (parseErr) {
        // Try extracting the first JSON object from the string
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) graph = JSON.parse(match[0]);
        else throw new Error("Could not parse JSON from AI response:\n" + clean.slice(0, 300));
      }

      if (!graph.concepts && !graph.errors)
        throw new Error("AI returned JSON but it's missing 'concepts'/'errors' keys.");

      const detectedGraphLang = graph.language || detectedLang;
      setLang(detectedGraphLang);
      clearInterval(stepTimer);
      setAnalyzeDone(true);
      setCurrentGraph({ language: detectedGraphLang, graph, code: trimmed });
      buildGraph(graph);
      setTimeout(()=>setAnalyzeDone(false), 2000);
    } catch(err){
      clearInterval(stepTimer);
      console.error("Graph analysis error:", err);
      setApiError(err.message);
      setLoadingStep("Analysis failed");
    } finally {
      setLoading(false);
    }
  },[code, forcedLang, buildGraph]);

  // ── Save to Neo4j ──────────────────────────────────────────────────────────
  const saveGraph = useCallback(async () => {
    if (!currentGraph || saving) return;
    setSaving(true); setSaveMsg(null);
    try {
      const res = await fetch("/api/graphs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: currentGraph.language,
          code: currentGraph.code,
          graph: currentGraph.graph,
          name: `${currentGraph.language} — ${new Date().toLocaleTimeString()}`
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Save failed: ${errText}`);
      }
      const saved = await res.json();
      setSavedGraphId(saved.id);
      setSaveMsg({ ok: true, text: "Saved to Neo4j ✓" });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e) {
      setSaveMsg({ ok: false, text: e.message });
      setTimeout(() => setSaveMsg(null), 4000);
    } finally {
      setSaving(false);
    }
  }, [currentGraph, saving]);

  // ── Load saved graph ───────────────────────────────────────────────────────
  const loadSavedGraph = useCallback((saved) => {
    if (!saved?.graph) return;
    setCode(saved.code || "");
    setLang(saved.language || "unknown");
    setCurrentGraph({ language: saved.language, graph: saved.graph, code: saved.code });
    setSavedGraphId(saved.id);
    setSaveMsg(null);
    buildGraph(saved.graph);
    setDrawerOpen(false);
  }, [buildGraph]);

  const handleKeyDown = e => { if ((e.ctrlKey||e.metaKey) && e.key==="Enter") analyze(); };
  const langColor = LANG_COLORS[lang?.toLowerCase()] || "#8890aa";
  const isSaved  = !!savedGraphId;
  const canSave  = !!currentGraph && !isSaved && !saving;

  return (
    <div style={{fontFamily:"'Syne',sans-serif",background:"#0a0b0f",color:"#e8eaf2",height:"100vh",display:"grid",gridTemplateColumns:"340px 1fr",gridTemplateRows:"56px 1fr",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Syne:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        textarea::-webkit-scrollbar{width:4px;}
        textarea::-webkit-scrollbar-track{background:transparent;}
        textarea::-webkit-scrollbar-thumb{background:#2a2f45;border-radius:2px;}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes pulse-out{0%{transform:scale(.7);opacity:1}100%{transform:scale(1.3);opacity:0}}
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .save-toast{animation:fadeSlideIn .2s ease forwards;}
      `}</style>

      {/* TOP BAR */}
      <div style={{gridColumn:"1/-1",display:"flex",alignItems:"center",gap:12,padding:"0 20px",background:"#10121a",borderBottom:"1px solid #2a2f45",zIndex:10}}>
        <button onClick={()=>navigate("/")}
          style={{background:"none",border:"1px solid #2a2f45",borderRadius:7,color:"#8890aa",cursor:"pointer",fontSize:12,padding:"4px 10px",fontFamily:"'Syne',sans-serif",fontWeight:600,display:"flex",alignItems:"center",gap:5,transition:"all .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#7c6ff7";e.currentTarget.style.color="#7c6ff7";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2f45";e.currentTarget.style.color="#8890aa";}}
        >← Home</button>

        <div style={{fontWeight:800,fontSize:15,letterSpacing:"-.3px",background:"linear-gradient(135deg,#7c6ff7,#29d4a8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
          KnowledgeGraph<span style={{WebkitTextFillColor:"#8890aa",fontWeight:400,fontSize:12,marginLeft:6}}>Engine</span>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:5,marginLeft:6}}>
          {CHAIN_ORDER.map((type,i)=>(
            <span key={type} style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,background:NODE_COLORS[type]+"22",border:`1px solid ${NODE_COLORS[type]}55`,color:NODE_COLORS[type],letterSpacing:".04em"}}>{COL_LABELS[type]}</span>
              {i<3&&<span style={{color:"#3a4060",fontSize:11}}>→</span>}
            </span>
          ))}
        </div>

        {saveMsg && (
          <div className="save-toast" style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:8,background:saveMsg.ok?"rgba(41,212,168,.12)":"rgba(255,107,107,.12)",border:`1px solid ${saveMsg.ok?"#29d4a888":"#ff6b6b88"}`,color:saveMsg.ok?"#29d4a8":"#ff6b6b",marginLeft:4}}>
            {saveMsg.text}
          </div>
        )}

        <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:20,border:"1px solid #3a4060",background:"#181c28",fontSize:11,fontWeight:600,color:"#8890aa",marginLeft:"auto"}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:langColor}}/>
          {lang}
        </div>

        <div style={{display:"flex",gap:16}}>
          {[["Nodes",stats.nodes],["Edges",stats.edges],["Errors",stats.errors]].map(([k,v])=>(
            <div key={k} style={{fontSize:11,color:"#5a6080"}}>
              <b style={{color:"#e8eaf2",fontWeight:600,marginRight:3}}>{showEmpty?"—":v}</b>{k.toLowerCase()}
            </div>
          ))}
        </div>

        {/* Save Graph Button */}
        <button
          onClick={saveGraph}
          disabled={!canSave}
          title={isSaved ? "Already saved" : !currentGraph ? "Analyze code first" : "Save graph to Neo4j"}
          style={{
            padding:"5px 13px", borderRadius:8,
            border:`1px solid ${isSaved ? "#29d4a855" : canSave ? "#7c6ff777" : "#2a2f45"}`,
            background: isSaved ? "rgba(41,212,168,.1)" : canSave ? "rgba(124,111,247,.12)" : "transparent",
            color: isSaved ? "#29d4a8" : canSave ? "#7c6ff7" : "#3a4060",
            fontFamily:"'Syne',sans-serif", fontSize:11, fontWeight:700,
            cursor: canSave ? "pointer" : "not-allowed",
            display:"flex", alignItems:"center", gap:5, transition:"all .15s"
          }}
          onMouseEnter={e=>{ if(canSave){ e.currentTarget.style.background="rgba(124,111,247,.2)"; e.currentTarget.style.borderColor="#7c6ff7aa"; }}}
          onMouseLeave={e=>{ if(canSave){ e.currentTarget.style.background="rgba(124,111,247,.12)"; e.currentTarget.style.borderColor="#7c6ff777"; }}}
        >
          {saving
            ? <><div style={{width:10,height:10,border:"1.5px solid #7c6ff744",borderTopColor:"#7c6ff7",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>Saving...</>
            : isSaved ? "✓ Saved" : "⬆ Save Graph"
          }
        </button>

        {/* Saved Graphs Button */}
        <button
          onClick={()=>setDrawerOpen(true)}
          style={{
            padding:"5px 13px", borderRadius:8, border:"1px solid #2a2f45",
            background:"transparent", color:"#8890aa", fontFamily:"'Syne',sans-serif",
            fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5,
            transition:"all .15s"
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#7c6ff7";e.currentTarget.style.color="#7c6ff7";e.currentTarget.style.background="rgba(124,111,247,.07)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2f45";e.currentTarget.style.color="#8890aa";e.currentTarget.style.background="transparent";}}
        >
          ◫ Saved Graphs
        </button>
      </div>

      {/* LEFT PANEL */}
      <div style={{background:"#10121a",borderRight:"1px solid #2a2f45",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"14px 16px 10px",fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"#5a6080",borderBottom:"1px solid #2a2f45"}}>Input Code</div>

        <div style={{display:"flex",gap:4,padding:"10px 12px 0",flexWrap:"wrap"}}>
          {["auto","python","javascript","java","cpp","c","rust","go"].map(l=>(
            <button key={l} onClick={()=>setForcedLang(l)}
              style={{padding:"4px 9px",borderRadius:6,border:`1px solid ${forcedLang===l?"#7c6ff7":"#2a2f45"}`,background:forcedLang===l?"#7c6ff7":"transparent",color:forcedLang===l?"#fff":"#5a6080",fontFamily:"'Syne',sans-serif",fontSize:10,fontWeight:600,cursor:"pointer"}}
            >{l}</button>
          ))}
        </div>

        <div style={{flex:1,overflow:"hidden",position:"relative"}}>
          <textarea
            value={code}
            onChange={e=>{setCode(e.target.value);setSavedGraphId(null);setSaveMsg(null);}}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            placeholder={"// Paste your code here...\n// Ctrl+Enter to analyze"}
            style={{width:"100%",height:"100%",padding:14,background:"transparent",border:"none",outline:"none",resize:"none",fontFamily:"'JetBrains Mono',monospace",fontSize:12.5,lineHeight:1.7,color:"#c9d1d9",caretColor:"#29d4a8",overflowY:"auto"}}
          />
        </div>

        <div style={{padding:"10px 12px 14px"}}>
          <div style={{fontSize:10,color:"#5a6080",fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",marginBottom:6}}>Quick Examples</div>
          {[["py_sort","Python — bubble sort"],["js_async","JS — async/await fetch"],["java_null","Java — NullPointerException"],["cpp_mem","C++ — memory leak"],["rust_own","Rust — ownership chain"],["go_goroutine","Go — goroutine pattern"]].map(([key,label])=>(
            <button key={key} onClick={()=>{setCode(EXAMPLES[key]);setSavedGraphId(null);}}
              style={{display:"block",width:"100%",textAlign:"left",padding:"7px 10px",marginBottom:4,borderRadius:7,border:"1px solid #2a2f45",background:"transparent",color:"#8890aa",fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,cursor:"pointer",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}
              onMouseEnter={e=>{e.target.style.borderColor="#7c6ff7";e.target.style.color="#7c6ff7";e.target.style.background="rgba(124,111,247,.07)";}}
              onMouseLeave={e=>{e.target.style.borderColor="#2a2f45";e.target.style.color="#8890aa";e.target.style.background="transparent";}}
            >{label}</button>
          ))}
        </div>

        <button onClick={analyze} disabled={loading||!code.trim()}
          style={{margin:12,padding:11,borderRadius:10,border:"none",cursor:loading||!code.trim()?"not-allowed":"pointer",background:analyzeDone?"linear-gradient(135deg,#29d4a8,#1aad88)":"linear-gradient(135deg,#7c6ff7,#5b4ee0)",color:"#fff",fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,letterSpacing:".3px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading||!code.trim()?0.4:1,transition:"opacity .2s,background .3s"}}
        >
          {loading
            ?<><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>Analyzing...</>
            :analyzeDone?"✓ Graph Built!":"⚡ Analyze & Build Graph"
          }
        </button>
      </div>

      {/* GRAPH AREA */}
      <div ref={graphAreaRef} style={{position:"relative",overflow:"hidden",background:"#0a0b0f"}}>
        <canvas ref={canvasRef} style={{position:"absolute",top:0,left:0}}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp} onClick={handleClick}
        />

        {showEmpty&&!loading&&!apiError&&(
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
            <div style={{textAlign:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center",marginBottom:20}}>
                {CHAIN_ORDER.map((t,i)=>(
                  <span key={t} style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{color:NODE_COLORS[t],fontWeight:700,fontSize:12}}>{COL_LABELS[t]}</span>
                    {i<3&&<span style={{color:"#2a2f45",fontSize:16}}>→</span>}
                  </span>
                ))}
              </div>
              <div style={{fontSize:40,marginBottom:14,opacity:.18}}>◈</div>
              <div style={{fontSize:16,fontWeight:700,color:"#5a6080",marginBottom:8}}>Knowledge Graph Engine</div>
              <div style={{fontSize:12,color:"#3a4060",lineHeight:1.8}}>Paste any code on the left<br/>and click Analyze to build the chain graph</div>
            </div>
          </div>
        )}

        {loading&&(
          <div style={{position:"absolute",inset:0,background:"rgba(10,11,15,.88)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,zIndex:20}}>
            <div style={{width:60,height:60,borderRadius:"50%",border:"2px solid #7c6ff7",animation:"pulse-out 1.2s ease-out infinite"}}/>
            <div style={{fontSize:13,color:"#8890aa",fontWeight:600}}>Analyzing code...</div>
            <div style={{fontSize:11,color:"#5a6080"}}>{loadingStep}</div>
          </div>
        )}

        {apiError&&!loading&&(
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:32}}>
            <div style={{fontSize:36,opacity:.6}}>⚠️</div>
            <div style={{fontSize:15,fontWeight:700,color:"#ff6b6b"}}>Graph generation failed</div>
            <div style={{maxWidth:460,background:"#181c28",border:"1px solid #ff6b6b44",borderRadius:10,padding:"12px 16px",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#ff6b6b",lineHeight:1.6,wordBreak:"break-all",whiteSpace:"pre-wrap"}}>{apiError}</div>
            <button onClick={()=>{setApiError(null);setShowEmpty(true);}}
              style={{marginTop:4,padding:"8px 20px",borderRadius:8,border:"1px solid #3a4060",background:"transparent",color:"#8890aa",cursor:"pointer",fontFamily:"'Syne',sans-serif",fontSize:12,fontWeight:600}}
            >← Try again</button>
          </div>
        )}

        {nodePanel.show&&nodePanel.node&&(
          <div style={{position:"absolute",top:16,right:60,width:255,background:"rgba(24,28,40,0.95)",backdropFilter:"blur(10px)",border:`1px solid ${NODE_COLORS[nodePanel.node.type]}44`,borderRadius:14,padding:16,fontSize:12,zIndex:50,boxShadow:"0 8px 32px rgba(0,0,0,.6)"}}>
            <button onClick={()=>setNodePanel(p=>({...p,show:false}))} style={{position:"absolute",top:10,right:10,background:"none",border:"none",color:"#5a6080",cursor:"pointer",fontSize:16}}>✕</button>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:8,color:NODE_COLORS[nodePanel.node.type]}}>{nodePanel.node.type.toUpperCase()}</div>
            <div style={{fontSize:15,fontWeight:800,marginBottom:10,color:"#e8eaf2"}}>{nodePanel.node.label}</div>
            <div style={{fontSize:12,color:"#8890aa",lineHeight:1.7}}>{nodePanel.node.desc||"No description available."}</div>
          </div>
        )}

        {tooltip.show&&tooltip.node&&(
          <div style={{position:"absolute",left:tooltip.x,top:tooltip.y,maxWidth:255,minWidth:160,background:"#181c28",border:`1px solid ${NODE_COLORS[tooltip.node.type]}44`,borderRadius:10,padding:"10px 13px",fontSize:12,lineHeight:1.6,color:"#e8eaf2",pointerEvents:"none",zIndex:100,boxShadow:"0 8px 32px rgba(0,0,0,.5)"}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",marginBottom:4,color:NODE_COLORS[tooltip.node.type]}}>{tooltip.node.type.toUpperCase()}</div>
            <div style={{fontWeight:700,fontSize:12,marginBottom:4}}>{tooltip.node.label}</div>
            <div style={{color:"#8890aa",fontSize:11}}>{(tooltip.node.desc||"").slice(0,90)}{(tooltip.node.desc||"").length>90?"…":""}</div>
          </div>
        )}

        <div style={{position:"absolute",bottom:20,left:20,background:"#181c28",border:"1px solid #2a2f45",borderRadius:10,padding:"9px 14px",display:"flex",gap:14,fontSize:11}}>
          {CHAIN_ORDER.map(type=>(
            <div key={type} style={{display:"flex",alignItems:"center",gap:5,color:"#8890aa"}}>
              <div style={{width:9,height:9,borderRadius:"50%",background:NODE_COLORS[type]}}/>
              {type.charAt(0).toUpperCase()+type.slice(1)}
            </div>
          ))}
        </div>

        <div style={{position:"absolute",top:16,right:16,display:"flex",flexDirection:"column",gap:8}}>
          {[["＋",zoomIn],["－",zoomOut],["⌂",resetView]].map(([icon,fn])=>(
            <div key={icon} onClick={fn}
              style={{width:34,height:34,background:"#181c28",border:"1px solid #2a2f45",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,color:"#8890aa"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#7c6ff7";e.currentTarget.style.color="#7c6ff7";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2f45";e.currentTarget.style.color="#8890aa";}}
            >{icon}</div>
          ))}
        </div>
      </div>

      <SavedGraphsDrawer
        open={drawerOpen}
        onClose={()=>setDrawerOpen(false)}
        onLoad={loadSavedGraph}
        currentGraphId={savedGraphId}
      />
    </div>
  );
}