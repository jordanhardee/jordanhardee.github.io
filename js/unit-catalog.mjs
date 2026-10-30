// Science-oriented unit catalog for self-hosted Math.js. Each category is
// dimensionally compatible; do not mix quantities based on identical symbols.
const entry = (code, label) => [code, label];
export const UNIT_GROUPS = {
  'Space & Time': {
    'Length & distance': [entry('pm','Picometers'),entry('nm','Nanometers'),entry('um','Micrometers'),entry('mm','Millimeters'),entry('cm','Centimeters'),entry('m','Meters'),entry('km','Kilometers'),entry('in','Inches'),entry('ft','Feet'),entry('yd','Yards'),entry('mi','Miles'),entry('angstrom','Ångströms')],
    'Area': [entry('mm2','Square millimeters'),entry('cm2','Square centimeters'),entry('m2','Square meters'),entry('km2','Square kilometers'),entry('sqin','Square inches'),entry('sqft','Square feet'),entry('sqyd','Square yards'),entry('sqmi','Square miles'),entry('acre','Acres'),entry('hectare','Hectares')],
    'Volume': [entry('ul','Microliters'),entry('ml','Milliliters'),entry('l','Liters'),entry('m3','Cubic meters'),entry('cm3','Cubic centimeters'),entry('cuin','Cubic inches'),entry('cuft','Cubic feet'),entry('teaspoon','Teaspoons'),entry('tablespoon','Tablespoons'),entry('floz','Fluid ounces (US)'),entry('cup','Cups'),entry('pint','Pints'),entry('quart','Quarts'),entry('gallon','Gallons')],
    'Time': [entry('ns','Nanoseconds'),entry('us','Microseconds'),entry('ms','Milliseconds'),entry('s','Seconds'),entry('min','Minutes'),entry('hour','Hours'),entry('day','Days'),entry('week','Weeks'),entry('month','Months (mean)'),entry('year','Years (mean)'),entry('decade','Decades'),entry('century','Centuries')],
    'Angle': [entry('rad','Radians'),entry('deg','Degrees'),entry('grad','Gradians'),entry('arcmin','Arcminutes'),entry('arcsec','Arcseconds'),entry('cycle','Cycles')],
    'Frequency': [entry('Hz','Hertz'),entry('kHz','Kilohertz'),entry('MHz','Megahertz'),entry('GHz','Gigahertz'),entry('THz','Terahertz'),entry('1/min','Per minute'),entry('1/hour','Per hour')],
    'Angular speed': [entry('rad/s','Radians per second'),entry('deg/s','Degrees per second'),entry('cycle/min','Revolutions per minute'),entry('cycle/s','Revolutions per second')],
  },
  'Mechanics & Fluids': {
    'Mass': [entry('ug','Micrograms'),entry('mg','Milligrams'),entry('g','Grams'),entry('kg','Kilograms'),entry('ton','Metric tonnes'),entry('grain','Grains'),entry('oz','Ounces'),entry('lbm','Pounds'),entry('stone','Stone')],
    'Speed': [entry('mm/s','Millimeters per second'),entry('m/s','Meters per second'),entry('km/hour','Kilometers per hour'),entry('mi/hour','Miles per hour'),entry('ft/s','Feet per second'),entry('mi/s','Miles per second')],
    'Acceleration': [entry('m/s^2','Meters per second squared'),entry('cm/s^2','Centimeters per second squared'),entry('ft/s^2','Feet per second squared'),entry('standardGravity','Standard gravity (g₀)')],
    'Jerk': [entry('m/s^3','Meters per second cubed'),entry('cm/s^3','Centimeters per second cubed'),entry('ft/s^3','Feet per second cubed')],
    'Force': [entry('uN','Micronewtons'),entry('mN','Millinewtons'),entry('N','Newtons'),entry('kN','Kilonewtons'),entry('dyn','Dynes'),entry('lbf','Pound-force'),entry('kgf','Kilogram-force')],
    'Pressure & stress': [entry('Pa','Pascals'),entry('kPa','Kilopascals'),entry('MPa','Megapascals'),entry('bar','Bar'),entry('mbar','Millibar'),entry('psi','PSI'),entry('atm','Atmospheres'),entry('torr','Torr'),entry('mmHg','Millimeters of mercury')],
    'Density': [entry('kg/m^3','Kilograms per cubic meter'),entry('g/cm^3','Grams per cubic centimeter'),entry('g/L','Grams per liter'),entry('lbm/ft^3','Pounds per cubic foot')],
    'Momentum & impulse': [entry('kg*m/s','Kilogram meters per second'),entry('N*s','Newton-seconds'),entry('g*cm/s','Gram centimeters per second'),entry('lbm*ft/s','Pound-feet per second')],
    'Torque': [entry('N*m','Newton-meters'),entry('kN*m','Kilonewton-meters'),entry('lbf*ft','Pound-force feet'),entry('lbf*in','Pound-force inches'),entry('kgf*m','Kilogram-force meters')],
    'Volumetric flow': [entry('m^3/s','Cubic meters per second'),entry('L/s','Liters per second'),entry('L/min','Liters per minute'),entry('m^3/hour','Cubic meters per hour'),entry('gallon/min','Gallons per minute'),entry('cuft/min','Cubic feet per minute')],
    'Mass flow': [entry('kg/s','Kilograms per second'),entry('g/s','Grams per second'),entry('kg/hour','Kilograms per hour'),entry('lbm/min','Pounds per minute')],
    'Dynamic viscosity': [entry('Pa*s','Pascal-seconds'),entry('mPa*s','Millipascal-seconds'),entry('poiseCustom','Poise'),entry('centipoiseCustom','Centipoise')],
    'Kinematic viscosity': [entry('m^2/s','Square meters per second'),entry('cm^2/s','Square centimeters per second'),entry('mm^2/s','Square millimeters per second'),entry('stokesCustom','Stokes')],
    'Surface tension': [entry('N/m','Newtons per meter'),entry('mN/m','Millinewtons per meter'),entry('dyn/cm','Dynes per centimeter')],
  },
  'Thermodynamics': {
    'Temperature (absolute)': [entry('degC','Celsius'),entry('degF','Fahrenheit'),entry('K','Kelvin'),entry('degR','Rankine')],
    'Energy & work': [entry('mJ','Millijoules'),entry('J','Joules'),entry('kJ','Kilojoules'),entry('MJ','Megajoules'),entry('Wh','Watt-hours'),entry('kWh','Kilowatt-hours'),entry('BTU','British thermal units'),entry('eV','Electronvolts')],
    'Power': [entry('mW','Milliwatts'),entry('W','Watts'),entry('kW','Kilowatts'),entry('MW','Megawatts'),entry('hp','Horsepower'),entry('BTU/hour','BTU per hour')],
    'Specific heat capacity': [entry('J/(kg*K)','Joules per kg-kelvin'),entry('kJ/(kg*K)','Kilojoules per kg-kelvin'),entry('J/(g*K)','Joules per gram-kelvin'),entry('BTU/(lbm*degR)','BTU per lb-°R')],
    'Heat capacity / entropy': [entry('J/K','Joules per kelvin'),entry('kJ/K','Kilojoules per kelvin'),entry('BTU/degR','BTU per rankine')],
    'Thermal conductivity': [entry('W/(m*K)','Watts per meter-kelvin'),entry('mW/(m*K)','Milliwatts per meter-kelvin'),entry('BTU/(hour*ft*degR)','BTU per hour-foot-°R')],
    'Heat flux / irradiance': [entry('W/m^2','Watts per square meter'),entry('kW/m^2','Kilowatts per square meter'),entry('mW/cm^2','Milliwatts per square centimeter'),entry('BTU/(hour*ft^2)','BTU per hour-square foot')],
    'Heat transfer coefficient': [entry('W/(m^2*K)','Watts per square meter-kelvin'),entry('kW/(m^2*K)','Kilowatts per square meter-kelvin'),entry('BTU/(hour*ft^2*degR)','BTU per hour-foot²-°R')],
  },
  'Electricity & Magnetism': {
    'Electric current': [entry('uA','Microamperes'),entry('mA','Milliamperes'),entry('A','Amperes'),entry('kA','Kiloamperes')],
    'Voltage': [entry('uV','Microvolts'),entry('mV','Millivolts'),entry('V','Volts'),entry('kV','Kilovolts'),entry('MV','Megavolts')],
    'Electric charge': [entry('nC','Nanocoulombs'),entry('uC','Microcoulombs'),entry('mC','Millicoulombs'),entry('C','Coulombs'),entry('Ah','Ampere-hours'),entry('mAh','Milliampere-hours')],
    'Electrical resistance': [entry('mohm','Milliohms'),entry('ohm','Ohms'),entry('kohm','Kiloohms'),entry('Mohm','Megaohms')],
    'Electrical conductance': [entry('uS','Microsiemens'),entry('mS','Millisiemens'),entry('S','Siemens')],
    'Capacitance': [entry('pF','Picofarads'),entry('nF','Nanofarads'),entry('uF','Microfarads'),entry('mF','Millifarads'),entry('F','Farads')],
    'Inductance': [entry('uH','Microhenries'),entry('mH','Millihenries'),entry('H','Henries')],
    'Magnetic flux': [entry('uWb','Microwebers'),entry('mWb','Milliwebers'),entry('Wb','Webers'),entry('V*s','Volt-seconds')],
    'Magnetic flux density': [entry('uT','Microteslas'),entry('mT','Milliteslas'),entry('T','Teslas'),entry('gaussMagnetic','Gauss')],
    'Electric field strength': [entry('V/m','Volts per meter'),entry('kV/m','Kilovolts per meter'),entry('N/C','Newtons per coulomb')],
    'Resistivity': [entry('ohm*m','Ohm-meters'),entry('ohm*cm','Ohm-centimeters'),entry('uohm*m','Microohm-meters')],
    'Conductivity': [entry('S/m','Siemens per meter'),entry('mS/cm','Millisiemens per centimeter'),entry('uS/cm','Microsiemens per centimeter')],
  },
  'Chemistry & Biology': {
    'Amount of substance': [entry('nmol','Nanomoles'),entry('umol','Micromoles'),entry('mmol','Millimoles'),entry('mol','Moles'),entry('kmol','Kilomoles')],
    'Molar concentration': [entry('mol/L','Moles per liter'),entry('mmol/L','Millimoles per liter'),entry('umol/L','Micromoles per liter'),entry('mol/m^3','Moles per cubic meter')],
    'Mass concentration': [entry('ug/L','Micrograms per liter'),entry('mg/L','Milligrams per liter'),entry('g/L','Grams per liter'),entry('kg/m^3','Kilograms per cubic meter')],
    'Molar mass': [entry('g/mol','Grams per mole'),entry('kg/mol','Kilograms per mole'),entry('mg/mmol','Milligrams per millimole')],
    'Molar energy': [entry('J/mol','Joules per mole'),entry('kJ/mol','Kilojoules per mole'),entry('MJ/mol','Megajoules per mole')],
    'Reaction rate': [entry('mol/s','Moles per second'),entry('mmol/s','Millimoles per second'),entry('umol/min','Micromoles per minute')],
    'Wavelength': [entry('pm','Picometers'),entry('angstrom','Ångströms'),entry('nm','Nanometers'),entry('um','Micrometers'),entry('mm','Millimeters'),entry('m','Meters')],
    'Radioactivity': [entry('becquerel','Becquerels (Bq)'),entry('kilobecquerel','Kilobecquerels (kBq)'),entry('curieCustom','Curies (Ci)'),entry('millicurieCustom','Millicuries (mCi)')],
    'Absorbed dose': [entry('grayDose','Gray (Gy)'),entry('milligrayDose','Milligray (mGy)'),entry('radDose','Rad (radiation dose)')],
    'Luminous intensity': [entry('mcd','Millicandelas'),entry('cd','Candelas'),entry('kcd','Kilocandelas')],
  },
  'Astronomy & Computing': {
    'Astronomical distance': [entry('km','Kilometers'),entry('mi','Miles'),entry('astronomicalUnit','Astronomical units (AU)'),entry('lightYear','Light-years'),entry('parsecCustom','Parsecs'),entry('kiloparsecCustom','Kiloparsecs')],
    'Astronomical mass': [entry('kg','Kilograms'),entry('ton','Metric tonnes'),entry('earthMass','Earth masses'),entry('solarMass','Solar masses')],
    'Astronomical radius': [entry('km','Kilometers'),entry('earthRadius','Earth radii'),entry('solarRadius','Solar radii')],
    'Orbital / space speed': [entry('m/s','Meters per second'),entry('km/s','Kilometers per second'),entry('mi/s','Miles per second'),entry('speedOfLightCustom','Speed of light (c)')],
    'Digital storage': [entry('bit','Bits'),entry('byte','Bytes'),entry('kB','Kilobytes'),entry('MB','Megabytes'),entry('GB','Gigabytes'),entry('TB','Terabytes'),entry('PB','Petabytes'),entry('KiB','Kibibytes'),entry('MiB','Mebibytes'),entry('GiB','Gibibytes'),entry('TiB','Tebibytes')],
    'Data transfer rate': [entry('bit/s','Bits per second'),entry('kb/s','Kilobits per second'),entry('Mb/s','Megabits per second'),entry('Gb/s','Gigabits per second'),entry('byte/s','Bytes per second'),entry('kB/s','Kilobytes per second'),entry('MB/s','Megabytes per second'),entry('MiB/s','Mebibytes per second')],
  },
};

