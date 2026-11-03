import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const patch = readFileSync(new URL('../.github/cyberchef-mobile.patch', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/static.yml', import.meta.url), 'utf8');

test('CyberChef Other > Entropy can be selected by desktop double-click and narrow-window tap', () => {
  // This is a source regression test; GitHub Actions also applies and builds
  // the patch against its pinned CyberChef upstream revision.
  assert.match(patch, /operationsPane\.addEventListener\(\"click\", e => \{/);
  assert.match(patch, /document\.addEventListener\(\"dblclick\", e => \{/);
  assert.match(patch, /e\.target\.closest\?\.\(\"#operations \.op-list li\.operation\"\)/);
  assert.match(patch, /e\.stopImmediatePropagation\(\)/);
  assert.match(patch, /app\.manager\.recipe\.addOperation\(operation\.textContent\.trim\(\)\)/);
  assert.match(patch, /if \(!media\.matches\) addSelectedOperation\(e\)/);
  assert.match(workflow, /git -C "\$CHEF_BUILD_DIR" apply --check/);
});
