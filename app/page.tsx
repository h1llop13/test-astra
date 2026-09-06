import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { SceneProps } from './WatchScene';
gsap.registerPlugin(ScrollTrigger);
const WatchScene = lazy(() => import('./WatchScene'));
const strapOptions = [
  { name: 'Midnight', color: '#242422', note: 'Black grained calfskin. Understated by nature.' },
  { name: 'Cognac', color: '#6d351d', note: 'Warm cognac calfskin. A character all its own.' },
  { name: 'Forest', color: '#293f33', note: 'Deep green calfskin. An unexpected classic.' },
];
function useMedia(query: string) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => { const m = matchMedia(query); const change = () => setMatches(m.matches); m.addEventListener('change', change); change(); return () => m.removeEventListener('change', change); }, [query]);
  return matches;
}
class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onFailure?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure?.(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function Fallback({ art = false }: { art?: boolean }) {
  return <div className={`scene-fallback ${art ? 'art-fallback' : ''}`}><img src={art ? '/a01-study.webp' : '/no01-still.webp'} alt={art ? 'AURELIS Calibre A01 movement study' : 'AURELIS No. 01 in polished steel with a graphite dial'} /><span className="fallback-caption">THE NO. 01 · A STUDY IN PRECISION</span></div>;
}
function Scene({ onFailure, ...props }: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(props.mode === undefined);
  const [active, setActive] = useState(props.mode === undefined);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => { setReady(true); props.onReady?.(); }, [props.onReady]);
  const fail = useCallback(() => { setFailed(true); onFailure?.(); }, [onFailure]);
  useEffect(() => {
    const node = host.current!;
    const observer = new IntersectionObserver(([e]) => { setActive(e.isIntersecting); if (e.isIntersecting) setEntered(true); }, { rootMargin: '120px' });
    observer.observe(node); return () => observer.disconnect();
  }, []);
  return <div ref={host} className={`scene-host ${ready ? 'is-ready' : ''}`} data-ready={ready}>
    {failed ? <Fallback art={props.mode === 'art'} /> : entered && <SceneBoundary fallback={<Fallback art={props.mode === 'art'} />} onFailure={fail}><Suspense fallback={null}><WatchScene {...props} active={active} onReady={handleReady} onFailure={fail} /></Suspense></SceneBoundary>}
    {!ready && !failed && <div className="loading-scene" role="status"><span className="loading-ring"/>Preparing the timepiece<span className="loading-sub">Every detail, in its own time.</span></div>}
  </div>;
}
const chapters = ['The introduction', 'A different perspective', 'Beauty within', 'The beating heart', 'Perfectly in place', 'Yours to discover'];
const chapterPoints = [0, .16, .35, .57, .78, .94];
export default function App() {
  const osReduced = useMedia('(prefers-reduced-motion: reduce)');
  const mobile = useMedia('(max-width: 600px)');
  const [still, setStill] = useState(false);
  const [failed, setFailed] = useState(false);
  const reduced = osReduced || still || failed;
  const [strap, setStrap] = useState(0);
  const [detail, setDetail] = useState(0);
  const [dialog, setDialog] = useState(false);
  const [request, setRequest] = useState<string | null>(null);
  const [chapter, setChapter] = useState(0);
  const progress = useRef(0);
  const shell = useRef<HTMLElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const crystalCallout = useRef<HTMLDivElement>(null);
  const bridgeCallout = useRef<HTMLDivElement>(null);
  const lastChapter = useRef(0);
  const fail = useCallback(() => setFailed(true), []);
  const [ready, setReady] = useState(false);
  const sceneReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    const update = (p: number) => {
      progress.current = p;
      let next = 0;
      const edges = [.10, .25, .47, .7, .86]; edges.forEach((v, i) => { if (p >= v) next = i + 1; });
      if (next !== lastChapter.current) { lastChapter.current = next; setChapter(next); }
      panels.current.forEach((panel, i) => { if (!panel) return; panel.style.opacity = i === next ? '1' : '0'; panel.style.visibility = i === next ? 'visible' : 'hidden'; panel.inert = i !== next; });
      if (fill.current) fill.current.style.transform = `scaleX(${p})`;
      if (crystalCallout.current) crystalCallout.current.style.opacity = p > .29 && p < .44 ? '1' : '0';
      if (bridgeCallout.current) bridgeCallout.current.style.opacity = p > .51 && p < .66 ? '1' : '0';
    };
    if (reduced) { update(0); return; }
    const trigger = ScrollTrigger.create({ trigger: shell.current, start: 'top top', end: 'bottom bottom', onUpdate: self => update(self.progress), onRefresh: self => update(self.progress) });
    update(trigger.progress);
    return () => trigger.kill();
  }, [reduced, mobile]);
  useEffect(() => {
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.site-header', {opacity:0,y:-12},{opacity:1,y:0,duration:1.1,ease:'power2.out'});
      gsap.fromTo('.story-copy h1', {opacity:0,y:24},{opacity:1,y:0,duration:1.5,delay:.15,ease:'power3.out'});
      const blocks = gsap.utils.toArray<HTMLElement>('.manifesto-body > *, .spec-grid > div, .precision-copy > *, .calibre-layout > div > h2, .calibre-intro, .calibre-details article, .detail-heading > *, .detail-copy, .atelier-heading > *, .finishing-notes > article, .strap-copy > *, .viewing > *, .footer-main > *, .footer-bottom');
      blocks.forEach((el,i) => gsap.fromTo(el,{opacity:0,y:24},{opacity:1,y:0,duration:1,delay:(i%3)*.07,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 94%',toggleActions:'play none none reverse'}}));
      gsap.utils.toArray<HTMLElement>('.section-kicker, .spec-grid, .heartbeat-band').forEach(el=>gsap.fromTo(el,{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0% 0 0)',duration:1.4,ease:'power3.inOut',scrollTrigger:{trigger:el,start:'top 92%',once:true}}));
      gsap.fromTo('.atelier-photo img',{yPercent:-8,scale:1.12},{yPercent:8,scale:1.04,ease:'none',scrollTrigger:{trigger:'.atelier-photo',start:'top bottom',end:'bottom top',scrub:1}});
      gsap.to('.viewing .small-star',{rotation:90,ease:'none',scrollTrigger:{trigger:'.viewing',start:'top bottom',end:'bottom top',scrub:1}});
    });
    return () => ctx.revert();
  },[reduced]);
  function jump(index: number) {
    if (reduced) { document.getElementById(index===3?'details':'calibre')?.scrollIntoView({ behavior: 'auto' }); return; }
    const element = shell.current!;
    window.scrollTo({ top: element.offsetTop + (element.offsetHeight - innerHeight) * chapterPoints[index], behavior: 'smooth' });
  }
  function openViewing() { setRequest(null); setDialog(true); }
  function saveRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const content = `AURELIS — Private viewing request\n\nName: ${data.get('name')}\nEmail: ${data.get('email')}\nPreference: ${data.get('format')}\nTimepiece: AURELIS No. 01\nStrap: ${strapOptions[strap].name} calfskin\nIndicative price: From $18,500\n\nConcept demonstration only. This request has not been sent and no appointment has been booked.\n`;
    setRequest(content);
  }
  function downloadRequest() {
    const url = URL.createObjectURL(new Blob([request!], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'AURELIS-private-viewing.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <>
    <a href="#craft" className="skip-link">Skip the animation</a>
    <header className="site-header"><a className="wordmark" href="#top" aria-label="Aurelis home"><span className="brand-symbol" aria-hidden="true">✳</span>AURELIS</a><nav aria-label="Main navigation"><a href="#story">The timepiece</a><a href="#craft">Our philosophy</a><a href="#calibre">The calibre</a></nav><button className="nav-cta" onClick={openViewing}>Private viewing <span aria-hidden="true">↗</span></button></header>
    <main id="top" className={reduced ? 'quiet-mode' : 'motion-enabled'}>
      <section className={`story-shell ${reduced ? 'reduced' : ''}`} id="story" ref={shell} aria-label="The No. 01, revealed in six chapters">
        <div className={`story-stage ${ready ? 'scene-loaded' : ''}`} data-chapter={chapter}>
          <div className="ambient-orbit" aria-hidden="true"/><div className="ground-shadow" aria-hidden="true"/>
          <Scene progress={progress} mobile={mobile} reduced={reduced} strap={strapOptions[strap].color} onReady={sceneReady} onFailure={fail}/>
          <div className="story-copy story-panel" ref={el => { panels.current[0] = el; }}>
            <p className="eyebrow"><span/> THE FIRST EXPRESSION · NO. 01</p><h1>Time,<br/><em>revealed.</em></h1><p className="lead">Beyond the passing of hours.<br/>A world waiting to be discovered.</p><button onClick={() => jump(1)} className="button-dark">Discover the movement <span aria-hidden="true">↓</span></button>
          </div>
          <div className="story-copy story-panel later-panel" ref={el => { panels.current[1] = el; }}><p className="eyebrow"><span/> 01 / A DIFFERENT PERSPECTIVE</p><h2>Nothing<br/>to <em>hide.</em></h2><p className="lead">Light traces every curve.<br/>A quiet confidence, from every angle.</p><div className="micro-spec">POLISHED STEEL <span>40 MM</span></div></div>
          <div className="story-copy story-panel later-panel" ref={el => { panels.current[2] = el; }}><p className="eyebrow"><span/> 02 / BEAUTY WITHIN</p><h2>Every part.<br/><em>One purpose.</em></h2><p className="lead">A harmony of individual elements.<br/>Revealed, one layer at a time.</p><div className="micro-spec">CALIBRE A01 <span>EXPLODED STUDY</span></div></div>
          <div className="story-copy story-panel later-panel" ref={el => { panels.current[3] = el; }}><p className="eyebrow"><span/> 03 / THE BEATING HEART</p><h2>Small world.<br/><em>Endless wonder.</em></h2><p className="lead">Calibre A01. Entirely mechanical.<br/>An intimate conversation between<br className="desktop-break"/> energy, balance and time.</p><div className="micro-spec">72-HOUR POWER RESERVE <span>3 HZ</span></div></div>
          <div className="story-copy story-panel later-panel" ref={el => { panels.current[4] = el; }}><p className="eyebrow"><span/> 04 / PERFECTLY IN PLACE</p><h2>Precision.<br/><em>In concert.</em></h2><p className="lead">Each element returns to its place.<br/>A singular expression of time.</p><div className="micro-spec">MADE TO MOVE YOU <span>NO. 01</span></div></div>
          <div className="story-copy story-panel later-panel" ref={el => { panels.current[5] = el; }}><p className="eyebrow"><span/> 05 / YOURS TO DISCOVER</p><h2>A moment.<br/><em>Made yours.</em></h2><p className="lead">AURELIS No. 01<br/><span className="price">From $18,500</span></p><button className="button-dark" onClick={openViewing}>Request a private viewing <span aria-hidden="true">↗</span></button></div>
          <div className="component-callout crystal-callout" ref={crystalCallout} aria-hidden="true"><span>01</span><p>Sapphire crystal<small>Clarity without compromise</small></p></div>
          <div className="component-callout bridge-callout" ref={bridgeCallout} aria-hidden="true"><span>02</span><p>Hand-finished bridges<small>The human touch, preserved</small></p></div>
          <div className={`hero-note ${chapter !== 0 ? 'note-hidden' : ''}`} aria-hidden={chapter !== 0}><span className="tiny-label">AURELIS NO. 01</span><p>A study in quiet precision.</p><span className="tiny-label">SWISS MECHANICAL · 40 MM</span></div>
          <div className="stage-bottom"><span className="chapter-title">0{chapter + 1} — {chapters[chapter].toUpperCase()}</span><div className="chapter-nav" aria-label="Story chapters">{chapters.map((label, i) => <button key={label} onClick={() => jump(i)} aria-label={`Chapter ${i + 1}: ${label}`} aria-current={chapter === i ? 'step' : undefined}><span/></button>)}</div><button className="motion-control" aria-pressed={reduced} disabled={osReduced || failed} onClick={() => setStill(v => !v)}>{reduced ? 'STILL EXPERIENCE' : 'PAUSE MOTION'} <span aria-hidden="true">{reduced ? '○' : 'Ⅱ'}</span></button></div>
          <div className="story-progress" aria-hidden="true"><span ref={fill}/></div>
          {!reduced && chapter === 0 && <span className="scroll-cue">SCROLL TO REVEAL <span aria-hidden="true">↓</span></span>}
        </div>
      </section>
      <section id="craft" className="manifesto section-pad">
        <div className="section-kicker"><span className="eyebrow">01 / OUR PHILOSOPHY</span><span className="tiny-label">THE VALUE OF TAKING TIME</span></div>
        <div className="manifesto-body"><span className="small-star" aria-hidden="true">✳</span><h2>Some things are made<br/>to keep time.<br/><em>Others, to give it meaning.</em></h2><p>We believe a watch should offer more than an hour.<br className="desktop-break"/> It should reward a closer look. Invite a slower moment.<br className="desktop-break"/> And carry the quiet imprint of the hands that made it.</p><span className="signature">The AURELIS philosophy</span></div>
        <div className="spec-grid"><div><span className="spec-number">40<span>mm</span></span><h3>A considered proportion</h3><p>Polished stainless-steel case</p></div><div><span className="spec-number">72<span>h</span></span><h3>Time on your side</h3><p>Mechanical power reserve</p></div><div><span className="spec-number">A01</span><h3>Our first heartbeat</h3><p>Hand-wound manufacture concept</p></div><div><span className="spec-number">01</span><h3>The beginning of a story</h3><p>An independent vision of watchmaking</p></div></div>
      </section>
      <div className="heartbeat-band"><span className="live-dot"/><span>MECHANICAL, AND VERY MUCH ALIVE.</span><svg viewBox="0 0 320 36" aria-hidden="true"><path d="M0 18 H35 L45 18 L51 6 L60 30 L69 10 L77 22 L84 18 H116 L130 18 L136 6 L145 30 L154 10 L162 22 L169 18 H201 L215 18 L221 6 L230 30 L239 10 L247 22 L254 18 H320"/></svg><span>3 HZ <i>·</i> 21,600 VIBRATIONS / HOUR</span></div>
      <section className="precision" aria-labelledby="precision-title"><div className="art-visual"><Scene mode="art" reduced={reduced} mobile={mobile}/><span className="art-caption">CALIBRE A01 · A STUDY OF LIGHT AND MECHANICS</span></div><div className="precision-copy"><p className="eyebrow">02 / THE HUMAN ELEMENT</p><h2 id="precision-title">The Art<br/>of <em>Precision.</em></h2><p>A bevel catches the light. A bridge carries the trace of its finishing. Where engineering ends, the art of watchmaking begins.</p><a className="text-link" href="#calibre">Meet the Calibre A01 <span aria-hidden="true">↗</span></a></div></section>
      <section className="calibre section-pad" id="calibre"><div className="section-kicker"><span className="eyebrow">03 / CALIBRE A01</span><span className="tiny-label">AN INNER LIFE, EXTRAORDINARILY RICH</span></div><div className="calibre-layout"><div><h2>The heart<br/>of the <em>matter.</em></h2><p className="calibre-intro">To wind a watch is to give it life.<br/>To understand it is to see time differently.</p><button onClick={() => jump(3)} className="text-link">Revisit the movement <span aria-hidden="true">↗</span></button></div><div className="calibre-details"><article><span>01</span><div><h3>Energy, patiently held.</h3><p>A hand-wound barrel stores three days of possibility. Each turn of the crown renews the connection between you and your timepiece.</p></div></article><article><span>02</span><div><h3>Balance, beautifully found.</h3><p>A balance oscillating at 21,600 vibrations per hour. An unhurried rhythm that gives the A01 its distinctive mechanical heartbeat.</p></div></article><article><span>03</span><div><h3>Even the unseen, considered.</h3><p>Brushed bridges, polished bevels and jewel bearings. The same attention given to every surface, whether seen or simply known.</p></div></article></div></div></section>
      <section className="details section-pad" id="details"><div className="section-kicker"><span className="eyebrow">04 / LOOK A LITTLE CLOSER</span><span className="tiny-label">THE DIFFERENCE IS IN THE DETAILS</span></div><div className="detail-heading"><h2>Designed to reward<br/><em>your attention.</em></h2><p>Three perspectives.<br/>A thousand reasons to look again.</p></div><Tabs value={detail} onValueChange={v=>setDetail(Number(v))} className="detail-tabs"><TabsList className="detail-tab-list" variant="line"><TabsTrigger value={0}>01 <span>The dial</span></TabsTrigger><TabsTrigger value={1}>02 <span>The crown</span></TabsTrigger><TabsTrigger value={2}>03 <span>The finishing</span></TabsTrigger></TabsList><div className="detail-stage"><Scene mode="detail" detail={detail} reduced={reduced} mobile={mobile} strap={strapOptions[strap].color}/><div className="detail-crosshair" aria-hidden="true">+</div><span className="detail-annotation">{['SUNRAY GRAIN / APPLIED INDICES','KNURLED STEEL / SIGNED CROWN','PERLAGE / POLISHED ANGLES'][detail]}</span><span className="detail-scale" aria-hidden="true">0 ├────────┤ 10 MM</span></div><TabsContent value={0}><div className="detail-copy"><h3>A different light. Every time.</h3><p>A graphite sunray dial beneath sapphire. Faceted hands and applied indices catch the light as your perspective shifts. A small seconds display quietly marks the moment.</p><span>01 / DIAL STUDY</span></div></TabsContent><TabsContent value={1}><div className="detail-copy"><h3>The beginning of a daily ritual.</h3><p>A precisely knurled crown, signed with the AURELIS monogram. A tactile connection to the movement within. Turn, feel, and make a moment your own.</p><span>02 / CROWN STUDY</span></div></TabsContent><TabsContent value={2}><div className="detail-copy"><h3>Beauty beneath the surface.</h3><p>Overlapping circular graining. Blue steel screw heads. Warm gold wheels and polished silver bridges. A quiet landscape of contrasts, made for the curious.</p><span>03 / FINISHING STUDY</span></div></TabsContent></Tabs></section>
      <section className="atelier section-pad"><div className="atelier-heading"><p className="eyebrow">05 / THE HUMAN TOUCH</p><h2>No machine can<br/><em>measure devotion.</em></h2><p>Time is our material.<br/>Patience is our method.</p></div><figure className="atelier-photo"><img src="/atelier.webp" loading="lazy" decoding="async" width="1536" height="1024" alt="A watchmaker carefully placing a component into a gold mechanical movement with fine steel tweezers"/><figcaption><span>THE ATELIER / A MOMENT OF CONCENTRATION</span><span>CRAFTED, NEVER HURRIED.</span></figcaption></figure><div className="finishing-notes"><article><span>01</span><h3>Polished by hand.</h3><p>A mirror on every bevel. Light reveals the care that went into it.</p></article><article><span>02</span><h3>Brushed with intent.</h3><p>Parallel lines, circular grain. Each surface speaks its own language.</p></article><article><span>03</span><h3>Assembled in balance.</h3><p>A collection of individual parts. Brought together with a singular purpose.</p></article></div></section>
      <section className="straps section-pad" id="straps"><div className="strap-visual"><Scene mode="strap" strap={strapOptions[strap].color} reduced={reduced} mobile={mobile}/><span className="strap-visual-label">NO. 01 / {strapOptions[strap].name.toUpperCase()}</span></div><div className="strap-copy"><p className="eyebrow">06 / A PERSONAL EXPRESSION</p><h2>Same soul.<br/><em>Your character.</em></h2><p>Supple calfskin. Hand-finished edges.<br/>Three tones, each a different point of view.</p><fieldset className="strap-options"><legend>Choose your strap</legend>{strapOptions.map((s, i) => <label key={s.name} className={strap === i ? 'selected' : ''}><input type="radio" name="strap" checked={strap === i} onChange={() => setStrap(i)} value={s.name}/><span className="swatch" style={{ '--swatch': s.color } as CSSProperties}/><span>{s.name}</span></label>)}</fieldset><p className="strap-description" aria-live="polite">{strapOptions[strap].note}</p><span className="tiny-label">QUICK-RELEASE FITTING · 20 MM</span></div></section>
      <section className="viewing section-pad" id="viewing"><span className="small-star" aria-hidden="true">✳</span><p className="eyebrow">YOUR TIME, PERSONALLY</p><h2>Some things deserve<br/>to be experienced <em>in person.</em></h2><p>Meet the No. 01. Discover the details.<br/>Take all the time you need.</p><span className="viewing-price">From $18,500</span><button className="button-dark" onClick={openViewing}>Request a private viewing <span aria-hidden="true">↗</span></button></section>
    </main>
    <footer className="site-footer"><div className="footer-main"><a className="wordmark" href="#top" aria-label="Aurelis home"><span className="brand-symbol" aria-hidden="true">✳</span>AURELIS</a><p>Time, revealed.</p><a href="#top" className="back-top">Back to the beginning <span aria-hidden="true">↑</span></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} AURELIS</span><span>A fictional maison. A real appreciation for time.</span><span>DESIGNED TO BE TIMELESS</span></div></footer>
    <Dialog open={dialog} onOpenChange={setDialog}><DialogContent className="viewing-dialog"><p className="eyebrow">AURELIS / PRIVATE VIEWING</p><DialogTitle className="dialog-title">A closer <em>connection.</em></DialogTitle><DialogDescription className="dialog-description">Your introduction to the No. 01, at your own pace.</DialogDescription>{request ? <div className="request-success" role="status"><span className="small-star" aria-hidden="true">✳</span><h3>Your request is ready.</h3><p>Download your personal viewing note. This concept experience does not send requests or book appointments.</p><button className="button-dark" onClick={downloadRequest}>Download viewing note <span aria-hidden="true">↓</span></button><button className="text-link" onClick={() => setRequest(null)}>Edit details</button></div> : <form onSubmit={saveRequest}><label htmlFor="viewing-name">Your name</label><input id="viewing-name" name="name" autoComplete="name" required maxLength={100} placeholder="Alex Morgan"/><label htmlFor="viewing-email">Email address</label><input id="viewing-email" name="email" type="email" autoComplete="email" required maxLength={200} placeholder="alex@example.com"/><fieldset className="format-options"><legend>Your preferred introduction</legend><label><input type="radio" name="format" value="At the atelier" defaultChecked/> At the atelier</label><label><input type="radio" name="format" value="A private video call"/> A private video call</label></fieldset><div className="request-selection">NO. 01 <span>{strapOptions[strap].name} calfskin · From $18,500</span></div><button type="submit" className="button-dark">Prepare my viewing request <span aria-hidden="true">↗</span></button><p className="form-note">Concept experience. Your details stay in this page and are never transmitted. No appointment will be booked.</p></form>}</DialogContent></Dialog>
  </>;
}
