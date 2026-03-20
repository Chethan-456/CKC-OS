import { useState, useEffect, useRef } from "react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=Instrument+Sans:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --bg: #060810;
    --bg2: #0B0E1A;
    --bg3: #0F1223;
    --surface: rgba(255,255,255,0.03);
    --border: rgba(255,255,255,0.07);
    --border-hover: rgba(99,140,255,0.4);
    --blue: #638CFF;
    --blue-d: #3A5FD9;
    --blue-l: #8AABFF;
    --teal: #00D4AA;
    --rose: #FF6B8A;
    --amber: #FFB547;
    --violet: #A78BFA;
    --text: #E8ECFF;
    --text-2: #8892B0;
    --text-3: #4A5270;
    --mono: 'JetBrains Mono', monospace;
  }

  .ckc-root {
    font-family: 'Instrument Sans', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* NAV */
  .nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 1.1rem 3rem;
    background: rgba(6,8,16,0.8);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255,255,255,0.04);
    transition: all .3s;
  }
  .nav-logo {
    font-family: 'Clash Display', sans-serif;
    font-size: 1.3rem; font-weight: 700;
    letter-spacing: -.01em; color: #fff;
    display: flex; align-items: center; gap: 10px;
  }
  .nav-logo-dot {
    width: 28px; height: 28px; border-radius: 8px;
    background: linear-gradient(135deg, var(--blue), var(--teal));
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
  }
  .nav-links { display: flex; gap: 2rem; }
  .nav-link {
    font-size: .85rem; font-weight: 500; color: var(--text-2);
    text-decoration: none; cursor: pointer;
    transition: color .2s; letter-spacing: .02em;
    background: none; border: none;
  }
  .nav-link:hover { color: var(--blue-l); }
  .nav-cta {
    background: linear-gradient(135deg, var(--blue), var(--blue-d));
    color: #fff; border: none; border-radius: 8px;
    padding: 9px 22px; font-size: .85rem; font-weight: 600;
    cursor: pointer; font-family: 'Instrument Sans', sans-serif;
    transition: opacity .2s, transform .2s;
    box-shadow: 0 4px 20px rgba(99,140,255,0.3);
  }
  .nav-cta:hover { opacity: .9; transform: translateY(-1px); }

  /* HERO */
  .hero {
    min-height: 100vh;
    display: flex; align-items: center;
    position: relative; overflow: hidden;
    padding: 8rem 3rem 5rem;
  }
  .hero-mesh {
    position: absolute; inset: 0; z-index: 0;
    background:
      radial-gradient(ellipse 70% 55% at 65% 15%, rgba(99,140,255,0.14) 0%, transparent 65%),
      radial-gradient(ellipse 45% 40% at 15% 75%, rgba(0,212,170,0.09) 0%, transparent 60%),
      radial-gradient(ellipse 30% 30% at 85% 75%, rgba(167,139,250,0.07) 0%, transparent 55%);
  }
  .hero-grid {
    position: absolute; inset: 0; z-index: 0;
    background-image:
      linear-gradient(rgba(99,140,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99,140,255,0.04) 1px, transparent 1px);
    background-size: 52px 52px;
    mask-image: radial-gradient(ellipse 90% 70% at 50% 0%, black 0%, transparent 100%);
  }
  .hero-content { position: relative; z-index: 1; max-width: 780px; }
  .hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(99,140,255,0.1);
    border: 1px solid rgba(99,140,255,0.3);
    border-radius: 100px; padding: 6px 16px;
    font-size: .72rem; font-weight: 500; letter-spacing: .1em;
    text-transform: uppercase; color: var(--blue-l);
    margin-bottom: 2rem;
    animation: fadeUp .6s ease both;
  }
  .live-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--teal); box-shadow: 0 0 8px var(--teal);
    animation: blink 2s infinite;
  }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .hero h1 {
    font-family: 'Clash Display', sans-serif;
    font-size: clamp(2.8rem, 6.5vw, 5.4rem);
    font-weight: 700; line-height: 1.02;
    letter-spacing: -.03em; color: #fff;
    margin-bottom: 1.25rem;
    animation: fadeUp .7s .1s ease both;
  }
  .hero h1 .grad {
    background: linear-gradient(135deg, var(--blue-l) 0%, var(--teal) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .hero-sub {
    font-size: 1.1rem; font-weight: 400; color: var(--text-2);
    max-width: 560px; line-height: 1.8; margin-bottom: 2.5rem;
    animation: fadeUp .7s .2s ease both;
  }
  .hero-btns {
    display: flex; gap: 1rem; flex-wrap: wrap;
    animation: fadeUp .7s .3s ease both;
  }
  .btn-primary {
    background: linear-gradient(135deg, var(--blue), var(--blue-d));
    color: #fff; border: none; border-radius: 10px;
    padding: 14px 32px; font-size: .95rem; font-weight: 600;
    cursor: pointer; font-family: 'Instrument Sans', sans-serif;
    box-shadow: 0 8px 30px rgba(99,140,255,0.35);
    transition: transform .2s, box-shadow .2s;
  }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 40px rgba(99,140,255,0.5); }
  .btn-outline {
    background: transparent; color: var(--text-2);
    border: 1px solid rgba(255,255,255,0.12); border-radius: 10px;
    padding: 14px 32px; font-size: .95rem; font-weight: 500;
    cursor: pointer; font-family: 'Instrument Sans', sans-serif;
    transition: all .2s;
  }
  .btn-outline:hover { border-color: var(--blue-l); color: var(--blue-l); }

  .hero-stats {
    display: flex; gap: 3rem; margin-top: 4.5rem;
    animation: fadeUp .7s .4s ease both;
  }
  .stat { border-left: 2px solid rgba(99,140,255,0.35); padding-left: 1rem; }
  .stat-num {
    font-family: 'Clash Display', sans-serif;
    font-size: 2rem; font-weight: 700; color: #fff;
  }
  .stat-lbl { font-size: .72rem; color: var(--text-3); letter-spacing: .08em; text-transform: uppercase; margin-top: 2px; }

  /* FLOATING CODE CARD */
  .hero-visual {
    position: absolute; right: 3rem; top: 50%;
    transform: translateY(-50%);
    width: 380px; z-index: 1;
    animation: fadeUp .8s .5s ease both;
  }
  .code-card {
    background: rgba(11,14,26,0.9);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px; overflow: hidden;
    box-shadow: 0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,140,255,0.1);
  }
  .code-header {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 16px;
    background: rgba(255,255,255,0.03);
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .dot-r{width:10px;height:10px;border-radius:50%;background:#FF5F56;}
  .dot-y{width:10px;height:10px;border-radius:50%;background:#FFBD2E;}
  .dot-g{width:10px;height:10px;border-radius:50%;background:#27C93F;}
  .code-filename { font-family: var(--mono); font-size: .72rem; color: var(--text-3); margin-left: 8px; }
  .code-body { padding: 1.25rem 1.5rem; font-family: var(--mono); font-size: .78rem; line-height: 1.8; }
  .c-kw{color:#638CFF;} .c-fn{color:#00D4AA;} .c-str{color:#FFB547;}
  .c-cmt{color:#4A5270; font-style:italic;} .c-num{color:#FF6B8A;}
  .c-var{color:#E8ECFF;}

  /* PROBLEM SECTION */
  .section { padding: 6rem 3rem; }
  .section.dark { background: var(--bg2); }
  .section.darker { background: var(--bg3); }

  .section-label {
    font-size: .72rem; letter-spacing: .14em; text-transform: uppercase;
    color: var(--blue-l); font-weight: 500; margin-bottom: .7rem;
  }
  .section-title {
    font-family: 'Clash Display', sans-serif;
    font-size: clamp(1.9rem, 4vw, 2.9rem);
    font-weight: 700; color: #fff;
    letter-spacing: -.025em; line-height: 1.1;
    margin-bottom: 1rem;
  }
  .section-desc { font-size: 1rem; color: var(--text-2); max-width: 520px; line-height: 1.8; }

  /* LAYERS */
  .layers-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem; margin-top: 3.5rem;
  }
  @media(max-width:800px){.layers-grid{grid-template-columns:1fr;}}

  .layer-card {
    border-radius: 18px; padding: 2rem;
    position: relative; overflow: hidden;
    border: 1px solid rgba(255,255,255,0.06);
    transition: transform .3s, border-color .3s;
  }
  .layer-card:hover { transform: translateY(-6px); }
  .layer-card.blue-card { background: linear-gradient(145deg, rgba(99,140,255,0.1), rgba(99,140,255,0.03)); }
  .layer-card.blue-card:hover { border-color: rgba(99,140,255,0.35); }
  .layer-card.teal-card { background: linear-gradient(145deg, rgba(0,212,170,0.09), rgba(0,212,170,0.02)); }
  .layer-card.teal-card:hover { border-color: rgba(0,212,170,0.35); }
  .layer-card.violet-card { background: linear-gradient(145deg, rgba(167,139,250,0.09), rgba(167,139,250,0.02)); }
  .layer-card.violet-card:hover { border-color: rgba(167,139,250,0.35); }

  .layer-num {
    font-family: 'Clash Display', sans-serif;
    font-size: 3.5rem; font-weight: 700; opacity: .07;
    position: absolute; top: 1rem; right: 1.5rem;
    color: #fff; line-height: 1;
  }
  .layer-icon { font-size: 1.6rem; margin-bottom: 1rem; }
  .layer-card h3 {
    font-family: 'Clash Display', sans-serif;
    font-size: 1.2rem; font-weight: 600; color: #fff; margin-bottom: .7rem;
  }
  .layer-card p { font-size: .88rem; color: var(--text-2); line-height: 1.75; }
  .layer-pills { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 1.2rem; }
  .pill {
    font-size: .72rem; font-weight: 500; border-radius: 100px;
    padding: 4px 12px; border: 1px solid;
  }
  .pill-blue { background: rgba(99,140,255,0.1); color: var(--blue-l); border-color: rgba(99,140,255,0.25); }
  .pill-teal { background: rgba(0,212,170,0.1); color: var(--teal); border-color: rgba(0,212,170,0.25); }
  .pill-violet { background: rgba(167,139,250,0.1); color: var(--violet); border-color: rgba(167,139,250,0.25); }

  /* MODULES */
  .modules-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 1.25rem; margin-top: 3.5rem;
  }
  .mod-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px; padding: 1.6rem;
    position: relative; overflow: hidden;
    transition: all .25s; cursor: default;
  }
  .mod-card:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(99,140,255,0.3);
    transform: translateY(-3px);
  }
  .mod-index {
    font-family: var(--mono); font-size: .68rem;
    color: rgba(99,140,255,0.5); font-weight: 500;
    letter-spacing: .08em; margin-bottom: .8rem;
  }
  .mod-card h3 {
    font-family: 'Clash Display', sans-serif;
    font-size: 1rem; font-weight: 600; color: #fff; margin-bottom: .5rem;
  }
  .mod-card p { font-size: .82rem; color: var(--text-3); line-height: 1.7; }
  .mod-accent {
    position: absolute; bottom: 0; left: 0; height: 2px;
    border-radius: 0 0 0 14px;
    transition: width .3s;
  }
  .mod-card:hover .mod-accent { width: 100% !important; }

  /* ARCHITECTURE */
  .arch-wrap { margin-top: 3.5rem; }
  .arch-pipeline {
    background: rgba(11,14,26,0.8);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 20px; padding: 2.5rem;
  }
  .arch-flow {
    display: flex; align-items: center;
    flex-wrap: wrap; gap: 0; margin-bottom: 2rem;
  }
  .arch-node {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px; padding: .9rem 1.4rem;
    font-family: var(--mono); font-size: .78rem;
    color: var(--text); font-weight: 500;
    white-space: nowrap;
    transition: all .2s;
    position: relative;
  }
  .arch-node:hover { background: rgba(99,140,255,0.1); border-color: rgba(99,140,255,0.35); }
  .arch-node.highlighted { border-color: rgba(99,140,255,0.5); color: var(--blue-l); }
  .arch-arrow {
    padding: 0 .5rem; color: var(--text-3);
    font-size: 1rem; flex-shrink: 0;
  }
  .arch-dbs {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;
    margin-top: 1.5rem;
  }
  @media(max-width:600px){.arch-dbs{grid-template-columns:1fr;}}
  .db-card {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px; padding: 1.2rem; text-align: center;
  }
  .db-icon { font-size: 1.4rem; margin-bottom: .5rem; }
  .db-name {
    font-family: 'Clash Display', sans-serif;
    font-size: .95rem; font-weight: 600; color: #fff; margin-bottom: .3rem;
  }
  .db-role { font-size: .75rem; color: var(--text-3); }

  /* TECH STACK */
  .tech-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1rem; margin-top: 3rem;
  }
  .tech-chip {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px; padding: 1.2rem;
    display: flex; flex-direction: column;
    align-items: center; gap: .6rem;
    transition: all .2s; cursor: default;
  }
  .tech-chip:hover { border-color: var(--border-hover); transform: translateY(-2px); }
  .tech-emoji { font-size: 1.4rem; }
  .tech-name { font-size: .78rem; font-weight: 500; color: var(--text-2); }

  /* WORKFLOW */
  .workflow-steps {
    display: flex; flex-direction: column; gap: 0;
    margin-top: 3rem; max-width: 640px;
  }
  .wf-step {
    display: flex; gap: 1.5rem; position: relative;
    padding-bottom: 2.5rem;
  }
  .wf-step:last-child { padding-bottom: 0; }
  .wf-step:not(:last-child)::before {
    content: ''; position: absolute;
    left: 19px; top: 40px; width: 2px;
    bottom: 0;
    background: linear-gradient(to bottom, rgba(99,140,255,0.3), transparent);
  }
  .wf-num {
    width: 40px; height: 40px; border-radius: 50%;
    background: rgba(99,140,255,0.12);
    border: 1px solid rgba(99,140,255,0.3);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Clash Display', sans-serif;
    font-size: .85rem; font-weight: 700; color: var(--blue-l);
    flex-shrink: 0;
  }
  .wf-body { padding-top: .6rem; }
  .wf-body h4 {
    font-family: 'Clash Display', sans-serif;
    font-size: 1rem; font-weight: 600; color: #fff; margin-bottom: .3rem;
  }
  .wf-body p { font-size: .85rem; color: var(--text-3); line-height: 1.7; }

  /* APPLICATIONS */
  .apps-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 1.5rem; margin-top: 3.5rem;
  }
  @media(max-width:700px){.apps-grid{grid-template-columns:1fr;}}
  .app-card {
    border-radius: 18px; padding: 2.5rem;
    border: 1px solid rgba(255,255,255,0.06);
    position: relative; overflow: hidden;
  }
  .app-card.students { background: linear-gradient(135deg, rgba(0,212,170,0.08), rgba(99,140,255,0.06)); }
  .app-card.devs { background: linear-gradient(135deg, rgba(255,107,138,0.07), rgba(167,139,250,0.07)); }
  .app-label {
    font-size: .72rem; letter-spacing: .1em; text-transform: uppercase;
    font-weight: 500; margin-bottom: 1rem;
  }
  .app-card.students .app-label { color: var(--teal); }
  .app-card.devs .app-label { color: var(--rose); }
  .app-card h3 {
    font-family: 'Clash Display', sans-serif;
    font-size: 1.6rem; font-weight: 700; color: #fff; margin-bottom: 1.2rem;
  }
  .app-list { list-style: none; display: flex; flex-direction: column; gap: .7rem; }
  .app-list li { display: flex; align-items: flex-start; gap: .6rem; font-size: .9rem; color: var(--text-2); }
  .app-list li::before {
    content: ''; width: 6px; height: 6px; border-radius: 50%;
    margin-top: .55rem; flex-shrink: 0;
  }
  .app-card.students .app-list li::before { background: var(--teal); }
  .app-card.devs .app-list li::before { background: var(--rose); }

  /* NOVELTY */
  .novelty-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1.25rem; margin-top: 3rem;
  }
  .novelty-card {
    background: var(--surface);
    border: 1px solid var(--border); border-radius: 14px;
    padding: 1.5rem;
  }
  .novelty-icon {
    width: 40px; height: 40px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem; margin-bottom: 1rem;
  }
  .ni-blue { background: rgba(99,140,255,0.12); }
  .ni-teal { background: rgba(0,212,170,0.12); }
  .ni-violet { background: rgba(167,139,250,0.12); }
  .ni-rose { background: rgba(255,107,138,0.12); }
  .novelty-card h4 {
    font-family: 'Clash Display', sans-serif;
    font-size: .95rem; font-weight: 600; color: #fff; margin-bottom: .4rem;
  }
  .novelty-card p { font-size: .82rem; color: var(--text-3); line-height: 1.7; }

  /* FUTURE */
  .future-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1rem; margin-top: 3rem;
  }
  .future-item {
    display: flex; align-items: center; gap: .8rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px; padding: 1rem 1.25rem;
    transition: all .2s;
  }
  .future-item:hover { border-color: rgba(99,140,255,0.3); }
  .future-bullet {
    width: 8px; height: 8px; border-radius: 50%;
    background: linear-gradient(135deg, var(--blue), var(--teal));
    flex-shrink: 0;
  }
  .future-text { font-size: .88rem; color: var(--text-2); font-weight: 500; }

  /* FOOTER / CTA */
  .cta-section {
    padding: 7rem 3rem;
    text-align: center; position: relative; overflow: hidden;
  }
  .cta-section::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,140,255,0.12) 0%, transparent 70%);
  }
  .cta-section h2 {
    font-family: 'Clash Display', sans-serif;
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 700; color: #fff;
    letter-spacing: -.025em; margin-bottom: 1rem;
    position: relative; z-index: 1;
  }
  .cta-section p {
    font-size: 1.05rem; color: var(--text-2); margin-bottom: 2.5rem;
    position: relative; z-index: 1;
  }
  .cta-btns { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; position: relative; z-index: 1; }

  .footer {
    border-top: 1px solid rgba(255,255,255,0.05);
    padding: 2rem 3rem;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 1rem;
  }
  .footer-logo {
    font-family: 'Clash Display', sans-serif;
    font-size: 1rem; font-weight: 600; color: var(--text-2);
  }
  .footer-note { font-size: .8rem; color: var(--text-3); }

  /* Tabs */
  .tabs { display: flex; gap: .5rem; margin-bottom: 2rem; flex-wrap: wrap; }
  .tab-btn {
    font-family: 'Instrument Sans', sans-serif;
    font-size: .82rem; font-weight: 500;
    background: var(--surface); border: 1px solid var(--border);
    color: var(--text-2); border-radius: 8px;
    padding: 7px 18px; cursor: pointer; transition: all .2s;
  }
  .tab-btn.active {
    background: rgba(99,140,255,0.15);
    border-color: rgba(99,140,255,0.4);
    color: var(--blue-l);
  }
  .tab-btn:hover:not(.active) { border-color: rgba(255,255,255,0.15); color: var(--text); }

  @media(max-width:900px){
    .hero { padding: 7rem 1.5rem 4rem; }
    .hero-visual { display: none; }
    .hero h1 { font-size: 2.6rem; }
    .nav { padding: 1rem 1.5rem; }
    .nav-links { display: none; }
    .section { padding: 4rem 1.5rem; }
    .hero-stats { gap: 1.5rem; }
    .cta-section { padding: 5rem 1.5rem; }
    .footer { padding: 1.5rem; }
  }
