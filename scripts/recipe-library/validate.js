const fs=require('fs');const files=process.argv.slice(2);
const CU=['American','Mexican','Asian','Mediterranean','Italian'];
const CAT=['Produce','Meat & Seafood','Dairy & Eggs','Pantry & Dry Goods','Frozen','Bakery','Beverages'];
const DI=['Vegetarian','Vegan','Gluten-free','Dairy-free','Keto','Halal'];
const MEAT=/\b(beef|chicken|pork|turkey|sausage|bacon|ham|lamb|shrimp|salmon|cod|tilapia|tuna|fish|chorizo|kielbasa|anchov|prosciutto|pepperoni)\b/i;
const GLU=/\b(pasta|spaghetti|penne|noodle|flour|bread|bun|roll|tortilla(?!.*corn)|soy sauce|panko|breadcrumb|pita|naan|lasagna|ziti|macaroni|linguine|orecchiette|rigatoni|tortellini|biscuit|crust|puff pastry|phyllo|couscous|barley|beer|cracker|dumpling|teriyaki sauce|hoisin|cornbread|stuffing)\b/i;
const DAIRY=/\b(milk|cheese|butter(?!nut)|cream|yogurt|parmesan|mozzarella|cheddar|ricotta|feta|sour cream|half-and-half|ghee)\b/i;
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const existing=new Set(fs.readFileSync(process.env.EXISTING||__dirname+'/existing.txt','utf8').split('\n').filter(Boolean).map(norm));
let all=[],errs=[],seen=new Set();
for(const f of files){for(const r of JSON.parse(fs.readFileSync(f,'utf8'))){
 const e=[];const n=norm(r.name||'');
 if(!r.name)e.push('name'); if(seen.has(n)||existing.has(n))e.push('DUP');seen.add(n);
 if(!CU.includes(r.cuisine))e.push('cuisine '+r.cuisine);
 for(const k of ['cook_time','prep_time','servings'])if(!Number.isInteger(r[k])||r[k]<=0)e.push(k);
 if(typeof r.estimated_cost!=='number'||r.estimated_cost<3||r.estimated_cost>80)e.push('cost '+r.estimated_cost);
 if(!Array.isArray(r.ingredients)||r.ingredients.length<4)e.push('ingredients');
 for(const i of r.ingredients||[]){if(!CAT.includes(i.category))e.push('cat '+i.category);if(typeof i.quantity!=='string'||!i.name||!i.unit||!i.searchTerm)e.push('ing '+JSON.stringify(i));}
 if(!Array.isArray(r.steps)||r.steps.length<3||r.steps.some(s=>typeof s!=='string'))e.push('steps');
 if(!Array.isArray(r.tags))e.push('tags'); if(!Array.isArray(r.dietary)||r.dietary.some(d=>!DI.includes(d)))e.push('dietary '+r.dietary);
 const ingText=(r.ingredients||[]).map(i=>i.name+' '+i.searchTerm).join(' | ');
 if((r.dietary||[]).some(d=>d==='Vegetarian'||d==='Vegan')&&MEAT.test(ingText))e.push('veg-but-meat');
 if((r.dietary||[]).includes('Gluten-free')&&GLU.test(ingText)&&!/gluten-free|tamari|corn tortilla|almond flour|coconut flour|spaghetti squash|cauliflower crust/i.test(ingText.match(GLU)?.input||''))e.push('GF? '+ingText.match(GLU)[0]);
 if((r.dietary||[]).some(d=>d==='Dairy-free'||d==='Vegan')&&DAIRY.test(ingText.replace(/peanut butter|coconut milk|coconut cream|almond milk|oat milk|non-dairy|dairy-free|vegan/gi,'')))e.push('DF? '+ingText.match(DAIRY)[0]);
 const tot=r.cook_time+r.prep_time;
 if(r.tags?.includes('quick')&&tot>30)e.push('quick but '+tot); if(r.tags?.includes('20-min')&&tot>20)e.push('20min but '+tot);
 if(r.nutrition&&(!Number.isFinite(r.nutrition.calories)))e.push('nutrition');
 if(/olive garden|big mac|allrecipes|chick-fil|panda express|mcdonald/i.test(JSON.stringify(r)))e.push('BRAND');
 if(e.length)errs.push(r.name+': '+e.join('; '));all.push(r);}}
console.log('total',all.length,'errors',errs.length);console.log(errs.join('\n'));
fs.writeFileSync(process.env.OUT||'/dev/null',JSON.stringify(all));
