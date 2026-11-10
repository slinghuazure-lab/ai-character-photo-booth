import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exposureGamma,foregroundAlpha,referenceWeight,calibratedWeight} from '../src/matte.ts';
test('background confidence maps to a feathered foreground edge',()=>{
  assert.equal(foregroundAlpha(0.85),0);
  assert.equal(foregroundAlpha(0.15),255);
  assert.ok(Math.abs(foregroundAlpha(0.5)-128)<=1);
});
test('only strong backlighting lifts a dark face, with a bounded correction',()=>{
  assert.equal(exposureGamma(120,215),1);
  assert.equal(exposureGamma(40,55),1);
  assert.ok(Math.abs(exposureGamma(30,200)-0.58)<1e-8);
});

test('stationary background is suppressed and changed pixels retained',()=>{
  assert.equal(referenceWeight(7),0);
  assert.equal(referenceWeight(30),1);
  assert.ok(referenceWeight(18)>0 && referenceWeight(18)<1);
});

test('matching plate colours preserve skin and moving fabric while suppressing stationary furniture',()=>{
  assert.equal(calibratedWeight(2,0.91,0,0),1);
  assert.equal(calibratedWeight(2,0.02,0.93,35),1);
  assert.equal(calibratedWeight(2,0.02,0.93,2),0);
  assert.equal(calibratedWeight(2,0.02,0.08,35),0);
});