const fs = require('fs');

const path = 'w:\\\\Works\\\\OS-Project\\\\System-Call-Visualizer-Analyzer\\\\renderer\\\\dashboard.html';
let content = fs.readFileSync(path, 'utf8');

// Replace chart area to have ID and remove SVG paths
content = content.replace(
  /<div\s+class="relative flex-1 min-h-\[220px\] w-full border-b border-l border-white\/\[0\.05\] pb-2 pl-2"([\s\S]*?)<\/svg>/,
  `<div class="relative flex-1 min-h-[220px] w-full border-b border-l border-white/[0.05] pb-2 pl-2" id="chartSvgArea">$1</svg>`
).replace(/<path\s+class="chart-path"[\s\S]*?\/>/g, '');


// Replace alerts list to have ID and remove static alerts
content = content.replace(
  /<div class="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">([\s\S]*?)<button/,
  `<div class="flex-1 flex flex-col gap-3 overflow-y-auto pr-2" id="alertsList"></div>
              <button`
);

fs.writeFileSync(path, content);
console.log('Static data removed from dashboard.html');
