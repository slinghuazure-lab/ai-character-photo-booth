import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ThumbShutter} from '../src/thumbShutter.ts';
const left={x:.2,y:.3},right={x:.8,y:.4};
test('one steady thumb fires at one second and holding it does not fire again',()=>{
 const s=new ThumbShutter();
 for(const t of [0,250,500,750,999])assert.equal(s.step([left],t),false);
 assert.equal(s.step([left],1000),true);
 assert.equal(s.step([left],1400),false);
 s.step([],1500);s.step([],2100);
 for(const t of [2200,2450,2700,2950])assert.equal(s.step([right],t),false);
 assert.equal(s.step([right],3200),true);
});
test('distant or interrupted hands cannot add their hold times together',()=>{
 const s=new ThumbShutter();s.step([left],0);s.step([left],400);s.step([right],800);
 assert.equal(s.step([right],1200),false);s.step([],1400);
 assert.equal(s.step([right],1500),false);assert.equal(s.step([right],2300),false);
});
