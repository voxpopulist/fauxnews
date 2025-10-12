// Search and index logic extracted from index.njk
export function tokenize(text) {
  if (!text) return [];
  const m = text.toLowerCase().match(/[a-z']+/g);
  if (!m) return [];
  return m.filter(w => w.length > 2);
}

export function deltaDecode(arr) {
  let prev = 0; const out = [];
  for (const d of arr) { prev += d; out.push(prev); }
  return out;
}

export function intersectSorted(a, b) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { out.push(a[i]); i++; j++; }
    else if (a[i] < b[j]) i++; else j++;
  }
  return out;
}

export function searchDocs(query, state) {
  const tokens = tokenize(query);
  if (tokens.length === 0) return state.docs.map(d => d.id);
  const lists = tokens.map(t => state.terms.get(t) || []);
  if (lists.some(l => l.length === 0)) return [];
  lists.sort((a,b) => a.length - b.length);
  return lists.slice(1).reduce((acc, cur) => intersectSorted(acc, cur), lists[0].slice());
}
