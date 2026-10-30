import { loadMath } from './math-loader.mjs';
import { UNIT_GROUPS, categories, registerExtraUnits } from './unit-catalog.mjs';

const category = document.getElementById('unit-category');
const filter = document.getElementById('unit-search');
const input = document.getElementById('unit-value');
const from = document.getElementById('unit-from');
const to = document.getElementById('unit-to');
const swap = document.getElementById('unit-swap');
const output = document.getElementById('unit-result');
const summary = document.getElementById('unit-summary');

if (category && filter && input && from && to && swap && output && summary) {
  let math = null;
  const options = (select, units) => select.replaceChildren(...units.map(([code,label]) => new Option(`${label} (${code})`, code)));
  const format = value => {
    if (value !== 0 && (Math.abs(value) >= 1e12 || Math.abs(value) < 1e-8)) return value.toExponential(10);
    return new Intl.NumberFormat(undefined, { maximumSignificantDigits: 12 }).format(value);
  };
  function calculate() {
    if (!math) return;
    if (input.value.trim() === '') { output.textContent = 'Enter a number to convert.'; return; }
    try {
      const numeric = Number(input.value);
      if (!Number.isFinite(numeric)) throw Error('Enter a finite number');
      const converted = math.unit(numeric, from.value).toNumber(to.value);
      if (!Number.isFinite(converted)) throw Error('Result is out of range');
      output.textContent = `${format(converted)} ${to.selectedOptions[0]?.textContent || to.value}`;
    } catch (error) { output.textContent = `Conversion unavailable: ${error.message}`; }
  }
  function updateCategory() {
    const units = categories[category.value];
    if (!units) return;
    options(from, units);
    options(to, units);
    to.selectedIndex = Math.min(1, units.length - 1);
    calculate();
  }
  function updateFilter() {
    const query = filter.value.trim().toLowerCase();
    const previous = category.value;
    const groups = [];
    let visibleCategories = 0;
    for (const [groupName, group] of Object.entries(UNIT_GROUPS)) {
      const options = [];
      for (const [name, units] of Object.entries(group)) {
        const haystack = `${groupName} ${name} ${units.map(item => item.join(' ')).join(' ')}`.toLowerCase();
        if (!haystack.includes(query)) continue;
        options.push(new Option(`${name} (${units.length})`, name));
        visibleCategories++;
      }
      if (options.length) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = groupName;
        optgroup.append(...options);
        groups.push(optgroup);
      }
    }
    category.replaceChildren(...groups);
    if (categories[previous] && Array.from(category.options).some(option => option.value === previous)) category.value = previous;
    summary.textContent = `${visibleCategories} disciplines · ${Object.values(categories).reduce((count,units) => count + units.length,0)} unit choices across science, engineering, astronomy, and computing`;
    if (!category.options.length) { output.textContent = 'No matching field. Try another search.'; from.replaceChildren(); to.replaceChildren(); return; }
    updateCategory();
  }
  category.addEventListener('change', updateCategory);
  filter.addEventListener('input', updateFilter);
  for (const control of [input, from, to]) control.addEventListener('input', calculate);
  swap.addEventListener('click', () => { const old = from.value; from.value = to.value; to.value = old; calculate(); });
  updateFilter();
  loadMath().then(value => { math = value; registerExtraUnits(math); calculate(); }).catch(error => { output.textContent = error.message; });
}
