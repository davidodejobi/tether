"""Source of truth for colour tokens: OKLCH ramps (P) + semantic Light/Dark map (SEM).
Run: python3 tools/tokens/tokens.py  -> prints WCAG contrast check (58 pairs/mode), writes tokens.json.
Any FAIL line = do not push to Figma. Edit seeds/SEM here first, then sync Figma."""
import math, json
def s2l(c): return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def l2s(c): return 12.92*c if c<=0.0031308 else 1.055*c**(1/2.4)-0.055
def hex2rgb(h): h=h.lstrip('#'); return [int(h[i:i+2],16)/255 for i in (0,2,4)]
def rgb2hex(r): return '#'+''.join('%02X'%round(max(0,min(1,x))*255) for x in r)
def to_oklch(h):
    r,g,b=[s2l(x) for x in hex2rgb(h)]
    l=0.4122214708*r+0.5363325363*g+0.0514459929*b
    m=0.2119034982*r+0.6806995451*g+0.1073969566*b
    s=0.0883024619*r+0.2817188376*g+0.6299787005*b
    l,m,s=[x**(1/3) for x in (l,m,s)]
    L=0.2104542553*l+0.7936177850*m-0.0040720468*s
    a=1.9779984951*l-2.4285922050*m+0.4505937099*s
    bb=0.0259040371*l+0.7827717662*m-0.8086757660*s
    return L, math.hypot(a,bb), math.degrees(math.atan2(bb,a))%360
def from_oklch(L,C,H):
    a=C*math.cos(math.radians(H)); b=C*math.sin(math.radians(H))
    l=(L+0.3963377774*a+0.2158037573*b)**3
    m=(L-0.1055613458*a-0.0638541728*b)**3
    s=(L-0.0894841775*a-1.2914855480*b)**3
    r=4.0767416621*l-3.3077115913*m+0.2309699292*s
    g=-1.2684380046*l+2.6097574011*m-0.3413193965*s
    bl=-0.0041960863*l-0.7034186147*m+1.7076147010*s
    return [r,g,bl]
def in_gamut(rgb): return all(-1e-4<=x<=1+1e-4 for x in rgb)
def mk(L,C,H):
    while C>0 and not in_gamut(from_oklch(L,C,H)): C-=0.002
    return rgb2hex([l2s(max(0,min(1,x))) for x in from_oklch(L,C,H)])
def lum(h): r,g,b=[s2l(x) for x in hex2rgb(h)]; return .2126*r+.7152*g+.0722*b
def cr(a,b): x,y=sorted([lum(a),lum(b)]); return (y+.05)/(x+.05)

STEPS=[50,100,200,300,400,500,600,700,800,900,950]
LS=[.975,.945,.89,.81,.72,.63,.54,.46,.38,.29,.21]
CMUL=[.12,.25,.5,.8,1,1,1,.9,.75,.6,.45]
def ramp(seed, cmax=None):
    L,C,H=to_oklch(seed); C=cmax or C
    return {s:mk(l,C*m,H) for s,l,m in zip(STEPS,LS,CMUL)}
P={
 'teal': ramp('#0F766E'),
 'red': ramp('#B3261E'),
 'green': ramp('#2E7D32'),
 'amber': ramp('#B26A00'),
 'blue': ramp('#3B5B85'),
}
# ---- Tether v2 · Light = "Naija Green · Day", Dark = "Adire Night" ----
# Meaning is the same in both modes: green = action, gold = proof/stamp, coral = gap, red = wrong.
P={
 'green': ramp('#00804D'),   # Nigerian flag green: action
 'mint':  ramp('#2ED3A0'),   # action in dark (Adire)
 'gold':  ramp('#FFB800'),   # proof / stamps / crown
 'coral': ramp('#F07A1A'),   # gap: orange (hue ~52), well clear of wrong red (hue ~27); was #E5482B, which matched red
 'red':   ramp('#C62828'),   # wrong answer
 'coach': ramp('#FFB547'),
}
# neutrals: leaf (green-tinted, light) and night (indigo, dark)
P['leaf']={s:mk(l,0.014,150) for s,l in zip(STEPS,[.985,.965,.92,.86,.74,.60,.50,.42,.34,.26,.20])}
P['night']={s:mk(l,c,268) for s,l,c in zip(STEPS,[.97,.93,.86,.76,.64,.52,.42,.36,.30,.24,.19],[.01,.02,.03,.05,.07,.08,.08,.08,.08,.08,.075])}
P['gold'][300]='#FFC233'  # exact Adire/Naija gold for stamps
P['base']={'white':'#FFFFFF'}
def g(ref): f,s=ref.split('/'); return P[f][s if f=='base' else int(s)]
SEM=[
 ('color/bg/page','leaf/50','night/950'),
 ('color/bg/surface','base/white','night/900'),
 ('color/bg/sunken','leaf/100','night/800'),
 ('color/bg/primary','green/600','mint/400'),
 ('color/bg/primary-edge','green/800','mint/600'),
 ('color/bg/primary-container','green/50','night/800'),
 ('color/bg/proof','gold/300','gold/300'),
 ('color/bg/proof-edge','gold/600','gold/600'),
 ('color/bg/proof-container','gold/50','night/800'),
 ('color/bg/gap','coral/600','coral/300'),
 ('color/bg/gap-container','coral/50','night/800'),
 ('color/bg/wrong-container','red/50','night/800'),
 ('color/bg/coach','coach/300','coach/300'),
 ('color/bg/coach-container','gold/50','night/800'),
 ('color/bg/disabled','leaf/200','night/800'),
 ('color/text/primary','leaf/900','night/50'),
 ('color/text/secondary','leaf/600','night/300'),
 ('color/text/disabled','leaf/500','night/400'),
 ('color/text/brand','green/700','mint/200'),
 ('color/text/on-primary','base/white','night/950'),
 ('color/text/on-primary-container','green/800','mint/100'),
 ('color/text/proof','gold/700','gold/200'),
 ('color/text/on-proof','leaf/950','night/950'),
 ('color/text/on-proof-container','gold/800','gold/100'),
 ('color/text/gap','coral/700','coral/200'),
 ('color/text/on-gap','base/white','night/950'),
 ('color/text/on-gap-container','coral/800','coral/100'),
 ('color/text/wrong','red/700','red/200'),
 ('color/text/on-wrong-container','red/800','red/100'),
 ('color/text/on-coach-container','leaf/900','night/50'),
 ('color/icon/default','leaf/900','night/50'),
 ('color/icon/secondary','leaf/600','night/300'),
 ('color/icon/brand','green/700','mint/200'),
 ('color/icon/proof','gold/600','gold/300'),
 ('color/icon/gap','coral/600','coral/300'),
 ('color/icon/wrong','red/600','red/300'),
 ('color/icon/on-primary','base/white','night/950'),
 ('color/border/subtle','leaf/200','night/800'),
 ('color/border/edge','leaf/300','night/700'),
 ('color/border/strong','leaf/500','night/400'),
 ('color/border/focus','green/600','mint/400'),
 ('color/border/selected','green/600','mint/400'),
 ('color/border/proof','gold/600','gold/300'),
 ('color/border/wrong','red/600','red/300'),
 ('color/border/gap','coral/600','coral/300'),
]
S={n:(l,d) for n,l,d in SEM}
PAIRS=[]
for t in ['primary','secondary','brand','proof','gap','wrong']:
  for c in ['page','surface']: PAIRS.append((f'color/text/{t}',f'color/bg/{c}',4.5))
