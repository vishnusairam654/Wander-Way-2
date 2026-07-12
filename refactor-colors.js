const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src', 'components');
const appTsxPath = path.join(__dirname, 'src', 'App.tsx');

const replacements = [
  // Backgrounds
  { search: /bg-\[\#FAFAF7\]/g, replace: 'bg-bg-cream' },
  { search: /bg-slate-50\/50/g, replace: 'bg-bg-cream/50' },
  { search: /bg-slate-50/g, replace: 'bg-bg-cream' },
  
  // Texts
  { search: /text-slate-900/g, replace: 'text-text-ink' },
  { search: /text-slate-800/g, replace: 'text-text-ink' },
  { search: /text-slate-500/g, replace: 'text-text-muted' },
  { search: /text-slate-600/g, replace: 'text-text-muted' },
  { search: /text-slate-400/g, replace: 'text-text-muted/70' },

  // Borders
  { search: /border-slate-200/g, replace: 'border-border-subtle' },
  { search: /border-slate-100/g, replace: 'border-border-subtle/50' },
  { search: /border-slate-300/g, replace: 'border-border-subtle' },

  // Success (emerald -> status-success)
  { search: /text-emerald-500/g, replace: 'text-status-success' },
  { search: /text-emerald-600/g, replace: 'text-status-success' },
  { search: /bg-emerald-50/g, replace: 'bg-status-success/10' },
  { search: /bg-emerald-100/g, replace: 'bg-status-success/20' },
  { search: /bg-emerald-500/g, replace: 'bg-status-success' },
  { search: /border-emerald-400/g, replace: 'border-status-success' },
  { search: /border-emerald-500/g, replace: 'border-status-success' },

  // Warning (amber -> status-warning)
  { search: /text-amber-500/g, replace: 'text-status-warning' },
  { search: /text-amber-600/g, replace: 'text-status-warning' },
  { search: /bg-amber-50/g, replace: 'bg-status-warning/10' },
  { search: /bg-amber-100/g, replace: 'bg-status-warning/20' },
  { search: /bg-amber-500/g, replace: 'bg-status-warning' },
  { search: /border-amber-500/g, replace: 'border-status-warning' },
  { search: /border-amber-600/g, replace: 'border-status-warning' },

  // Danger (red/rose -> status-danger)
  { search: /text-red-500/g, replace: 'text-status-danger' },
  { search: /text-red-600/g, replace: 'text-status-danger' },
  { search: /bg-red-50/g, replace: 'bg-status-danger/10' },
  { search: /bg-red-500/g, replace: 'bg-status-danger' },
  { search: /border-red-500/g, replace: 'border-status-danger' },
  { search: /text-rose-500/g, replace: 'text-status-danger' },
  { search: /text-rose-600/g, replace: 'text-status-danger' },
  { search: /bg-rose-50/g, replace: 'bg-status-danger/10' },

  // Primary brand / Buttons (indigo -> brand-terracotta)
  { search: /text-indigo-600/g, replace: 'text-brand-terracotta' },
  { search: /text-indigo-700/g, replace: 'text-brand-terracotta-dark' },
  { search: /text-indigo-500/g, replace: 'text-brand-terracotta' },
  { search: /bg-indigo-600/g, replace: 'bg-brand-terracotta' },
  { search: /bg-indigo-500/g, replace: 'bg-brand-terracotta' },
  { search: /bg-indigo-50/g, replace: 'bg-brand-terracotta/10' },
  { search: /bg-indigo-100/g, replace: 'bg-brand-terracotta/20' },
  { search: /border-indigo-400/g, replace: 'border-brand-terracotta' },
  { search: /border-indigo-500/g, replace: 'border-brand-terracotta' },
  { search: /shadow-indigo-100/g, replace: 'shadow-brand-terracotta/20' },
  { search: /from-indigo-600 to-indigo-800/g, replace: 'from-brand-terracotta to-brand-terracotta-dark' },
  { search: /from-indigo-700 to-indigo-900/g, replace: 'from-brand-terracotta-dark to-[#A34A23]' },
  
  // Custom Gradients (Sidebar/Buttons)
  { search: /bg-gradient-to-r from-\[\#FF8A65\] to-\[\#FFB74D\]/g, replace: 'bg-brand-terracotta' },
  { search: /shadow-orange-100/g, replace: 'shadow-brand-terracotta/20' },
  
  // Logos / Maps (Brand Teal)
  { search: /bg-gradient-to-r from-\[\#3B7A57\] to-\[\#4FA8E0\] bg-clip-text text-transparent/g, replace: 'text-brand-teal' },
  { search: /text-yellow-400/g, replace: 'text-brand-amber' },
  { search: /bg-\[\#4FA8E0\]/g, replace: 'bg-brand-teal' },
  { search: /text-\[\#4FA8E0\]/g, replace: 'text-brand-teal' },
  { search: /border-\[\#4FA8E0\]/g, replace: 'border-brand-teal' },
  
  // Interactive hover states
  { search: /hover:bg-slate-50/g, replace: 'hover:bg-bg-cream' },
  { search: /hover:text-slate-800/g, replace: 'hover:text-text-ink' },
  { search: /hover:text-slate-900/g, replace: 'hover:text-text-ink' },
  { search: /hover:bg-red-50/g, replace: 'hover:bg-status-danger/10' },
  { search: /hover:text-red-500/g, replace: 'hover:text-status-danger' },
  
  // Specific UI fixes
  { search: /bg-slate-950/g, replace: 'bg-text-ink' },
  { search: /text-slate-100/g, replace: 'text-bg-cream' },
  { search: /border-slate-950/g, replace: 'border-text-ink' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  replacements.forEach(({ search, replace }) => {
    content = content.replace(search, replace);
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  });
}

walkDir(directoryPath);
if (fs.existsSync(appTsxPath)) {
  processFile(appTsxPath);
}

console.log('Refactoring complete.');
