import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Chess } from '../js/vendor/chess.mjs';
import { chooseComputerMove, evaluateForBlack } from '../js/chess-game.mjs';

const require = createRequire(import.meta.url);
const math = require('../js/vendor/math.js');

test('self-hosted chess library handles legal opening moves, special rules and reset', () => {
  const board = new Chess();
  assert.equal(board.moves().length, 20);
  board.move('e4');
  assert.equal(board.turn(), 'b');
  assert.ok(board.moves().includes('e5'));
  board.undo();
  assert.equal(board.moves().length, 20);
  board.load('8/8/8/8/8/8/4k3/4K3 w - - 0 1');
  assert.equal(board.isCheckmate(), false);
});

test('computer move is legal, does not mutate the position during search', () => {
  const board = new Chess();
  assert.equal(chooseComputerMove(board), null);
  board.move('d4');
  const before = board.fen();
  const legal = board.moves();
  const move = chooseComputerMove(board, 2);
  assert.ok(move);
  assert.equal(board.fen(), before);
  assert.ok(legal.includes(move.san));
  board.move(move);
  assert.equal(board.turn(), 'w');
  assert.equal(typeof evaluateForBlack(board), 'number');
});

test('math vendor supports common conversions, offset temperature, scientific expressions', () => {
  assert.equal(math.unit(1, 'mi').toNumber('km'), 1.609344);
  assert.equal(math.unit(1, 'byte').toNumber('bit'), 8);
  assert.equal(math.unit(0, 'degC').toNumber('degF'), 32);
  assert.equal(math.unit(1, 'mi/hour').toNumber('km/h'), 1.609344);
  assert.equal(math.evaluate('2*(3+4)'), 14);
  assert.ok(Math.abs(math.evaluate('sin(pi/2)') - 1) < 1e-10);
  const f = math.compile('x^2+2*x+1');
  assert.equal(f.evaluate({x: 3}), 16);
});

test('conversion categories use valid Math.js unit names', () => {
  const categories = {
    Length: ['mm','cm','m','km','in','ft','yd','mi'],
    Mass: ['mg','g','kg','oz','lb','ton'],
    Temperature: ['degC','degF','K'],
    Area: ['mm2','cm2','m2','km2','sqin','sqft','acre','hectare'],
    Volume: ['ml','l','m3','floz','cup','pint','quart','gallon'],
    Speed: ['m/s','km/h','mi/hour','ft/s'],
    Time: ['ms','s','min','hour','day','week'],
    Energy: ['J','kJ','BTU','Wh','kWh'],
    Power: ['W','kW','hp'],
    Pressure: ['Pa','kPa','bar','psi','atm'],
    Data: ['bit','byte','kB','MB','GB','KiB','MiB','GiB'],
    Angle: ['deg','rad','grad'],
  };
  for (const [category, units] of Object.entries(categories)) {
    for (const unit of units) {
      const result = math.unit(1, unit).toNumber(units[0]);
      assert.ok(Number.isFinite(result), `${category}: ${unit}`);
    }
  }
});