for t in ['primary','secondary']: PAIRS.append((f'color/text/{t}','color/bg/sunken',4.5))
PAIRS += [('color/text/on-primary','color/bg/primary',4.5),('color/text/on-proof','color/bg/proof',4.5),('color/text/on-gap','color/bg/gap',4.5),
  ('color/text/on-primary-container','color/bg/primary-container',4.5),('color/text/on-proof-container','color/bg/proof-container',4.5),
  ('color/text/on-gap-container','color/bg/gap-container',4.5),('color/text/on-wrong-container','color/bg/wrong-container',4.5),
  ('color/text/on-coach-container','color/bg/coach-container',4.5),('color/text/primary','color/bg/primary-container',4.5),
  ('color/text/primary','color/bg/wrong-container',4.5),('color/text/primary','color/bg/proof-container',4.5),('color/text/brand','color/bg/primary-container',4.5),
  ('color/icon/on-primary','color/bg/primary',3)]
for ic in ['default','secondary','brand','proof','gap','wrong']:
  for c in ['page','surface']: PAIRS.append((f'color/icon/{ic}',f'color/bg/{c}',3))
for b in ['strong','focus','selected','proof','wrong','gap']:
  for c in ['page','surface']: PAIRS.append((f'color/border/{b}',f'color/bg/{c}',3))
PAIRS += [('color/bg/primary','color/bg/page',3),('color/bg/proof-edge','color/bg/surface',3),('color/bg/gap','color/bg/surface',3)]
fails=0
for mi,mode in enumerate(['Light','Dark']):
  lowT=lowN=99; worst=None
  for fg,bg,mn in PAIRS:
    c=cr(g(S[fg][mi]),g(S[bg][mi]))
    if c<mn: print('FAIL',mode,fg,'on',bg,round(c,2),g(S[fg][mi]),g(S[bg][mi])); fails+=1
    if mn==4.5 and c<lowT: lowT=c; worst=(fg,bg)
    if mn==3: lowN=min(lowN,c)
  print(mode,'pairs',len(PAIRS),'lowest text',round(lowT,2),worst,'lowest non-text',round(lowN,2))
# gap and wrong must be told apart on screen (review-4): hue at least 20 degrees apart in OKLCH
for mi,mode in enumerate(['Light','Dark']):
  for a,b in [('color/text/gap','color/text/wrong'),('color/border/gap','color/border/wrong'),('color/icon/gap','color/icon/wrong')]:
    dh=abs(to_oklch(g(S[a][mi]))[2]-to_oklch(g(S[b][mi]))[2])
    if dh<20: print('FAIL',mode,a,'vs',b,'hue apart only',round(dh,1)); fails+=1
import os
HERE=os.path.dirname(os.path.abspath(__file__))
json.dump({'P':P,'SEM':SEM,'resolved':{n:{'Light':g(l),'Dark':g(d)} for n,l,d in SEM}},open(os.path.join(HERE,'tokens.json'),'w'),indent=1)
print('fails',fails)
for k in ['color/bg/page','color/bg/surface','color/bg/primary','color/bg/proof','color/bg/gap','color/text/primary']: print(k, g(S[k][0]), g(S[k][1]))

if fails: raise SystemExit(1)
