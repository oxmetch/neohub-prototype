import re,os,sys,json
SP=os.path.dirname(os.path.abspath(__file__))
KEEP={'viewBox','preserveAspectRatio','gradientUnits','gradientTransform','patternUnits','patternContentUnits','maskUnits','clipPathUnits','spreadMethod','stdDeviation','markerWidth','markerHeight','refX','refY','filterUnits','primitiveUnits','baseFrequency','numOctaves','tableValues','kernelMatrix','pathLength'}
def kebab(k):
    if k.startswith('Webkit'): return '-webkit-'+kebab(k[6:]).lstrip('-')
    if k.startswith('Moz'): return '-moz-'+kebab(k[3:]).lstrip('-')
    if k.startswith('ms'): return '-ms-'+kebab(k[2:])
    return re.sub(r'([A-Z])',lambda m:'-'+m.group(1).lower(),k)
def parse_obj(s,i):
    # s[i] after '{{'; returns css, new index after '}}'
    props=[]
    n=len(s)
    while True:
        while s[i] in ' \n\t,': i+=1
        if s.startswith('}}',i): return '; '.join(props),i+2
        m=re.match(r"['\"]?([A-Za-z\-]+)['\"]?\s*:\s*",s[i:])
        key=m.group(1); i+=m.end()
        if s[i] in "'\"":
            q=s[i]; j=i+1; buf=''
            while s[j]!=q:
                if s[j]=='\\': buf+=s[j+1]; j+=2
                else: buf+=s[j]; j+=1
            val=buf; i=j+1
        else:
            m=re.match(r"[^,}]+",s[i:]); val=m.group(0).strip(); i+=m.end()
        k=key if key.startswith('-') else kebab(key)
        if re.fullmatch(r'-?[0-9.]+',val) and val!='0' and k not in UNITLESS: val+='px'
        val=val.replace('"',"'")
        props.append(f'{k}: {val}')
def attr_name(a):
    if a=='className': return 'class'
    if a=='htmlFor': return 'for'
    if a in KEEP: return a
    if a.startswith('xlink'): return 'xlink:'+a[5:].lower()
    return kebab(a)
UNITLESS={'flex-grow','flex-shrink','font-weight','opacity','z-index','order','flex','-webkit-line-clamp','line-height'}
VOID={'img','br','input','hr','meta','link'}
SVGT=set('svg path g rect circle ellipse line polyline polygon defs linearGradient radialGradient stop clipPath mask use pattern filter feGaussianBlur feOffset feBlend feFlood feComposite feColorMatrix feMerge feMergeNode image text tspan symbol'.split())
def convert(src):
    s=src.strip()
    if s.startswith('('): s=s[1:]
    if s.endswith(')'): s=s[:-1]
    out=[];i=0;n=len(s)
    while i<n:
        if s.startswith('style={{',i):
            css,i=parse_obj(s,i+8); out.append('style="'+css.replace('"','&quot;')+'"'); continue
        if s[i]=='<' and re.match(r'<[A-Za-z]',s[i:]):
            m=re.match(r'<([A-Za-z0-9]+)',s[i:]); tag=m.group(1); out.append('<'+tag); i+=m.end()
            # attributes until > or />
            while True:
                while s[i] in ' \n\t': i+=1
                if s.startswith('/>',i):
                    out.append('>' if tag in VOID else ('/>' if tag in SVGT else '></'+tag+'>')); i+=2; break
                if s[i]=='>': out.append('>'); i+=1; break
                if s.startswith('style={{',i):
                    css,i=parse_obj(s,i+8); out.append(' style="'+css.replace('"','&quot;')+'"'); continue
                m=re.match(r'([A-Za-z:\-]+)',s[i:]); a=m.group(1); i+=m.end()
                if s[i]=='=':
                    i+=1
                    if s[i]=='"':
                        j=s.index('"',i+1); v=s[i+1:j]; i=j+1
                    elif s[i]=='{':
                        j=s.index('}',i); v=s[i+1:j].strip().strip("'\""); i=j+1
                    out.append(f' {attr_name(a)}="{v}"')
                else: out.append(' '+attr_name(a))
            continue
        if s[i]=='{':
            m=re.match(r"\{\s*(['\"])(.*?)\1\s*\}",s[i:],re.S)
            if m: out.append(m.group(2)); i+=m.end(); continue
        out.append(s[i]); i+=1
    html=''.join(out)
    html=re.sub(r'>\s+',' >',html) if False else html
    # collapse whitespace between tags / text
    html=re.sub(r'\n\s*','\n',html)
    html=re.sub(r'>\n','>',html); html=re.sub(r'\n<','<',html)
    return html
if __name__=='__main__':
    os.makedirs(os.path.join(SP,'html'),exist_ok=True)
    for f in sorted(os.listdir(os.path.join(SP,'jsx'))):
        h=convert(open(os.path.join(SP,'jsx',f)).read())
        open(os.path.join(SP,'html',f.replace('.jsx','.html')),'w').write(h)
    print('ok')
