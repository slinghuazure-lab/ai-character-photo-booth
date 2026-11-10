import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exposureGamma,foregroundAlpha} from '../src/matte.ts';
test('background confidence maps to a feathered foreground edge',()=>{
  assert.equal(foregroundAlpha(0.85),0);
  assert.equal(foregroundAlpha(0.15),255);
  assert.ok(Math.abs(foregroundAlpha(0.5)-128)<=1);
});
test('only strong backlighting lifts a dark face, with a bounded correction',()=>{
  assert.equal(exposureGamma(120,215),1);
  assert.equal(exposureGamma(40,55),1);
  assert.equal(exposureGamma(30,200),0.75);
});
