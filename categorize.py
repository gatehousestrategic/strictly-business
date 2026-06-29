import csv, re, json
from datetime import date

def categorize(service):
    s = service.lower()
    if re.search(r'plumb|pipe|drain|water heater|boiler', s): return 'Plumbing'
    if re.search(r'electric|wiring|panel|generator|outlet', s): return 'Electrical'
    if re.search(r'roof|gutter|shingle|slate', s): return 'Roofing'
    if re.search(r'hvac|heat|cool|ac |air con|furnace|boiler', s): return 'HVAC'
    if re.search(r'clean|maid|janitorial|power wash|pressure wash', s): return 'Cleaning'
    if re.search(r'lawyer|attorney|legal|notary|contract', s): return 'Legal'
    if re.search(r'account|tax|cpa|bookkeep|payroll|audit', s): return 'Accounting & Tax'
    if re.search(r'contrac|build|renovat|construc|remodel|addition', s): return 'Contracting & Construction'
    if re.search(r'handyman|repair|fix|mainten', s): return 'Handyman'
    if re.search(r'landscap|lawn|grass|tree|sod|irrigation|garden', s): return 'Landscaping'
    if re.search(r'paint|stain|coat', s): return 'Painting'
    if re.search(r'floor|tile|hardwood|carpet|vinyl', s): return 'Flooring'
    if re.search(r'real estate|realtor|agent|broker|property manag', s): return 'Real Estate'
    if re.search(r'insur', s): return 'Insurance'
    if re.search(r'mortgage|loan|financ|invest|fund|capital|lend', s): return 'Finance & Lending'
    if re.search(r'doctor|physician|medical|health|dental|chiro|therapy|therapist|psych|counsel', s): return 'Medical & Health'
    if re.search(r'tutor|teach|coach|mentor|edu', s): return 'Education & Tutoring'
    if re.search(r'cater|food|chef|baker|restaurant|kosher', s): return 'Catering & Food'
    if re.search(r'photo|videograph|film|media', s): return 'Photography & Video'
    if re.search(r'design|architect|interior|space plan|decor', s): return 'Design & Architecture'
    if re.search(r'tech|computer|software|it |web|app|dev|cyber|network', s): return 'Technology & IT'
    if re.search(r'transport|moving|mov|deliver|trucking|logistic', s): return 'Moving & Delivery'
    if re.search(r'car|auto|vehicl|truck|mechanic|body shop|tires?', s): return 'Automotive'
    if re.search(r'pool|spa|hot tub', s): return 'Pool & Spa'
    if re.search(r'window|door|glass|screen', s): return 'Windows & Doors'
    if re.search(r'mason|brick|concret|paver|stone|stucco', s): return 'Masonry'
    if re.search(r'fence|deck|porch|pergola|railin', s): return 'Fencing & Decking'
    if re.search(r'pest|exterminator|termite|mice|rodent', s): return 'Pest Control'
    if re.search(r'securi|alarm|camera|cctv|surveil', s): return 'Security'
    if re.search(r'market|advertis|seo|social media|branding|pr ', s): return 'Marketing & PR'
    if re.search(r'staffing|recruit|hr |human res|employ', s): return 'Staffing & HR'
    if re.search(r'print|sign|graphic|banner', s): return 'Printing & Signage'
    if re.search(r'storage|warehous', s): return 'Storage & Warehousing'
    if re.search(r'child|baby|nanny|daycare|babysit', s): return 'Childcare'
    if re.search(r'event|wedding|party|catering', s): return 'Events & Catering'
    if re.search(r'locksmith|lock|key', s): return 'Locksmith'
    if re.search(r'propane|gas|oil|energy|solar', s): return 'Energy & Utilities'
    if re.search(r'structur|engineer|survey|inspection', s): return 'Engineering & Inspection'
    return 'Other Services'

rows = []
with open('/home/claude/strictly-business/recommendations.csv', encoding='utf-8') as f:
    for r in csv.DictReader(f):
        r['category'] = categorize(r['service'])
        r['date_added'] = str(date.today())
        rows.append(r)

with open('/home/claude/strictly-business/recommendations_categorized.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=['name','service','category','contact','notes','date_added'])
    w.writeheader()
    w.writerows(rows)

cats = {}
for r in rows:
    cats[r['category']] = cats.get(r['category'], 0) + 1
for k,v in sorted(cats.items(), key=lambda x:-x[1]):
    print(f"  {v:4d}  {k}")
print(f"\nTotal: {len(rows)}")