`;

const modules = [
  { idx:"01", title:"Live Collaborative Editor", desc:"Google Docs-style real-time coding with multi-user cursor tracking via WebSockets + CRDT/OT and Monaco Editor.", accent:"#638CFF" },
  { idx:"02", title:"Real-Time Debugging Room", desc:"Share logs instantly. Teams view, annotate, and suggest fixes collaboratively — for students and developers alike.", accent:"#00D4AA" },
  { idx:"03", title:"Live Server Logs Dashboard", desc:"Stream server events in real-time. Acts as a mini DevOps monitoring layer with live error surfacing.", accent:"#FFB547" },
  { idx:"04", title:"Collaborative API Testing", desc:"Like Postman, but real-time. Teams test endpoints, share requests, and view responses together live.", accent:"#FF6B8A" },
  { idx:"05", title:"Context-Based Dev Chat", desc:"Chat linked to specific files, errors, and projects. Threaded discussions with @mention support.", accent:"#A78BFA" },
  { idx:"06", title:"Code Execution Sandbox", desc:"Run Node.js and Python in-browser securely via Docker containers. Share output in real time.", accent:"#638CFF" },
  { idx:"07", title:"Performance Monitor", desc:"Track API response time, errors per second, and execution latency with real-time graph visualization.", accent:"#00D4AA" },
  { idx:"08", title:"Behavior Tracking Engine", desc:"Monitors typing speed, backspace frequency, error rate, and idle time to understand developer cognition.", accent:"#FFB547" },
  { idx:"09", title:"Frustration Detection", desc:"Detects when users are stuck and intelligently triggers hints, learning mode, or contextual suggestions.", accent:"#FF6B8A" },
  { idx:"10", title:"Live Knowledge Graph Engine", desc:"Converts code into concepts, errors, and fixes. Builds a live visual graph: Loop → Array → Error → Fix.", accent:"#A78BFA", core:true },
  { idx:"11", title:"Adaptive AI Mentor", desc:"Beginner gets deep explanations. Intermediate gets hints. Advanced gets optimizations. Fully adaptive.", accent:"#638CFF" },
  { idx:"12", title:"Adaptive UI Engine", desc:"Dynamically changes the interface: hints for beginners, guidance for stuck users, minimal for experts.", accent:"#00D4AA" },
  { idx:"13", title:"Cognitive Analytics Dashboard", desc:"Displays productivity trends, focus levels, and weak concept identification across sessions.", accent:"#FFB547" },
];

const techStack = [
  { emoji:"⚛️", name:"React / Angular" },
  { emoji:"🟩", name:"Node.js" },
  { emoji:"⚡", name:"WebSockets" },
  { emoji:"🐘", name:"PostgreSQL" },
  { emoji:"🕸️", name:"Neo4j" },
  { emoji:"🔴", name:"Redis" },
  { emoji:"🐍", name:"Python AI" },
  { emoji:"🐳", name:"Docker" },
];

const workflowSteps = [
  { n:"1", title:"Users Join Session", desc:"Developers and students enter a real-time collaborative session with unique session IDs." },
  { n:"2", title:"Collaborative Editing", desc:"Code is co-authored using CRDT/OT conflict resolution, ensuring consistent state across all clients." },
  { n:"3", title:"Behavior Tracked", desc:"The Behavior Tracking Engine silently monitors typing patterns, idle time, and error frequency." },
  { n:"4", title:"Logs & Execution Streamed", desc:"Server logs and code execution output flow to all participants in real time via WebSockets." },
  { n:"5", title:"AI Analyzes Code & Behavior", desc:"The AI engine processes code semantics and developer state to derive contextual understanding." },
  { n:"6", title:"System Responds Adaptively", desc:"Suggestions surface, knowledge graph updates, UI adapts — all in real time without interruption." },
];

function CodeBlock() {
  const lines = [
    <><span className="c-cmt">// CKC-OS Knowledge Engine</span></>,
    <><span className="c-kw">async function</span> <span className="c-fn">analyzeCode</span>(<span className="c-var">session</span>) {'{'}</>,
    <>  <span className="c-kw">const</span> <span className="c-var">graph</span> = <span className="c-kw">await</span> <span className="c-fn">buildKnowledgeGraph</span>(<span className="c-var">session</span>.<span className="c-fn">code</span>);</>,
    <>  <span className="c-kw">const</span> <span className="c-var">state</span> = <span className="c-fn">detectCognitiveState</span>(<span className="c-var">session</span>.<span className="c-fn">behavior</span>);</>,
    <></>,
    <>  <span className="c-kw">if</span> (<span className="c-var">state</span>.<span className="c-fn">isFrustrated</span>) {'{'}</>,
    <>    <span className="c-fn">triggerAdaptiveMentor</span>(<span className="c-str">'guidance'</span>);</>,
    <>  {'}'}</>,
    <></>,
    <>  <span className="c-fn">updateUI</span>({'{'} <span className="c-var">mode</span>: <span className="c-var">state</span>.<span className="c-fn">level</span> {'}'});</>,
    <>  <span className="c-kw">return</span> {'{'} <span className="c-var">graph</span>, <span className="c-var">state</span>, <span className="c-var">suggestions</span>: <span className="c-num">[]</span> {'}'};</>,
    <>{'}'}</>,
  ];
  return (
    <div className="code-card">
      <div className="code-header">
        <span className="dot-r"/><span className="dot-y"/><span className="dot-g"/>
        <span className="code-filename">engine.ts</span>
      </div>
      <div className="code-body">
        {lines.map((l,i)=><div key={i}>{l}</div>)}
      </div>
    </div>
  );
}

export default function CKCOS() {
  const [activeModTab, setActiveModTab] = useState("all");

  const filteredMods = activeModTab === "all" ? modules
    : activeModTab === "collab" ? modules.filter((_,i)=>i<6)
    : modules.filter((_,i)=>i>=6);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <style>{styles}</style>
      <div className="ckc-root">

        {/* NAV */}
        <nav className="nav">
          <div className="nav-logo">
            <div className="nav-logo-dot">⚡</div>
            CKC-OS
          </div>
          <div className="nav-links">
            {[["Overview","overview"],["Modules","modules"],["Architecture","architecture"],["Stack","stack"]].map(([l,id])=>(
              <button key={id} className="nav-link" onClick={()=>scrollTo(id)}>{l}</button>
            ))}
          </div>
          <button className="nav-cta" onClick={()=>scrollTo("cta")}>Get Started</button>
        </nav>

        {/* HERO */}
        <section className="hero">
          <div className="hero-mesh"/>
          <div className="hero-grid"/>
          <div className="ck-wrap" style={{width:"100%"}}>
            <div className="hero-content">
              <div className="hero-badge">
                <span className="live-dot"/>
                AI-Powered · Real-Time · Adaptive
              </div>
              <h1>
                Cognitive Knowledge<br/>
                <span className="grad">Coding OS</span>
              </h1>
              <p className="hero-sub">
                A next-generation intelligent ecosystem that unifies real-time collaboration, AI-driven cognitive adaptation, live knowledge graphs, and DevOps tooling — for developers and students alike.
              </p>
              <div className="hero-btns">
                <button className="btn-primary" onClick={()=>scrollTo("modules")}>Explore Modules</button>
                <button className="btn-outline" onClick={()=>scrollTo("overview")}>System Overview</button>
              </div>
              <div className="hero-stats">
                <div className="stat"><div className="stat-num">13</div><div className="stat-lbl">Core Modules</div></div>
                <div className="stat"><div className="stat-num">3</div><div className="stat-lbl">System Layers</div></div>
                <div className="stat"><div className="stat-num">8+</div><div className="stat-lbl">Technologies</div></div>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <CodeBlock/>
          </div>
        </section>

        {/* PROBLEM + LAYERS */}
        <section className="section dark" id="overview">
          <div className="ck-wrap">
            <div className="section-label">System Overview</div>
            <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"1.5rem",alignItems:"flex-end"}}>
              <div>
                <h2 className="section-title">Three Intelligent Layers<br/>Working in Concert</h2>
                <p className="section-desc">CKC-OS bridges isolated tools into a unified, behavior-aware platform that understands how you code, not just what you code.</p>
              </div>
            </div>
            <div className="layers-grid">
              <div className="layer-card blue-card">
                <div className="layer-num">01</div>
                <div className="layer-icon">🧠</div>
                <h3>Cognitive Layer</h3>
                <p>Tracks real-time developer behavior — typing cadence, error frequency, idle periods — to infer frustration, focus, and proficiency level.</p>
                <div className="layer-pills">
                  <span className="pill pill-blue">Behavior Tracking</span>
                  <span className="pill pill-blue">Frustration Detection</span>
                  <span className="pill pill-blue">Focus Metrics</span>
                </div>
              </div>
              <div className="layer-card teal-card">
                <div className="layer-num">02</div>
                <div className="layer-icon">🕸️</div>
                <h3>Knowledge Layer</h3>
                <p>Transforms raw code into structured knowledge: concepts, errors, and fixes are linked in a live Neo4j graph that grows smarter with every session.</p>
                <div className="layer-pills">
                  <span className="pill pill-teal">Knowledge Graph</span>
                  <span className="pill pill-teal">Concept Mapping</span>
                  <span className="pill pill-teal">Neo4j</span>
                </div>
              </div>
              <div className="layer-card violet-card">
                <div className="layer-num">03</div>
                <div className="layer-icon">🔧</div>
                <h3>Collaboration & DevOps Layer</h3>
                <p>Real-time code editing, shared debugging rooms, collaborative API testing, and live performance monitoring — all synchronized via WebSockets.</p>
                <div className="layer-pills">
                  <span className="pill pill-violet">WebSockets</span>
                  <span className="pill pill-violet">CRDT/OT</span>
                  <span className="pill pill-violet">Docker Sandbox</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MODULES */}
        <section className="section" id="modules">
          <div className="ck-wrap">
            <div className="section-label">Core Modules</div>
            <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"1.5rem",alignItems:"flex-end",marginBottom:"2rem"}}>
              <div>
                <h2 className="section-title">13 Integrated Modules</h2>
                <p className="section-desc">Every module communicates in real time, forming a cohesive ecosystem rather than isolated features.</p>
              </div>
            </div>
            <div className="tabs">
              {[["all","All Modules"],["collab","Collaboration"],["ai","AI & Cognition"]].map(([v,l])=>(
                <button key={v} className={`tab-btn${activeModTab===v?" active":""}`} onClick={()=>setActiveModTab(v)}>{l}</button>
              ))}
            </div>
            <div className="modules-grid">
              {filteredMods.map(m=>(
                <div className="mod-card" key={m.idx}>
                  {m.core && <span style={{position:"absolute",top:"1rem",right:"1rem",fontSize:".65rem",background:"rgba(255,181,71,0.12)",color:"#FFB547",border:"1px solid rgba(255,181,71,0.3)",borderRadius:"100px",padding:"3px 10px",fontWeight:500,letterSpacing:".06em"}}>CORE</span>}
                  <div className="mod-index">{m.idx}</div>
                  <h3>{m.title}</h3>
                  <p>{m.desc}</p>
                  <div className="mod-accent" style={{width:"0%",background:m.accent,height:"2px",position:"absolute",bottom:0,left:0,borderRadius:"0 0 0 14px",transition:"width .35s ease"}}
                    onMouseEnter={e=>{e.currentTarget.style.width="100%"}}
                    onMouseLeave={e=>{e.currentTarget.style.width="0%"}}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ARCHITECTURE */}
        <section className="section darker" id="architecture">
          <div className="ck-wrap">
            <div className="section-label">System Architecture</div>
            <h2 className="section-title">Full-Stack Pipeline</h2>
            <p className="section-desc" style={{marginBottom:0}}>A layered architecture connecting frontend intelligence to AI execution and graph storage.</p>
            <div className="arch-wrap">
              <div className="arch-pipeline">
                <div style={{marginBottom:"1.5rem"}}>
                  <div style={{fontSize:".72rem",color:"var(--text-3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:"1rem"}}>Request Flow</div>
                  <div className="arch-flow">
                    {["React / Angular","WebSocket Engine","Node.js Backend","AI Engine (Python)","Docker Sandbox"].map((n,i,arr)=>(
                      <>
                        <div className={`arch-node${i===0||i===3?"highlighted":""}`} key={n}>{n}</div>
                        {i<arr.length-1 && <div className="arch-arrow">→</div>}
                      </>
                    ))}
                  </div>
                </div>
                <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:"1.5rem"}}>
                  <div style={{fontSize:".72rem",color:"var(--text-3)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:"1rem"}}>Data Stores</div>
                  <div className="arch-dbs">
                    <div className="db-card">
                      <div className="db-icon">🐘</div>
                      <div className="db-name">PostgreSQL</div>
                      <div className="db-role">Users · Projects · Sessions · Logs</div>
                    </div>
                    <div className="db-card">
                      <div className="db-icon">🕸️</div>
                      <div className="db-name">Neo4j</div>
                      <div className="db-role">Concepts · Errors · Fixes · Relations</div>
                    </div>
                    <div className="db-card">
                      <div className="db-icon">🔴</div>
                      <div className="db-name">Redis</div>
                      <div className="db-role">Real-time Events · Caching</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW */}
        <section className="section dark">
          <div className="ck-wrap">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4rem",alignItems:"start"}}>
              <div>
                <div className="section-label">System Workflow</div>
                <h2 className="section-title">How It Works</h2>
                <p className="section-desc">Six orchestrated steps from session join to adaptive response — seamless and invisible to the user.</p>
              </div>
              <div className="workflow-steps">
                {workflowSteps.map(s=>(
                  <div className="wf-step" key={s.n}>
                    <div className="wf-num">{s.n}</div>
                    <div className="wf-body">
                      <h4>{s.title}</h4>
                      <p>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* TECH STACK */}
        <section className="section" id="stack">
          <div className="ck-wrap">
            <div className="section-label">Technologies</div>
            <h2 className="section-title">Built on Proven Tech</h2>
            <p className="section-desc">Industry-grade tools chosen for performance, scalability, and real-time capability.</p>
            <div className="tech-grid">
              {techStack.map(t=>(
                <div className="tech-chip" key={t.name}>
                  <div className="tech-emoji">{t.emoji}</div>
                  <div className="tech-name">{t.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* APPLICATIONS */}
        <section className="section darker">
          <div className="ck-wrap">
            <div className="section-label">Applications</div>
            <h2 className="section-title">Built for Two Audiences</h2>
            <p className="section-desc">Designed from the ground up to serve both learning journeys and professional development workflows.</p>
            <div className="apps-grid">
              <div className="app-card students">
                <div className="app-label">For Students</div>
                <h3>Learn by Doing,<br/>Together</h3>
                <ul className="app-list">
                  <li>Learn coding concepts through live visual knowledge graphs</li>
                  <li>Debug with AI-guided hints and explanations</li>
                  <li>Practice collaboratively in shared coding sessions</li>
                  <li>Track personal weak spots and productivity trends</li>
                </ul>
              </div>
              <div className="app-card devs">
                <div className="app-label">For Developers</div>
                <h3>Build Faster,<br/>Debug Smarter</h3>
                <ul className="app-list">
                  <li>Collaborate on code in real time with full team sync</li>
                  <li>Monitor live system performance and server logs</li>
                  <li>Debug faster with shared annotation and fix suggestions</li>
                  <li>Test APIs collaboratively with Postman-style real-time tooling</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* NOVELTY */}
        <section className="section dark">
          <div className="ck-wrap">
            <div className="section-label">Innovation</div>
            <h2 className="section-title">What Makes CKC-OS Unique</h2>
            <p className="section-desc">The first platform to integrate cognitive analysis, real-time collaboration, and knowledge graph learning in a single ecosystem.</p>
            <div className="novelty-grid">
              {[
                {icon:"🧠",cls:"ni-blue",title:"Behavior-Aware Coding",desc:"The system understands how you code — not just what you type — and responds accordingly."},
                {icon:"🕸️",cls:"ni-teal",title:"Live Knowledge Graphs",desc:"Code is automatically transformed into interconnected concept maps powered by Neo4j."},
                {icon:"🤝",cls:"ni-violet",title:"Real-Time Collaborative Debug",desc:"First platform to offer synchronized debugging rooms with shared annotations and fix suggestions."},
                {icon:"🎯",cls:"ni-rose",title:"Unified Dev + Learning Ecosystem",desc:"No more context-switching between tools. Everything lives in one adaptive, intelligent environment."},
              ].map(n=>(
                <div className="novelty-card" key={n.title}>
                  <div className={`novelty-icon ${n.cls}`}>{n.icon}</div>
                  <h4>{n.title}</h4>
                  <p>{n.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FUTURE SCOPE */}
        <section className="section">
          <div className="ck-wrap">
            <div className="section-label">Future Scope</div>
            <h2 className="section-title">What's Next</h2>
            <p className="section-desc">The roadmap extends CKC-OS into an even more powerful, connected, and human-aware development platform.</p>
            <div className="future-grid">
              {["GitHub Integration","AI Pair Programmer","Voice-Based Coding Assistant","Emotion Detection Engine","Mobile IDE Support","LLM Fine-Tuning on Codebase"].map(f=>(
                <div className="future-item" key={f}>
                  <div className="future-bullet"/>
                  <span className="future-text">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section" id="cta">
          <h2>An Intelligent Coding<br/>Ecosystem Awaits</h2>
          <p>CKC-OS transforms how developers build and students learn — intelligently, collaboratively, and adaptively.</p>
          <div className="cta-btns">
            <button className="btn-primary" onClick={()=>scrollTo("modules")}>Explore All 13 Modules</button>
            <button className="btn-outline" onClick={()=>scrollTo("overview")}>Read System Overview</button>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <div className="nav-logo">
            <div className="nav-logo-dot" style={{width:22,height:22,fontSize:11}}>⚡</div>
            CKC-OS
          </div>
          <div className="footer-note">Cognitive Knowledge Coding OS · AI-Powered Real-Time Adaptive Ecosystem</div>
          <div className="footer-note" style={{color:"var(--text-3)"}}>Research & Industry Grade · 2025</div>
        </footer>

      </div>
    </>
  );
}