export const EXTRA_UNITS = {
  standardGravity: '9.80665 m/s^2',
  poiseCustom: '0.1 Pa*s', centipoiseCustom: '0.001 Pa*s', stokesCustom: '0.0001 m^2/s',
  gaussMagnetic: '0.0001 T',
  becquerel: '1 / s', kilobecquerel: '1000 / s',
  curieCustom: '3.7e10 / s', millicurieCustom: '3.7e7 / s',
  grayDose: '1 J/kg', milligrayDose: '0.001 J/kg', radDose: '0.01 J/kg',
  astronomicalUnit: '149597870700 m', lightYear: '9.4607304725808e15 m',
  parsecCustom: '3.0856775814913673e16 m', kiloparsecCustom: '3.0856775814913673e19 m',
  earthMass: '5.9722e24 kg', solarMass: '1.98847e30 kg',
  earthRadius: '6371000 m', solarRadius: '695700000 m',
  speedOfLightCustom: '299792458 m/s',
};

export function registerExtraUnits(math) {
  for (const [name, definition] of Object.entries(EXTRA_UNITS)) {
    if (!math.Unit.UNITS[name]) math.createUnit(name, definition);
  }
}

export const categories = Object.fromEntries(Object.values(UNIT_GROUPS).flatMap(group => Object.entries(group)));
