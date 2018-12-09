const macAccount = appRequire('plugins/macAccount/index');
const account = appRequire('plugins/account/index');
const flow = appRequire('plugins/flowSaver/flow');
const dns = require('dns');
const net = require('net');
const knex = appRequire('init/knex').knex;

const formatMacAddress = mac => mac.replace(/-/g, '').replace(/:/g, '').toLowerCase();

function unit1000To1024(size) {
  let num = 0;
  while(size > 1000){
    size /= 1000;
    num++;
  }
  while(num > 0){
    size *= 1024;
    num--;
  }
  return size;
}

exports.getMacAccount = (req, res) => {
  const userId = +req.query.userId;
  macAccount.getAccount(userId, -1).then(success => {
    res.send(success);
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.addMacAccount = (req, res) => {
  const mac = formatMacAddress(req.params.macAddress);
  const userId = req.body.userId;
  const accountId = req.body.accountId;
  const serverId = req.body.serverId;
  macAccount.newAccount(mac, userId, serverId, accountId).then(success => {
    res.send('success');
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.editMacAccount = (req, res) => {
  const id = req.body.id;
  const mac = formatMacAddress(req.body.macAddress);
  const userId = req.body.userId;
  const accountId = req.body.accountId;
  const serverId = req.body.serverId;
  macAccount.editAccount(id, mac, serverId, accountId).then(success => {
    res.send('success');
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.deleteMacAccount = (req, res) => {
  const accountId = +req.query.id;
  macAccount.deleteAccount(accountId).then(success => {
    res.send('success');
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.getMacAccountForUser = (req, res) => {
  const mac = req.params.macAddress;
  const ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
  const noPassword = !!(+req.query.noPassword);
  const noFlow = !!(+req.query.noFlow);
  macAccount.getAccountForUser(mac.toLowerCase(), ip, {
    noPassword,
    noFlow,
  }).then(success => {
    res.send(success);
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.getNoticeForUser = (req, res) => {
  const mac = req.params.macAddress;
  const ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
  macAccount
  .getNoticeForUser(mac.toLowerCase(), ip)
  .then(success => {
    res.send(success);
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.banAccount = (req, res) => {
  const serverId = +req.params.serverId;
  const accountId = +req.params.accountId;
  const time = +req.body.time;
  account.banAccount({
    serverId,
    accountId,
    time,
  }).then(success => {
    res.send('success');
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

exports.getBanAccount = (req, res) => {
  const serverId = +req.params.serverId;
  const accountId = +req.params.accountId;
  account.getBanAccount({
    serverId,
    accountId,
  }).then(success => {
    res.send(success);
  }).catch(err => {
    console.log(err);
    res.status(403).end();
  });
};

const isMacAddress = str => {
  return str.match(/^([A-Fa-f0-9]{2}[:-]?){5}[A-Fa-f0-9]{2}$/);
};

const getAddress = (address, ip) => {
  let myAddress = address;
  if(address.indexOf(':') >= 0) {
    const hosts = address.split(':');
    const number = Math.ceil(Math.random() * (hosts.length - 1));
    myAddress = hosts[number];
  }
  if(!ip) {
    return Promise.resolve(myAddress);
  }
  if(net.isIP(myAddress)) {
    return Promise.resolve(myAddress);
  }
  return new Promise((resolve, reject) => {
    dns.lookup(myAddress, (err, myAddress, family) => {
      if(err) {
        return reject(err);
      }
      return resolve(myAddress);
    });
  });
};

const urlsafeBase64 = str => {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

exports.getSubscribeAccountForUser = async (req, res) => {
  try {
    const type = req.query.type;
    const resolveIp = req.query.ip;
    const token = req.params.token;
    const ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
    if(isMacAddress(token)) {
      await macAccount.getAccountForUser(token.toLowerCase(), ip, {
        noPassword: 0,
        noFlow: 1,
      }).then(success => {
        const result = success.servers.map(server => {
          return 'ss://' + Buffer.from(server.method + ':' + success.default.password + '@' + server.address + ':' + server.port).toString('base64') + '#' + server.name;
        }).join('\r\n');
        return res.send(Buffer.from(result).toString('base64'));
      });
    } else {
      const isSubscribeOn = await knex('webguiSetting').where({
        key: 'account'
      }).then(s => s[0]).then(s => JSON.parse(s.value).subscribe);
      if(!isSubscribeOn) { return res.status(404).end(); }
      const subscribeAccount = await account.getAccountForSubscribe(token, ip);
      for(const s of subscribeAccount.server) {
        s.host = await getAddress(s.host, +resolveIp);
      }
      const baseSetting = await knex('webguiSetting').where({
        key: 'base'
      }).then(s => s[0]).then(s => JSON.parse(s.value));
      const result = subscribeAccount.server.map(s => {
        switch(type) {
          case 'ss':
            return 'ss://' + Buffer.from(s.method + ':' + subscribeAccount.account.password + '@' + s.host + ':' + (subscribeAccount.account.port +  + s.shift)).toString('base64') + '#' + Buffer.from(s.name).toString('base64');
            // return 'ssr://' + urlsafeBase64(s.host + ':' + (subscribeAccount.account.port + s.shift) + ':origin:' + s.method + ':plain:' + urlsafeBase64(subscribeAccount.account.password) +  '/?obfsparam=&remarks=' + urlsafeBase64(s.name) + '&group=' + urlsafeBase64(baseSetting.title));
          default:
            // 更好的适配 Quantumult
            return 'ss://' + Buffer.from(s.method + ':' + subscribeAccount.account.password).toString('base64') + '@' + s.host + ':' + (subscribeAccount.account.port + s.shift) + '/?plugin=&group=' + urlsafeBase64(baseSetting.title) + '#' + s.name;
        }
      }).join('\r\n');

      // Quantumult 中显示使用量
      const myAccount = subscribeAccount.account;
      const myServers = subscribeAccount.server;
      const data = myAccount.data;

      const time = {
        '2': 7 * 24 * 3600000,
        '3': 30 * 24 * 3600000,
        '4': 24 * 3600000,
        '5': 3600000,
      };

      const timeArray = [data.create, data.create + time[myAccount.type]];
      if (data.create <= Date.now()) {
        let i = 0;
        while (data.create + i * time[myAccount.type] <= Date.now()) {
          timeArray[0] = data.create + i * time[myAccount.type];
          timeArray[1] = data.create + (i + 1) * time[myAccount.type];
          i++;
        }
      }

      const flowLimit = data.flow * (myAccount.multiServerFlow ? 1 : myServers.length);
      const currentFlow = (await flow.getServerPortFlowWithScale(null, myAccount.id, timeArray, myAccount.multiServerFlow))[0];
      res.setHeader('subscription-userinfo', `upload=0; download=${unit1000To1024(currentFlow)}; total=${unit1000To1024(flowLimit)}`);
      return res.send(Buffer.from(result).toString('base64'));
    }
  } catch (err) {
    console.log(err);
    res.status(403).end();
  }
};