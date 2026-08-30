#!/bin/sh
prev=-1
for i in 1 2 3 4 5 6 7 8; do
  now=$(node -e "try{const d=JSON.parse(require('fs').readFileSync('seed-data.json','utf8'));console.log(d.filter(x=>x.cover&&x.enrichV===2).length)}catch(e){console.log(0)}")
  echo "=== pass $i starting, $now fully enriched ==="
  if [ "$now" = "$prev" ]; then echo "no progress; stopping"; break; fi
  prev=$now
  node tools/enrich.mjs >> tools/pass.log 2>&1
  sleep 15
done
node -e "const d=JSON.parse(require('fs').readFileSync('seed-data.json','utf8'));
console.log('FINAL',d.length,'items | covers',d.filter(x=>x.cover).length,'| cast',d.filter(x=>x.cast&&x.cast.length).length,'| score',d.filter(x=>x.score!=null).length)"
echo "ALLDONE"
