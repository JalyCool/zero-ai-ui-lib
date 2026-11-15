import math
def s2l(c): return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def l2s(c):
    c=max(0.0,min(1.0,c)); return 12.92*c if c<=0.0031308 else 1.055*c**(1/2.4)-0.055
def hex2lin(h):
    h=h.lstrip('#'); return [s2l(int(h[i:i+2],16)/255) for i in (0,2,4)]
def lin2oklab(r,g,b):
    l=0.4122214708*r+0.5363325363*g+0.0514459929*b
    m=0.2119034982*r+0.6806995451*g+0.1073969566*b
    s=0.0883024619*r+0.2817188376*g+0.6299787005*b
    l_,m_,s_=[v**(1/3) for v in (l,m,s)]
    return (0.2104542553*l_+0.7936177850*m_-0.0040720468*s_,
            1.9779984951*l_-2.4285922050*m_+0.4505937099*s_,
            0.0259040371*l_+0.7827717662*m_-0.8086757660*s_)
def oklab2hex(L,A,B):
    l_=L+0.3963377774*A+0.2158037573*B; m_=L-0.1055613458*A-0.0638541728*B; s_=L-0.0894841775*A-1.2914855480*B
    l,m,s=l_**3,m_**3,s_**3
    r=4.0767416621*l-3.3077115913*m+0.2309699292*s
    g=-1.2684380046*l+2.6097574011*m-0.3413193965*s
    b=-0.0041960863*l-0.7034186147*m+1.7076147010*s
    return '#'+''.join(f'{round(l2s(v)*255):02x}' for v in (r,g,b))
def mix(fg,bg,pct):
    a=lin2oklab(*hex2lin(fg)); b=lin2oklab(*hex2lin(bg))
    return oklab2hex(*[a[i]*pct+b[i]*(1-pct) for i in range(3)])
bg='#f4f3f7'
for name,fg,pct in [('success-container','#15803d',0.13),('warning-container','#b45309',0.14),('error-container','#ba1a1a',0.13)]:
    print(name, mix(fg,bg,pct))
print('stroke-hover', mix('#777680','#f4f3f7',1))
