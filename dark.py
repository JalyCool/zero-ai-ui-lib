import math
def s2l(c):
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def l2s(c):
    c=max(0.0,min(1.0,c))
    return 12.92*c if c<=0.0031308 else 1.055*c**(1/2.4)-0.055
def hex2oklch(h):
    h=h.lstrip('#'); r,g,b=[s2l(int(h[i:i+2],16)/255) for i in (0,2,4)]
    l=0.4122214708*r+0.5363325363*g+0.0514459929*b
    m=0.2119034982*r+0.6806995451*g+0.1073969566*b
    s=0.0883024619*r+0.2817188376*g+0.6299787005*b
    l_,m_,s_=[v**(1/3) for v in (l,m,s)]
    L=0.2104542553*l_+0.7936177850*m_-0.0040720468*s_
    A=1.9779984951*l_-2.4285922050*m_+0.4505937099*s_
    B=0.0259040371*l_+0.7827717662*m_-0.8086757660*s_
    return L, math.hypot(A,B), math.atan2(B,A)
def oklch2hex(L,C,h):
    A=C*math.cos(h); B=C*math.sin(h)
    l_=L+0.3963377774*A+0.2158037573*B
    m_=L-0.1055613458*A-0.0638541728*B
    s_=L-0.0894841775*A-1.2914855480*B
    l,m,s=l_**3,m_**3,s_**3
    r=4.0767416621*l-3.3077115913*m+0.2309699292*s
    g=-1.2684380046*l+2.6097574011*m-0.3413193965*s
    b=-0.0041960863*l-0.7034186147*m+1.7076147010*s
    rgb=[max(0,min(1,l2s(v))) for v in (r,g,b)]
    return '#'+''.join(f'{round(v*255):02x}' for v in rgb)
L,C,h=hex2oklch('#3f5f90')
print('seed hue deg', math.degrees(h), 'L',L,'C',C)
lramp=[0.90,0.82,0.72,0.62,0.52,0.44,0.36,0.30,0.24,0.19,0.14,0.09]
cmul=[0.15,0.25,0.40,0.60,0.80,0.95,1.0,0.95,0.85,0.70,0.50,0.30]
def scale(hue, base): return [oklch2hex(l, base*cmul[i], math.radians(hue)) for i,l in enumerate(lramp)]
p=scale(math.degrees(h),0.20); n=scale(math.degrees(h),0.010); nv=scale(math.degrees(h),0.030)
sec=scale(math.degrees(h)+30,0.08); err=scale(math.degrees(h)-180,0.16)
dark={'background':n[11],'surface':n[11],'surface-container-low':n[10],'surface-container':n[9],
'surface-container-high':n[8],'surface-container-highest':n[7],'on-surface':n[0],
'on-surface-variant':nv[3],'outline':nv[5],'outline-variant':nv[7],'primary':p[2],
'on-primary':p[10],'primary-container':p[9],'on-primary-container':p[1],
'secondary':sec[2],'secondary-container':sec[9],'on-secondary-container':sec[1],
'error':err[2],'on-error':err[10]}
for k,v in dark.items(): print(f'  --{k}: {v};')
