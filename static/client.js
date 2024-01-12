const styles = {
  '1': 'bold',
  '2': 'faint',
  '3': 'italics',
  '4': 'underline',
  '5': 'blink',
  '30': 'black',
  '31': 'red',
  '32': 'green',
  '33': 'yellow',
  '34': 'blue',
  '35': 'magenta',
  '36': 'cyan',
  '37': 'white',
};

function printTextEl(element, text) {
  let el = element;
  if (text.length > 0) {
    const char = text.charAt(0);

    // deno-lint-ignore no-control-regex
    const escapeRegex = /^\x1b\[([\d;]*)m/;
    const match = text.match(escapeRegex);

    if (match) {
      const code = match[1];
      if (code === '0') {
        el = element.parentElement;
      } else {
        const e = document.createElement('span');
        for (const s of getStylesFromCode(code)) {
          e.classList.add(s);
        }
        element.appendChild(e);
        el = e
      }
      printTextEl(el, text.substr(match[0].length))
      // setTimeout(() => printTextEl(el, text.substr(match[0].length)), 0);
    } else {
      element.innerHTML += (char === '\n') ? '<br>' : char;
      // printTextEl(el, text.substr(1))
      setTimeout(() => printTextEl(el, text.substr(1)), 0);
    }
  }
}

function getStylesFromCode(code) {
  const result = [];
  for (const c of code.split(';')) {
    if (styles[c]) result.push(styles[c]);
  }

  return result;
}

function toggleShareBlock() {
  const share_block = document.getElementById('share_block');
  if (share_block) {
    if (share_block.style.display === 'none') {
      share_block.style.display = 'block';
    } else {
      share_block.style.display = 'none';
    }
  }
}

function shareAccepted(accepted = false) {
  const do_share_block = document.getElementById('do_share');
  do_share_block.style.display = accepted ? 'block' : 'none'
}

function doShare() {
  const do_share_block = document.getElementById('do_share');
  const share_data_block = document.getElementById('share_data');
  const share_url_el = document.getElementById('share_url');
  const share_password_el = document.getElementById('share_password');
  const share_accepted_el = document.getElementById('share_accepted');
  if (share_accepted_el) share_accepted_el.disabled = true;


  // const data = {};
  // fetch('/share', { body: JSON.stringify(data), method: 'POST' }).then(
  //   (rsp) => {
  //     if (do_share_block) do_share_block.style.display = 'block';
  //     rsp.json().then((data) => {
  //       if (share_data_block) {
  //         share_url_el.innerText = data.url;
  //         share_password_el.innerText = data.password;
  //         share_data_block.style.display = 'block';
  //       }
  //     })
  //   })

  const data = {
    url: 'https://ipsaur.url/shared/hash',
    password: 'P@$$w0rd'
  };
  if (do_share_block) do_share_block.style.display = 'none';

  if (share_data_block) {
    share_url_el.innerText = data.url;
    share_password_el.innerText = data.password;
    share_data_block.style.display = 'block';
  }
}

async function testBandwidth(region = 'primary') {
  const rtt_el = document.getElementById('rtt_' + region);
  const dl_el = document.getElementById('dl_' + region);
  const ul_el = document.getElementById('ul_' + region);

  if (rtt_el) rtt_el.innerText = 'Testing';
  if (dl_el) dl_el.innerText = 'Testing';
  if (ul_el) ul_el.innerText = 'Testing';

  const rtt = await testRtt(region);
  if (rtt_el) rtt_el.innerText = rtt + 'ms';

  let bw_test_size = 1000000;
  if (rtt > 10) bw_test_size = 500000;
  if (rtt > 100) bw_test_size = 300000;
  if (rtt > 1000) bw_test_size = 200000;
  if (rtt > 2000) bw_test_size = 100000;
  // if (rtt > 1500) bw_test_size = 80000;
  // if (rtt > 2000) bw_test_size = 50000;
  // if (rtt > 3000) bw_test_size = 30000;
  // if (rtt > 5000) bw_test_size = 10000;

  const dl = await testDownload(region, bw_test_size);

  let dl_speed_h = dl.speed.toString();
  if (dl.speed > 1000) dl_speed_h = `${dl.speed / 1000}K`;
  if (dl.speed > 1000000) dl_speed_h = `${Math.round(dl.speed / 1000) / 1000}M`;
  if (dl.speed > 1000000000) dl_speed_h = `${Math.round(dl.speed / 1000000) / 1000}G`;

  if (dl_el) dl_el.innerText = `${dl_speed_h}bps (${dl.time / 1000}s)`;

  const ul = await testUpload(region, bw_test_size);

  let ul_speed_h = (ul.speed, '');
  if (ul.speed > 1000) ul_speed_h = `${ul.speed / 1000}K`;
  if (ul.speed > 1000000) ul_speed_h = `${Math.round(ul.speed / 1000) / 1000}M`;
  if (ul.speed > 1000000000) ul_speed_h = `${Math.round(ul.speed / 1000000) / 1000}G`;

  if (ul_el) ul_el.innerText = `${ul_speed_h}bps (${ul.rsp_time / 1000}s)`;
  return {
    rtt: rtt,
    dl: dl,
    ul: ul
  }
}

async function testRtt(region) {
  const start_ts = Date.now();
  const rsp = await fetch('/empty');
  const end_ts = Date.now();
  const rsp_time = Number.parseInt(rsp.headers.get('x-response-time')) || 0;
  return end_ts - start_ts - rsp_time
}

async function testDownload(region, length) {
  const size = Number.parseInt(length) || 1000000;

  const rsp = await fetch('/bandwidth?length=' + size);
  const start_ts = Date.now();
  const rsp_blob = await rsp.arrayBuffer();
  const end_ts = Date.now();
  const rsp_time = Number.parseInt(rsp.headers.get('x-response-time')) || 0;
  const rsp_length = rsp_blob.byteLength;
  const time = end_ts - start_ts - rsp_time;
  const speed = Math.round(rsp_length * 8 / (time / 1000));
  return {
    blobsize: rsp_length,
    time: time,
    rsp_time: rsp_time,
    speed: speed
  }
}

async function testUpload(region, length) {
  const size = Number.parseInt(length) || 1000000;

  const start_ts = Date.now();
  const rsp = await fetch('/bandwidth', {
    method: 'POST',
    body: ''.padEnd(size, start_ts.toString()),
    headers: {
      "Accept-Encoding": ""
    }
  })
  const end_ts = Date.now();
  const rsp_time = Number.parseInt(rsp.headers.get('x-response-time')) || 0;
  const time = end_ts - start_ts;
  const speed = Math.round(size * 8 / (rsp_time / 1000));
  return {
    blobsize: size,
    time: time,
    rsp_time: rsp_time,
    speed: speed
  }
}
