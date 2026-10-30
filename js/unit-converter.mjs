import { loadMath } from './math-loader.mjs';

// Explicit pairs avoid mixing unlike measurements (a common conversion-tool mistake).
const categories = {
  Length: [['mm', 'Millimeters'], ['cm', 'Centimeters'], ['m', 'Meters'], ['km', 'Kilometers'], ['in', 'Inches'], ['ft', 'Feet'], ['yd', 'Yards'], ['mi', 'Miles']],
  Mass: [['mg', 'Milligrams'], ['g', 'Grams'], ['kg', 'Kilograms'], ['oz', 'Ounces'], ['lb', 'Pounds'], ['ton', 'Metric tons']],
  Temperature: [['degC', 'Celsius'], ['degF', 'Fahrenheit'], ['K', 'Kelvin']],
  Area: [['mm2', 'Square millimeters'], ['cm2', 'Square centimeters'], ['m2', 'Square meters'], ['km2', 'Square kilometers'], ['sqin', 'Square inches'], ['sqft', 'Square feet'], ['acre', 'Acres'], ['hectare', 'Hectares']],
  Volume: [['ml', 'Milliliters'], ['l', 'Liters'], ['m3', 'Cubic meters'], ['floz', 'Fluid ounces (US)'], ['cup', 'Cups (US)'], ['pint', 'Pints (US)'], ['quart', 'Quarts (US)'], ['gallon', 'Gallons (US)']],
  Speed: [['m/s', 'Meters per second'], ['km/h', 'Kilometers per hour'], ['mi/hour', 'Miles per hour'], ['ft/s', 'Feet per second']],
  Time: [['ms', 'Milliseconds'], ['s', 'Seconds'], ['min', 'Minutes'], ['hour', 'Hours'], ['day', 'Days'], ['week', 'Weeks']],
  Energy: [['J', 'Joules'], ['kJ', 'Kilojoules'], ['BTU', 'British thermal units'], ['Wh', 'Watt-hours'], ['kWh', 'Kilowatt-hours']],
  Power: [['W', 'Watts'], ['kW', 'Kilowatts'], ['hp', 'Horsepower']],
  Pressure: [['Pa', 'Pascals'], ['kPa', 'Kilopascals'], ['bar', 'Bar'], ['psi', 'PSI'], ['atm', 'Atmospheres']],
  Data: [['bit', 'Bits'], ['byte', 'Bytes'], ['kB', 'Kilobytes'], ['MB', 'Megabytes'], ['GB', 'Gigabytes'], ['KiB', 'Kibibytes'], ['MiB', 'Mebibytes'], ['GiB', 'Gibibytes']],
  Angle: [['deg', 'Degrees'], ['rad', 'Radians'], ['grad', 'Gradians']],
};

const category = document.getElementById('unit-category');
const input = document.getElementById('unit-value');
const from = document.getElementById('unit-from');
const to = document.getElementById('unit-to');
const swap = document.getElementById('unit-swap');
const output = document.getElementById('unit-result');

if (category && input && from && to && swap && output) {
  let math = null;
  const addOptions = (select, units) => select.replaceChildren(...units.map(([unit, label]) => new Option(`${label} (${unit})`, unit)));
  function update() {
    if (!math) return;
    if (input.value.trim() === '') { output.textContent = 'Enter a number to convert.'; return; }
    try {
      const result = math.unit(Number(input.value), from.value).toNumber(to.value);
      if (!Number.isFinite(result)) throw new Error('Result is outside the supported range');
      output.textContent = `${new Intl.NumberFormat(undefined, {maximumSignificantDigits: 12}).format(result)} ${to.selectedOptions[0]?.textContent || to.value}`;
    } catch (error) { output.textContent = `Conversion unavailable: ${error.message}`; }
  }
  function updateCategory() {
    const units = categories[category.value];
    addOptions(from, units);
    addOptions(to, units);
    to.selectedIndex = 1;
    update();
  }
  category.replaceChildren(...Object.keys(categories).map(name => new Option(name, name)));
  category.addEventListener('change', updateCategory);
  for (const control of [input, from, to]) control.addEventListener('input', update);
  swap.addEventListener('click', () => { const old = from.value; from.value = to.value; to.value = old; update(); });
  updateCategory();
  loadMath().then(value => { math = value; update(); }).catch(error => { output.textContent = error.message; });
}
