import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newPhotoRecord,isPhotoRecord} from '../src/photoRecord.ts';
test('each formal capture has its own id, timestamp, headcount and initial status',()=>{
 const first=newPhotoRecord(2,10000),next=newPhotoRecord(2,10000);
 assert.notEqual(first.id,next.id); assert.equal(first.shareStatus,'local');assert.equal(first.capturedAt,10000);
 assert.deepEqual(Object.keys(first).sort(),['capturedAt','id','people','shareStatus']);
 assert.ok(isPhotoRecord(first));
});
test('ignore invalid local records',()=>{
 const row=newPhotoRecord(1,100);
 for(const bad of [null,{...row,people:6},{...row,capturedAt:-1},{...row,id:'?'},{...row,shareStatus:'downloaded'}])assert.equal(isPhotoRecord(bad),false);
});
