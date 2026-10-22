import re,collections,os
HERE=os.path.dirname(os.path.abspath(__file__))
t=open(os.path.join(HERE,'04-pencocokan.md')).read()
code=open(os.path.join(HERE,'02-inventaris-kode.md')).read()
uni=collections.defaultdict(list)
for l in code.split('\n'):
    m=re.match(r'\|\s*((RT|API|ST|PERM|DEN|AUTO|AUD|ENV|CON)-(\d+)(?:\.\.(\d+))?)\s*\|',l)
    if m:
        p=m.group(2);a=int(m.group(3));b=int(m.group(4) or a)
        for n in range(a,b+1): uni[p].append(f"{p}-{n:02d}")
    m=re.match(r'### (ST)-(\d+)',l)
    if m: uni['ST'].append(f"ST-{int(m.group(2)):02d}")
U={p:set(v) for p,v in uni.items()}
allids=set().union(*U.values())
def expand(s):
    out=set()
    for m in re.finditer(r'\b(RT|API|ST|PERM|DEN|AUTO|AUD|ENV|CON)-(\d+)(?:\.\.(\d+))?',s):
        p=m.group(1);a=int(m.group(2));b=int(m.group(3) or a)
        for n in range(a,b+1):
            i=f"{p}-{n:02d}"
            if i in allids: out.add(i)
    return out
sec1=t.split('## 2. Daftar selisih')[0]
rows=[]
for l in sec1.split('\n'):
    if re.match(r'\| [ABPTSX]\d\d \|',l):
        rows.append([x.strip() for x in l.strip().strip('|').split(' | ')])
cat=collections.Counter(r[6] for r in rows)
print('units',len(rows),dict(sorted(cat.items())))
print('mvp',dict(collections.Counter(r[5] for r in rows)))
pen=[r for r in rows if not r[2].startswith('—')]
cod=[r for r in rows if not r[3].startswith('—')]
doc=[r for r in rows if r[4]!='—']
print('penpot',len(pen),'kode',len(cod),'dok',len(doc))
for c in 'ABCDE':
    rs=[r for r in rows if r[6]==c]
    print(c,len(rs),'penpot',sum(not r[2].startswith('—') for r in rs),'kode',sum(not r[3].startswith('—') for r in rs),'dok',sum(r[4]!='—' for r in rs))
# kode real (DIBANGUN) vs stub etc
sec4=t.split('## 4. Rencana diagram')[1].split('**Sengaja TIDAK')[0]
kotak=set();pudar=set()
for l in sec4.split('\n'):
    if re.match(r'\| D\d\d \|',l):
        c=[x.strip() for x in l.strip().strip('|').split(' | ')]
        kotak|=set(re.findall(r'[ABPTSX]\d\d',c[2])); pudar|=set(re.findall(r'[ABPTSX]\d\d',c[3]))
ids=[r[0] for r in rows]
print('not drawn',[i for i in ids if i not in kotak|pudar],'kotak',len(kotak),'pudar-only',len(pudar-kotak))
sec5=t.split('## 5. Kartu aturan')[1].split('## 6.')[0]
cardids=set();cards=0;st=collections.Counter()
for l in sec5.split('\n'):
    if re.match(r'\| R\d+ \|',l):
        cards+=1
        c=[x.strip() for x in l.strip().strip('|').split(' | ')]
        cardids|=expand(c[3]); st[c[2]]+=1
print('cards',cards,dict(st))
unitcode={r[0]:expand(r[3]) for r in rows}
cov_k=set();cov_p=set()
for u,s in unitcode.items():
    if u in kotak: cov_k|=s
    elif u in pudar: cov_p|=s
tot=0;cv=0
for p in ['AUTO','DEN','AUD','API','RT','ST','PERM','ENV','CON']:
    T=U[p];ck=T&cov_k;cp=(T&cov_p)-ck;cc=(T&cardids)-ck-cp
    unc=sorted(T-ck-cp-cardids)
    if p!='ENV' and p!='CON': tot+=len(T);cv+=len(ck)+len(cp)+len(cc)
    print(p,len(T),'kotak',len(ck),'pudar',len(cp),'kartu',len(cc),'tercakup',len(ck)+len(cp)+len(cc),'tidak',unc)
print('7 prefix',tot,cv)
# which unit codes ids not in universe (typos)
for r in rows:
    for m in re.finditer(r'\b(RT|API|ST|PERM|DEN|AUTO|AUD|ENV|CON)-(\d+)(?:\.\.(\d+))?',r[3]+' '+r[4]):
        pass
bad=[]
for l in (sec1+sec5).split('\n'):
    for m in re.finditer(r'\b(RT|API|ST|PERM|DEN|AUTO|AUD|ENV|CON)-(\d+)\b',l):
        i=f"{m.group(1)}-{int(m.group(2)):02d}"
        if i not in allids: bad.append(i)
print('ids not in universe',sorted(set(bad)))
# B rows with penpot content, C rows with real code
for r in rows:
    if r[6]=='B' and not r[2].startswith('—'): print('B with penpot',r[0],r[2][:50])
    if r[6]=='C' and not r[3].startswith('—'): print('C with code',r[0],r[3][:60])
