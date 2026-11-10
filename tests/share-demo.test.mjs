import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {localSharing} from '../scripts/localSharing.ts';

test('simulated upload, retries, distinct links and private downloads',async()=>{
  let handler;
  localSharing().configureServer({middlewares:{use:h=>{handler=h;}}});
  const server=createServer((req,res)=>handler(req,res,()=>{res.statusCode=404;res.end();}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const origin='http://127.0.0.1:'+server.address().port;
    const route=origin+'/ai-character-photo-booth/__share/';
    const png=Buffer.from('89504e470d0a1a0a'+'00'.repeat(24),'hex');
    const upload=(id,data)=>fetch(route+id,{method:'POST',headers:{'content-type':'image/png'},body:data});
    const first=randomUUID(),link=(await (await upload(first,png)).json()).url;
    assert.equal((await (await upload(first,png)).json()).url,link);
    assert.equal((await upload(first,Buffer.concat([png,Buffer.from('x')]))).status,409);
    const next=(await (await upload(randomUUID(),png)).json()).url;
    assert.notEqual(next,link);
    const response=await fetch(origin+link);
    assert.equal(response.headers.get('content-type'),'image/png');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),png);
    assert.equal((await fetch(origin+link.split('?')[0])).status,404);
    assert.equal((await upload(randomUUID(),Buffer.from('not a PNG'))).status,400);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
