const regions = ['primary'];
const btn_test_all = document.getElementById('test_all');
btn_test_all.addEventListener('click', async () => {
  btn_test_all.classList.add('pure-button-disabled');
  for (const region of regions) {
    const btn = document.getElementById('test_' + region);
    if (btn) {
      btn.classList.add('pure-button-disabled');
      try{
        await testRegionAsync(region);
      } finally{
        btn.classList.remove('pure-button-disabled');
      }
    }
  }
  btn_test_all.classList.remove('pure-button-disabled');
})

for (const region of regions) {
  const btn = document.getElementById('test_' + region);
  btn.addEventListener('click', async () => {
    btn.classList.add('pure-button-disabled');
    try{
      await testRegionAsync(region);
    } finally{
      if (btn) btn.classList.remove('pure-button-disabled');
    }
  })
}

async function testRegionAsync(region) {
  const rtt_el = document.getElementById('rtt_' + region);
  const dl_el = document.getElementById('dl_' + region);
  const ul_el = document.getElementById('ul_' + region);

  if (rtt_el) rtt_el.innerText = '';
  if (dl_el) dl_el.innerText = '';
  if (ul_el) ul_el.innerText = '';

  const rtt = await testRtt(region);
  if (rtt_el) rtt_el.innerText = rtt + 'ms';

  const dl = await testDownload(region);

  let dl_speed_h = dl.speed.toString();
  if (dl.speed > 1000) dl_speed_h = `${dl.speed / 1000}K`;
  if (dl.speed > 1000000) dl_speed_h = `${Math.round(dl.speed / 1000) / 1000}M`;
  if (dl.speed > 1000000000) dl_speed_h = `${Math.round(dl.speed / 1000000) / 1000}G`;

  if (dl_el) dl_el.innerText = `${dl_speed_h}bps (${dl.time / 1000}s)`;

  const ul = await testUpload(region);

  let ul_speed_h = (ul.speed, '');
  if (ul.speed > 1000) ul_speed_h = `${ul.speed / 1000}K`;
  if (ul.speed > 1000000) ul_speed_h = `${Math.round(ul.speed / 1000) / 1000}M`;
  if (ul.speed > 1000000000) ul_speed_h = `${Math.round(ul.speed / 1000000) / 1000}G`;

  if (ul_el) ul_el.innerText = `${ul_speed_h}bps (${ul.time / 1000}s)`;
}

async function testRtt(region) {
  const start_ts = Date.now();
  const rsp = await fetch('/empty');
  const end_ts = Date.now();
  const rsp_time = Number.parseInt(rsp.headers.get('x-response-time')) || 0;
  return end_ts - start_ts - rsp_time
}

async function testDownload(region, length) {
  const start_ts = Date.now();
  const rsp = await fetch('/bandwidth?length=' + (Number.parseInt(length) || 100000));
  const rsp_blob = await rsp.blob();
  const end_ts = Date.now();
  const rsp_time = Number.parseInt(rsp.headers.get('x-response-time')) || 0;
  const time = end_ts - start_ts - rsp_time;
  const speed = Math.round(rsp_blob.size / (time / 1000));
  return {
    blobsize: rsp_blob.size,
    time: time,
    rsp_time: rsp_time,
    speed: speed
  }
}

async function testUpload(region, length) {
  const size = Number.parseInt(length) || 100000;
  const start_ts = Date.now();
  const rsp = await fetch('/bandwidth', {
    method: 'POST',
    body: ''.padEnd(size, start_ts.toString()),
    headers: {
      "Accept-Encoding": ""
    }
  })
  await rsp.blob();
  const end_ts = Date.now();
  const rsp_time = Number.parseInt(rsp.headers.get('x-response-time')) || 0;
  const time = end_ts - start_ts;
  const speed = Math.round(size / (time / 1000));
  return {
    blobsize: size,
    time: time,
    rsp_time: rsp_time,
    speed: speed
  }
}

document.getElementById('darkModeSwitcher').checked = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
